"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Play, Activity, CalendarDays, ChevronLeft, ChevronRight, Search, Bell, Library, LayoutGrid, Trophy, BarChart3, Menu, X } from "lucide-react";
import { readOfflineCache, writeOfflineCache } from "../lib/offline-cache";

const MATCHES_CACHE_KEY = "snooker.offline.matches";
const SETTINGS_CACHE_KEY = "snooker.offline.settings";
const primaryNavItems = [
  { href: "#live", label: "Live Matches" },
  { href: "#schedule", label: "Upcoming" },
  { href: "#history", label: "History" },
  { href: "/players", label: "Players" },
  { href: "/analytics", label: "Analytics" },
];
const secondaryNavItems = [
  { href: "/multi-stream", label: "Multi-Stream", icon: LayoutGrid },
  { href: "/vod", label: "VOD", icon: Library },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const [hasMounted, setHasMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [scheduledMatches, setScheduledMatches] = useState<any[]>([]);
  const [completedMatches, setCompletedMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [registrationAllowed, setRegistrationAllowed] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationNotice, setNotificationNotice] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [session, status]);

  // Auto advance slides every 5 seconds
  useEffect(() => {
    if (liveMatches.length <= 1) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % liveMatches.length);
    }, 5000);
    return () => clearInterval(slideInterval);
  }, [liveMatches.length]);

  useEffect(() => {
    const fetchLatestData = () => {
      fetch("/api/matches", { cache: "no-store" }) 
        .then(res => {
          if (!res.ok) {
            throw new Error("Unable to load matches");
          }
          return res.json();
        })
        .then(data => {
          const matches = data.matches || [];
          setLiveMatches(matches.filter((m: any) => m.status === 'live' || m.status === 'paused'));
          setScheduledMatches(matches.filter((m: any) => m.status === 'scheduled'));
          setCompletedMatches(matches.filter((m: any) => m.status === 'finished').slice(-20).reverse());
          writeOfflineCache(MATCHES_CACHE_KEY, matches);
          setShowingOfflineSnapshot(false);
          setIsLoading(false);
        })
        .catch(() => {
          const cachedMatches = readOfflineCache<any[]>(MATCHES_CACHE_KEY, []);
          setLiveMatches(cachedMatches.filter((m: any) => m.status === 'live' || m.status === 'paused'));
          setScheduledMatches(cachedMatches.filter((m: any) => m.status === 'scheduled'));
          setCompletedMatches(cachedMatches.filter((m: any) => m.status === 'finished').slice(-20).reverse());
          setShowingOfflineSnapshot(cachedMatches.length > 0);
          setIsLoading(false);
        });
    };

    fetchLatestData(); 
    const interval = setInterval(fetchLatestData, 3000); // Polling for real-time score updates!
    return () => clearInterval(interval); 
  }, []);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load settings");
        }
        return res.json();
      })
      .then((data) => {
        setRegistrationAllowed(data.allowRegistration !== false);
        setMaintenanceMode(Boolean(data.maintenanceMode));
        setAnnouncement(data.globalAnnouncement || "");
        writeOfflineCache(SETTINGS_CACHE_KEY, data);
      })
      .catch(() => {
        const cachedSettings = readOfflineCache<{ allowRegistration?: boolean; maintenanceMode?: boolean; globalAnnouncement?: string }>(
          SETTINGS_CACHE_KEY,
          {},
        );
        setRegistrationAllowed(cachedSettings.allowRegistration !== false);
        setMaintenanceMode(Boolean(cachedSettings.maintenanceMode));
        setAnnouncement(cachedSettings.globalAnnouncement || "");
      });
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setFavoritePlayers(data?.user?.favoritePlayers || []))
      .catch(() => {});
  }, [session?.user]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotificationSupported(false);
      setNotificationsEnabled(false);
      return;
    }

    setNotificationSupported(true);
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setNotificationsEnabled(Boolean(subscription) && Notification.permission === "granted");
      })
      .catch(() => {
        setNotificationsEnabled(false);
      });
  }, []);

  useEffect(() => {
    if (!session?.user) {
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    let cancelled = false;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!subscription || cancelled) {
          return;
        }

        const syncResult = await syncSubscriptionWithServer(subscription);
        if (!cancelled) {
          setNotificationSupported(true);
          setNotificationsEnabled(syncResult);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotificationsEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const syncExistingSubscriptionState = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    setNotificationsEnabled(Boolean(subscription) && Notification.permission === "granted");
  };

  const syncSubscriptionWithServer = async (subscription: PushSubscription) => {
    const saveRes = await fetch("/api/push/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    if (!saveRes.ok) {
      const saveData = await saveRes.json().catch(() => ({}));
      throw new Error(saveData.error || "Unable to enable push alerts.");
    }

    return true;
  };

  const requestNotifications = async () => {
    if (!session?.user) {
      setNotificationNotice("Sign in first so alerts can be linked to your favorite players.");
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotificationNotice("This browser does not support notifications.");
      setNotificationSupported(false);
      setNotificationsEnabled(false);
      return;
    }

    setNotificationNotice("");
    setNotificationBusy(true);

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setNotificationSupported(true);

      if (!granted) {
        setNotificationNotice(
          permission === "denied"
            ? "Notifications are blocked in this browser. Allow them in browser settings and try again."
            : "Notification permission was dismissed.",
        );
        return;
      }

      const keyRes = await fetch("/api/push/public-key", { cache: "no-store" });
      const keyData = await keyRes.json().catch(() => ({}));
      if (!keyRes.ok || !keyData.publicKey) {
        throw new Error(keyData.error || "Push alerts are not configured on the server.");
      }

      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
        }));

      await syncSubscriptionWithServer(subscription);

      setNotificationsEnabled(true);
      setNotificationNotice(
        favoritePlayers.length > 0
          ? "Background push alerts are enabled. You will get alerts even when the app is not open."
          : "Background push alerts are enabled. Add favorite players in your profile to receive live alerts.",
      );
    } catch (error) {
      setNotificationSupported(true);
      setNotificationsEnabled(false);
      setNotificationNotice(
        error instanceof Error ? error.message : "Failed to enable background push alerts in this browser.",
      );
    } finally {
      setNotificationBusy(false);
    }
  };

  const disableNotifications = async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setNotificationBusy(true);
    setNotificationNotice("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => {});

        await subscription.unsubscribe();
      }

      setNotificationsEnabled(false);
      setNotificationNotice("Background push alerts have been disabled.");
    } catch {
      setNotificationNotice("Failed to disable background push alerts in this browser.");
    } finally {
      setNotificationBusy(false);
      syncExistingSubscriptionState().catch(() => {});
    }
  };

  // Filter matches based on search query
  const filteredLiveMatches = liveMatches.filter((match) => 
    match.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerA.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerB.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredScheduledMatches = scheduledMatches.filter((match) => 
    match.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerA.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.playerB.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 font-sans">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl">
        <div className="flex min-h-20 items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-1.5 md:gap-2 group">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] group-hover:animate-pulse transition-all"></div>
              <span className="font-bold text-xl md:text-2xl text-white tracking-tight">Snooker<span className="text-emerald-500">Stream</span></span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {primaryNavItems.map((item) => (
                <Link key={item.href} href={item.href} className="text-zinc-300 hover:text-white font-medium transition-colors">
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="rounded-full border border-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-700 hover:text-white">
                    <Icon size={14} className="mr-2 inline-block" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {!hasMounted || status === "loading" ? (
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
            ) : session ? (
              <div className="hidden md:flex items-center gap-4">
                {(session.user as any)?.role === "admin" && (
                  <Link href="/admin" className="text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors border border-zinc-700">
                    Admin Dashboard
                  </Link>
                )}
                {(session.user as any)?.role === "umpire" && (
                  <Link href="/umpire" className="text-sm font-semibold bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-800/50">
                    Umpire Panel
                  </Link>
                )}

                <div className="w-px h-6 bg-zinc-800 hidden md:block"></div>

                <Link
                  href="/profile"
                  className="flex items-center gap-3 group transition-all"
                  title="Profile Settings"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-zinc-800 transition-all overflow-hidden">
                    {session.user?.image ? (
                      <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-zinc-500 group-hover:text-emerald-500 transition-colors capitalize font-bold">
                        {session.user?.name?.[0] || "U"}
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <p className="text-xs font-bold text-white leading-none mb-0.5">{session.user?.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium">{session.user?.email}</p>
                  </div>
                </Link>

                <button
                  onClick={() => signOut()}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/login" className="text-sm font-semibold text-zinc-300 hover:text-white transition-colors">Sign In</Link>
                <Link href="/register" className={`text-sm font-semibold px-4 md:px-5 py-2 md:py-2.5 rounded-full transition-colors shadow-lg shadow-emerald-900/20 ${registrationAllowed && !maintenanceMode ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-400 pointer-events-none"}`}>
                  <span className="hidden sm:inline">Subscribe Now</span>
                  <span className="sm:hidden">Subscribe</span>
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white md:hidden"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="border-t border-zinc-800 bg-zinc-950/95 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:text-white"
                  >
                    <Icon size={14} className="mr-2 inline-block" />
                    {item.label}
                  </Link>
                );
              })}
              {!hasMounted || status === "loading" ? (
                <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">Loading account...</div>
              ) : session ? (
                <div className="mt-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                      {session.user?.image ? (
                        <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="text-sm font-bold capitalize text-emerald-400">
                          {session.user?.name?.[0] || "U"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{session.user?.name}</p>
                      <p className="truncate text-xs text-zinc-500">{session.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200 hover:border-zinc-700 hover:text-white">
                      Profile Settings
                    </Link>
                    {(session.user as any)?.role === "admin" && (
                      <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700">
                        Admin Dashboard
                      </Link>
                    )}
                    {(session.user as any)?.role === "umpire" && (
                      <Link href="/umpire" onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-blue-800/50 bg-blue-900/40 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-900/60">
                        Umpire Panel
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        signOut();
                      }}
                      className="rounded-xl border border-zinc-800 px-4 py-3 text-left text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-white"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-200 hover:border-zinc-700 hover:text-white">
                    Sign In
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)} className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold transition-colors ${registrationAllowed && !maintenanceMode ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-zinc-800 text-zinc-400 pointer-events-none"}`}>
                    Subscribe
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {(maintenanceMode || announcement) && (
        <section className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6">
          <div className={`rounded-2xl border px-4 py-3 text-sm ${maintenanceMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-zinc-900 border-zinc-800 text-zinc-300"}`}>
            {maintenanceMode
              ? "Maintenance mode is active. Viewing remains available, but account and admin changes are temporarily limited."
              : announcement}
          </div>
        </section>
      )}

      {/* Hero / Top Live Matches Carousel (Hotstar Style) */}
      <section className="relative flex h-[70svh] min-h-[520px] w-full items-center justify-center overflow-hidden border-b border-zinc-800 bg-black md:h-[75vh]">
        {isLoading ? (
          <Activity className="animate-spin text-emerald-500 relative z-10" size={48} />
        ) : liveMatches.length === 0 ? (
          <div className="text-center z-10 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
             <p className="text-zinc-500 font-medium text-lg">No live matches currently in progress.</p>
          </div>
        ) : (
          <>
            {/* Background Layers */}
            <div className="absolute inset-0 z-0">
               {/* Per-match background: use thumbnail if available, else fallback */}
               {liveMatches.map((match, idx) => (
                 <div
                   key={match._id}
                   className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                 >
                   <img
                     src={match.thumbnailUrl || "https://images.unsplash.com/photo-1628190715364-77218f2a9ccb?q=80&w=2070&auto=format&fit=crop"}
                     alt={match.title}
                     className="w-full h-full object-cover opacity-100 transition-transform duration-[5s] scale-110 group-hover:scale-100"
                     onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1628190715364-77218f2a9ccb?q=80&w=2070&auto=format&fit=crop"; }}
                   />
                 </div>
               ))}
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent"></div>
                 <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent"></div>
              </div>

            {/* Content Container */}
            <div className="max-w-[1600px] w-full mx-auto px-4 md:px-8 relative z-10 flex flex-col justify-end h-full pb-24 md:pb-24">
               {liveMatches.map((match, idx) => (
                 <div 
                   key={match._id} 
                   className={`transition-all duration-700 ease-in-out absolute inset-0 max-w-[1600px] mx-auto px-4 md:px-8 flex flex-col justify-end pb-24 md:pb-24 ${idx === currentSlide ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-12 pointer-events-none z-0'}`}
                 >
                   <div className="max-w-4xl relative">
                     <div className={`inline-flex items-center gap-2 border px-3 py-1.5 rounded-full mb-6 max-w-fit ${match.status === 'live' ? 'bg-red-500/10 border-red-500/20' : (match.status === 'finished' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-orange-500/10 border-orange-500/20')}`}>
                        <div className={`w-2 h-2 rounded-full ${match.status === 'live' ? 'bg-red-500 animate-pulse' : (match.status === 'finished' ? 'bg-emerald-500' : 'bg-orange-500')}`}></div>
                        <span className={`text-xs font-bold tracking-widest uppercase ${match.status === 'live' ? 'text-red-500' : (match.status === 'finished' ? 'text-emerald-500' : 'text-orange-500')}`}>
                          {match.status === 'live' ? 'Live Now' : (match.status === 'finished' ? 'Match Finished' : 'Paused')}
                        </span>
                      </div>
                      <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white leading-tight md:leading-none tracking-tighter mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                        {match.playerA} <span className="text-zinc-400 font-medium px-1 md:px-2 text-xl md:text-4xl">vs</span> {match.playerB}
                      </h1>
                      {match.status === "finished" && match.winner && (
                        <div className="mb-4 flex items-center gap-2 text-2xl text-emerald-400 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] md:text-4xl">
                          <Trophy className="h-7 w-7 md:h-10 md:w-10" />
                          <span className="uppercase tracking-widest">{match.winner} won</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 md:mb-8 text-lg md:text-2xl font-bold">
                        <div className="flex items-baseline gap-2 drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
                          <span className={`truncate max-w-[100px] md:max-w-[150px] ${match.winner === match.playerA ? 'text-emerald-400' : 'text-white'}`}>{match.playerA}</span>
                          <span className={`text-3xl md:text-5xl ${match.winner === match.playerA ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {match.status === 'finished' ? (match.framesWonA || 0) : (match.scoreA || 0)}
                          </span>
                        </div>
                        <span className="text-zinc-400">-</span>
                        <div className="flex items-baseline gap-2 drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
                          <span className={`text-3xl md:text-5xl ${match.winner === match.playerB ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {match.status === 'finished' ? (match.framesWonB || 0) : (match.scoreB || 0)}
                          </span>
                          <span className={`truncate max-w-[100px] md:max-w-[150px] ${match.winner === match.playerB ? 'text-emerald-400' : 'text-zinc-200'}`}>{match.playerB}</span>
                        </div>
                      </div>
                     
                      <div className="flex flex-row flex-wrap gap-3 md:gap-4">
                        <Link 
                          href={`/watch/${match._id}`} 
                          className="inline-flex items-center justify-center gap-2 md:gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-base md:text-lg transition-all shadow-xl shadow-emerald-900/30"
                        >
                          <Play fill="currentColor" size={18} /> Watch Now
                        </Link>
                        <div className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-black/40 border border-white/5 rounded-full text-white font-medium capitalize w-fit text-sm md:text-base">
                          <Activity size={18} className={match.status === 'live' ? 'text-emerald-500' : (match.status === 'finished' ? 'text-emerald-500' : 'text-orange-500')} /> 
                          <span className="hidden sm:inline">
                             {match.status === 'finished' ? `Final Match Score: ${match.framesWonA}-${match.framesWonB}` : `Frame ${match.currentFrame || 1} • Target ${match.framesToWin || Math.ceil(match.totalFrames / 2)}`}
                          </span>
                          <span className="sm:hidden">
                             {match.status === 'finished' ? `Final: ${match.framesWonA}-${match.framesWonB}` : `F${match.currentFrame || 1} • T${match.framesToWin || Math.ceil(match.totalFrames / 2)}`}
                          </span>
                        </div>
                      </div>
                   </div>
                 </div>
               ))}
            </div>

            {/* Navigation Controls */}
            {liveMatches.length > 1 && (
              <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-3 shadow-2xl backdrop-blur-md md:bottom-8 md:left-auto md:right-8 md:translate-x-0 md:gap-4 md:px-6">
                <button 
                  onClick={() => setCurrentSlide(prev => prev === 0 ? liveMatches.length - 1 : prev - 1)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex gap-2">
                  {liveMatches.map((_, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 transition-all rounded-full cursor-pointer ${idx === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-700 hover:bg-zinc-500'}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={() => setCurrentSlide(prev => (prev + 1) % liveMatches.length)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Main Content Areas */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-16 space-y-20">
        {showingOfflineSnapshot && (
          <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
            You are viewing the latest cached home feed. Scores and schedules will refresh automatically when the connection returns.
          </section>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link href="/players" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-300 hover:border-zinc-700">
            <Trophy className="mb-3 text-emerald-400" />
            <h3 className="font-bold text-white">Advanced Player Search</h3>
            <p className="mt-2 text-sm text-zinc-400">Search by name, ranking, and country from the player directory.</p>
          </Link>
          <Link href="/analytics" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-300 hover:border-zinc-700">
            <BarChart3 className="mb-3 text-blue-400" />
            <h3 className="font-bold text-white">Analytics Suite</h3>
            <p className="mt-2 text-sm text-zinc-400">Review win rate, scoring visits, and event-derived player metrics.</p>
          </Link>
          <Link href="/multi-stream" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-300 hover:border-zinc-700">
            <LayoutGrid className="mb-3 text-amber-400" />
            <h3 className="font-bold text-white">Multi-Stream Wall</h3>
            <p className="mt-2 text-sm text-zinc-400">Watch multiple live tables side by side based on your subscription tier.</p>
          </Link>
          <Link href="/profile" className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-300 hover:border-zinc-700">
            <Bell className="mb-3 text-rose-400" />
            <h3 className="font-bold text-white">Buy Premium</h3>
            <p className="mt-2 text-sm text-zinc-400">Upgrade a viewer account to Plus or Pro for more streams and premium viewing features.</p>
          </Link>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-300">
            <Bell className="mb-3 text-emerald-400" />
            <h3 className="font-bold text-white">Favorite Player Alerts</h3>
            <p className="mt-2 text-sm text-zinc-400">Enable true background browser push alerts to get notified when your favorite players go live.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={notificationsEnabled ? disableNotifications : requestNotifications}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
                disabled={(!notificationSupported && hasMounted) || notificationBusy}
              >
                {notificationBusy ? "Updating..." : notificationsEnabled ? "Disable Alerts" : "Enable Alerts"}
              </button>
            </div>
            {notificationNotice && (
              <p className="mt-3 text-xs text-zinc-400">{notificationNotice}</p>
            )}
            {!notificationsEnabled && favoritePlayers.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                Add favorite players in <Link href="/profile" className="text-emerald-400 hover:text-emerald-300">your profile</Link> to receive live alerts.
              </p>
            )}
          </div>
        </section>
        
        {/* Search Bar Section */}
        <div className="relative max-w-2xl mx-auto -mt-6 px-4 md:px-0">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-500/10 rounded-2xl blur-xl group-hover:bg-emerald-500/20 transition-all duration-300"></div>
            <div className="relative flex items-center bg-zinc-900 border border-zinc-700/50 rounded-2xl p-1.5 md:p-2 shadow-2xl">
              <Search className="text-zinc-400 ml-3 md:ml-4 mr-2" size={20} />
              <input 
                type="text" 
                placeholder="Search matches or players..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-zinc-500 px-2 md:px-4 py-2.5 md:py-3 outline-none text-base md:text-lg"
              />
            </div>
          </div>
        </div>

        <section id="live" className="scroll-mt-24">
           <h2 className="text-2xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
             <Activity className="text-emerald-500" />
             All Live Matches <span className="text-zinc-500 text-base font-medium ml-2">({filteredLiveMatches.length})</span>
           </h2>
           
           {!isLoading && filteredLiveMatches.length === 0 ? (
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30 text-center">
               <Activity className="mx-auto text-zinc-700 mb-4" size={48} />
               <h3 className="text-xl font-bold text-white mb-2">{searchQuery ? 'No matching live matches' : 'No matches live right now'}</h3>
               <p className="text-zinc-500">{searchQuery ? 'Try a different search term.' : 'Check back later for exciting snooker action.'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredLiveMatches.map(match => (
                 <MatchCard key={match._id} match={match} />
               ))}
             </div>
           )}
        </section>

        <section id="schedule" className="scroll-mt-24">
           <h2 className="text-2xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
             <CalendarDays className="text-blue-500" />
             Upcoming Matches <span className="text-zinc-500 text-base font-medium ml-2">({filteredScheduledMatches.length})</span>
           </h2>
           
           {!isLoading && filteredScheduledMatches.length === 0 ? (
             <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30 text-center">
               <CalendarDays className="mx-auto text-zinc-700 mb-4" size={48} />
               <h3 className="text-xl font-bold text-white mb-2">{searchQuery ? 'No matching upcoming matches' : 'No upcoming matches scheduled'}</h3>
               <p className="text-zinc-500">{searchQuery ? 'Try a different search term.' : 'Stay tuned for future events and match announcements.'}</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               {filteredScheduledMatches.map(match => (
                 <MatchCard key={match._id} match={match} />
               ))}
             </div>
           )}
         </section>

         <section id="history" className="scroll-mt-24">
            <h2 className="text-2xl font-bold text-white mb-8 border-b border-zinc-800 pb-4 flex items-center gap-3">
              <Activity className="text-zinc-500" />
              Completed Matches <span className="text-zinc-500 text-base font-medium ml-2">(Last 20)</span>
            </h2>
            
            {!isLoading && completedMatches.length === 0 ? (
              <div className="p-8 border border-zinc-800 rounded-2xl bg-zinc-900/30 text-center">
                <Activity className="mx-auto text-zinc-700 mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">No completed matches yet</h3>
                <p className="text-zinc-500">History will appear here once matches are finished.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completedMatches.map((match: any) => (
                  <MatchCard key={match._id} match={match} />
                ))}
              </div>
            )}
          </section>

      </main>
    </div>
  );
}function MatchCard({ match }: { match: any }) {
  const isScheduled = match.status === 'scheduled';
  return (
    <Link href={`/watch/${match._id}`} className="bg-[#121214] border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-colors group flex flex-col justify-start h-full">
       {/* ALWAYS AT THE TOP: Status Header */}
       <div className="p-5 pb-0">
          <div className="flex justify-between items-start mb-4">
            <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded border ${
              isScheduled ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 
              (match.status === 'live' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 
              (match.status === 'finished' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-orange-400 bg-orange-500/10 border-orange-500/20'))
            }`}>
              {match.status.toUpperCase()}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium uppercase">
               {match.status === 'finished' ? `Final Score (${match.framesWonA}-${match.framesWonB})` : (isScheduled ? new Date(match.scheduledTime).toLocaleDateString() : `Frame ${match.currentFrame || 1}`)}
            </span>
          </div>
       </div>

       {/* Consistent Placeholder or Thumbnail Area */}
       <div className="relative w-full h-36 overflow-hidden flex-shrink-0 mb-2 bg-zinc-900/50">
         {match.thumbnailUrl ? (
           <>
             <img
               src={match.thumbnailUrl}
               alt={match.title}
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
               onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-[#121214] to-transparent" />
           </>
         ) : (
           <div className="w-full h-full flex items-center justify-center">
              <Activity className="text-zinc-800" size={48} />
           </div>
         )}
       </div>

       <div className="p-5 pt-0 flex flex-col flex-1">
          <div className="space-y-3 mb-6 flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center gap-3 text-lg">
               <span className={`font-bold truncate max-w-[150px] ${
                 (match.winner === match.playerA || (match.status === 'finished' && match.framesWonA > match.framesWonB)) ? 'text-emerald-400' : 'text-white'
               }`}>
                 {match.playerA} {(match.winner === match.playerA || (match.status === 'finished' && match.framesWonA > match.framesWonB)) && 'Trophy'}
               </span>
               {!isScheduled && <span className={`font-black ${
                 (match.winner === match.playerA || (match.status === 'finished' && match.framesWonA > match.framesWonB)) ? 'text-emerald-400' : 'text-zinc-500'
               }`}>{match.framesWonA || 0}</span>}
            </div>
            <div className="flex justify-between items-center gap-3 text-lg">
               <span className={`font-bold truncate max-w-[150px] ${
                 (match.winner === match.playerB || (match.status === 'finished' && match.framesWonB > match.framesWonA)) ? 'text-emerald-400' : 'text-zinc-400'
               }`}>
                 {match.playerB} {(match.winner === match.playerB || (match.status === 'finished' && match.framesWonB > match.framesWonA)) && 'Trophy'}
               </span>
               {!isScheduled && <span className={`font-black ${
                 (match.winner === match.playerB || (match.status === 'finished' && match.framesWonB > match.framesWonA)) ? 'text-emerald-400' : 'text-zinc-500'
               }`}>{match.framesWonB || 0}</span>}
            </div>
          </div>

         {isScheduled && (
            <div className="mt-auto pt-4 border-t border-zinc-800 text-xs text-zinc-500 flex justify-between items-center">
              <span>{new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="flex items-center gap-1"><Play size={12} className="text-blue-500 group-hover:text-blue-400"/>View</span>
            </div>
          )}
       </div>
    </Link>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

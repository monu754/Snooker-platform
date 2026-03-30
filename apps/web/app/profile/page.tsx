"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { User, Mail, Lock, CheckCircle, AlertCircle, ArrowLeft, Camera, Loader2, Star, Zap, Search, X } from "lucide-react";
import { canPurchasePremium } from "../../lib/access";
import { SUBSCRIPTION_PRICING } from "../../lib/subscriptions";

function RequiredMark() {
  return <span aria-hidden="true" className="text-red-400">*</span>;
}

type ProfileMeta = {
  createdAt: string;
  updatedAt: string;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  subscriptionTier?: string;
};

type PlayerOption = {
  _id: string;
  name: string;
  country?: string;
  rank?: number;
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;
  const [hasMounted, setHasMounted] = useState(false);
  const [name, setName] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);
  const [favoritePlayerQuery, setFavoritePlayerQuery] = useState("");
  const [playerOptions, setPlayerOptions] = useState<PlayerOption[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [profileMeta, setProfileMeta] = useState<ProfileMeta | null>(null);
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState("");
  const role = sessionUser?.role || "user";
  const canManagePremium = canPurchasePremium(role);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    setName(session?.user?.name || "");
  }, [session?.user?.name]);

  useEffect(() => {
    if (!session?.user) return;

    setPlayersLoading(true);
    fetch("/api/players", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPlayerOptions(data.players || []))
      .catch(() => {})
      .finally(() => setPlayersLoading(false));

    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfileMeta({
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          });
          setSubscriptionTier(data.user.subscriptionTier || "free");
          setFavoritePlayers(data.user.favoritePlayers || []);
        }
      })
      .catch(() => {});
  }, [session?.user]);

  if (!hasMounted || status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-zinc-700 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-zinc-500">Please sign in to view your profile.</p>
          <Link href="/login" className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          password,
          ...(canManagePremium ? { subscriptionTier } : {}),
          favoritePlayers,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Update failed");

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setPassword("");
      setConfirmPassword("");
      setProfileMeta((prev) => prev ? { ...prev, updatedAt: new Date().toISOString() } : prev);
      
      // Update the session in real-time
      await update({ ...session, user: { ...session?.user, name, subscriptionTier } });
      
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayerOptions = playerOptions.filter((player) => {
    const query = favoritePlayerQuery.trim().toLowerCase();
    if (!query) return true;

    return (
      player.name.toLowerCase().includes(query) ||
      (player.country || "").toLowerCase().includes(query)
    );
  });

  const toggleFavoritePlayer = (playerName: string) => {
    setFavoritePlayers((prev) =>
      prev.includes(playerName)
        ? prev.filter((favorite) => favorite !== playerName)
        : [...prev, playerName],
    );
  };

  const handleCheckout = async (tier: "plus" | "pro") => {
    setCheckoutLoadingTier(tier);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Unable to start checkout");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data.tier) {
        setSubscriptionTier(data.tier);
        await update({ ...session, user: { ...session?.user, subscriptionTier: data.tier } });
      }

      setMessage({ type: "success", text: data.message || "Premium access updated successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Unable to start checkout" });
    } finally {
      setCheckoutLoadingTier("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="h-16 md:h-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 flex items-center px-4 md:px-8 sticky top-0 z-50">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 group text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">Back to Home</span>
            <span className="text-sm font-medium sm:hidden">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="font-bold text-base md:text-lg tracking-tight">Account <span className="text-emerald-500">Settings</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar / User Info */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="relative w-24 h-24 mx-auto mb-4 group text-center">
                <div className="w-full h-full rounded-2xl bg-zinc-800 flex items-center justify-center border-2 border-zinc-700 group-hover:border-emerald-500 transition-colors">
                  {session.user?.image ? (
                    <Image src={session.user.image} alt={session.user.name || "User"} fill className="object-cover rounded-2xl" />
                  ) : (
                    <User size={40} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  )}
                </div>
                <button className="absolute -bottom-2 -right-2 bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg shadow-lg border border-emerald-400/20 transition-all active:scale-95">
                  <Camera size={16} />
                </button>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">{session.user?.name}</h2>
                <p className="text-zinc-500 text-sm font-medium">{session.user?.email}</p>
                <div className="mt-4 flex justify-center">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    {sessionUser?.role || "User"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Account Stats</h3>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Member Since</span>
                  <span className="text-zinc-300">
                    {profileMeta?.createdAt
                      ? new Date(profileMeta.createdAt).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Updated</span>
                  <span className="text-emerald-500">
                    {profileMeta?.updatedAt
                      ? new Date(profileMeta.updatedAt).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                      : "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-bold mb-6">Profile Details</h3>
                
                {message.text && (
                  <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium text-sm">{message.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-1">Full Name <RequiredMark /></label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-12 py-3.5 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                        placeholder="Your Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative opacity-60">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="email" 
                        value={session.user?.email || ""}
                        disabled
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-12 py-3.5 cursor-not-allowed outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 ml-1">Email cannot be changed.</p>
                  </div>

                  <hr className="border-zinc-800 my-8" />

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Zap size={20} className="text-emerald-500" />
                      {canManagePremium ? "Premium Access" : "Role Access"}
                    </h4>
                    {canManagePremium ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className={`rounded-2xl border p-4 text-left ${subscriptionTier === "free" ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950"}`}>
                          <p className="font-bold">Free</p>
                          <p className="mt-2 text-sm text-zinc-400">Single live stream and standard viewer tools.</p>
                        </div>
                        {(Object.entries(SUBSCRIPTION_PRICING) as Array<["plus" | "pro", (typeof SUBSCRIPTION_PRICING)["plus"]]>).map(([tierKey, tier]) => (
                          <div key={tierKey} className={`rounded-2xl border p-4 text-left ${subscriptionTier === tierKey ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950"}`}>
                            <p className="font-bold">{tier.label}</p>
                            <p className="mt-1 text-sm text-emerald-400">${tier.monthlyPriceUsd}/month</p>
                            <p className="mt-2 text-sm text-zinc-400">{tier.description}</p>
                            <button
                              type="button"
                              onClick={() => handleCheckout(tierKey)}
                              disabled={checkoutLoadingTier === tierKey || subscriptionTier === tierKey}
                              className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500"
                            >
                              {checkoutLoadingTier === tierKey ? "Processing..." : subscriptionTier === tierKey ? "Current Plan" : `Buy ${tier.label}`}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                        {role === "admin"
                          ? "Admins already have full platform access through their role. Premium plans are not used for admin accounts."
                          : "Umpires already have the tools they need through their role. Premium plans are only for viewer accounts."}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1 flex items-center gap-2">
                      <Star size={14} className="text-amber-400" />
                      Favorite Players
                    </label>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          value={favoritePlayerQuery}
                          onChange={(e) => setFavoritePlayerQuery(e.target.value)}
                          placeholder="Search registered players"
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-10 py-3 text-sm outline-none transition-all placeholder:text-zinc-600 focus:border-emerald-500"
                        />
                      </div>

                      {favoritePlayers.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {favoritePlayers.map((playerName) => (
                            <button
                              key={playerName}
                              type="button"
                              onClick={() => toggleFavoritePlayer(playerName)}
                              className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"
                            >
                              {playerName}
                              <X size={12} />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                        {playersLoading ? (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                            Loading registered players...
                          </div>
                        ) : filteredPlayerOptions.length === 0 ? (
                          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-500">
                            No registered players matched your search.
                          </div>
                        ) : (
                          filteredPlayerOptions.map((player) => {
                            const selected = favoritePlayers.includes(player.name);
                            return (
                              <label
                                key={player._id}
                                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                                  selected
                                    ? "border-emerald-500/40 bg-emerald-500/10"
                                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleFavoritePlayer(player.name)}
                                  className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-white">{player.name}</p>
                                  <p className="text-xs text-zinc-500">
                                    {[player.country || "Country pending", player.rank ? `Rank #${player.rank}` : "Unranked"].join(" • ")}
                                  </p>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 ml-1">Choose one or more registered players. Browser alerts use this list when your favorites go live.</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Lock size={20} className="text-emerald-500" />
                      Security
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-zinc-950 border rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-zinc-700 ${confirmPassword && password !== confirmPassword ? 'border-red-500/50' : 'border-zinc-800 focus:border-emerald-500'}`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 ml-1">Leave blank if you don&apos;t want to change your password.</p>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-4">
                    <p className="mr-auto text-xs text-zinc-600"><RequiredMark /> Required fields</p>
                    <Link href="/" className="text-zinc-500 hover:text-white font-medium text-sm transition-colors">
                      Discard Changes
                    </Link>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-3 min-w-[160px] justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

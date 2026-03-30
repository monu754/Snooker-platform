"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Activity, ChevronLeft, Circle, MessageSquare, PlayCircle, Trophy, Users } from "lucide-react";
import { getPusherClient } from "../../../lib/pusher";
import { readOfflineCache, writeOfflineCache } from "../../../lib/offline-cache";
import { getStreamEmbed } from "../../../lib/stream-embed";

type EventLog = { id: string; time: string; player: "A" | "B" | "system"; action: string; points: string; type: "score" | "foul" | "system" };
type MentionUser = { id: string; name: string; handle: string; role: string; image?: string };

const QUICK_EMOJIS = ["\u{1F3B1}", "\u{1F525}", "\u{1F44F}", "\u{1F62E}", "\u{1F4AF}"];
const VIEWER_HEARTBEAT_MS = 15_000;

export default function WatchPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const matchId = params.id as string;
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "chat">("events");
  const [match, setMatch] = useState<any>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [activePlayer, setActivePlayer] = useState<"A" | "B" | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatNotice, setChatNotice] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionUser[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);
  const [matchNotice, setMatchNotice] = useState("");
  const [chatLoadNotice, setChatLoadNotice] = useState("");
  const viewerTokenRef = useRef<string | null>(null);
  const hasReleasedViewerRef = useRef(false);
  const canModerateChat = hasMounted && ((session?.user as any)?.role || "") === "admin";
  const formatLabel = getFormatLabel(match);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const insertIntoChat = (token: string) => setChatInput((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}${token} `);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session) return;
    const text = chatInput;
    setChatInput("");
    setMentionQuery("");
    setMentionSuggestions([]);
    setChatNotice("");
    try {
      const res = await fetch(`/api/matches/${matchId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        return;
      }

      setChatInput(text);

      if (res.status === 429) {
        setChatNotice(data.error || "You are sending messages too quickly. Please wait a moment.");
        return;
      }

      if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 503) {
        setChatNotice(data.error || "Unable to send that message right now.");
        return;
      }

      setChatNotice("Failed to send the message. Please try again.");
    } catch {
      setChatInput(text);
      setChatNotice("Network error while sending the message. Please try again.");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (pendingDeleteIds.includes(messageId)) return;

    setPendingDeleteIds((prev) => [...prev, messageId]);
    setChatNotice("");

    try {
      const res = await fetch(`/api/matches/${matchId}/chat/${messageId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setChatMessages((prev) => prev.filter((message) => message._id !== messageId));
        return;
      }

      if (res.status === 429) {
        setChatNotice(data.error || "Delete limit reached. Please wait a moment and try again.");
        return;
      }

      if (res.status === 401) {
        setChatNotice("Please sign in again to remove messages.");
        return;
      }

      if (res.status === 403) {
        setChatNotice("You do not have permission to remove this message.");
        return;
      }

      setChatNotice(data.error || "Failed to remove the message.");
    } catch {
      setChatNotice("Network error while removing the message. Please try again.");
    } finally {
      setPendingDeleteIds((prev) => prev.filter((id) => id !== messageId));
    }
  };

  const applyMention = (user: MentionUser) => {
    setChatInput((prev) => replaceActiveMention(prev, user.handle));
    setMentionQuery("");
    setMentionSuggestions([]);
  };

  useEffect(() => {
    const storageKey = `snooker.viewer.${matchId}`;
    viewerTokenRef.current = window.sessionStorage.getItem(storageKey) || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    window.sessionStorage.setItem(storageKey, viewerTokenRef.current);
    hasReleasedViewerRef.current = false;

    const syncViewerPresence = async (method: "POST" | "DELETE", keepalive = false) => {
      const viewerToken = viewerTokenRef.current;
      if (!viewerToken) return;
      await fetch(`/api/matches/${matchId}/viewers`, { method, keepalive, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ viewerToken }) })
        .then(async (res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (typeof data?.viewers === "number") {
            setViewerCount(data.viewers);
          }
        })
        .catch(() => {});
    };

    const releaseViewer = (keepalive = false) => {
      if (hasReleasedViewerRef.current) return;
      hasReleasedViewerRef.current = true;
      syncViewerPresence("DELETE", keepalive);
    };

    syncViewerPresence("POST");
    const heartbeat = window.setInterval(() => syncViewerPresence("POST"), VIEWER_HEARTBEAT_MS);

    const handleUnload = () => {
      releaseViewer(true);
    };

    window.addEventListener("beforeunload", handleUnload);

    fetch(`/api/matches/${matchId}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load match");
        }
        return res.json();
      })
      .then((data) => {
        if (data.match) {
          setMatch(data.match);
          setScoreA(data.match.scoreA || 0);
          setScoreB(data.match.scoreB || 0);
          setStreamUrl(data.match.streamUrl || null);
          setActivePlayer(data.match.activePlayer || "A");
          setViewerCount(data.match.viewers || 0);
        }
        if (data.events) {
          setEvents(data.events.map((event: any) => ({
            id: event._id || Date.now().toString(),
            time: new Date(event.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            player: event.player === "A" || event.player === "B" ? event.player : "system",
            action: event.description,
            points: event.eventType === "foul" ? `Opponent +${event.points}` : `+${event.points}`,
            type: event.eventType === "foul" ? "foul" : event.eventType === "score_update" ? "score" : "system",
          })));
        }
        writeOfflineCache(`snooker.offline.watch.${matchId}.summary`, data);
        setShowingOfflineSnapshot(false);
        setMatchNotice("");
      })
      .catch(() => {
        const cached = readOfflineCache<any>(`snooker.offline.watch.${matchId}.summary`, null);
        if (cached?.match) {
          setMatch(cached.match);
          setScoreA(cached.match.scoreA || 0);
          setScoreB(cached.match.scoreB || 0);
          setStreamUrl(cached.match.streamUrl || null);
          setActivePlayer(cached.match.activePlayer || "A");
          setViewerCount(cached.match.viewers || 0);
        }
        if (cached?.events) {
          setEvents(cached.events.map((event: any) => ({
            id: event._id || Date.now().toString(),
            time: new Date(event.createdAt || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            player: event.player === "A" || event.player === "B" ? event.player : "system",
            action: event.description,
            points: event.eventType === "foul" ? `Opponent +${event.points}` : `+${event.points}`,
            type: event.eventType === "foul" ? "foul" : event.eventType === "score_update" ? "score" : "system",
          })));
          setShowingOfflineSnapshot(true);
          setMatchNotice("Live data could not be refreshed, so this match is being shown from the latest cached snapshot.");
          return;
        }

        setMatchNotice("This match could not be loaded right now. Please refresh or try again shortly.");
      });

    fetch(`/api/matches/${matchId}/chat`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load chat");
        }
        return res.json();
      })
      .then((data) => {
        if (data.messages) {
          setChatMessages(data.messages);
          writeOfflineCache(`snooker.offline.watch.${matchId}.chat`, data.messages);
          setChatLoadNotice("");
        }
      })
      .catch(() => {
        const cachedMessages = readOfflineCache<any[]>(`snooker.offline.watch.${matchId}.chat`, []);
        if (cachedMessages.length > 0) {
          setChatMessages(cachedMessages);
          setShowingOfflineSnapshot(true);
          setChatLoadNotice("Chat is showing the latest cached messages because the live chat feed could not be refreshed.");
          return;
        }

        setChatLoadNotice("Live chat messages could not be loaded right now.");
      });

    const pusher = getPusherClient();
    const channel = pusher.subscribe(`match-${matchId}`);
    channel.bind("match-updated", (data: any) => {
      if (data.scoreA !== undefined) setScoreA(data.scoreA);
      if (data.scoreB !== undefined) setScoreB(data.scoreB);
      if (data.streamUrl !== undefined) setStreamUrl(data.streamUrl || null);
      if (data.activePlayer !== undefined) setActivePlayer(data.activePlayer);
      setMatch((prev: any) => ({ ...prev, ...data }));
    });
    channel.bind("new-event", (data: EventLog) => setEvents((prev) => [data, ...prev]));
    channel.bind("event-removed", (data: { eventId?: string }) => {
      if (data.eventId) {
        setEvents((prev) => prev.filter((event) => event.id !== data.eventId));
      }
    });
    channel.bind("viewer-update", (data: { viewers?: number }) => { if (typeof data.viewers === "number") setViewerCount(data.viewers); });
    channel.bind("new-chat-message", (data: any) => {
      setChatMessages((prev) => [...prev, data]);
      setTimeout(() => {
        const chatBox = document.getElementById("chat-container");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }, 50);
    });
    channel.bind("chat-message-deleted", (data: { messageId?: string }) => {
      if (data.messageId) setChatMessages((prev) => prev.filter((message) => message._id !== data.messageId));
    });

    return () => {
      pusher.unsubscribe(`match-${matchId}`);
      window.removeEventListener("beforeunload", handleUnload);
      window.clearInterval(heartbeat);
      releaseViewer();
    };
  }, [matchId]);

  useEffect(() => {
    const nextQuery = extractActiveMentionQuery(chatInput);
    setMentionQuery(nextQuery);
    if (!session || !nextQuery) {
      setMentionSuggestions([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/users/mentions?q=${encodeURIComponent(nextQuery)}`, { signal: controller.signal, cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setMentionSuggestions(data.mentions || []))
      .catch((error) => {
        if (error.name !== "AbortError") console.error("Failed to load mention suggestions", error);
      });
    return () => controller.abort();
  }, [chatInput, session]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans">
      <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <span className="font-bold text-xl text-white tracking-tight">Snooker<span className="text-emerald-500">Stream</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {!hasMounted || status === "loading" ? (
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          ) : session ? (
            <div className="flex items-center gap-4">
              {(session.user as any)?.role === "admin" && <Link href="/admin" className="text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors border border-zinc-700">Admin Dashboard</Link>}
              {(session.user as any)?.role === "umpire" && <Link href="/umpire" className="text-sm font-semibold bg-blue-900/40 hover:bg-blue-900/60 text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-800/50">Umpire Panel</Link>}
              <div className="w-px h-6 bg-zinc-800 hidden md:block"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-300 hidden md:block">{session.user?.name}</span>
                <button onClick={() => signOut()} className="text-sm font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer">Sign Out</button>
              </div>
            </div>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Sign In</Link>
              <Link href="/register" className="text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-full transition-colors cursor-pointer">Subscribe</Link>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {matchNotice && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-200">
              {matchNotice}
            </div>
          )}
          {showingOfflineSnapshot && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-4 text-sm text-blue-200">
              You are viewing a cached match snapshot. Live scoring, viewer count, and chat updates will resume when connectivity returns.
            </div>
          )}
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Link href="/" className="hover:text-white transition-colors flex items-center text-sm"><ChevronLeft size={16} /> Back to Home</Link>
            <span>•</span>
            <span className="text-sm">{formatLabel}</span>
            <span>•</span>
            <span className="text-sm flex items-center gap-1"><Users size={14} /> {viewerCount}</span>
          </div>

          <StreamPlayer streamUrl={streamUrl} matchStatus={match?.status} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
            {match?.status === "live" && activePlayer && <div className="text-center mb-3"><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">At the Table</span></div>}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
              <PlayerScoreCard side="A" match={match} activePlayer={activePlayer} score={scoreA} />
              <div className="flex flex-row md:flex-col items-center justify-center px-4 flex-shrink-0">
                <div className="h-px w-full bg-zinc-800 hidden md:block mb-2"></div>
                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest bg-zinc-950 px-2 py-1 rounded md:bg-transparent">Target {match?.framesToWin || 4}</span>
                <div className="h-px w-full bg-zinc-800 hidden md:block mt-2"></div>
              </div>
              <PlayerScoreCard side="B" match={match} activePlayer={activePlayer} score={scoreB} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col h-[600px] lg:h-auto bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="flex border-b border-zinc-800">
            <button onClick={() => setActiveTab("events")} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium ${activeTab === "events" ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5" : "text-zinc-500"}`}><Activity size={16} /> Match Events</button>
            <button onClick={() => setActiveTab("chat")} className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium ${activeTab === "chat" ? "text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5" : "text-zinc-500"}`}><MessageSquare size={16} /> Live Chat</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {activeTab === "events" ? (
              <div className="space-y-4">
                {events.length === 0 ? <p className="text-zinc-500 text-sm text-center mt-10">Waiting for match to begin...</p> : events.map((event) => <EventItem key={event.id} time={event.time} player={event.player === "A" ? match?.playerA || "Player A" : event.player === "B" ? match?.playerB || "Player B" : "System"} action={event.action} points={event.points} type={event.type} />)}
              </div>
            ) : (
              <div className="flex flex-col h-full h-[500px] justify-between">
                <div id="chat-container" className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2 pb-4">
                  {chatLoadNotice && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                      {chatLoadNotice}
                    </div>
                  )}
                  {chatMessages.length === 0 ? <p className="text-zinc-500 text-sm text-center mt-10">No messages yet. Be the first to say hello!</p> : chatMessages.map((msg) => (
                    <div key={msg._id} className="flex gap-3 text-sm group">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                        {msg.userImage ? <img src={msg.userImage} alt={msg.userName} className="w-full h-full object-cover" /> : <AvatarBadge name={msg.userName} accentClassName="text-zinc-200" sizeClassName="text-xs" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-emerald-400">{msg.userName}</span>
                          <span className="text-[10px] text-zinc-600">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          {(hasMounted && (canModerateChat || msg.userId === (session?.user as any)?.id)) && <button type="button" disabled={pendingDeleteIds.includes(msg._id)} onClick={() => handleDeleteMessage(msg._id)} className="ml-auto text-[10px] uppercase tracking-wider text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100 disabled:text-zinc-500">{pendingDeleteIds.includes(msg._id) ? "Removing..." : "Remove"}</button>}
                        </div>
                        <p className="text-zinc-300 mt-0.5">{renderChatText(msg.text)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMounted && session ? (
                  <form onSubmit={handleSendMessage} className="mt-4">
                    {chatNotice && (
                      <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                        {chatNotice}
                      </div>
                    )}
                    <div className="mb-3 flex flex-wrap gap-2">
                      {QUICK_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => insertIntoChat(emoji)} className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm text-zinc-300 hover:border-emerald-500/40 hover:text-white transition-colors">{emoji}</button>)}
                    </div>
                    {mentionSuggestions.length > 0 && (
                      <div className="mb-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 p-2">
                        <p className="px-2 pb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500">Mention users matching @{mentionQuery}</p>
                        <div className="space-y-1">
                          {mentionSuggestions.map((user) => (
                            <button key={user.id} type="button" onClick={() => applyMention(user)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-900 transition-colors">
                              <div className="h-8 w-8 overflow-hidden rounded-full bg-zinc-800">
                                {user.image ? <img src={user.image} alt={user.name} className="h-full w-full object-cover" /> : <AvatarBadge name={user.name} accentClassName="text-zinc-200" sizeClassName="text-xs" />}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                                <p className="truncate text-xs text-zinc-500">@{user.handle} • {user.role}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <input type="text" value={chatInput} maxLength={500} onChange={(e) => { setChatInput(e.target.value); if (chatNotice) setChatNotice(""); }} placeholder="Comment on the action... Use @user_name to mention anyone." className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-4 pr-14 py-3 text-sm text-white focus:border-emerald-500 transition-colors outline-none" />
                      <button type="submit" disabled={!chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors cursor-pointer"><PlayCircle size={14} className="ml-0.5" /></button>
                    </div>
                  </form>
                ) : !hasMounted || status === "loading" ? (
                  <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center"><p className="text-sm text-zinc-400">Loading chat access...</p></div>
                ) : (
                  <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center"><p className="text-sm text-zinc-400 mb-3">Sign in to participate in the live chat.</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function PlayerScoreCard({ side, match, activePlayer, score }: { side: "A" | "B"; match: any; activePlayer: "A" | "B" | null; score: number }) {
  const isPlayerA = side === "A";
  const playerName = isPlayerA ? match?.playerA || "Player A" : match?.playerB || "Player B";
  const winner = isPlayerA ? match?.playerA : match?.playerB;
  const finishedScore = isPlayerA ? match?.framesWonA || 0 : match?.framesWonB || 0;
  const accentClass = isPlayerA ? "text-white" : "text-zinc-400";
  const avatarAccent = isPlayerA ? "text-emerald-300" : "text-zinc-300";
  const active = match?.status === "live" && activePlayer === side;

  return (
    <div className={`flex-1 flex items-center justify-between ${isPlayerA ? "md:justify-start" : "md:justify-end md:flex-row-reverse"} gap-3 md:gap-4 p-3 rounded-xl transition-all duration-300 ${active ? "bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]" : "border border-transparent"}`}>
      <div className={`flex items-center gap-3 ${isPlayerA ? "" : "md:flex-row-reverse"}`}>
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden flex-shrink-0 transition-all ${active ? "border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "border-2 border-transparent"}`}>
          <AvatarBadge name={playerName} accentClassName={avatarAccent} />
        </div>
        <div className={isPlayerA ? "" : "md:text-right"}>
          <h2 className={`text-lg md:text-2xl font-bold leading-none truncate max-w-[120px] md:max-w-none ${accentClass}`}>{playerName}</h2>
          {active && <span className={`text-[10px] font-bold text-emerald-500 uppercase tracking-widest block md:inline mt-1 md:mt-0 ${isPlayerA ? "md:ml-2" : "md:mr-2"}`}>Active</span>}
        </div>
      </div>
      <div className={`text-4xl md:text-5xl font-black tracking-tighter w-16 md:w-20 ${isPlayerA ? "text-right" : "text-left md:mr-auto"} ${winner === playerName ? "text-emerald-400" : active ? "text-emerald-400" : isPlayerA ? "text-white" : "text-zinc-500"}`}>{match?.status === "finished" ? finishedScore : score}</div>
      {match?.status === "finished" && winner === playerName && <Trophy className={`${isPlayerA ? "ml-2" : "mr-2"} text-emerald-500 animate-bounce`} size={24} />}
    </div>
  );
}

function EventItem({ time, player, action, points, type }: any) {
  const isFoul = type === "foul";
  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg border ${isFoul ? "bg-red-500/5 border-red-500/20" : "bg-zinc-950 border-zinc-800"}`}>
      <div className="text-xs text-zinc-500 font-medium pt-1 w-10 text-right">{time}</div>
      <div className="mt-1.5">{isFoul ? <Activity size={14} className="text-red-500" /> : <Circle size={14} className="text-emerald-500" />}</div>
      <div><p className="text-sm font-semibold text-white">{player} <span className="font-normal text-zinc-400">• {action}</span></p><p className={`text-xs font-medium mt-0.5 ${isFoul ? "text-red-400" : "text-emerald-500"}`}>{points}</p></div>
    </div>
  );
}

function AvatarBadge({ name, accentClassName, sizeClassName = "text-sm" }: { name: string; accentClassName: string; sizeClassName?: string }) {
  return <div className={`flex h-full w-full items-center justify-center font-bold uppercase ${accentClassName} ${sizeClassName}`}>{getInitials(name)}</div>;
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "SN";
}

function extractActiveMentionQuery(input: string) {
  const match = input.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
  return match?.[1] || "";
}

function replaceActiveMention(input: string, handle: string) {
  return input.replace(/(^|\s)@([a-zA-Z0-9_]*)$/, `$1@${handle} `);
}

function getFormatLabel(match: any) {
  if (!match) return "Loading format";
  const totalFrames = Number(match.totalFrames) || 0;
  const formatName = typeof match.format === "string" && match.format.trim() ? match.format.trim() : "match";
  const displayName = formatName.split(/[-_\s]+/).filter(Boolean).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  return totalFrames > 0 ? `${displayName} (Best of ${totalFrames})` : displayName;
}

function renderChatText(text: string) {
  const parts = text.split(/(@[A-Za-z0-9_]+)/g);
  return parts.map((part: string, index: number) => part.startsWith("@") ? <span key={`${part}-${index}`} className="font-semibold text-emerald-400">{part}</span> : <span key={`${part}-${index}`}>{part}</span>);
}

function StreamPlayer({ streamUrl, matchStatus }: { streamUrl: string | null; matchStatus?: string }) {
  const embed = streamUrl ? getStreamEmbed(streamUrl, typeof window !== "undefined" ? window.location.hostname : "localhost", true) : null;
  if (!embed) {
    return (
      <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center"><PlayCircle size={40} className="text-zinc-700" /></div>
        <div className="text-center"><p className="text-zinc-400 font-semibold text-lg">Stream Not Available</p><p className="text-zinc-600 text-sm mt-1">{matchStatus === "scheduled" ? "Stream will start when the match begins." : "The admin has not set a stream URL yet."}</p></div>
        {matchStatus === "live" && <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 rounded-full"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs font-bold text-white tracking-widest">LIVE (NO STREAM)</span></div>}
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      {matchStatus === "live" && <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 rounded-full pointer-events-none"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div><span className="text-xs font-bold text-white tracking-widest">LIVE</span></div>}
      {embed.type === "video" ? <video src={embed.embedUrl} controls autoPlay muted playsInline className="w-full h-full object-contain bg-black" /> : <iframe src={embed.embedUrl} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen frameBorder="0" title="Live Stream" />}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { PlayCircle, MessageSquare, Activity, Trophy, ChevronLeft, Circle, Users } from "lucide-react";
import { getPusherClient } from "../../../lib/pusher";
type EventLog = { id: string; time: string; player: "A" | "B"; action: string; points: string; type: "score" | "foul" | "system" };

export default function WatchPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const matchId = params.id as string;
  const [activeTab, setActiveTab] = useState<"events" | "chat">("events");
  const [match, setMatch] = useState<any>(null);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [activePlayer, setActivePlayer] = useState<"A" | "B" | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [events, setEvents] = useState<EventLog[]>([]);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !session) return;
    
    const text = chatInput;
    setChatInput(""); // Clear instantly for UI speed
    
    try {
      await fetch(`/api/matches/${matchId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
    } catch (err) {
      console.error("Failed to send msg", err);
    }
  };

  useEffect(() => {
    // ── Viewer Tracking ─────────────────────────────────────────
    // Increment when page mounts
    fetch(`/api/matches/${matchId}/viewers`, { method: "POST" }).catch(() => {});

    // Decrement on clean unmount (back button / navigation)
    const decrementViewer = () => {
      fetch(`/api/matches/${matchId}/viewers`, { method: "DELETE" }).catch(() => {});
    };

    // Beacon API decrement for page close/refresh (non-blocking)
    const handleUnload = () => {
      // keepalive ensures the fetch completes even on page unload
      fetch(`/api/matches/${matchId}/viewers`, { method: "DELETE", keepalive: true }).catch(() => {});
    };
    window.addEventListener("beforeunload", handleUnload);
    // ──────────────────────────────────────────────────────────────

    // 1. Fetch initial match state
    fetch(`/api/matches/${matchId}`)
      .then(res => res.json())
      .then(data => {
        if (data.match) {
          setMatch(data.match);
          setScoreA(data.match.scoreA || 0);
          setScoreB(data.match.scoreB || 0);
          setStreamUrl(data.match.streamUrl || null);
          setActivePlayer(data.match.activePlayer || "A");
        }
        if (data.events) {
          setEvents(data.events.map((e: any) => ({
            id: e._id || Date.now().toString(),
            time: new Date(e.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            player: e.player,
            action: e.description,
            points: e.eventType === "foul" ? `Opponent +${e.points}` : `+${e.points}`,
            type: e.eventType === "foul" ? "foul" : (e.eventType === "score_update" ? "score" : "system")
          })));
        }
      })
      .catch(err => console.error("Failed to load initial match data", err));

    // Fetch initial chat messages
    fetch(`/api/matches/${matchId}/chat`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) setChatMessages(data.messages);
      })
      .catch(err => console.error("Failed to load chat", err));

    // 2. Subscribe to real-time updates
    const pusher = getPusherClient();
    const channel = pusher.subscribe(`match-${matchId}`);

    channel.bind("match-updated", (data: any) => {
      // Direct state replacement - handles both regular scores and undos seamlessly!
      if (data.scoreA !== undefined) setScoreA(data.scoreA);
      if (data.scoreB !== undefined) setScoreB(data.scoreB);
      // Update stream URL in real-time when admin changes it
      if (data.streamUrl !== undefined) setStreamUrl(data.streamUrl || null);
      // Update active player highlight
      if (data.activePlayer !== undefined) setActivePlayer(data.activePlayer);
      
      // Update match object for framesWon, status, and winner
      setMatch((prev: any) => ({
        ...prev,
        ...data
      }));
    });

    channel.bind("new-event", (data: EventLog) => {
      setEvents((prev) => [data, ...prev]);
    });

    channel.bind("new-chat-message", (data: any) => {
      setChatMessages(prev => [...prev, data]);
      // Auto-scroll to bottom
      setTimeout(() => {
        const chatBox = document.getElementById("chat-container");
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
      }, 50);
    });

    return () => {
      pusher.unsubscribe(`match-${matchId}`);
      window.removeEventListener("beforeunload", handleUnload);
      decrementViewer();
    };
  }, [matchId]);

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
          {status === "loading" ? (
             <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
          ) : session ? (
            <div className="flex items-center gap-4">
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
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-300 hidden md:block">{session.user?.name}</span>
                <button onClick={() => signOut()} className="text-sm font-medium text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  Sign Out
                </button>
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
          {/* UPDATED: Back to Home Link */}
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Link href="/" className="hover:text-white transition-colors flex items-center text-sm">
              <ChevronLeft size={16} /> Back to Home
            </Link>
            <span>•</span>
            <span className="text-sm">Standard Match (Best of 7)</span>
          </div>

          <StreamPlayer streamUrl={streamUrl} matchStatus={match?.status} />

          {/* Score Panel with Active Player Highlight */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-6 shadow-xl">
            {match?.status === 'live' && activePlayer && (
              <div className="text-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">At the Table</span>
              </div>
            )}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
              {/* Player A */}
              <div className={`flex-1 flex items-center justify-between md:justify-start gap-3 md:gap-4 p-3 rounded-xl transition-all duration-300 ${
                match?.status === 'live' && activePlayer === 'A'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : 'border border-transparent'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden flex-shrink-0 transition-all ${
                    match?.status === 'live' && activePlayer === 'A' ? 'border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'border-2 border-transparent'
                  }`}>
                    <img src={`https://ui-avatars.com/api/?name=${match?.playerA || "Player A"}&background=18181b&color=10b981`} alt="Player A" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-white leading-none truncate max-w-[120px] md:max-w-none">{match?.playerA || "Player A"}</h2>
                    {match?.status === 'live' && activePlayer === 'A' && (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block md:inline mt-1 md:mt-0 md:ml-2">▶ Active</span>
                    )}
                  </div>
                </div>
                <div className={`text-4xl md:text-5xl font-black tracking-tighter w-16 md:w-20 text-right ${
                  match?.winner === match?.playerA ? 'text-emerald-400' : (match?.status === 'live' && activePlayer === 'A' ? 'text-emerald-400' : 'text-white')
                }`}>
                  {match?.status === 'finished' ? (match.framesWonA || 0) : scoreA}
                </div>
                {match?.status === 'finished' && match?.winner === match?.playerA && (
                  <Trophy className="text-emerald-500 ml-2 animate-bounce" size={24} />
                )}
              </div>

              <div className="flex flex-row md:flex-col items-center justify-center px-4 flex-shrink-0">
                <div className="h-px w-full bg-zinc-800 hidden md:block mb-2"></div>
                <span className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest bg-zinc-950 px-2 py-1 rounded md:bg-transparent">Target {match?.framesToWin || 4}</span>
                <div className="h-px w-full bg-zinc-800 hidden md:block mt-2"></div>
              </div>

              {/* Player B */}
              <div className={`flex-1 flex items-center justify-between md:justify-end gap-3 md:gap-4 flex-row md:flex-row-reverse p-3 rounded-xl transition-all duration-300 ${
                match?.status === 'live' && activePlayer === 'B'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : 'border border-transparent'
              }`}>
                <div className="flex items-center gap-3 flex-row md:flex-row-reverse">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-white overflow-hidden flex-shrink-0 transition-all ${
                    match?.status === 'live' && activePlayer === 'B' ? 'border-2 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'border-2 border-transparent'
                  }`}>
                    <img src={`https://ui-avatars.com/api/?name=${match?.playerB || "Player B"}&background=18181b&color=a1a1aa`} alt="Player B" />
                  </div>
                  <div className="md:text-right">
                    <h2 className="text-lg md:text-2xl font-bold text-zinc-400 leading-none truncate max-w-[120px] md:max-w-none">{match?.playerB || "Player B"}</h2>
                    {match?.status === 'live' && activePlayer === 'B' && (
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block md:inline mt-1 md:mt-0 md:mr-2">▶ Active</span>
                    )}
                  </div>
                </div>
                <div className={`text-4xl md:text-5xl font-black tracking-tighter w-16 md:w-20 text-left md:mr-auto ${
                  match?.winner === match?.playerB ? 'text-emerald-400' : (match?.status === 'live' && activePlayer === 'B' ? 'text-emerald-400' : 'text-zinc-500')
                }`}>
                   {match?.status === 'finished' ? (match.framesWonB || 0) : scoreB}
                </div>
                {match?.status === 'finished' && match?.winner === match?.playerB && (
                  <Trophy className="text-emerald-500 mr-2 animate-bounce transition-all" size={24} />
                )}
              </div>
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
                {events.length === 0 ? <p className="text-zinc-500 text-sm text-center mt-10">Waiting for match to begin...</p> : events.map((ev) => <EventItem key={ev.id} time={ev.time} player={ev.player === "A" ? (match?.playerA || "Player A") : (match?.playerB || "Player B")} action={ev.action} points={ev.points} type={ev.type} />)}
              </div>
            ) : (
              <div className="flex flex-col h-full h-[500px] justify-between">
                <div id="chat-container" className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2 pb-4">
                  {chatMessages.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center mt-10">No messages yet. Be the first to say hello!</p>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg._id} className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                          <img src={msg.userImage || `https://ui-avatars.com/api/?name=${msg.userName}&background=random`} alt={msg.userName} />
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-emerald-400">{msg.userName}</span>
                            <span className="text-[10px] text-zinc-600">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-zinc-300 mt-0.5">{msg.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {session ? (
                  <form onSubmit={handleSendMessage} className="mt-4 relative">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Comment on the action..." 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-4 pr-12 py-3 text-sm text-white focus:border-emerald-500 transition-colors outline-none" 
                    />
                    <button type="submit" disabled={!chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 flex items-center justify-center text-white hover:bg-emerald-500 transition-colors cursor-pointer">
                      <PlayCircle size={14} className="ml-0.5" />
                    </button>
                  </form>
                ) : (
                  <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center">
                    <p className="text-sm text-zinc-400 mb-3">Sign in to participate in the live chat.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EventItem({ time, player, action, points, type }: any) {
  const isFoul = type === "foul";
  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg border ${isFoul ? "bg-red-500/5 border-red-500/20" : "bg-zinc-950 border-zinc-800"}`}>
      <div className="text-xs text-zinc-500 font-medium pt-1 w-10 text-right">{time}</div>
      <div className="mt-1.5">{isFoul ? <Activity size={14} className="text-red-500" /> : <Circle size={14} className="text-emerald-500" />}</div>
      <div>
        <p className="text-sm font-semibold text-white">{player} <span className="font-normal text-zinc-400">• {action}</span></p>
        <p className={`text-xs font-medium mt-0.5 ${isFoul ? "text-red-400" : "text-emerald-500"}`}>{points}</p>
      </div>
    </div>
  );
}

/** Converts a raw URL entered by admin into a proper embed URL */
function getEmbedUrl(url: string): { type: "youtube" | "twitch" | "video" | "iframe"; embedUrl: string } | null {
  if (!url) return null;
  const u = url.trim();

  // YouTube: watch?v=ID  or  youtu.be/ID  or  shorts/ID
  const ytMatch = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (ytMatch) {
    return { 
      type: "youtube", 
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1` 
    };
  }

  // YouTube Live stream (direct embed URL already)
  if (u.includes("youtube.com/embed/")) {
    return { type: "youtube", embedUrl: u };
  }

  // Twitch channel: twitch.tv/channelname
  const twitchChannel = url.match(/twitch\.tv\/([^"&?\/\s]+)/);
  if (twitchChannel) {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return { 
      type: "twitch", 
      embedUrl: `https://player.twitch.tv/?channel=${twitchChannel[1]}&parent=${hostname}&autoplay=true&muted=true` 
    };
  }

  // Direct video (mp4, webm, m3u8)
  if (u.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
    return { type: "video", embedUrl: u };
  }

  // Fallback: generic iframe
  return { type: "iframe", embedUrl: u };
}

function StreamPlayer({ streamUrl, matchStatus }: { streamUrl: string | null; matchStatus?: string }) {
  const embed = streamUrl ? getEmbedUrl(streamUrl) : null;

  if (!embed) {
    // No stream URL set — show placeholder
    return (
      <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col items-center justify-center gap-4">
        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <PlayCircle size={40} className="text-zinc-700" />
        </div>
        <div className="text-center">
          <p className="text-zinc-400 font-semibold text-lg">Stream Not Available</p>
          <p className="text-zinc-600 text-sm mt-1">
            {matchStatus === "scheduled" ? "Stream will start when the match begins." : "The admin has not set a stream URL yet."}
          </p>
        </div>
        {matchStatus === "live" && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-xs font-bold text-white tracking-widest">LIVE (No Stream)</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
      {/* LIVE badge */}
      {matchStatus === "live" && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/70 backdrop-blur-md border border-zinc-700/50 px-3 py-1.5 rounded-full pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span className="text-xs font-bold text-white tracking-widest">LIVE</span>
        </div>
      )}

      {embed.type === "video" ? (
        <video
          src={embed.embedUrl}
          controls
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <iframe
          src={embed.embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          frameBorder="0"
          title="Live Stream"
        />
      )}
    </div>
  );
}
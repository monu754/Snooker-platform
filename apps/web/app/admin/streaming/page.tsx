"use client";

import { useState, useEffect } from "react";
import { Play, Pause, AlertCircle, Save, Video, HelpCircle } from "lucide-react";

interface MatchData {
  _id: string;
  title: string;
  playerA: string;
  playerB: string;
  status: "scheduled" | "live" | "paused" | "finished";
  streamUrl?: string;
}

export default function StreamingControlPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [streamUpdates, setStreamUpdates] = useState<Record<string, string>>({});

  const fetchMatches = async () => {
    try {
        // Fetch matches prioritizing live and scheduled ones
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Failed to load matches");
      const data = await res.json();
      
      const filteredMatches = data.matches.filter((m: MatchData) => m.status !== "finished");
      setMatches(filteredMatches);
      
      // Initialize the input states
      const initialUpdates: Record<string, string> = {};
      filteredMatches.forEach((m: MatchData) => {
        initialUpdates[m._id] = m.streamUrl || "";
      });
      setStreamUpdates(initialUpdates);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleUpdateStream = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/matches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamUrl: streamUpdates[id] }),
      });
      
      if (!res.ok) throw new Error("Failed to update stream URL");
      
      // Update local state to reflect the saved URL
      setMatches(prev => prev.map(m => m._id === id ? { ...m, streamUrl: streamUpdates[id] } : m));
      
      // Optional: show a small toast or inline success here in the future
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="p-8"><div className="animate-pulse h-10 w-48 bg-zinc-900 rounded mb-8"></div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="h-48 bg-zinc-900 rounded-xl"></div><div className="h-48 bg-zinc-900 rounded-xl"></div></div></div>;
  if (error) return <div className="p-8 text-red-500 flex items-center gap-2"><AlertCircle /> {error}</div>;

  return (
    <div className="p-8 font-sans">
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2 md:gap-3">
            <Video className="text-blue-500" size={24} />
            Streaming Control
          </h1>
          <p className="text-sm md:text-base text-zinc-400">Manage live video feeds, RTMP links, and stream status.</p>
        </div>
      </header>
      
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-3 text-blue-400 text-sm">
         <HelpCircle className="flex-shrink-0 mt-0.5" size={18} />
         <div>
           <p className="font-medium mb-1">How it works:</p>
           <p className="text-blue-400/80">Updating a URL here instantly pushes the new stream link via Pusher to all connected viewers in the /watch room without requiring a page refresh.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.length === 0 ? (
          <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-500 font-medium">No active or scheduled matches to manage.</p>
          </div>
        ) : (
          matches.map((match) => (
            <div key={match._id} className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-5 shadow-lg flex flex-col transition-all hover:border-zinc-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-bold text-white text-lg leading-tight">{match.title}</h3>
                   <p className="text-sm text-zinc-400 mt-1">{match.playerA} vs {match.playerB}</p>
                </div>
                {match.status === "live" && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Play size={10} className="fill-current" /> LIVE</span>}
                {match.status === "paused" && <span className="bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Pause size={10} className="fill-current" /> PAUSED</span>}
                {match.status === "scheduled" && <span className="bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">SCHEDULED</span>}
              </div>
              
              <div className="mt-auto pt-4 border-t border-zinc-800/50 space-y-3">
                 <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block">Stream URL (YouTube/Twitch/RTMP)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input 
                      type="text" 
                      placeholder="https://youtube.com/watch?v=..."
                      value={streamUpdates[match._id] || ""}
                      onChange={(e) => setStreamUpdates({ ...streamUpdates, [match._id]: e.target.value })}
                      className="flex-1 bg-[#09090b] border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                    <button 
                      onClick={() => handleUpdateStream(match._id)}
                      disabled={savingId === match._id || streamUpdates[match._id] === match.streamUrl}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[100px]"
                    >
                      {savingId === match._id ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span> : <Save size={16} />}
                      Save
                    </button>
                  </div>
                 {match.streamUrl && match.streamUrl === streamUpdates[match._id] && (
                     <p className="text-[10px] text-zinc-500">Currently active and broadcasted to viewers.</p>
                 )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Play, Pause, Search } from "lucide-react";

export default function MatchManagerPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchMatches = () => {
      fetch("/api/matches", { cache: "no-store" }) // Force bypass cache
        .then(res => res.json())
        .then(data => {
          setMatches(data.matches || []);
          setLoading(false);
      });
    };
  useEffect(() => { 
    fetchMatches(); 
    // Auto-refresh the table every 3 seconds!
    const interval = setInterval(fetchMatches, 3000);
    return () => clearInterval(interval);
  }, []);
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this match permanently?")) return;
    await fetch(`/api/matches/${id}`, { method: "DELETE" });
    fetchMatches();
  };

  const handleForceStart = async (id: string) => {
    if (!window.confirm("Start/Resume this match now?")) return;
    await fetch(`/api/matches/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "live" }) 
    });
    fetchMatches();
  };

  const handleForcePause = async (id: string) => {
    if (!window.confirm("Pause this live match?")) return;
    await fetch(`/api/matches/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }) 
    });
    fetchMatches();
  };

  // Instant frontend filtering & smart sorting logic
  const getStatusWeight = (status: string) => {
    if (status === 'live') return 1;
    if (status === 'paused') return 2;
    return 3; // scheduled or finished
  };

  const filteredMatches = matches
    .filter((match) => {
      const query = searchQuery.toLowerCase();
      return (
        match.playerA.toLowerCase().includes(query) ||
        match.playerB.toLowerCase().includes(query) ||
        match.format.toLowerCase().includes(query) ||
        (match.venue && match.venue.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => {
      // 1. Prioritize Live, then Paused, then Scheduled
      const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
      if (weightDiff !== 0) return weightDiff;
      
      // 2. If status is the same, sort chronologically by scheduled time
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
    });

  return (
    <div className="p-8 font-sans max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Match Manager</h1>
          <p className="text-zinc-400">Complete database of all past, present, and future matches.</p>
        </div>
        <Link href="/admin/matches/create" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
          <Plus size={18} /> Schedule Match
        </Link>
      </header>

      {/* SEARCH BAR TOOLBAR */}
      <div className="mb-6 flex items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            placeholder="Search players, formats, or venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#09090b] text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Match Details</th>
                <th className="px-6 py-4 font-semibold">Format</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Date / Time</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading database records...</td></tr>
              ) : filteredMatches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                    {searchQuery ? `No matches found matching "${searchQuery}"` : "No matches found. Create one to get started."}
                  </td>
                </tr>
              ) : (
                filteredMatches.map((match: any) => (
                  <tr key={match._id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{match.playerA} vs {match.playerB}</td>
                    <td className="px-6 py-4 capitalize">{match.format}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                          match.status === 'live' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          match.status === 'paused' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                        {match.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{new Date(match.scheduledTime).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                         {match.status === 'live' && (
                           <button onClick={() => handleForcePause(match._id)} className="p-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded transition-colors" title="Pause Match">
                             <Pause size={16} />
                           </button>
                         )}
                         {(match.status === 'scheduled' || match.status === 'paused') && (
                           <button onClick={() => handleForceStart(match._id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded transition-colors" title={match.status === 'paused' ? 'Resume Match' : 'Force Start'}>
                             <Play size={16} />
                           </button>
                         )}
                         <button onClick={() => handleDelete(match._id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors" title="Delete Match">
                           <Trash2 size={16} />
                         </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
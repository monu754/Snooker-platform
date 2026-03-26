"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Settings2, ShieldAlert, Activity, Users, Trash2, AlertCircle } from "lucide-react";
import { getPusherClient } from "../../lib/pusher";

interface DashboardData {
  stats: { liveCount: number; scheduledCount: number; activeViewers: number; activeUmpires: number; };
  actionableMatches: any[];
  recentEvents: any[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setError("");
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDashboardData(); 
    // Auto-refresh dashboard stats every 3 seconds!
    const interval = setInterval(fetchDashboardData, 3000);
    const pusher = getPusherClient();
    const channel = pusher.subscribe("admin-dashboard");

    channel.bind("viewer-stats-updated", (event: { matchId?: string; matchViewers?: number; activeViewers?: number }) => {
      setData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            activeViewers: typeof event.activeViewers === "number" ? event.activeViewers : prev.stats.activeViewers,
          },
          actionableMatches: prev.actionableMatches.map((match) =>
            match._id === event.matchId && typeof event.matchViewers === "number"
              ? { ...match, viewers: event.matchViewers }
              : match,
          ),
        };
      });
    });

    return () => {
      clearInterval(interval);
      pusher.unsubscribe("admin-dashboard");
    };
  }, []);

  const handleDeleteMatch = async (id: string) => {
    if (!window.confirm("System Admin: Delete this match permanently?")) return;
    try {
      const res = await fetch(`/api/matches/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete match");
      }
      fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete match");
    }
  };

  const handleForceStart = async (id: string) => {
    if (!window.confirm("Start/Resume this match now?")) return;
    try {
      const res = await fetch(`/api/matches/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ status: "live" }) 
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to update match status");
      }
      fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update match status");
    }
  };

  const handleForcePause = async (id: string) => {
    if (!window.confirm("Pause this live match?")) return;
    try {
      const res = await fetch(`/api/matches/${id}`, { 
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }) 
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to pause match");
      }
      fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pause match");
    }
  };
  
  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to delete ALL system logs? This action cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/events", { method: "DELETE" });
      if (res.ok) setData((prev) => prev ? { ...prev, recentEvents: [] } : null);
    } catch (err) {
      console.error("Failed to clear logs", err);
    }
  };

  if (loading && !data) return <DashboardSkeleton />;
  if (error && !data) return <div className="p-8 text-red-500 flex items-center gap-2"><AlertCircle /> {error}</div>;
  if (!data) return null;

  // --- SMART SORTING LOGIC ---
  const getStatusWeight = (status: string) => {
    if (status === 'live') return 1;
    if (status === 'paused') return 2;
    return 3; // scheduled
  };

  const sortedActionableMatches = [...data.actionableMatches].sort((a, b) => {
    const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  });
  // ---------------------------

  return (
    <div className="p-4 md:p-8 font-sans">
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <header className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Overview</h1>
          <p className="text-zinc-400">System authority and match oversight.</p>
        </div>
        <Link href="/admin/matches/create" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20 self-start sm:self-auto">
          + Create New Match
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Live Matches" value={data.stats.liveCount} icon={<Activity className="text-emerald-500" />} trend="Currently active" />
        <StatCard title="Active Viewers" value={data.stats.activeViewers.toLocaleString()} icon={<Users className="text-blue-500" />} trend="Across all streams" />
        <StatCard title="Scheduled Matches" value={data.stats.scheduledCount} icon={<Settings2 className="text-purple-500" />} trend="Awaiting start" />
        <StatCard title="Total Umpires" value={data.stats.activeUmpires} icon={<ShieldAlert className="text-orange-500" />} trend="Registered on platform" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Live & Actionable Matches
            </h2>
            
            <div className="space-y-4">
              {sortedActionableMatches.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-lg">
                  <p className="text-zinc-500 font-medium mb-2">No matches currently active or scheduled.</p>
                  <Link href="/admin/matches/create" className="text-emerald-500 hover:text-emerald-400 text-sm">Create one now</Link>
                </div>
              ) : (
                sortedActionableMatches.map((match) => (
                  <div key={match._id} className="bg-[#09090b] border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-zinc-700">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {match.status === "live" && <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 uppercase tracking-wide">LIVE</span>}
                        {match.status === "scheduled" && <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/20 uppercase tracking-wide">SCHEDULED</span>}
                        {match.status === "paused" && <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/20 uppercase tracking-wide">PAUSED</span>}
                        <span className="text-xs md:text-sm text-zinc-400 capitalize ml-1 md:ml-2">{match.format}</span>
                      </div>
                      <p className="text-base md:text-lg font-bold text-white tracking-tight">{match.playerA} <span className="text-zinc-600 font-medium mx-1 md:mx-2 text-xs md:text-sm">VS</span> {match.playerB}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {match.status === "live" && <p className="text-[10px] md:text-xs text-zinc-500 tracking-wider font-medium font-mono uppercase">Views: {match.viewers?.toLocaleString() || 0}</p>}
                        {match.status === "scheduled" && <p className="text-[10px] md:text-xs text-zinc-500 tracking-wider font-medium font-mono uppercase">Starts: {new Date(match.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      {match.status === "live" && (
                        <>
                          <Link href="/admin/streaming" className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs md:text-sm font-medium rounded transition-colors cursor-pointer flex items-center justify-center">Manage</Link>
                          <button onClick={() => handleForcePause(match._id)} className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs md:text-sm font-medium rounded transition-colors cursor-pointer">Pause</button>
                        </>
                      )}
                      {(match.status === "scheduled" || match.status === "paused") && (
                        <>
                          <button onClick={() => handleForceStart(match._id)} className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 text-xs md:text-sm font-medium rounded shadow-lg cursor-pointer">
                            <Play size={14} fill="currentColor" /> {match.status === "paused" ? "Resume" : "Start"}
                          </button>
                          <button onClick={() => handleDeleteMatch(match._id)} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center rounded border border-red-500/20 cursor-pointer hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* System Log */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-xl h-[500px] flex flex-col">
          <h2 className="text-xl font-semibold text-white mb-6">Recent System Events</h2>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {data.recentEvents.length === 0 ? (
               <p className="text-zinc-600 text-sm text-center mt-10">No recent events logged.</p>
            ) : (
              data.recentEvents.map((event) => (
                <LogItem 
                  key={event._id}
                  time={new Date(event.createdAt).toLocaleString([], {
                    year: "numeric",
                    month: "short",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })} 
                  action={event.eventType.replace('_', ' ').toUpperCase()} 
                  target={event.description} 
                  isAlert={event.eventType === "foul" || event.eventType === "system_alert"} 
                />
              ))
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800">
            <Link href="/admin/events" className="w-full py-2.5 text-sm font-medium text-zinc-400 hover:text-white border border-zinc-800 rounded-lg transition-colors hover:bg-zinc-800 flex justify-center items-center">View All Logs</Link>
            <button onClick={handleClearLogs} className="w-full py-2.5 text-sm font-medium text-red-500 hover:text-white border border-red-500/20 hover:border-red-500 hover:bg-red-500 rounded-lg transition-colors cursor-pointer">Clear Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend }: any) {
  return (
    <div className="bg-[#18181b] border border-zinc-800/50 p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-start mb-4"><h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider">{title}</h3><div className="p-2 bg-[#09090b] rounded-lg border border-zinc-800">{icon}</div></div>
      <p className="text-4xl font-black text-white mb-2 tracking-tighter">{value}</p><p className="text-xs text-zinc-500 font-medium">{trend}</p>
    </div>
  );
}

function LogItem({ time, action, target, isAlert = false }: any) {
  return (
    <div className="flex gap-3 items-start p-3 rounded-lg hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800">
      <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${isAlert ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-emerald-500'}`}></div>
      <div>
        <p className="text-sm text-zinc-300"><span className="font-bold text-white text-xs tracking-wider">{action}</span> • {target}</p>
        <p className="text-[10px] uppercase font-bold text-zinc-500 mt-1 tracking-widest">{time}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      <div className="h-10 w-48 bg-zinc-900 rounded mb-8"></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-900 rounded-xl border border-zinc-800"></div>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[400px] bg-zinc-900 rounded-xl border border-zinc-800"></div>
        <div className="h-[400px] bg-zinc-900 rounded-xl border border-zinc-800"></div>
      </div>
    </div>
  );
}

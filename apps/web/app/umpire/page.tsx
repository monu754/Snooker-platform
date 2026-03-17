"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Play, Calendar, Clock, Activity, AlertCircle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function UmpireDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      const fetchMatches = () => {
        fetch("/api/umpire/matches", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) throw new Error(data.error);
            setMatches(data.matches || []);
            setLoading(false);
            setCurrentTime(new Date()); // Update the current time every fetch
          })
          .catch((err) => {
            setError(err.message);
            setLoading(false);
          });
      };

      fetchMatches();
      const interval = setInterval(fetchMatches, 3000); // Poll every 3 seconds
      return () => clearInterval(interval);
    }
  }, [status, router]);

  // Smart Sorting: Live first, then Paused, Scheduled, then Finished
  const getStatusWeight = (status: string) => {
    if (status === 'live') return 1;
    if (status === 'paused') return 2;
    if (status === 'scheduled') return 3;
    return 4; // finished
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const weightDiff = getStatusWeight(a.status) - getStatusWeight(b.status);
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
  });

  if (status === "loading" || loading) {
    return <div className="h-[80vh] flex items-center justify-center text-emerald-500"><Activity className="animate-spin" size={32} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">My Assigned Matches</h1>
        <p className="text-zinc-400">Select a match below to open the official scoring interface.</p>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sortedMatches.length === 0 ? (
          <div className="bg-[#18181b] border border-dashed border-zinc-800 rounded-xl p-12 text-center">
            <Calendar className="mx-auto text-zinc-600 mb-4" size={48} />
            <h3 className="text-lg font-medium text-white mb-1">No Matches Assigned</h3>
            <p className="text-zinc-500 text-sm">You currently have no matches assigned to you. Contact the system administrator if you believe this is an error.</p>
          </div>
        ) : (
          sortedMatches.map((match) => {
            // SECURITY CHECK: Can the umpire open the panel?
            const isPastScheduledTime = currentTime.getTime() >= new Date(match.scheduledTime).getTime();
            const canStart = match.status === 'live' || match.status === 'paused' || (match.status === 'scheduled' && isPastScheduledTime);

            return (
              <div key={match._id} className="bg-[#18181b] border border-zinc-800/80 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-zinc-700 transition-colors shadow-lg">
                
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    {match.status === 'live' && <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>LIVE</span>}
                    {match.status === 'paused' && <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PAUSED</span>}
                    {match.status === 'scheduled' && <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">SCHEDULED</span>}
                    {match.status === 'finished' && <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider">FINISHED</span>}
                    
                    <span className="text-[10px] md:text-xs font-medium text-zinc-500 flex items-center gap-1.5">
                      <Clock size={12} /> 
                      <span className="hidden sm:inline">{new Date(match.scheduledTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="sm:hidden">{new Date(match.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
                    {match.playerA} <span className="text-zinc-600 mx-1 text-lg font-medium">vs</span> {match.playerB}
                  </h3>
                  
                  <p className="text-sm text-zinc-400 capitalize flex items-center gap-4">
                    <span>{match.format} Match</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                    <span>Best of {match.totalFrames}</span>
                  </p>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  {match.status === 'finished' ? (
                    <button disabled className="w-full md:w-auto bg-zinc-800 border border-zinc-700 text-zinc-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed">
                      Match Concluded
                    </button>
                  ) : canStart ? (
                    <Link 
                      href={`/umpire/match/${match._id}`} 
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                    >
                      <Play size={18} /> Open Scoring Panel
                    </Link>
                  ) : (
                    <button disabled className="w-full md:w-auto bg-zinc-900 border border-zinc-800 text-zinc-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed flex items-center justify-center gap-2">
                      <Lock size={16} /> Waiting to Start
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
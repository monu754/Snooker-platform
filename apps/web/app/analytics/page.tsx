"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Trophy } from "lucide-react";
import { readOfflineCache, writeOfflineCache } from "../../lib/offline-cache";

type PlayerAnalytics = {
  player: string;
  matches: number;
  wins: number;
  framesWon: number;
  framesLost: number;
  scoringVisits: number;
  foulPointsDrawn: number;
  highestScoringVisit: number;
  winRate: number;
};

const ANALYTICS_CACHE_KEY = "snooker.offline.analytics";

export default function AnalyticsPage() {
  const [players, setPlayers] = useState<PlayerAnalytics[]>([]);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/players", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load analytics");
        }
        return res.json();
      })
      .then((data) => {
        const nextPlayers = data.players || [];
        setPlayers(nextPlayers);
        writeOfflineCache(ANALYTICS_CACHE_KEY, nextPlayers);
        setShowingOfflineSnapshot(false);
      })
      .catch(() => {
        const cachedPlayers = readOfflineCache<PlayerAnalytics[]>(ANALYTICS_CACHE_KEY, []);
        setPlayers(cachedPlayers);
        setShowingOfflineSnapshot(cachedPlayers.length > 0);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics Suite</h1>
            <p className="mt-2 text-zinc-400">Live player performance snapshots derived from finished matches and event logs.</p>
          </div>
          <div className="hidden rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 md:block">
            <BarChart3 className="mr-2 inline-block text-emerald-400" size={16} /> Updated from match history
          </div>
        </div>

        <div className="grid gap-4">
          {showingOfflineSnapshot && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-sm text-blue-200">
              Analytics are being shown from the most recent cached snapshot. Live recalculation will resume once you are back online.
            </div>
          )}
          {players.map((player, index) => (
            <div key={player.player} className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 md:grid-cols-2 xl:grid-cols-[2fr_repeat(5,1fr)]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Rank #{index + 1}</p>
                <h2 className="mt-2 text-xl font-bold">{player.player}</h2>
                <p className="mt-1 text-sm text-zinc-400">{player.matches} matches, {player.wins} wins, {player.winRate}% win rate</p>
              </div>
              <Metric label="Frames" value={`${player.framesWon}-${player.framesLost}`} icon={<Trophy size={14} />} />
              <Metric label="Visits" value={player.scoringVisits} icon={<Activity size={14} />} />
              <Metric label="Best Visit" value={player.highestScoringVisit} icon={<BarChart3 size={14} />} />
              <Metric label="Foul Points" value={player.foulPointsDrawn} icon={<Activity size={14} />} />
              <Metric label="Wins" value={player.wins} icon={<Trophy size={14} />} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{icon} {label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

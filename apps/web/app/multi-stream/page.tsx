"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LayoutGrid } from "lucide-react";
import { useSession } from "next-auth/react";
import { getAccessLabel, getEffectiveMaxStreams } from "../../lib/access";
import { getStreamEmbed } from "../../lib/stream-embed";
import { readOfflineCache, writeOfflineCache } from "../../lib/offline-cache";

type MatchData = {
  _id: string;
  title: string;
  playerA: string;
  playerB: string;
  status: string;
  streamUrl?: string;
};

const MULTI_STREAM_CACHE_KEY = "snooker.offline.multi-stream";

export default function MultiStreamPage() {
  const { data: session } = useSession();
  const [hasMounted, setHasMounted] = useState(false);
  const sessionUser = hasMounted ? (session?.user as { role?: string; subscriptionTier?: string } | undefined) : undefined;
  const role = sessionUser?.role || "user";
  const tier = sessionUser?.subscriptionTier || "free";
  const maxStreams = getEffectiveMaxStreams(role, tier);
  const accessLabel = getAccessLabel(role, tier);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/matches?status=live", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load live matches");
        }
        return res.json();
      })
      .then((data) => {
        const nextMatches = (data.matches || []).filter((match: MatchData) => Boolean(match.streamUrl));
        setMatches(nextMatches);
        writeOfflineCache(MULTI_STREAM_CACHE_KEY, nextMatches);
        setShowingOfflineSnapshot(false);
      })
      .catch(() => {
        const cachedMatches = readOfflineCache<MatchData[]>(MULTI_STREAM_CACHE_KEY, []);
        setMatches(cachedMatches);
        setShowingOfflineSnapshot(cachedMatches.length > 0);
      });
  }, []);

  const selectedMatches = useMemo(
    () => matches.filter((match) => selectedIds.includes(match._id)).slice(0, maxStreams),
    [matches, selectedIds, maxStreams],
  );

  const toggleSelection = (matchId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(matchId)) {
        return prev.filter((id) => id !== matchId);
      }
      if (prev.length >= maxStreams) {
        return [...prev.slice(1), matchId];
      }
      return [...prev, matchId];
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Multi-Stream Viewing</h1>
            <p className="mt-2 text-zinc-400">Your {accessLabel} can watch up to {maxStreams} live tables at the same time.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
            <LayoutGrid className="mr-2 inline-block text-emerald-400" size={16} />
            Selected {selectedMatches.length}/{maxStreams}
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          {showingOfflineSnapshot && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200 md:col-span-3">
              Multi-stream is using the last cached live-table list. Embedded streams may still require an active connection from the video provider.
            </div>
          )}
          {matches.map((match) => (
            <button
              key={match._id}
              type="button"
              onClick={() => toggleSelection(match._id)}
              className={`rounded-2xl border p-4 text-left ${selectedIds.includes(match._id) ? "border-emerald-500 bg-emerald-500/10" : "border-zinc-800 bg-zinc-900"}`}
            >
              <p className="font-semibold">{match.playerA} vs {match.playerB}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{match.status}</p>
            </button>
          ))}
        </div>

        <div className={`grid gap-4 ${selectedMatches.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {selectedMatches.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-zinc-400">Select live matches to build your multi-view wall.</div>
          ) : (
            selectedMatches.map((match) => (
              <div key={match._id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="font-semibold">{match.playerA} vs {match.playerB}</p>
                </div>
                <StreamPanel match={match} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StreamPanel({ match }: { match: MatchData }) {
  const embed = getStreamEmbed(match.streamUrl || "", typeof window !== "undefined" ? window.location.hostname : "localhost");

  if (!embed) {
    return <div className="aspect-video bg-zinc-950" />;
  }

  if (embed.type === "video") {
    return (
      <div className="aspect-video">
        <video src={embed.embedUrl} controls autoPlay muted playsInline className="h-full w-full bg-black object-contain" />
      </div>
    );
  }

  return (
    <div className="aspect-video">
      <iframe src={embed.embedUrl} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title={match.title}></iframe>
    </div>
  );
}

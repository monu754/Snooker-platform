"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock3, Trophy } from "lucide-react";
import { getStreamEmbed } from "../../lib/stream-embed";
import { readOfflineCache, writeOfflineCache } from "../../lib/offline-cache";

type VodMatch = {
  _id: string;
  playerA: string;
  playerB: string;
  winner?: string;
  framesWonA?: number;
  framesWonB?: number;
  playbackUrl: string;
  thumbnailUrl?: string;
  chapters: Array<{ title: string; timeLabel: string }>;
};

const VOD_CACHE_KEY = "snooker.offline.vod";

export default function VodPage() {
  const [matches, setMatches] = useState<VodMatch[]>([]);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);

  useEffect(() => {
    fetch("/api/vod", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load vod");
        }
        return res.json();
      })
      .then((data) => {
        const nextMatches = (data.matches || []).filter((match: VodMatch) => Boolean(match.playbackUrl));
        setMatches(nextMatches);
        writeOfflineCache(VOD_CACHE_KEY, nextMatches);
        setShowingOfflineSnapshot(false);
      })
      .catch(() => {
        const cachedMatches = readOfflineCache<VodMatch[]>(VOD_CACHE_KEY, []);
        setMatches(cachedMatches);
        setShowingOfflineSnapshot(cachedMatches.length > 0);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div className="mb-8">
          <h1 className="text-3xl font-bold">VOD Library</h1>
          <p className="mt-2 text-zinc-400">Archived finished matches with quick chapter markers from match events.</p>
        </div>

        <div className="grid gap-6">
          {showingOfflineSnapshot && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-sm text-blue-200">
              You are viewing the most recent cached VOD library snapshot. Some embedded videos may still need a connection to play.
            </div>
          )}
          {matches.map((match) => (
            <div key={match._id} className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="overflow-hidden rounded-xl border border-zinc-800">
                <VodPlayer match={match} />
              </div>
              <div className="p-2">
                <h2 className="text-xl font-bold">{match.playerA} vs {match.playerB}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  <Trophy className="mr-2 inline-block text-emerald-400" size={14} />
                  Winner: {match.winner || "Recorded"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  Final score {match.framesWonA || 0}-{match.framesWonB || 0}
                </p>
                <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    <Clock3 className="mr-2 inline-block" size={12} />
                    Chapter markers
                  </p>
                  <div className="space-y-2">
                    {match.chapters.length === 0 ? (
                      <p className="text-sm text-zinc-500">No chapter markers available yet.</p>
                    ) : (
                      match.chapters.map((chapter, index) => (
                        <div key={`${match._id}-${index}`} className="flex items-center justify-between rounded-lg border border-zinc-800 px-3 py-2 text-sm">
                          <span>{chapter.title}</span>
                          <span className="text-zinc-500">{chapter.timeLabel}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VodPlayer({ match }: { match: VodMatch }) {
  const embed = getStreamEmbed(match.playbackUrl, typeof window !== "undefined" ? window.location.hostname : "localhost");

  if (!embed) {
    return <div className="aspect-video bg-zinc-950" />;
  }

  if (embed.type === "video") {
    return (
      <div className="aspect-video">
        <video src={embed.embedUrl} controls playsInline className="h-full w-full bg-black object-contain" />
      </div>
    );
  }

  return (
    <div className="aspect-video">
      <iframe src={embed.embedUrl} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen title={`${match.playerA} vs ${match.playerB}`}></iframe>
    </div>
  );
}

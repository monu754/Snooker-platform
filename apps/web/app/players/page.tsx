"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Search, Star, Trophy } from "lucide-react";
import { useSession } from "next-auth/react";
import { readOfflineCache, writeOfflineCache } from "../../lib/offline-cache";

type Player = {
  _id: string;
  name: string;
  country?: string;
  rank?: number;
  bio?: string;
  favoriteCount?: number;
};

const PLAYERS_CACHE_KEY = "snooker.offline.players";
const PROFILE_CACHE_KEY = "snooker.offline.favoritePlayers";

export default function PlayersPage() {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [favoritePlayers, setFavoritePlayers] = useState<string[]>([]);
  const [showingOfflineSnapshot, setShowingOfflineSnapshot] = useState(false);

  const loadPlayers = async (nextQuery = "", nextCountry = "") => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextQuery) params.set("q", nextQuery);
    if (nextCountry) params.set("country", nextCountry);

    try {
      const res = await fetch(`/api/players?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Unable to load players");
      }

      const data = await res.json();
      const nextPlayers = data.players || [];
      setPlayers(nextPlayers);
      writeOfflineCache(`${PLAYERS_CACHE_KEY}:${nextQuery}:${nextCountry}`, nextPlayers);
      setShowingOfflineSnapshot(false);
      setLoading(false);
    } catch {
      const cachedPlayers = readOfflineCache<Player[]>(`${PLAYERS_CACHE_KEY}:${nextQuery}:${nextCountry}`, []);
      setPlayers(cachedPlayers);
      setShowingOfflineSnapshot(cachedPlayers.length > 0);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const favorites = data?.user?.favoritePlayers || [];
        setFavoritePlayers(favorites);
        writeOfflineCache(PROFILE_CACHE_KEY, favorites);
      })
      .catch(() => {
        setFavoritePlayers(readOfflineCache<string[]>(PROFILE_CACHE_KEY, []));
      });
  }, []);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const cachedPlayers = readOfflineCache<Player[]>(`${PLAYERS_CACHE_KEY}:${query}:${country}`, []);
    if (cachedPlayers.length > 0) {
      setPlayers(cachedPlayers);
      setLoading(false);
      setShowingOfflineSnapshot(true);
    }
  }, [country, loading, query]);

  const countries = useMemo(
    () => [...new Set(players.map((player) => player.country).filter(Boolean))].sort(),
    [players],
  );

  const toggleFavorite = async (playerName: string) => {
    if (!session?.user) return;
    const nextFavorites = favoritePlayers.includes(playerName)
      ? favoritePlayers.filter((favorite) => favorite !== playerName)
      : [...favoritePlayers, playerName];

    setFavoritePlayers(nextFavorites);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favoritePlayers: nextFavorites }),
    });
    loadPlayers(query, country);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Advanced Player Search</h1>
            <p className="mt-2 text-zinc-400">Filter the player directory by name, country, and ranking.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => loadPlayers(query, country)}
                placeholder="Search player"
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-10 py-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={country}
              onChange={(event) => {
                setCountry(event.target.value);
                loadPlayers(query, event.target.value);
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">All countries</option>
              {countries.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {showingOfflineSnapshot && (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6 text-sm text-blue-200 md:col-span-2 xl:col-span-3">
              You are browsing the last cached player directory snapshot. Search results will update again when the network comes back.
            </div>
          )}
          {loading ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">No players matched your filters.</div>
          ) : (
            players.map((player) => {
              const favorite = favoritePlayers.includes(player.name);
              return (
                <div key={player._id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{player.name}</h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
                        <span className="rounded-full border border-zinc-700 px-2 py-1">Rank #{player.rank || "N/A"}</span>
                        <span className="rounded-full border border-zinc-700 px-2 py-1">{player.country || "Country pending"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(player.name)}
                      disabled={!session?.user || showingOfflineSnapshot}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${favorite ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-zinc-700 text-zinc-400"}`}
                    >
                      <Star size={14} className="inline-block" /> {favorite ? "Following" : "Follow"}
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-zinc-400">{player.bio || "Add player notes, ranking, and country from the admin player manager."}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Globe size={12} /> {player.country || "Unassigned"}</span>
                    <span className="inline-flex items-center gap-1"><Trophy size={12} /> {player.favoriteCount || 0} followers</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

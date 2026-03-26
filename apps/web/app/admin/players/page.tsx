"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trophy } from "lucide-react";

type Player = {
  _id: string;
  name: string;
  country?: string;
  rank?: number;
  bio?: string;
  favoriteCount?: number;
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/players", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setPlayers(data.players || []))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = players.filter((player) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [player.name, player.country || "", player.bio || ""].some((value) =>
      value.toLowerCase().includes(query),
    );
  });

  return (
    <div className="p-8 font-sans max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Player Manager</h1>
          <p className="text-zinc-400">Maintain the official player directory used by match scheduling, player search, favorites, and analytics.</p>
        </div>
      </header>

      <div className="mb-6 flex items-center justify-between gap-4">
        <Link href="/admin/players/create" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
          <Plus size={18} /> Create Player
        </Link>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search player name, country, or bio..."
            className="w-full bg-[#18181b] border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#09090b] text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Player</th>
                <th className="px-6 py-4 font-semibold">Country</th>
                <th className="px-6 py-4 font-semibold">Rank</th>
                <th className="px-6 py-4 font-semibold">Followers</th>
                <th className="px-6 py-4 font-semibold">Bio</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">Loading registered players...</td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    {search ? `No players matched "${search}"` : "No players registered yet. Create one to get started."}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player._id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Trophy size={16} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white">{player.name}</p>
                          <p className="text-xs text-zinc-500">Registered platform player</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{player.country || "Pending"}</td>
                    <td className="px-6 py-4 text-zinc-400">{player.rank || "Unranked"}</td>
                    <td className="px-6 py-4 text-zinc-400">{player.favoriteCount || 0}</td>
                    <td className="px-6 py-4 text-zinc-400 max-w-md">{player.bio || "No bio added yet."}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/admin/players/${player._id}/edit`} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded transition-colors" title="Edit Player">
                          <Pencil size={16} />
                        </Link>
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

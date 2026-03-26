"use client";

import { useEffect, useState } from "react";
import { GitBranchPlus, Sparkles } from "lucide-react";

type BracketData = {
  entrants: string[];
  rounds: Array<Array<{ id: string; playerA: string; playerB: string }>>;
};

export default function AdminBracketsPage() {
  const [entrantsText, setEntrantsText] = useState("");
  const [bracket, setBracket] = useState<BracketData | null>(null);

  useEffect(() => {
    fetch("/api/brackets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setBracket(data.bracket || null);
        setEntrantsText((data.bracket?.entrants || []).join("\n"));
      })
      .catch(() => {});
  }, []);

  const generate = async () => {
    const entrants = entrantsText.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
    const res = await fetch("/api/brackets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrants }),
    });
    const data = await res.json();
    setBracket(data.bracket || null);
  };

  return (
    <div className="p-8 font-sans text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Tournament Brackets</h1>
        <p className="text-zinc-400">Generate a seeded knockout bracket from upcoming match entrants or a custom list.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <label className="mb-3 block text-sm font-semibold text-zinc-300">Entrants</label>
          <textarea value={entrantsText} onChange={(event) => setEntrantsText(event.target.value)} className="min-h-80 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm outline-none focus:border-emerald-500" />
          <button type="button" onClick={generate} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold hover:bg-emerald-500">
            <GitBranchPlus size={16} className="mr-2 inline-block" /> Generate Bracket
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <div className="flex min-w-max gap-6">
            {bracket?.rounds?.map((round, roundIndex) => (
              <div key={`round-${roundIndex}`} className="w-72 space-y-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-300">
                  <Sparkles size={14} className="mr-2 inline-block text-emerald-400" />
                  Round {roundIndex + 1}
                </div>
                {round.map((match) => (
                  <div key={match.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <p className="rounded-lg bg-zinc-900 px-3 py-2">{match.playerA}</p>
                    <p className="my-2 text-center text-xs uppercase tracking-[0.3em] text-zinc-500">vs</p>
                    <p className="rounded-lg bg-zinc-900 px-3 py-2">{match.playerB}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

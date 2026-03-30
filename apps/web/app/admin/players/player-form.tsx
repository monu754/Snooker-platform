"use client";

import Link from "next/link";
import { ArrowLeft, Save, UserPlus } from "lucide-react";

function RequiredMark() {
  return <span aria-hidden="true" className="text-red-400">*</span>;
}

type PlayerFormData = {
  name: string;
  country: string;
  rank: string;
  bio: string;
};

export function PlayerForm({
  title,
  description,
  backHref,
  backLabel,
  submitLabel,
  savingLabel,
  loading,
  error,
  success,
  formData,
  onChange,
  onSubmit,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  submitLabel: string;
  savingLabel: string;
  loading: boolean;
  error: string;
  success: string;
  formData: PlayerFormData;
  onChange: (field: keyof PlayerFormData, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 font-sans">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <Link href={backHref} className="mb-4 flex w-fit items-center gap-2 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400">
            <ArrowLeft size={16} /> {backLabel}
          </Link>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">{title}</h1>
          <p className="text-sm text-zinc-400">{description}</p>
        </header>

        {error && <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}
        {success && <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">{success}</div>}

        <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-zinc-800/50 bg-[#18181b] p-6 shadow-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Player Name <RequiredMark /></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) => onChange("name", event.target.value)}
              placeholder="e.g. Ronnie O'Sullivan"
              className="w-full rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Country <RequiredMark /></label>
              <input
                type="text"
                required
                value={formData.country}
                onChange={(event) => onChange("country", event.target.value)}
                placeholder="e.g. England"
                className="w-full rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">World Rank</label>
              <input
                type="number"
                min="1"
                value={formData.rank}
                onChange={(event) => onChange("rank", event.target.value)}
                placeholder="e.g. 1"
                className="w-full rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Player Bio</label>
            <textarea
              rows={5}
              value={formData.bio}
              onChange={(event) => onChange("bio", event.target.value)}
              placeholder="Career highlights, style of play, titles, and any important context for viewers."
              className="w-full resize-none rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
            />
          </div>

          <p className="text-xs text-zinc-500"><RequiredMark /> Required fields</p>

          <div className="flex items-center justify-end gap-4 border-t border-zinc-800 pt-4">
            <Link href={backHref} className="px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : submitLabel === "Create Player" ? <UserPlus size={16} /> : <Save size={16} />}
              {loading ? savingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

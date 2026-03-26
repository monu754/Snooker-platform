import Link from "next/link";
import { ArrowLeft, DownloadCloud, WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <WifiOff size={28} />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Offline Mode</h1>
        <p className="mt-3 text-zinc-400">
          SnookerStream can keep public pages and recently viewed match data available while your connection is down.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-white">Available offline</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Home, players, analytics, VOD, multi-stream setup, and recently visited match pages can fall back to cached content.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="font-semibold text-white">Needs connection</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Sign-in, profile updates, chat posting, admin tools, umpire controls, and any live write action still require the network.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 text-emerald-400">
            <DownloadCloud size={18} />
            <span className="font-semibold">Best results</span>
          </div>
          <p className="mt-3 text-sm text-zinc-400">
            Open the pages you care about while online first. The app will cache the latest shell, data, and visited match views so they still open later without connectivity.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500">
            <ArrowLeft size={16} />
            Back Home
          </Link>
          <Link href="/players" className="rounded-full border border-zinc-700 px-5 py-3 font-semibold text-zinc-300 hover:border-zinc-600 hover:text-white">
            Browse Players
          </Link>
        </div>
      </div>
    </div>
  );
}

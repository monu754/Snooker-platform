"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Image, Link2, ShieldCheck, Trophy, Upload, User, Video, X } from "lucide-react";

const FORMATS = {
  short: { total: 3, win: 2, label: "Short Match (Best of 3)" },
  standard: { total: 7, win: 4, label: "Standard Match (Best of 7)" },
  tournament: { total: 11, win: 6, label: "Tournament Match (Best of 11)" },
  championship: { total: 35, win: 18, label: "Championship (Best of 35)" },
};

type FormatKey = keyof typeof FORMATS;

function toLocalDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function toLocalTimeInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(11, 16);
}

export default function EditMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [umpires, setUmpires] = useState<any[]>([]);
  const [players, setPlayers] = useState<Array<{ _id: string; name: string; country?: string; rank?: number }>>([]);
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [formData, setFormData] = useState({
    playerA: "",
    playerB: "",
    format: "standard" as FormatKey,
    date: "",
    time: "",
    venue: "",
    umpireId: "",
    streamUrl: "",
    thumbnailUrl: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/matches/${matchId}`, { cache: "no-store" }),
      fetch("/api/admin/umpires", { cache: "no-store" }),
      fetch("/api/admin/players", { cache: "no-store" }),
    ])
      .then(async ([matchRes, umpireRes, playerRes]) => {
        const matchData = await matchRes.json();
        const umpireData = await umpireRes.json();
        const playerData = await playerRes.json();
        if (!matchRes.ok || !matchData.match) {
          throw new Error(matchData.error || "Failed to load match");
        }

        const match = matchData.match;
        const scheduled = new Date(match.scheduledTime);
        const matchedFormat = (Object.keys(FORMATS) as FormatKey[]).find((key) => FORMATS[key].total === match.totalFrames) || "standard";

        setFormData({
          playerA: match.playerA || "",
          playerB: match.playerB || "",
          format: matchedFormat,
          date: toLocalDateInputValue(scheduled),
          time: toLocalTimeInputValue(scheduled),
          venue: match.venue || "",
          umpireId: match.umpireId || "",
          streamUrl: match.streamUrl || "",
          thumbnailUrl: match.thumbnailUrl || "",
        });
        setUmpires(umpireData.umpires || []);
        setPlayers(playerData.players || []);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  const activeFormat = FORMATS[formData.format];

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFormData((prev) => ({ ...prev, thumbnailUrl: data.url }));
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${formData.playerA} vs ${formData.playerB}`,
          playerA: formData.playerA,
          playerB: formData.playerB,
          format: formData.format,
          totalFrames: activeFormat.total,
          framesToWin: activeFormat.win,
          scheduledTime: scheduledDateTime,
          venue: formData.venue,
          umpireId: formData.umpireId,
          streamUrl: formData.streamUrl,
          thumbnailUrl: formData.thumbnailUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update match");

      setSuccess("Match updated successfully.");
      setTimeout(() => {
        router.push("/admin/matches");
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-400">Loading match editor...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/admin/matches" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 text-sm font-medium mb-4 transition-colors w-fit">
            <ArrowLeft size={16} /> Back to Matches
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Edit Match</h1>
          <p className="text-zinc-400 text-sm">Update players, format, schedule, assignment, stream, and thumbnail.</p>
        </header>

        {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 text-sm">{error}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-lg mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
          <section className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6"><User size={18} className="text-emerald-500" /> Match Participants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select value={formData.playerA} onChange={(e) => setFormData({ ...formData, playerA: e.target.value })} className="w-full appearance-none rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500">
                <option value="">Select registered player</option>
                {buildPlayerOptions(players, formData.playerB).map((player) => <option key={player._id} value={player.name}>{player.name}{player.country ? ` • ${player.country}` : ""}{player.rank ? ` • Rank ${player.rank}` : ""}</option>)}
              </select>
              <select value={formData.playerB} onChange={(e) => setFormData({ ...formData, playerB: e.target.value })} className="w-full appearance-none rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500">
                <option value="">Select registered player</option>
                {buildPlayerOptions(players, formData.playerA).map((player) => <option key={player._id} value={player.name}>{player.name}{player.country ? ` • ${player.country}` : ""}{player.rank ? ` • Rank ${player.rank}` : ""}</option>)}
              </select>
            </div>
            <p className="mt-4 text-xs text-zinc-500">Only players already registered in the player manager can be used in matches. <Link href="/admin/players/create" className="text-emerald-500 hover:text-emerald-400">Create player</Link></p>
          </section>

          <section className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6"><Trophy size={18} className="text-emerald-500" /> Match Format</h2>
            <div className="flex flex-col md:flex-row items-end gap-6">
              <select value={formData.format} onChange={(e) => setFormData({ ...formData, format: e.target.value as FormatKey })} className="flex-1 w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer">
                {Object.entries(FORMATS).map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
              </select>
              <div className="flex items-center gap-8 px-6 py-3 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-400 h-[46px]">
                <span>Total Frames: <strong className="text-white">{activeFormat.total}</strong></span>
                <span>To Win: <strong className="text-emerald-500">{activeFormat.win}</strong></span>
              </div>
            </div>
          </section>

          <section className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6"><CalendarDays size={18} className="text-emerald-500" /> Schedule & Venue</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors [color-scheme:dark]" />
              <input type="time" required value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors [color-scheme:dark]" />
              <input type="text" required value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })} placeholder="Venue" className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" />
            </div>
          </section>

          <section className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6"><ShieldCheck size={18} className="text-emerald-500" /> Administration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select value={formData.umpireId} onChange={(e) => setFormData({ ...formData, umpireId: e.target.value })} className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer">
                <option value="">-- Select Umpire --</option>
                {umpires.map((umpire) => <option key={umpire._id} value={umpire._id}>{umpire.name} ({umpire.email})</option>)}
              </select>
              <div className="relative">
                <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input type="url" value={formData.streamUrl} onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" />
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Match Thumbnail</label>
                  <div className="flex items-center gap-1 bg-[#09090b] border border-zinc-800 rounded-lg p-1">
                    <button type="button" onClick={() => setUploadMode("url")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === "url" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}><Link2 size={12} /> Paste URL</button>
                    <button type="button" onClick={() => setUploadMode("file")} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${uploadMode === "file" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}><Upload size={12} /> Upload Photo</button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    {uploadMode === "url" ? (
                      <div className="relative">
                        <Image size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input type="url" value={formData.thumbnailUrl} onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })} placeholder="https://example.com/match-image.jpg" className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" />
                      </div>
                    ) : (
                      <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith("image/")) handleFileUpload(file); }} className={`relative w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${dragOver ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-700 bg-[#09090b] hover:border-zinc-500"}`}>
                        {uploading ? <><span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /><span className="text-xs text-zinc-400">Uploading...</span></> : <><Upload size={22} className="text-zinc-500" /><span className="text-xs text-zinc-400">Drag & drop image here, or</span><label className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer underline underline-offset-2">Browse from device<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} /></label></>}
                      </div>
                    )}
                    {uploadError && <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>}
                  </div>
                  {formData.thumbnailUrl && <div className="relative w-full md:w-48 h-28 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0 group"><img src={formData.thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><button type="button" onClick={() => setFormData({ ...formData, thumbnailUrl: "" })} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><X size={12} /></button></div>}
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-2">
            <Link href="/admin/matches" className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 transition-colors">Cancel</Link>
            <button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/20">{saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function buildPlayerOptions(
  players: Array<{ _id: string; name: string; country?: string; rank?: number }>,
  excludedName: string,
) {
  return players.filter((player) => player.name !== excludedName);
}

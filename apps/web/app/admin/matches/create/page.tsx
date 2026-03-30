"use client";

import { useState, useEffect } from "react"; // <-- This is the fix right here!
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Trophy, CalendarDays, ShieldCheck, Video, Image, Upload, X, Link2 } from "lucide-react";

const FORMATS = {
  short: { total: 3, win: 2, label: "Short Match (Best of 3)" },
  standard: { total: 7, win: 4, label: "Standard Match (Best of 7)" },
  tournament: { total: 11, win: 6, label: "Tournament Match (Best of 11)" },
  championship: { total: 35, win: 18, label: "Championship (Best of 35)" }
};

function RequiredMark() {
  return <span aria-hidden="true" className="text-red-400">*</span>;
}

function getTodayDateInputValue() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [players, setPlayers] = useState<Array<{ _id: string; name: string; country?: string; rank?: number }>>([]);

  const [formData, setFormData] = useState({
    playerA: "",
    playerB: "",
    format: "standard" as keyof typeof FORMATS,
    date: "",
    time: "",
    venue: "",
    umpireId: "",
    streamUrl: "",
    thumbnailUrl: ""
  });

  // --- Thumbnail upload state ---
  const [uploadMode, setUploadMode] = useState<"url" | "file">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setFormData(prev => ({ ...prev, thumbnailUrl: data.url }));
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFileUpload(file);
  };

  // --- Fetch Umpires from Database ---
  const [umpires, setUmpires] = useState<any[]>([]);
  
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/umpires", { cache: "no-store" }),
      fetch("/api/admin/players", { cache: "no-store" }),
    ])
      .then(async ([umpireRes, playerRes]) => {
        const umpireData = await umpireRes.json();
        const playerData = await playerRes.json();
        setUmpires(umpireData.umpires || []);
        setPlayers(playerData.players || []);
      });
  }, []);
  // -----------------------------------

  const activeFormat = FORMATS[formData.format];

  const [success, setSuccess] = useState("");
  const minDate = getTodayDateInputValue();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();
      if (new Date(scheduledDateTime).getTime() < Date.now()) {
        throw new Error("Scheduled time cannot be in the past");
      }

      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${formData.playerA} vs ${formData.playerB}`,
          playerA: formData.playerA,
          playerB: formData.playerB,
          format: formData.format,
          totalFrames: activeFormat.total,
          scheduledTime: scheduledDateTime,
          venue: formData.venue,
          umpireId: formData.umpireId,
          streamUrl: formData.streamUrl,
          thumbnailUrl: formData.thumbnailUrl
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create match");

      let successMsg = "Match created successfully!";
      if (formData.umpireId) {
        if (data.mailSent) {
          successMsg += " Assignment email sent to umpire.";
        } else if (data.mailSent === false) {
          successMsg += ` (Note: Umpire email failed: ${data.mailError})`;
        }
      }

      setSuccess(successMsg);

      setTimeout(() => {
        router.push("/admin/matches");
        router.refresh();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <Link href="/admin/matches" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 text-sm font-medium mb-4 transition-colors w-fit">
            <ArrowLeft size={16} /> Back to Matches
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Schedule New Match</h1>
          <p className="text-zinc-400 text-sm">Configure players, format, and assign an umpire.</p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-lg mb-6 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
          
          {/* Section 1: Match Participants */}
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <User size={18} className="text-emerald-500" /> Match Participants
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-4 relative">
              <div className="w-full space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Player A <RequiredMark /></label>
                <select
                  required
                  value={formData.playerA}
                  onChange={(e) => setFormData({ ...formData, playerA: e.target.value })}
                  className="w-full appearance-none rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                >
                  <option value="">Select registered player</option>
                  {players.filter((player) => player.name !== formData.playerB).map((player) => (
                    <option key={player._id} value={player.name}>
                      {player.name}{player.country ? ` • ${player.country}` : ""}{player.rank ? ` • Rank ${player.rank}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 mt-5 z-10 md:absolute md:left-1/2 md:-translate-x-1/2 md:top-[22px]">
                VS
              </div>

              <div className="w-full space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Player B <RequiredMark /></label>
                <select
                  required
                  value={formData.playerB}
                  onChange={(e) => setFormData({ ...formData, playerB: e.target.value })}
                  className="w-full appearance-none rounded-lg border border-zinc-800 bg-[#09090b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-emerald-500"
                >
                  <option value="">Select registered player</option>
                  {players.filter((player) => player.name !== formData.playerA).map((player) => (
                    <option key={player._id} value={player.name}>
                      {player.name}{player.country ? ` • ${player.country}` : ""}{player.rank ? ` • Rank ${player.rank}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Players must be created first in the player manager before they can be assigned to a match.
              <Link href="/admin/players/create" className="ml-2 text-emerald-500 hover:text-emerald-400">
                Create player
              </Link>
            </p>
          </div>

          {/* Section 2: Match Format */}
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <Trophy size={18} className="text-emerald-500" /> Match Format
            </h2>
            <div className="flex flex-col md:flex-row items-end gap-6">
              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Format Template <RequiredMark /></label>
                <select 
                  required
                  value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value as any})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
                >
                  {Object.entries(FORMATS).map(([key, data]) => (
                    <option key={key} value={key}>{data.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-8 px-6 py-3 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-400 h-[46px]">
                <span>Total Frames: <strong className="text-white">{activeFormat.total}</strong></span>
                <span>To Win: <strong className="text-emerald-500">{activeFormat.win}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Venue */}
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <CalendarDays size={18} className="text-emerald-500" /> Schedule & Venue
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Date <RequiredMark /></label>
                <input 
                  type="date" required min={minDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors [color-scheme:dark]" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Time (Local) <RequiredMark /></label>
                <input 
                  type="time" required value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors [color-scheme:dark]" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Venue <RequiredMark /></label>
                <input 
                  type="text" required value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})}
                  placeholder="e.g. Crucible Theatre" 
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" 
                />
              </div>
            </div>
          </div>

          {/* Section 4: Administration */}
          <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6">
            <h2 className="text-white font-medium flex items-center gap-2 mb-6">
              <ShieldCheck size={18} className="text-emerald-500" /> Administration
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400 flex items-center gap-1">Assign Umpire <RequiredMark /></label>
                <select 
                  required
                  value={formData.umpireId} onChange={(e) => setFormData({...formData, umpireId: e.target.value})}
                  className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="">-- Select Umpire --</option>
                  {umpires.map((umpire) => (
                    <option key={umpire._id} value={umpire._id}>
                      {umpire.name} ({umpire.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Stream URL (Optional)</label>
                <div className="relative">
                  <Video size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="url" value={formData.streamUrl} onChange={(e) => setFormData({...formData, streamUrl: e.target.value})}
                    placeholder="https://youtube.com/watch?v=..." 
                    className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" 
                  />
                </div>
              </div>

              {/* Thumbnail Section — URL or Device Upload */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-400">Match Thumbnail (Optional)</label>
                  {/* Toggle between URL and Upload modes */}
                  <div className="flex items-center gap-1 bg-[#09090b] border border-zinc-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setUploadMode("url")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        uploadMode === "url" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Link2 size={12} /> Paste URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("file")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                        uploadMode === "file" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Upload size={12} /> Upload Photo
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  {/* Left: Input area */}
                  <div className="flex-1">
                    {uploadMode === "url" ? (
                      /* URL Input */
                      <div className="relative">
                        <Image size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="url"
                          value={formData.thumbnailUrl}
                          onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                          placeholder="https://example.com/match-image.jpg"
                          className="w-full bg-[#09090b] border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
                        />
                      </div>
                    ) : (
                      /* Drag-and-drop / file picker area */
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                          dragOver
                            ? "border-emerald-500 bg-emerald-500/5"
                            : "border-zinc-700 bg-[#09090b] hover:border-zinc-500"
                        }`}
                      >
                        {uploading ? (
                          <>
                            <span className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-zinc-400">Uploading…</span>
                          </>
                        ) : (
                          <>
                            <Upload size={22} className="text-zinc-500" />
                            <span className="text-xs text-zinc-400">Drag & drop image here, or</span>
                            <label className="text-xs font-semibold text-emerald-500 hover:text-emerald-400 cursor-pointer underline underline-offset-2">
                              Browse from device
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(file);
                                }}
                              />
                            </label>
                            <span className="text-[10px] text-zinc-600">JPG, PNG, WebP · Max 5MB</span>
                          </>
                        )}
                      </div>
                    )}
                    {uploadError && <p className="text-xs text-red-400 mt-1.5">{uploadError}</p>}
                  </div>

                  {/* Right: Live Preview */}
                  {formData.thumbnailUrl ? (
                    <div className="relative w-full md:w-48 h-28 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0 group">
                      <img
                        src={formData.thumbnailUrl}
                        alt="Thumbnail preview"
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      {/* Clear button */}
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, thumbnailUrl: "" })}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full md:w-48 h-28 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/50 flex items-center justify-center flex-shrink-0">
                      <div className="text-center">
                        <Image size={20} className="mx-auto text-zinc-700 mb-1" />
                        <span className="text-[10px] text-zinc-600">Preview</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-zinc-600">This image will appear in match cards and the hero carousel on the homepage.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-500"><RequiredMark /> Required fields</p>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-4 pt-2">
            <Link href="/admin/matches" className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Match
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

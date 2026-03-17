"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Mail, User, KeyRound } from "lucide-react";

export default function RegisterUmpirePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({ name: "", email: "", password: "" }); // <-- Added password

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/umpires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register umpire");

      router.push("/admin/umpires");
      router.refresh();
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8">
          <Link href="/admin/umpires" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 text-sm font-medium mb-4 transition-colors w-fit">
            <ArrowLeft size={16} /> Back to Directory
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Register Umpire</h1>
          <p className="text-zinc-400 text-sm">Add a new official referee to the platform. They will use these credentials to access the Umpire Dashboard.</p>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#18181b] border border-zinc-800/50 rounded-xl p-6 shadow-xl space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
              <User size={14} className="text-emerald-500" /> Full Name
            </label>
            <input 
              type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g. John Smith" 
              className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
              <Mail size={14} className="text-blue-500" /> Official Email Address
            </label>
            <input 
              type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="e.g. john@snookerstream.com" 
              className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" 
            />
          </div>

          {/* NEW PASSWORD FIELD */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 flex items-center gap-2">
              <KeyRound size={14} className="text-orange-500" /> Login Password
            </label>
            <input 
              type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Minimum 6 characters" 
              className="w-full bg-[#09090b] border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors" 
            />
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-4">
            <Link href="/admin/umpires" className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 transition-colors">
              Cancel
            </Link>
            <button 
              type="submit" disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <UserPlus size={16} /> Register Official
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
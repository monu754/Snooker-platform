"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { User, Mail, Lock, CheckCircle, AlertCircle, ArrowLeft, Camera, Loader2 } from "lucide-react";

type ProfileMeta = {
  createdAt: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [name, setName] = useState(session?.user?.name || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [profileMeta, setProfileMeta] = useState<ProfileMeta | null>(null);

  useEffect(() => {
    setName(session?.user?.name || "");
  }, [session?.user?.name]);

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/user/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfileMeta({
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          });
        }
      })
      .catch(() => {});
  }, [session?.user]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-zinc-700 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-zinc-500">Please sign in to view your profile.</p>
          <Link href="/login" className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Update failed");

      setMessage({ type: "success", text: "Profile updated successfully!" });
      setPassword("");
      setConfirmPassword("");
      setProfileMeta((prev) => prev ? { ...prev, updatedAt: new Date().toISOString() } : prev);
      
      // Update the session in real-time
      await update({ ...session, user: { ...session.user, name } });
      
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-emerald-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="h-16 md:h-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 flex items-center px-4 md:px-8 sticky top-0 z-50">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 group text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
            <span className="text-sm font-medium hidden sm:inline">Back to Home</span>
            <span className="text-sm font-medium sm:hidden">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="font-bold text-base md:text-lg tracking-tight">Account <span className="text-emerald-500">Settings</span></span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar / User Info */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
              <div className="relative w-24 h-24 mx-auto mb-4 group text-center">
                <div className="w-full h-full rounded-2xl bg-zinc-800 flex items-center justify-center border-2 border-zinc-700 group-hover:border-emerald-500 transition-colors">
                  {session.user?.image ? (
                    <img src={session.user.image} alt={session.user.name || "User"} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <User size={40} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                  )}
                </div>
                <button className="absolute -bottom-2 -right-2 bg-emerald-600 hover:bg-emerald-500 p-2 rounded-lg shadow-lg border border-emerald-400/20 transition-all active:scale-95">
                  <Camera size={16} />
                </button>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold">{session.user?.name}</h2>
                <p className="text-zinc-500 text-sm font-medium">{session.user?.email}</p>
                <div className="mt-4 flex justify-center">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                    {(session.user as any)?.role || "User"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Account Stats</h3>
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Member Since</span>
                  <span className="text-zinc-300">
                    {profileMeta?.createdAt
                      ? new Date(profileMeta.createdAt).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                      : "Loading..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Updated</span>
                  <span className="text-emerald-500">
                    {profileMeta?.updatedAt
                      ? new Date(profileMeta.updatedAt).toLocaleDateString([], {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                        })
                      : "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 backdrop-blur-sm relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-bold mb-6">Profile Details</h3>
                
                {message.text && (
                  <div className={`mb-8 p-4 rounded-xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium text-sm">{message.text}</span>
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative group">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-12 py-3.5 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                        placeholder="Your Name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative opacity-60">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="email" 
                        value={session.user?.email || ""}
                        disabled
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-12 py-3.5 cursor-not-allowed outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-600 ml-1">Email cannot be changed.</p>
                  </div>

                  <hr className="border-zinc-800 my-8" />

                  <div className="space-y-4">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Lock size={20} className="text-emerald-500" />
                      Security
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">New Password</label>
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                        <input 
                          type="password" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={`w-full bg-zinc-950 border rounded-xl px-4 py-3.5 outline-none transition-all placeholder:text-zinc-700 ${confirmPassword && password !== confirmPassword ? 'border-red-500/50' : 'border-zinc-800 focus:border-emerald-500'}`}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-600 ml-1">Leave blank if you don't want to change your password.</p>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-4">
                    <Link href="/" className="text-zinc-500 hover:text-white font-medium text-sm transition-colors">
                      Discard Changes
                    </Link>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-3 min-w-[160px] justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Profile"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

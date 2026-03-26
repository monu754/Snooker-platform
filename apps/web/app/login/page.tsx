"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, Activity, AlertCircle, ArrowLeft, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [googleAuthEnabled, setGoogleAuthEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setMaintenanceMode(Boolean(data.maintenanceMode));
        setGoogleAuthEnabled(Boolean(data.googleAuthEnabled));
      })
      .catch(() => {
        setMaintenanceMode(false);
        setGoogleAuthEnabled(false);
      })
      .finally(() => {
        setSettingsLoaded(true);
      });
  }, []);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Call NextAuth's Credentials provider
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // We handle the redirect manually so we can check for errors
    });

    if (res?.error) {
      setError("Invalid email or password.");
      setLoading(false);
    } else {
      // Success! Next.js will auto-read their role from the session.
      // Send them to the homepage (or we can route based on role later)
      router.push("/"); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#121214] border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl relative z-10">
        {/* Back to Home Link */}
        <Link href="/" className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>

        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 mt-2">
            <Activity className="text-emerald-500" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">System Login</h1>
          <p className="text-zinc-400 text-sm">Sign in to access your platform dashboard.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {settingsLoaded && maintenanceMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-lg mb-6 text-sm">
            Maintenance mode is active. Viewer access is blocked right now. Admins and umpires can still sign in with credentials.
          </div>
        )}

        {/* Umpire / Admin Credentials Form */}
        <form onSubmit={handleCredentialsLogin} className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="official@snookerstream.com" 
                className="w-full bg-[#09090b] border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full bg-[#09090b] border border-zinc-800 rounded-xl pl-10 pr-12 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex justify-center items-center h-[48px] cursor-pointer"
          >
            {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : "Sign In with Email"}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-6">
          <div className="absolute w-full border-t border-zinc-800"></div>
          <span className="bg-[#121214] px-4 text-xs text-zinc-500 relative font-medium uppercase tracking-widest">Or</span>
        </div>

        {/* Normal User Google Auth */}
        <button 
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          disabled={maintenanceMode || !googleAuthEnabled}
          className="w-full bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleAuthEnabled ? "Continue with Google" : "Google Sign-In Unavailable"}
        </button>

        <div className="mt-6 text-center text-sm text-zinc-400">
          Not a registered user?{' '}
          {maintenanceMode ? (
            <span className="text-zinc-500">Registration is temporarily unavailable</span>
          ) : (
            <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
              Register for access
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

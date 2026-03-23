"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMatch = password === confirmPassword;
  const isConfirmDirty = confirmPassword.length > 0;
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setRegistrationAllowed(data.allowRegistration !== false);
        setMaintenanceMode(Boolean(data.maintenanceMode));
      })
      .catch(() => {
        setRegistrationAllowed(true);
        setMaintenanceMode(false);
      })
      .finally(() => {
        setSettingsLoaded(true);
      });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (maintenanceMode) {
      setError("Registration is temporarily unavailable during maintenance mode.");
      return;
    }
    if (!registrationAllowed) {
      setError("Registration is currently disabled by the administrator.");
      return;
    }
    if (!passwordsMatch) return;
    
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Success! Auto-login using the credentials provider
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/",
      });
      
      if (signInRes?.error) {
        setError("Account created but auto-login failed. Please sign in.");
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10">
        {/* Back to Home Link */}
        <Link href="/" className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>

        <div className="text-center mb-8 mt-2">
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create Account</h1>
          <p className="text-zinc-400 text-sm">Join the ultimate snooker streaming community</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {settingsLoaded && maintenanceMode && (
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm text-center">
            Registration is temporarily unavailable during maintenance mode.
          </div>
        )}

        {settingsLoaded && !maintenanceMode && !registrationAllowed && (
          <div className="mb-6 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-sm text-center">
            New registrations are currently paused.
          </div>
        )}

        <form className="space-y-4" onSubmit={handleRegister}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="name">Full Name</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Judd Trump" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="judd@example.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-emerald-500 transition-all" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white pr-12 focus:border-emerald-500 transition-all" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300" htmlFor="confirm-password">Confirm Password</label>
            <div className="relative">
              <input id="confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-zinc-950 border rounded-lg px-4 py-3 text-white pr-12 transition-all ${isConfirmDirty && !passwordsMatch ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-emerald-500'}`} required />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {isConfirmDirty && !passwordsMatch && <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>}
          </div>
          <button type="submit" disabled={(!passwordsMatch && isConfirmDirty) || loading || !registrationAllowed || maintenanceMode} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white font-semibold rounded-lg px-4 py-3 transition-colors duration-200 cursor-pointer flex justify-center items-center">
            {loading ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span> : "Create Account"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-zinc-800 flex-1"></div><span className="text-zinc-500 text-sm">or</span><div className="h-px bg-zinc-800 flex-1"></div>
        </div>

        <button type="button" disabled={!registrationAllowed || maintenanceMode} onClick={() => signIn("google", { callbackUrl: "/" })} className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold rounded-lg px-4 py-3 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors duration-200 cursor-pointer">
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          Sign up with Google
        </button>
        <p className="mt-8 text-center text-sm text-zinc-400">Already have an account? <Link href="/login" className="text-emerald-500 font-medium hover:text-emerald-400">Sign in</Link></p>
      </div>
    </div>
  );
}

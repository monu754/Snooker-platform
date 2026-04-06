"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Home } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react"; 

export default function UmpireLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-sans">
      <header className="bg-[#121214] border-b border-zinc-800/80">
        <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
        <Link href="/umpire" className="flex items-center gap-2 text-blue-500 hover:opacity-80 transition-opacity">
          <ShieldCheck size={24} />
          <span className="font-bold text-lg text-white tracking-wide">Umpire<span className="text-zinc-500 font-medium">Panel</span></span>
        </Link>
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-sm text-zinc-400">
            Logged in as: <strong className="text-white">{hasMounted ? (session?.user?.name || "Official") : "Official"}</strong>
          </span>
          <div className="hidden h-6 w-px bg-zinc-800 sm:block"></div>
          
          {/* Route to main App Home */}
          <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium cursor-pointer"
          >
            <Home size={16} /> Home Page
          </Link>
        </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

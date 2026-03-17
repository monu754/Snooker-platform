"use client";

import { ShieldCheck, Home } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react"; 

export default function UmpireLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col font-sans">
      <header className="h-16 bg-[#121214] border-b border-zinc-800/80 flex items-center justify-between px-6">
        <Link href="/umpire" className="flex items-center gap-2 text-blue-500 hover:opacity-80 transition-opacity">
          <ShieldCheck size={24} />
          <span className="font-bold text-lg text-white tracking-wide">Umpire<span className="text-zinc-500 font-medium">Panel</span></span>
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            Logged in as: <strong className="text-white">{session?.user?.name || "Official"}</strong>
          </span>
          <div className="w-px h-6 bg-zinc-800"></div>
          
          {/* Route to main App Home */}
          <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium cursor-pointer"
          >
            <Home size={16} /> Home Page
          </Link>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
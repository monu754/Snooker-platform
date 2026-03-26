"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Swords, Users, ShieldCheck, Video, Settings, LogOut, Menu, Trophy, GitBranchPlus, Activity } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { href: "/admin", icon: <LayoutDashboard size={20} />, label: "Dashboard", exact: true },
    { href: "/admin/matches", icon: <Swords size={20} />, label: "Match Manager" },
    { href: "/admin/players", icon: <Trophy size={20} />, label: "Player Directory" },
    { href: "/admin/brackets", icon: <GitBranchPlus size={20} />, label: "Brackets" },
    { href: "/admin/umpires", icon: <ShieldCheck size={20} />, label: "Umpire Manager" },
    { href: "/admin/users", icon: <Users size={20} />, label: "User Manager" },
    { href: "/admin/streaming", icon: <Video size={20} />, label: "Streaming Control" },
    { href: "/admin/settings", icon: <Settings size={20} />, label: "Platform Settings" },
    { href: "/admin/observability", icon: <Activity size={20} />, label: "Observability" },
  ];

  const SidebarContent = () => (
    <>
      <Link
        href="/"
        className="h-16 flex items-center px-6 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors shrink-0"
        onClick={() => setSidebarOpen(false)}
      >
        <div className="flex items-center gap-2 text-emerald-500">
          <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          <span className="font-bold text-lg text-white tracking-wide">SnookerAdmin</span>
        </div>
      </Link>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                isActive ? "bg-emerald-500/10 text-emerald-400 font-medium" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800 shrink-0">
        <Link
          href="/"
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors w-full px-2 py-2 rounded-md hover:bg-zinc-800/50"
        >
          <LogOut size={20} />
          <span className="font-medium">Exit Admin</span>
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: always visible, Mobile: slide-in drawer */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#121214] border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-4 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-zinc-400 hover:text-white transition-colors p-2 -ml-2"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-white">SnookerAdmin</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
          {children}
        </main>
      </div>
    </div>
  );
}

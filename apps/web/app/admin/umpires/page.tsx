"use client";

import { useState, useEffect } from "react";
import Link from "next/link"; // <-- THIS IS THE MISSING IMPORT!
import { UserPlus, Shield } from "lucide-react";

export default function UmpireManagerPage() {
  const [umpires, setUmpires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/umpires")
      .then(res => res.json())
      .then(data => {
        setUmpires(data.umpires || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 font-sans">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Umpire Directory</h1>
          <p className="text-zinc-400">Manage official referees and their system access.</p>
        </div>
        <Link href="/admin/umpires/create" className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20">
          <UserPlus size={18} /> Register Umpire
        </Link>
      </header>

      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#09090b] text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Umpire Name</th>
                <th className="px-6 py-4 font-semibold">Email Account</th>
                <th className="px-6 py-4 font-semibold">Clearance Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {loading ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">Loading umpires...</td></tr>
              ) : umpires.length === 0 ? (
                 <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">No umpires registered yet.</td></tr>
              ) : (
                umpires.map((umpire) => (
                  <tr key={umpire._id} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-500 font-bold uppercase">
                        {umpire.name.charAt(0)}
                      </div> 
                      {umpire.name}
                    </td>
                    <td className="px-6 py-4 text-zinc-400">{umpire.email}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-blue-400 bg-blue-500/10 w-max px-3 py-1 rounded-full border border-blue-500/20 text-xs font-bold uppercase tracking-wide">
                        <Shield size={12}/> Verified Official
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
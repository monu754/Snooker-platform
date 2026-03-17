"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Activity, Trash2, ShieldAlert } from "lucide-react";

export default function SystemLogsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = () => {
    fetch("/api/admin/events")
      .then(res => res.json())
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to delete ALL system logs? This action cannot be undone.")) return;
    await fetch("/api/admin/events", { method: "DELETE" });
    fetchEvents(); // Refresh the table to show it's empty
  };

  return (
    <div className="p-8 font-sans max-w-6xl mx-auto">
      <header className="mb-8">
        <Link href="/admin" className="text-emerald-500 hover:text-emerald-400 flex items-center gap-2 text-sm font-medium mb-4 transition-colors w-fit">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">System Logs</h1>
            <p className="text-zinc-400">Complete audit trail of all platform actions and match events.</p>
          </div>
          <button onClick={handleClearLogs} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm">
            <Trash2 size={16} /> Clear All Logs
          </button>
        </div>
      </header>

      <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#09090b] text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Event Type</th>
                <th className="px-6 py-4 font-semibold">Action / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
              {loading ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">Loading system logs...</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-zinc-500">No events logged in the system.</td></tr>
              ) : (
                events.map((event) => {
                  const isAlert = event.eventType === "foul" || event.eventType === "system_alert";
                  return (
                    <tr key={event._id} className="hover:bg-zinc-800/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-400">
                        {new Date(event.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1.5 w-max px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${isAlert ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                           {isAlert ? <ShieldAlert size={12}/> : <Activity size={12}/>}
                           {event.eventType.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-white">
                        {event.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
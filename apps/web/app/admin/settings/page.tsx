"use client";

import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, AlertCircle, RefreshCw, PowerOff, UserPlus, Megaphone } from "lucide-react";

interface SettingsData {
  maintenanceMode: boolean;
  globalAnnouncement: string;
  allowRegistration: boolean;
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      const data = await res.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      setSuccessMsg("Settings updated successfully.");
      
      // Auto clear success message
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center items-center h-full"><RefreshCw className="animate-spin text-zinc-500" size={32} /></div>;

  return (
    <div className="p-8 font-sans max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
          <SettingsIcon className="text-purple-500" size={28} />
          Platform Settings
        </h1>
        <p className="text-zinc-400">Global configurations, maintenance toggles, and system-wide announcements.</p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Main Toggles Section */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-zinc-800/50 bg-[#09090b]">
            <h2 className="text-lg font-bold text-white leading-tight">Access Control</h2>
            <p className="text-xs text-zinc-500 mt-1">Manage system availability and user onboarding.</p>
          </div>
          
          <div className="p-6 space-y-6">
            <ToggleOption 
              icon={<PowerOff size={20} className={settings?.maintenanceMode ? "text-orange-500" : "text-zinc-400"} />}
              title="Maintenance Mode"
              description="Temporarily disable public access. Only Admins and Umpires can log in."
              enabled={settings?.maintenanceMode || false}
              onChange={(val: boolean) => setSettings(prev => prev ? { ...prev, maintenanceMode: val } : null)}
              isActiveDanger={true}
            />
            
            <div className="h-px bg-zinc-800/50 w-full"></div>

            <ToggleOption 
              icon={<UserPlus size={20} className={settings?.allowRegistration ? "text-emerald-500" : "text-zinc-400"} />}
              title="Allow User Registration"
              description="Enable or disable the public registration page for new viewers."
              enabled={settings?.allowRegistration || false}
              onChange={(val: boolean) => setSettings(prev => prev ? { ...prev, allowRegistration: val } : null)}
            />
          </div>
        </div>

        {/* Messaging Section */}
        <div className="bg-[#18181b] border border-zinc-800/50 rounded-xl overflow-hidden shadow-lg">
          <div className="p-5 border-b border-zinc-800/50 bg-[#09090b]">
            <h2 className="text-lg font-bold text-white leading-tight">System Announcements</h2>
            <p className="text-xs text-zinc-500 mt-1">Broadcast important platform messages to all active viewers.</p>
          </div>
          
          <div className="p-6">
            <div className="flex gap-3 items-start mb-2">
               <div className="p-2 bg-blue-500/10 rounded-lg"><Megaphone size={20} className="text-blue-500" /></div>
               <div className="flex-1">
                 <label className="text-sm font-semibold text-zinc-300 block mb-2">Global Banner Text</label>
                 <textarea 
                   rows={3}
                   value={settings?.globalAnnouncement || ""}
                   onChange={(e) => setSettings(prev => prev ? { ...prev, globalAnnouncement: e.target.value } : null)}
                   placeholder="Enter a message to display at the top of the viewer interface... (Leave blank to hide)"
                   className="w-full bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                 />
                 <p className="text-xs text-zinc-500 mt-2">Visible globally across all match spectator views.</p>
               </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button 
            type="submit"
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-lg shadow-purple-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>

      </form>
    </div>
  );
}

// Helper Component
function ToggleOption({ icon, title, description, enabled, onChange, isActiveDanger = false }: any) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex gap-4">
        <div className="mt-1">{icon}</div>
        <div>
           <h3 className={`font-medium ${enabled && isActiveDanger ? 'text-orange-400' : 'text-zinc-200'}`}>{title}</h3>
           <p className="text-sm text-zinc-500 mt-1 max-w-lg">{description}</p>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? (isActiveDanger ? 'bg-orange-500' : 'bg-emerald-500') : 'bg-zinc-800'}`}
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'left-7' : 'left-1'}`}></div>
      </button>
    </div>
  );
}
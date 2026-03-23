"use client";

import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";
import { getPusherClient } from "../lib/pusher";

export default function GlobalAnnouncement() {
  const [announcement, setAnnouncement] = useState<string>("");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // 1. Fetch initial settings
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setAnnouncement(data.globalAnnouncement || "");
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };

    fetchSettings();

    // 2. Setup Pusher for real-time updates
    const pusher = getPusherClient();
    const channel = pusher.subscribe("platform-settings");
    channel.bind("settings-updated", (data: any) => {
      setAnnouncement(data.globalAnnouncement || "");
      if (data.globalAnnouncement) {
        setIsVisible(true);
      }
    });

    return () => {
      pusher.unsubscribe("platform-settings");
    };
  }, []);

  if (!announcement || !isVisible) return null;

  return (
    <div className="bg-emerald-600/90 backdrop-blur-md text-white border-b border-emerald-500/30 relative z-[9999]">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-2.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-full shrink-0">
            <Megaphone size={14} className="text-white" />
          </div>
          <p className="text-sm md:text-base font-bold tracking-tight">
            {announcement}
          </p>
        </div>
        
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
          aria-label="Close announcement"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

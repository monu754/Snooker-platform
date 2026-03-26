"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";

export default function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      setIsVisible(offline);
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[60] border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-200 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-2">
          {isOffline ? <WifiOff size={16} /> : <Wifi size={16} />}
          <span>You are offline. SnookerStream is showing the most recent cached pages and data it has available.</span>
        </div>
        <Link href="/offline" className="shrink-0 text-xs font-semibold text-amber-100 underline underline-offset-4">
          Offline help
        </Link>
      </div>
    </div>
  );
}

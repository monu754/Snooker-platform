"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});

      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("snookerstream-"))
              .map((key) => caches.delete(key)),
          ),
        )
        .catch(() => {});

      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return <SessionProvider>{children}</SessionProvider>;
}

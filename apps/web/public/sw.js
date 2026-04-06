const CACHE_NAME = "snookerstream-v3";
const CORE_CACHE = "snookerstream-core-v3";
const API_CACHE = "snookerstream-api-v3";
const PAGE_CACHE = "snookerstream-pages-v3";
const STATIC_CACHE = "snookerstream-static-v3";
const CORE_ASSETS = ["/", "/offline", "/manifest.webmanifest", "/icon"];
const STATIC_DESTINATIONS = new Set(["style", "script", "image", "font"]);
const PUBLIC_PAGE_PREFIXES = ["/watch/", "/players", "/analytics", "/vod", "/multi-stream", "/offline"];
const PUBLIC_API_PREFIXES = [
  "/api/matches",
  "/api/players",
  "/api/analytics/players",
  "/api/vod",
  "/api/settings",
  "/api/partner/live",
];
const DENYLIST_PREFIXES = ["/api/auth", "/api/push", "/api/subscription", "/api/user", "/api/admin", "/admin", "/umpire", "/profile", "/login", "/register"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![CORE_CACHE, API_CACHE, PAGE_CACHE, STATIC_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const title = payload.title || "SnookerStream alert";
  const options = {
    body: payload.body || "",
    data: {
      url: payload.url || "/",
    },
    tag: payload.tag || "snooker-alert",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (DENYLIST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (STATIC_DESTINATIONS.has(request.destination) || CORE_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  const canCachePage = url.pathname === "/" || PUBLIC_PAGE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  if (!canCachePage) {
    return fetch(request);
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return (await caches.match("/offline")) || Response.error();
  }
}

async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response(JSON.stringify({ success: false, offline: true, error: "Offline and no cached data available." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

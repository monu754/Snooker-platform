export type StreamEmbedConfig =
  | { type: "youtube" | "twitch" | "iframe"; embedUrl: string }
  | { type: "video"; embedUrl: string };

function normalizeHostname(rawHostname = "localhost") {
  return rawHostname.split(":")[0] || "localhost";
}

function extractYouTubeVideoId(parsedUrl: URL) {
  const hostname = parsedUrl.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (hostname === "youtu.be") {
    return parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
  }

  if (!hostname.endsWith("youtube.com") && hostname !== "youtube-nocookie.com") {
    return "";
  }

  if (parsedUrl.searchParams.get("v")) {
    return parsedUrl.searchParams.get("v") || "";
  }

  const segments = parsedUrl.pathname.split("/").filter(Boolean);
  const embedIndex = segments.findIndex((segment) => ["embed", "shorts", "live", "v"].includes(segment));

  if (embedIndex >= 0) {
    return segments[embedIndex + 1] || "";
  }

  return "";
}

export function getStreamEmbed(url: string, hostname = "localhost", autoplay = false): StreamEmbedConfig | null {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) {
    return null;
  }

  const normalizedHostname = normalizeHostname(hostname);

  try {
    const parsedUrl = new URL(normalizedUrl);
    const youtubeVideoId = extractYouTubeVideoId(parsedUrl);
    if (/^[A-Za-z0-9_-]{11}$/.test(youtubeVideoId)) {
      const query = new URLSearchParams({
        autoplay: autoplay ? "1" : "0",
        mute: "1",
        playsinline: "1",
        rel: "0",
        modestbranding: "1",
      });

      return {
        type: "youtube",
        embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeVideoId}?${query.toString()}`,
      };
    }

    if (parsedUrl.hostname.replace(/^www\./, "").endsWith("twitch.tv")) {
      const segments = parsedUrl.pathname.split("/").filter(Boolean);
      const channel = segments[0];
      if (channel && channel !== "videos" && channel !== "directory") {
        const query = new URLSearchParams({
          channel,
          parent: normalizedHostname,
          autoplay: autoplay ? "true" : "false",
          muted: "true",
        });

        return {
          type: "twitch",
          embedUrl: `https://player.twitch.tv/?${query.toString()}`,
        };
      }
    }
  } catch {
    if (normalizedUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
      return { type: "video", embedUrl: normalizedUrl };
    }

    return { type: "iframe", embedUrl: normalizedUrl };
  }

  if (normalizedUrl.match(/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i)) {
    return { type: "video", embedUrl: normalizedUrl };
  }

  return { type: "iframe", embedUrl: normalizedUrl };
}

export function getEmbedUrl(url: string, hostname = "localhost"): string {
  return getStreamEmbed(url, hostname)?.embedUrl || "";
}

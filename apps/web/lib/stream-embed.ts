export function getEmbedUrl(url: string, hostname = "localhost"): string {
  const normalizedUrl = url.trim();
  const youtubeMatch = normalizedUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=0&mute=1&playsinline=1&rel=0&modestbranding=1`;
  if (normalizedUrl.includes("youtube.com/embed/")) return normalizedUrl;
  const twitchChannel = normalizedUrl.match(/twitch\.tv\/([^"&?/\s]+)/);
  if (twitchChannel) {
    return `https://player.twitch.tv/?channel=${twitchChannel[1]}&parent=${hostname}&autoplay=true&muted=true`;
  }
  return normalizedUrl;
}

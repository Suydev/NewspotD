export type UrlKind =
  | "spotify-track"
  | "spotify-playlist"
  | "spotify-album"
  | "spotify-episode"
  | "youtube-video"
  | "youtube-playlist"
  | "youtube-shorts"
  | "podcast"
  | "unknown";

export interface ParsedUrl {
  kind: UrlKind;
  id: string;
  raw: string;
}

export function parseUrl(raw: string): ParsedUrl {
  const url = raw.trim();

  if (url.includes("spotify.com") || url.startsWith("spotify:")) {
    for (const kind of ["track", "episode", "playlist", "album", "show"] as const) {
      if (url.includes(`/${kind}/`) || url.includes(`spotify:${kind}:`)) {
        const id = url.includes(`/${kind}/`)
          ? url.split(`/${kind}/`)[1]?.split(/[/?#]/)[0] ?? ""
          : url.split(`spotify:${kind}:`)[1]?.split(/[/?#]/)[0] ?? "";
        const mapped: UrlKind =
          kind === "episode" ? "spotify-episode" :
          kind === "show" ? "podcast" :
          (`spotify-${kind}` as UrlKind);
        return { kind: mapped, id, raw: url };
      }
    }
  }

  if (
    url.includes("youtube.com") ||
    url.includes("youtu.be") ||
    url.includes("music.youtube.com")
  ) {
    if (url.includes("/shorts/")) {
      const id = url.split("/shorts/")[1]?.split(/[/?#]/)[0] ?? "";
      return { kind: "youtube-shorts", id, raw: url };
    }
    if (url.includes("list=")) {
      const id = url.match(/[?&]list=([^&]+)/)?.[1] ?? "";
      return { kind: "youtube-playlist", id, raw: url };
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split(/[/?#]/)[0] ?? "";
      return { kind: "youtube-video", id, raw: url };
    }
    if (url.includes("watch?v=") || url.includes("watch?")) {
      const id = url.match(/[?&]v=([^&]+)/)?.[1] ?? "";
      return { kind: "youtube-video", id, raw: url };
    }
  }

  if (url.match(/\.(rss|xml|feed)/i) || url.includes("feeds.") || url.includes("/feed")) {
    return { kind: "podcast", id: url, raw: url };
  }

  return { kind: "unknown", id: "", raw: url };
}

export function getUrlLabel(kind: UrlKind): string {
  switch (kind) {
    case "spotify-track": return "Spotify Track";
    case "spotify-playlist": return "Spotify Playlist";
    case "spotify-album": return "Spotify Album";
    case "spotify-episode": return "Spotify Podcast Episode";
    case "youtube-video": return "YouTube Video";
    case "youtube-playlist": return "YouTube Playlist";
    case "youtube-shorts": return "YouTube Short";
    case "podcast": return "Podcast";
    default: return "Unknown URL";
  }
}

export function isSpotify(kind: UrlKind) {
  return kind.startsWith("spotify-");
}
export function isYouTube(kind: UrlKind) {
  return kind.startsWith("youtube-");
}
export function isPodcast(kind: UrlKind) {
  return kind === "podcast" || kind === "spotify-episode";
}

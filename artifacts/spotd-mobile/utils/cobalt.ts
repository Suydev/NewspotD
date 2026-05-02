import { getAudioStreamUrl } from "./invidious";

export type AudioQuality = "128" | "192" | "320" | "flac";
export type VideoQuality = "360" | "480" | "720" | "1080" | "1440" | "2160" | "4320";

export interface CobaltResult {
  url: string;
  filename: string;
  ext: string;
}

const COBALT_INSTANCES = [
  "https://api.cobalt.tools",
  "https://cobalt-api.ayo.tf",
  "https://cobalt.api.timelessnesses.me",
];

async function tryCobaltInstance(
  instance: string,
  body: object
): Promise<CobaltResult> {
  const res = await fetch(instance, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Cobalt ${res.status}: ${text.slice(0, 120)}`);
  }

  const data = await res.json();

  if (data.status === "error") {
    throw new Error(data.error?.code || "Cobalt error");
  }

  const url = data.url;
  if (!url) throw new Error("No URL in Cobalt response");
  return { url, filename: data.filename || "media", ext: "mp3" };
}

export async function getCobaltAudioUrl(
  youtubeUrl: string,
  bitrate: AudioQuality = "320"
): Promise<CobaltResult> {
  const isFlac = bitrate === "flac";
  const audioFormat = isFlac ? "best" : "mp3";
  const audioBitrate = isFlac ? "320" : bitrate;
  const ext = isFlac ? "webm" : "mp3";

  const body = {
    url: youtubeUrl,
    downloadMode: "audio",
    audioFormat,
    audioBitrate,
  };

  for (const instance of COBALT_INSTANCES) {
    try {
      const result = await tryCobaltInstance(instance, body);
      return { ...result, ext };
    } catch {
    }
  }

  const videoId = youtubeUrl.match(/[?&]v=([^&]+)/)?.[1] ?? youtubeUrl.split("youtu.be/")[1]?.split("?")[0] ?? "";
  if (!videoId) throw new Error("Could not extract video ID for fallback");

  const stream = await getAudioStreamUrl(videoId);
  return {
    url: stream.url,
    filename: `audio.${stream.ext}`,
    ext: stream.ext,
  };
}

export async function getCobaltVideoUrl(
  youtubeUrl: string,
  quality: VideoQuality = "720"
): Promise<CobaltResult> {
  const body = {
    url: youtubeUrl,
    downloadMode: "auto",
    videoQuality: quality,
  };

  for (const instance of COBALT_INSTANCES) {
    try {
      const result = await tryCobaltInstance(instance, body);
      return { ...result, ext: "mp4" };
    } catch {
    }
  }

  const videoId = youtubeUrl.match(/[?&]v=([^&]+)/)?.[1] ?? youtubeUrl.split("youtu.be/")[1]?.split("?")[0] ?? "";
  if (!videoId) throw new Error("Could not get video stream");

  const stream = await getAudioStreamUrl(videoId);
  return { url: stream.url, filename: `video.${stream.ext}`, ext: stream.ext };
}

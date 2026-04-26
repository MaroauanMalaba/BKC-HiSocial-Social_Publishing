export type PlatformFormat = {
  id: string;
  label: string;
  desc: string;
  icon: string;
  maxChars: number;
  mediaRequired?: boolean;
  videoOnly?: boolean;
};

export const PLATFORM_FORMATS: Record<string, PlatformFormat[]> = {
  instagram: [
    { id: "feed",     label: "Feed",      desc: "Bild oder Video · 1:1 / 4:5",   icon: "image",   maxChars: 2200 },
    { id: "reel",     label: "Reel",      desc: "Kurzvideo · 9:16 · max 90s",     icon: "video",   maxChars: 2200, videoOnly: true },
    { id: "story",    label: "Story",     desc: "24h sichtbar · 9:16 Vollbild",   icon: "clock",   maxChars: 0,   mediaRequired: true },
    { id: "carousel", label: "Karussell", desc: "2–10 Bilder zum Wischen",        icon: "grid",    maxChars: 2200 },
  ],
  tiktok: [
    { id: "video",    label: "Video",     desc: "Standard TikTok · bis 10 Min",   icon: "video",   maxChars: 2200, videoOnly: true },
  ],
  youtube: [
    { id: "video",    label: "Video",     desc: "Langformat · 16:9 · unbegrenzt", icon: "video",   maxChars: 5000, videoOnly: true },
    { id: "short",    label: "Short",     desc: "Unter 60s · 9:16 · vertikal",    icon: "bolt",    maxChars: 100,  videoOnly: true },
  ],
  facebook: [
    { id: "feed",     label: "Post",      desc: "Bild, Text oder Video",          icon: "image",   maxChars: 63206 },
    { id: "reel",     label: "Reel",      desc: "Kurzvideo · 9:16 · bis 90s",     icon: "video",   maxChars: 2200, videoOnly: true },
    { id: "story",    label: "Story",     desc: "24h sichtbar · 9:16 Vollbild",   icon: "clock",   maxChars: 0,   mediaRequired: true },
  ],
  linkedin: [
    { id: "post",     label: "Post",      desc: "Text, Bild oder Video",          icon: "message", maxChars: 3000 },
    { id: "article",  label: "Artikel",   desc: "Langer Fachbeitrag",             icon: "folder",  maxChars: 110000 },
    { id: "document", label: "Dokument",  desc: "PDF oder Präsentation",          icon: "upload",  maxChars: 3000 },
  ],
};

export function defaultFormat(platform: string): string {
  return PLATFORM_FORMATS[platform]?.[0]?.id ?? "feed";
}

/** Maps (platform, format) → Zernio platformSpecificData */
export function toZernioSpecific(platform: string, format: string): Record<string, unknown> {
  if (platform === "instagram") {
    if (format === "reel")     return { contentType: "reel" };
    if (format === "story")    return { contentType: "story" };
    if (format === "carousel") return { contentType: "carousel" };
    return {};
  }
  if (platform === "facebook") {
    if (format === "reel")  return { contentType: "reel" };
    if (format === "story") return { contentType: "story" };
    return {};
  }
  if (platform === "youtube") {
    if (format === "short") return { type: "short", isShort: true };
    return {};
  }
  if (platform === "linkedin") {
    if (format === "article")  return { contentType: "article" };
    if (format === "document") return { contentType: "document" };
    return {};
  }
  // tiktok: only video, no extra data needed
  return {};
}

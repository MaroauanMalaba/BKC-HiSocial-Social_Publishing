const BASE = "https://app.ayrshare.com/api";
const API_KEY = process.env.AYRSHARE_API_KEY!;

function headers(profileKey?: string) {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };
  if (profileKey) h["Profile-Key"] = profileKey;
  return h;
}

export async function createProfile(title: string, email: string | null): Promise<string> {
  const res = await fetch(`${BASE}/profiles/profile`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ title, email: email ?? undefined }),
  });
  const json = await res.json();
  if (!json.profileKey) throw new Error(json.message || "Failed to create Ayrshare profile");
  return json.profileKey as string;
}

export async function generateConnectUrl(profileKey: string): Promise<string> {
  const res = await fetch(`${BASE}/profiles/generateJWT`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ profileKey }),
  });
  const json = await res.json();
  if (!json.url) throw new Error(json.message || "Failed to generate connect URL");
  return json.url as string;
}

export type ConnectedPlatform = {
  platform: string;
  display_name?: string;
};

export async function getConnectedPlatforms(profileKey: string): Promise<ConnectedPlatform[]> {
  const res = await fetch(`${BASE}/user`, { headers: headers(profileKey) });
  const json = await res.json();
  if (!Array.isArray(json.platforms)) return [];
  return json.platforms as ConnectedPlatform[];
}

export type AyrsharePostResult = {
  ok: boolean;
  postIds?: Record<string, string>;
  error?: string;
};

export async function postContent(
  profileKey: string,
  options: {
    post: string;
    platforms: string[];
    mediaUrls?: string[];
    scheduleDate?: string;
  }
): Promise<AyrsharePostResult> {
  const body: Record<string, unknown> = {
    post: options.post,
    platforms: options.platforms,
  };
  if (options.mediaUrls?.length) body.mediaUrls = options.mediaUrls;
  if (options.scheduleDate) body.scheduleDate = options.scheduleDate;

  const res = await fetch(`${BASE}/post`, {
    method: "POST",
    headers: headers(profileKey),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json.status === "error") return { ok: false, error: json.message };
  return { ok: true, postIds: json.postIds ?? {} };
}

export type AyrshareAnalytics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
};

export async function getPostAnalytics(
  profileKey: string,
  platform: string,
  postId: string
): Promise<AyrshareAnalytics> {
  const res = await fetch(`${BASE}/analytics/post/${postId}?platforms=${platform}`, {
    headers: headers(profileKey),
  });
  const json = await res.json();
  const d = json?.[platform] ?? {};
  return {
    views: Number(d.impressions ?? d.views ?? d.playCount ?? 0),
    likes: Number(d.likes ?? d.likeCount ?? 0),
    comments: Number(d.comments ?? d.commentCount ?? 0),
    shares: Number(d.shares ?? d.shareCount ?? 0),
    saves: Number(d.saved ?? d.saves ?? 0),
    reach: Number(d.reach ?? 0),
  };
}

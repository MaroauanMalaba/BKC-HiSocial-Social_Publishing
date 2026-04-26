const BASE = "https://zernio.com/api/v1";
const KEY = process.env.ZERNIO_API_KEY!;

function headers(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${KEY}`,
    ...extra,
  };
}

export type ZernioAccount = {
  _id: string;
  platform: string;
  name: string;
  username?: string;
  profilePicture?: string;
  disconnected?: boolean;
};

export type ZernioProfile = {
  _id: string;
  name: string;
};

// --- Profiles ---

export async function getOrCreateZernioProfile(name: string): Promise<string> {
  // Try to create
  const createRes = await fetch(`${BASE}/profiles`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  const createJson = await createRes.json();
  if (createRes.ok && createJson._id) return createJson._id as string;

  // At limit — reuse the first existing profile
  const listRes = await fetch(`${BASE}/profiles`, { headers: headers() });
  const listJson = await listRes.json();
  const profiles = listJson.profiles as ZernioProfile[] | undefined;
  if (profiles?.length) return profiles[0]._id;

  throw new Error(createJson.message || "Failed to get Zernio profile");
}

// --- Account Connection ---

export async function getConnectUrl(
  platform: string,
  profileId: string,
  redirectUrl: string
): Promise<string> {
  const res = await fetch(
    `${BASE}/connect/${platform}?profileId=${encodeURIComponent(profileId)}&redirectUrl=${encodeURIComponent(redirectUrl)}`,
    { headers: headers() }
  );
  const json = await res.json();
  if (!res.ok || !json.authUrl) throw new Error(json.message || "Failed to get connect URL");
  return json.authUrl as string;
}

export async function getConnectedAccounts(profileId: string): Promise<ZernioAccount[]> {
  const res = await fetch(`${BASE}/accounts?profileId=${profileId}`, {
    headers: headers(),
  });
  const json = await res.json();
  if (!res.ok) return [];
  return (json.accounts ?? json ?? []) as ZernioAccount[];
}

// --- Posting ---

export type ZernioPostOptions = {
  profileId: string;
  content: string;
  platforms: Array<{ platform: string; accountId: string }>;
  mediaUrls?: string[];
  scheduledFor?: string;
};

export type ZernioPostResult = {
  ok: boolean;
  postId?: string;
  error?: string;
};

export async function zernioPost(options: ZernioPostOptions): Promise<ZernioPostResult> {
  const body: Record<string, unknown> = {
    content: options.content,
    platforms: options.platforms,
    profileId: options.profileId,
  };

  if (options.mediaUrls?.length) {
    body.mediaItems = options.mediaUrls.map((url) => ({ type: "image", url }));
  }

  if (options.scheduledFor) {
    body.scheduledFor = options.scheduledFor;
    body.timezone = "Europe/Vienna";
  } else {
    body.publishNow = true;
  }

  const res = await fetch(`${BASE}/posts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { ok: false, error: json.message || "Post failed" };
  return { ok: true, postId: json.id ?? json.postId };
}

// --- Analytics ---

export type ZernioAnalytics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
};

export async function getPostAnalytics(postId: string): Promise<ZernioAnalytics> {
  const res = await fetch(`${BASE}/posts/${postId}/analytics`, { headers: headers() });
  const json = await res.json();
  const d = json?.analytics ?? json ?? {};
  return {
    views: Number(d.impressions ?? d.views ?? d.playCount ?? 0),
    likes: Number(d.likes ?? d.likeCount ?? 0),
    comments: Number(d.comments ?? d.commentCount ?? 0),
    shares: Number(d.shares ?? d.shareCount ?? 0),
    saves: Number(d.saved ?? d.saves ?? 0),
    reach: Number(d.reach ?? 0),
  };
}

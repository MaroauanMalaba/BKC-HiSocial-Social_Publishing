import { getDb, Post, SocialAccount, PostInsight } from "../db";

const GRAPH = "https://graph.facebook.com/v21.0";
const TT = "https://open.tiktokapis.com/v2";

export type NormalizedMetrics = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
};

function empty(): NormalizedMetrics {
  return { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, reach: 0 };
}

async function fetchInstagramInsights(
  externalId: string,
  token: string
): Promise<{ metrics: NormalizedMetrics; raw: unknown } | null> {
  const mediaRes = await fetch(
    `${GRAPH}/${externalId}?fields=like_count,comments_count&access_token=${encodeURIComponent(token)}`
  );
  const media = await mediaRes.json();
  if (!mediaRes.ok) return { metrics: empty(), raw: media };

  const insightsRes = await fetch(
    `${GRAPH}/${externalId}/insights?metric=reach,saved,shares,views&access_token=${encodeURIComponent(token)}`
  );
  const insights = await insightsRes.json();

  const m = empty();
  m.likes = Number(media.like_count ?? 0);
  m.comments = Number(media.comments_count ?? 0);

  type IgInsight = { name: string; values?: Array<{ value?: number }> };
  if (insights?.data && Array.isArray(insights.data)) {
    for (const row of insights.data as IgInsight[]) {
      const v = row.values?.[0]?.value ?? 0;
      if (row.name === "reach") m.reach = Number(v);
      else if (row.name === "saved") m.saves = Number(v);
      else if (row.name === "shares") m.shares = Number(v);
      else if (row.name === "views") m.views = Number(v);
    }
  }
  return { metrics: m, raw: { media, insights } };
}

async function fetchFacebookInsights(
  externalId: string,
  token: string
): Promise<{ metrics: NormalizedMetrics; raw: unknown } | null> {
  const isVideo = !externalId.includes("_");
  const fields = isVideo
    ? "likes.summary(total_count),comments.summary(total_count),views"
    : "likes.summary(total_count),comments.summary(total_count),shares";

  const res = await fetch(
    `${GRAPH}/${externalId}?fields=${fields}&access_token=${encodeURIComponent(token)}`
  );
  const json = await res.json();
  if (!res.ok) return { metrics: empty(), raw: json };

  const m = empty();
  m.likes = Number(json?.likes?.summary?.total_count ?? 0);
  m.comments = Number(json?.comments?.summary?.total_count ?? 0);
  m.shares = Number(json?.shares?.count ?? 0);
  m.views = Number(json?.views ?? 0);
  return { metrics: m, raw: json };
}

async function fetchTikTokInsights(
  publishId: string,
  token: string
): Promise<{ metrics: NormalizedMetrics; raw: unknown } | null> {
  const statusRes = await fetch(`${TT}/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const status = await statusRes.json();
  const videoId = status?.data?.publicaly_available_post_id?.[0];

  if (!videoId) {
    return { metrics: empty(), raw: status };
  }

  const listRes = await fetch(
    `${TT}/video/query/?fields=id,view_count,like_count,comment_count,share_count`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    }
  );
  const list = await listRes.json();
  const video = list?.data?.videos?.[0];

  const m = empty();
  if (video) {
    m.views = Number(video.view_count ?? 0);
    m.likes = Number(video.like_count ?? 0);
    m.comments = Number(video.comment_count ?? 0);
    m.shares = Number(video.share_count ?? 0);
  }
  return { metrics: m, raw: { status, list } };
}

export async function refreshPostInsights(postId: number): Promise<number> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as
    | Post
    | undefined;
  if (!post || post.status !== "published") return 0;

  const results = post.results_json
    ? (JSON.parse(post.results_json) as Array<
        | { ok: true; platform: string; externalId: string }
        | { ok: false; platform: string; error: string }
      >)
    : [];
  const platforms = JSON.parse(post.platforms_json) as Array<{
    platform: "tiktok" | "instagram" | "facebook";
    account_id: number;
  }>;

  const now = Date.now();
  let updated = 0;

  for (const r of results) {
    if (!r.ok) continue;
    const platformBinding = platforms.find((p) => p.platform === r.platform);
    if (!platformBinding) continue;
    const account = db
      .prepare("SELECT * FROM social_accounts WHERE id = ?")
      .get(platformBinding.account_id) as SocialAccount | undefined;
    if (!account?.access_token) continue;

    let data: { metrics: NormalizedMetrics; raw: unknown } | null = null;
    try {
      if (r.platform === "instagram")
        data = await fetchInstagramInsights(r.externalId, account.access_token);
      else if (r.platform === "facebook")
        data = await fetchFacebookInsights(r.externalId, account.access_token);
      else if (r.platform === "tiktok")
        data = await fetchTikTokInsights(r.externalId, account.access_token);
    } catch (e) {
      data = { metrics: empty(), raw: { error: String(e) } };
    }
    if (!data) continue;

    db.prepare(
      `INSERT INTO post_insights
        (post_id, platform, external_id, views, likes, comments, shares, saves, reach, raw_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(post_id, platform) DO UPDATE SET
         views = excluded.views,
         likes = excluded.likes,
         comments = excluded.comments,
         shares = excluded.shares,
         saves = excluded.saves,
         reach = excluded.reach,
         raw_json = excluded.raw_json,
         fetched_at = excluded.fetched_at`
    ).run(
      postId,
      r.platform,
      r.externalId,
      data.metrics.views,
      data.metrics.likes,
      data.metrics.comments,
      data.metrics.shares,
      data.metrics.saves,
      data.metrics.reach,
      JSON.stringify(data.raw),
      now
    );
    updated++;
  }

  return updated;
}

export function getInsightsForPost(postId: number): PostInsight[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM post_insights WHERE post_id = ?")
    .all(postId) as PostInsight[];
}

export function getInsightsForUser(userId: number): Map<number, PostInsight[]> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pi.* FROM post_insights pi
       JOIN posts p ON p.id = pi.post_id
       WHERE p.user_id = ?`
    )
    .all(userId) as PostInsight[];
  const map = new Map<number, PostInsight[]>();
  for (const row of rows) {
    const list = map.get(row.post_id) || [];
    list.push(row);
    map.set(row.post_id, list);
  }
  return map;
}

import { getDb, Post, PostInsight, AccountInsight, User } from "../db";
import { getPostAnalytics, getAccountAnalytics, getConnectedAccounts } from "./zernio";

export async function refreshPostInsights(postId: number): Promise<number> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
  if (!post || post.status !== "published") return 0;

  const result = post.results_json ? JSON.parse(post.results_json) : null;
  if (!result?.ok || !result?.postId) return 0;

  const zernioPostId: string = result.postId;
  const meta = JSON.parse(post.platforms_json);
  const platforms: string[] = Array.isArray(meta.platforms) ? meta.platforms : [];
  if (!platforms.length) return 0;

  try {
    const metrics = await getPostAnalytics(zernioPostId);
    const now = Date.now();
    for (const platform of platforms) {
      db.prepare(
        `INSERT INTO post_insights
          (post_id, platform, external_id, views, likes, comments, shares, saves, reach, raw_json, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(post_id, platform) DO UPDATE SET
           views = excluded.views, likes = excluded.likes, comments = excluded.comments,
           shares = excluded.shares, saves = excluded.saves, reach = excluded.reach,
           raw_json = excluded.raw_json, fetched_at = excluded.fetched_at`
      ).run(
        postId, platform, zernioPostId,
        metrics.views, metrics.likes, metrics.comments,
        metrics.shares, metrics.saves, metrics.reach,
        null, now
      );
    }
    return platforms.length;
  } catch {
    return 0;
  }
}

export async function refreshAccountInsights(userId: number): Promise<void> {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;
  if (!user?.zernio_profile_id) return;

  const accounts = await getConnectedAccounts(user.zernio_profile_id);
  const now = Date.now();

  for (const account of accounts) {
    if (account.disconnected) continue;
    try {
      const m = await getAccountAnalytics(account._id);
      db.prepare(
        `INSERT INTO account_insights
          (user_id, platform, account_id, followers, following, media_count, profile_views, impressions, reach, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, platform) DO UPDATE SET
           account_id = excluded.account_id,
           followers = excluded.followers, following = excluded.following,
           media_count = excluded.media_count, profile_views = excluded.profile_views,
           impressions = excluded.impressions, reach = excluded.reach,
           fetched_at = excluded.fetched_at`
      ).run(
        userId, account.platform, account._id,
        m.followers, m.following, m.mediaCount,
        m.profileViews, m.impressions, m.reach,
        now
      );
    } catch {
      // continue — one platform failing shouldn't block others
    }
  }
}

export function getInsightsForPost(postId: number): PostInsight[] {
  const db = getDb();
  return db.prepare("SELECT * FROM post_insights WHERE post_id = ?").all(postId) as PostInsight[];
}

export function getInsightsForUser(userId: number): Map<number, PostInsight[]> {
  const db = getDb();
  const rows = db.prepare(
    `SELECT pi.* FROM post_insights pi
     JOIN posts p ON p.id = pi.post_id
     WHERE p.user_id = ?`
  ).all(userId) as PostInsight[];
  const map = new Map<number, PostInsight[]>();
  for (const row of rows) {
    const list = map.get(row.post_id) ?? [];
    list.push(row);
    map.set(row.post_id, list);
  }
  return map;
}

export function getAccountInsightsForUser(userId: number): AccountInsight[] {
  const db = getDb();
  return db.prepare("SELECT * FROM account_insights WHERE user_id = ?").all(userId) as AccountInsight[];
}

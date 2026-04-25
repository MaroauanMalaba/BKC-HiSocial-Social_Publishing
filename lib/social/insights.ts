import { getDb, Post, User, PostInsight } from "../db";
import { getPostAnalytics } from "./ayrshare";

export async function refreshPostInsights(postId: number): Promise<number> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
  if (!post || post.status !== "published") return 0;

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(post.user_id) as User | undefined;
  if (!user?.ayrshare_profile_key) return 0;

  const result = post.results_json ? JSON.parse(post.results_json) : null;
  if (!result?.postIds) return 0;

  const now = Date.now();
  let updated = 0;

  for (const [platform, postId_] of Object.entries(result.postIds as Record<string, string>)) {
    try {
      const metrics = await getPostAnalytics(user.ayrshare_profile_key, platform, postId_);
      db.prepare(
        `INSERT INTO post_insights
          (post_id, platform, external_id, views, likes, comments, shares, saves, reach, raw_json, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(post_id, platform) DO UPDATE SET
           views = excluded.views, likes = excluded.likes, comments = excluded.comments,
           shares = excluded.shares, saves = excluded.saves, reach = excluded.reach,
           raw_json = excluded.raw_json, fetched_at = excluded.fetched_at`
      ).run(
        postId, platform, postId_,
        metrics.views, metrics.likes, metrics.comments,
        metrics.shares, metrics.saves, metrics.reach,
        null, now
      );
      updated++;
    } catch {
      // continue with next platform
    }
  }
  return updated;
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
    const list = map.get(row.post_id) || [];
    list.push(row);
    map.set(row.post_id, list);
  }
  return map;
}

import { getDb, Post, Media, User } from "../db";
import { postContent } from "./ayrshare";
import { refreshPostInsights } from "./insights";

export async function publishPost(postId: number): Promise<void> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
  if (!post) return;

  db.prepare("UPDATE posts SET status = 'publishing', updated_at = ? WHERE id = ?").run(
    Date.now(), postId
  );

  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(post.media_id) as Media | undefined;
  if (!media || !media.compressed_path) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "media not ready" }), Date.now(), postId
    );
    return;
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(post.user_id) as User | undefined;
  if (!user?.ayrshare_profile_key) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "No Ayrshare profile — connect social accounts first" }),
      Date.now(), postId
    );
    return;
  }

  const platforms = JSON.parse(post.platforms_json) as string[];

  const publicBase = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (!publicBase) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "PUBLIC_BASE_URL not configured" }), Date.now(), postId
    );
    return;
  }

  const fileName = media.compressed_path.split("/").pop();
  const mediaUrl = `${publicBase}/media/${fileName}`;

  const result = await postContent(user.ayrshare_profile_key, {
    post: post.caption,
    platforms,
    mediaUrls: [mediaUrl],
  });

  db.prepare("UPDATE posts SET status = ?, results_json = ?, updated_at = ? WHERE id = ?").run(
    result.ok ? "published" : "failed",
    JSON.stringify(result),
    Date.now(),
    postId
  );

  if (result.ok) {
    setTimeout(() => {
      refreshPostInsights(postId).catch(() => {});
    }, 5000);
  }
}

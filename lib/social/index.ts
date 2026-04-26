import path from "path";
import { getDb, Post, Media, User } from "../db";
import { uploadMediaToZernio, zernioPost, getConnectedAccounts } from "./zernio";
import { refreshPostInsights } from "./insights";

export async function publishPost(postId: number): Promise<void> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
  if (!post) return;

  db.prepare("UPDATE posts SET status = 'publishing', updated_at = ? WHERE id = ?").run(Date.now(), postId);

  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(post.media_id) as Media | undefined;
  if (!media || !media.compressed_path) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "media not ready" }), Date.now(), postId
    );
    return;
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(post.user_id) as User | undefined;
  if (!user?.zernio_profile_id) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "Keine verbundenen Accounts — geh zu /accounts und verbinde zuerst eine Plattform." }),
      Date.now(), postId
    );
    return;
  }

  // Upload media to Zernio CDN
  const filename = path.basename(media.compressed_path);
  const contentType = media.kind === "video" ? "video/mp4" : "image/jpeg";
  let mediaUrl: string;
  try {
    mediaUrl = await uploadMediaToZernio(media.compressed_path, filename, contentType);
  } catch (e) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: `Media upload fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}` }),
      Date.now(), postId
    );
    return;
  }

  // Get connected accounts for requested platforms
  const platforms = JSON.parse(post.platforms_json) as string[];
  const allAccounts = await getConnectedAccounts(user.zernio_profile_id);
  const targetAccounts = allAccounts
    .filter((a) => platforms.includes(a.platform) && !a.disconnected)
    .map((a) => ({ platform: a.platform, accountId: a._id }));

  if (!targetAccounts.length) {
    db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
      JSON.stringify({ error: "Keine passenden verbundenen Accounts für die gewählten Plattformen." }),
      Date.now(), postId
    );
    return;
  }

  const result = await zernioPost({
    profileId: user.zernio_profile_id,
    content: post.caption,
    platforms: targetAccounts,
    mediaUrls: [mediaUrl],
  });

  db.prepare("UPDATE posts SET status = ?, results_json = ?, updated_at = ? WHERE id = ?").run(
    result.ok ? "published" : "failed",
    JSON.stringify(result),
    Date.now(),
    postId
  );

  if (result.ok) {
    setTimeout(() => refreshPostInsights(postId).catch(() => {}), 5000);
  }
}

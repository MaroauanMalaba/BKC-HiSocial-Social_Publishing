import path from "path";
import { getDb, Post, Media, User } from "../db";
import { uploadMediaToZernio, zernioPost, getConnectedAccounts } from "./zernio";
import { refreshPostInsights } from "./insights";

type PostMeta = {
  platforms: string[];
  media_ids: number[];
  post_type: "feed" | "story" | "reel";
};

export async function publishPost(postId: number): Promise<void> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as Post | undefined;
  if (!post) return;

  db.prepare("UPDATE posts SET status = 'publishing', updated_at = ? WHERE id = ?").run(Date.now(), postId);

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(post.user_id) as User | undefined;
  if (!user?.zernio_profile_id) {
    return fail(postId, "Keine verbundenen Accounts — geh zu /accounts.");
  }

  const meta = JSON.parse(post.platforms_json) as PostMeta;
  const mediaIds: number[] = meta.media_ids ?? [post.media_id];
  const platforms: string[] = meta.platforms ?? [];
  const postType: string = meta.post_type ?? "feed";

  // Upload all media files to Zernio CDN
  const mediaUrls: string[] = [];
  for (const mediaId of mediaIds) {
    const media = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as Media | undefined;
    if (!media?.compressed_path) return fail(postId, `Media ${mediaId} nicht fertig`);
    const filename = path.basename(media.compressed_path);
    const contentType = media.kind === "video" ? "video/mp4" : "image/jpeg";
    try {
      const url = await uploadMediaToZernio(media.compressed_path, filename, contentType);
      mediaUrls.push(url);
    } catch (e) {
      return fail(postId, `Media Upload fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Get connected accounts for requested platforms
  const allAccounts = await getConnectedAccounts(user.zernio_profile_id);
  const targetAccounts = allAccounts
    .filter((a) => platforms.includes(a.platform) && !a.disconnected)
    .map((a) => {
      const acc: Record<string, unknown> = { platform: a.platform, accountId: a._id };
      if (postType === "story") acc.platformSpecificData = { contentType: "story" };
      else if (postType === "reel") acc.platformSpecificData = { contentType: "reel" };
      return acc;
    });

  if (!targetAccounts.length) {
    return fail(postId, "Keine passenden verbundenen Accounts für die gewählten Plattformen.");
  }

  const result = await zernioPost({
    profileId: user.zernio_profile_id,
    content: post.caption,
    platforms: targetAccounts as Array<{ platform: string; accountId: string }>,
    mediaUrls,
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

function fail(postId: number, error: string) {
  const db = getDb();
  db.prepare("UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify({ error }), Date.now(), postId
  );
}

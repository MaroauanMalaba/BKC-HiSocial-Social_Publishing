import { getDb, Post, Media, SocialAccount } from "../db";
import { publishInstagram, publishFacebook } from "./meta";
import { publishTikTok } from "./tiktok";
import { Platform, PublishInput, PublishResult } from "./types";
import { refreshPostInsights } from "./insights";

export async function publishToPlatform(
  platform: Platform,
  input: PublishInput
): Promise<PublishResult> {
  switch (platform) {
    case "instagram":
      return publishInstagram(input);
    case "facebook":
      return publishFacebook(input);
    case "tiktok":
      return publishTikTok(input);
  }
}

export async function publishPost(postId: number): Promise<void> {
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId) as
    | Post
    | undefined;
  if (!post) return;

  db.prepare(
    "UPDATE posts SET status = 'publishing', updated_at = ? WHERE id = ?"
  ).run(Date.now(), postId);

  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(
    post.media_id
  ) as Media | undefined;
  if (!media || !media.compressed_path) {
    db.prepare(
      "UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?"
    ).run(
      JSON.stringify({ error: "media not ready" }),
      Date.now(),
      postId
    );
    return;
  }

  const platforms = JSON.parse(post.platforms_json) as Array<{
    platform: Platform;
    account_id: number;
  }>;

  const results: PublishResult[] = [];
  for (const p of platforms) {
    const account = db
      .prepare("SELECT * FROM social_accounts WHERE id = ?")
      .get(p.account_id) as SocialAccount | undefined;
    if (!account) {
      results.push({
        ok: false,
        platform: p.platform,
        error: "Account missing",
      });
      continue;
    }
    const result = await publishToPlatform(p.platform, {
      mediaPath: media.compressed_path,
      mediaKind: media.kind,
      caption: post.caption,
      account: {
        id: account.id,
        external_id: account.external_id,
        access_token: account.access_token,
        meta_json: account.meta_json,
      },
    });
    results.push(result);
  }

  const allOk = results.every((r) => r.ok);
  db.prepare(
    "UPDATE posts SET status = ?, results_json = ?, updated_at = ? WHERE id = ?"
  ).run(
    allOk ? "published" : "failed",
    JSON.stringify(results),
    Date.now(),
    postId
  );

  if (allOk) {
    setTimeout(() => {
      refreshPostInsights(postId).catch(() => {});
    }, 5000);
  }
}

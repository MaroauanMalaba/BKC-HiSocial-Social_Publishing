import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Media, Post } from "@/lib/db";
import { publishPost } from "@/lib/social";

const schema = z.object({
  media_ids: z.array(z.number()).min(1).max(10),
  caption: z.string().default(""),
  platforms: z.array(z.string()).min(1),
  platform_formats: z.record(z.string(), z.string()).optional(),
  post_type: z.string().default("feed"), // legacy fallback
  scheduled_at: z.number().optional(),
  is_draft: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const db = getDb();

  // Verify all media belong to user and are ready
  for (const mediaId of parsed.data.media_ids) {
    const media = db.prepare("SELECT * FROM media WHERE id = ? AND user_id = ?").get(mediaId, user.id) as Media | undefined;
    if (!media) return NextResponse.json({ error: `Media ${mediaId} nicht gefunden` }, { status: 404 });
    if (media.status !== "ready") return NextResponse.json({ error: `Media ${mediaId} noch nicht fertig komprimiert` }, { status: 400 });
  }

  // Use first media_id as primary (for backwards compat), store all in platforms_json meta
  const primaryMediaId = parsed.data.media_ids[0];
  const now = Date.now();
  const scheduled = parsed.data.scheduled_at;
  const status = parsed.data.is_draft ? "draft"
    : (scheduled && scheduled > now ? "scheduled" : "publishing");

  const info = db.prepare(
    `INSERT INTO posts (user_id, media_id, caption, platforms_json, scheduled_at, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    primaryMediaId,
    parsed.data.caption,
    JSON.stringify({
      platforms: parsed.data.platforms,
      media_ids: parsed.data.media_ids,
      post_type: parsed.data.post_type,
      platform_formats: parsed.data.platform_formats ?? {},
    }),
    scheduled ?? null,
    status,
    now,
    now
  );

  const postId = Number(info.lastInsertRowid);
  if (status === "publishing") {
    publishPost(postId).catch((e) => console.error("publishPost error", e));
  }

  return NextResponse.json({ id: postId, status });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = db.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200").all(user.id) as Post[];
  return NextResponse.json({
    posts: rows.map((p) => {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(p.platforms_json); } catch { /* ignore */ }
      return {
        ...p,
        platforms: Array.isArray(meta.platforms) ? (meta.platforms as string[]).map((pl) => ({ platform: pl })) : [],
        post_type: (meta.post_type as string) ?? "feed",
        results: p.results_json ? (() => { try { return JSON.parse(p.results_json!); } catch { return null; } })() : null,
      };
    }),
  });
}

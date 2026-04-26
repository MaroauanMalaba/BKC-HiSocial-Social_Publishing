import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Media, Post } from "@/lib/db";
import { publishPost } from "@/lib/social";

const schema = z.object({
  media_ids: z.array(z.number()).min(1).max(10),
  caption: z.string().default(""),
  platforms: z.array(z.string()).min(1),
  post_type: z.enum(["feed", "story", "reel"]).default("feed"),
  scheduled_at: z.number().optional(),
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
  const status = scheduled && scheduled > now ? "scheduled" : "publishing";

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
    posts: rows.map((p) => ({
      ...p,
      platforms: JSON.parse(p.platforms_json),
      results: p.results_json ? JSON.parse(p.results_json) : null,
    })),
  });
}

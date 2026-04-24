import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb, Media, Post } from "@/lib/db";
import { publishPost } from "@/lib/social";

const schema = z.object({
  media_id: z.number(),
  caption: z.string().default(""),
  platforms: z
    .array(
      z.object({
        platform: z.enum(["tiktok", "instagram", "facebook"]),
        account_id: z.number(),
      })
    )
    .min(1),
  scheduled_at: z.number().optional(),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );

  const db = getDb();
  const media = db
    .prepare("SELECT * FROM media WHERE id = ? AND user_id = ?")
    .get(parsed.data.media_id, user.id) as Media | undefined;
  if (!media)
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  if (media.status !== "ready")
    return NextResponse.json(
      { error: "Media not ready yet" },
      { status: 400 }
    );

  const now = Date.now();
  const scheduled = parsed.data.scheduled_at;
  const status = scheduled && scheduled > now ? "scheduled" : "publishing";

  const info = db
    .prepare(
      `INSERT INTO posts (user_id, media_id, caption, platforms_json,
         scheduled_at, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      parsed.data.media_id,
      parsed.data.caption,
      JSON.stringify(parsed.data.platforms),
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
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200"
    )
    .all(user.id) as Post[];
  return NextResponse.json({
    posts: rows.map((p) => ({
      ...p,
      platforms: JSON.parse(p.platforms_json),
      results: p.results_json ? JSON.parse(p.results_json) : null,
    })),
  });
}

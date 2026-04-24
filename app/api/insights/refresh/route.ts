import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { refreshPostInsights } from "@/lib/social/insights";
import { getDb, Post } from "@/lib/db";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const postId = Number(body.post_id);
  if (!postId)
    return NextResponse.json({ error: "Missing post_id" }, { status: 400 });

  const db = getDb();
  const post = db
    .prepare("SELECT * FROM posts WHERE id = ? AND user_id = ?")
    .get(postId, user.id) as Post | undefined;
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await refreshPostInsights(postId);
  return NextResponse.json({ ok: true, updated: count });
}

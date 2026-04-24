import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { refreshPostInsights } from "@/lib/social/insights";
import { getDb, Post } from "@/lib/db";

export async function POST() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const posts = db
    .prepare(
      "SELECT id FROM posts WHERE user_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 50"
    )
    .all(user.id) as Pick<Post, "id">[];

  let total = 0;
  for (const p of posts) {
    try {
      total += await refreshPostInsights(p.id);
    } catch {
      // continue on error
    }
  }
  return NextResponse.json({ ok: true, refreshed: posts.length, updated: total });
}

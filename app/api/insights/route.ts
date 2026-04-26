import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getInsightsForUser } from "@/lib/social/insights";
import { getDb, Post } from "@/lib/db";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE user_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 100"
    )
    .all(user.id) as Post[];
  const insightsMap = getInsightsForUser(user.id);

  return NextResponse.json({
    posts: posts.map((p) => {
      const meta = JSON.parse(p.platforms_json);
      const platformList: string[] = Array.isArray(meta.platforms) ? meta.platforms : [];
      return {
        id: p.id,
        caption: p.caption,
        created_at: p.created_at,
        platforms: platformList.map((pl) => ({ platform: pl })),
        results: p.results_json ? JSON.parse(p.results_json) : [],
        insights: insightsMap.get(p.id) ?? [],
      };
    }),
  });
}

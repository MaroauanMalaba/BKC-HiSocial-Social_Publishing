import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb, Post } from "@/lib/db";
import { getInsightsForUser, getAccountInsightsForUser } from "@/lib/social/insights";

export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const db = getDb();
  const posts = db.prepare(
    "SELECT * FROM posts WHERE user_id = ? AND status = 'published' ORDER BY created_at DESC LIMIT 200"
  ).all(user.id) as Post[];

  const insightsMap = getInsightsForUser(user.id);
  const accountInsights = getAccountInsightsForUser(user.id);

  const rows: string[] = [
    "Type,Platform,Post-ID,Caption,Date,Views,Likes,Comments,Shares,Saves,Reach"
  ];

  for (const p of posts) {
    const meta = JSON.parse(p.platforms_json);
    const caption = (p.caption ?? "").replace(/"/g, '""');
    const date = new Date(p.created_at).toISOString().slice(0, 10);
    const insights = insightsMap.get(p.id) ?? [];
    for (const i of insights) {
      rows.push(`post,${i.platform},${p.id},"${caption}",${date},${i.views},${i.likes},${i.comments},${i.shares},${i.saves},${i.reach}`);
    }
    if (insights.length === 0) {
      const platforms: string[] = Array.isArray(meta.platforms) ? meta.platforms : [];
      for (const pl of platforms) {
        rows.push(`post,${pl},${p.id},"${caption}",${date},0,0,0,0,0,0`);
      }
    }
  }

  rows.push("Type,Platform,Post-ID,Caption,Date,Followers,Following,Posts,Profile-Views,Impressions,Reach");
  for (const a of accountInsights) {
    rows.push(`account,${a.platform},,,${new Date(a.fetched_at).toISOString().slice(0,10)},${a.followers},${a.following},${a.media_count},${a.profile_views},${a.impressions},${a.reach}`);
  }

  const csv = rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hisocial-insights-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}

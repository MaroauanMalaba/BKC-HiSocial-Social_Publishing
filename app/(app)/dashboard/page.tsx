import { redirect } from "next/navigation";
import { getDb, Post, SocialAccount, AccountInsight } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getInsightsForUser, getAccountInsightsForUser } from "@/lib/social/insights";
import { DashboardVisuals } from "./dashboard-visuals";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();

  const posts = db.prepare(
    "SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(user.id) as Post[];

  const accounts = db.prepare(
    "SELECT * FROM social_accounts WHERE user_id = ?"
  ).all(user.id) as SocialAccount[];

  const insightsMap = getInsightsForUser(user.id);
  const accountInsights = getAccountInsightsForUser(user.id) as AccountInsight[];

  // Aggregate totals
  let reach = 0, views = 0, likes = 0, comments = 0, shares = 0;
  for (const list of insightsMap.values()) {
    for (const i of list) {
      reach    += i.reach;
      views    += i.views;
      likes    += i.likes;
      comments += i.comments;
      shares   += i.shares;
    }
  }
  const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0;
  const followers = accountInsights.reduce((s, a) => s + a.followers, 0);

  const scheduledCount = (
    db.prepare("SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'scheduled'").get(user.id) as { n: number }
  ).n;

  // Upcoming posts for next 48h
  const now = Date.now();
  const rawUpcoming = db.prepare(
    "SELECT * FROM posts WHERE user_id = ? AND status = 'scheduled' AND scheduled_at > ? AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 8"
  ).all(user.id, now, now + 48 * 3_600_000) as Post[];

  const upcomingPosts = rawUpcoming.map((p) => {
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(p.platforms_json); } catch { /* ignore */ }
    const platforms: string[] = Array.isArray(meta.platforms) ? (meta.platforms as string[]) : [];
    const postType: string = (meta.post_type as string | undefined) ?? (
      meta.platform_formats ? (Object.values(meta.platform_formats as Record<string, string>)[0]) : "feed"
    );
    return { id: p.id, caption: p.caption, platforms, scheduled_at: p.scheduled_at!, post_type: postType };
  });

  // Top posts for insights table
  const publishedPosts = posts.filter((p) => p.status === "published");
  const topPosts = publishedPosts.map((p) => {
    let meta: Record<string, unknown> = {};
    try { meta = JSON.parse(p.platforms_json); } catch { /* ignore */ }
    const platformList: string[] = Array.isArray(meta.platforms) ? (meta.platforms as string[]) : [];
    return {
      id: p.id,
      caption: p.caption,
      created_at: p.created_at,
      platforms: platformList.map((pl) => ({ platform: pl })),
      insights: insightsMap.get(p.id) ?? [],
    };
  });

  // Accounts data for roundup
  const accountsData = accounts.map((a) => ({
    platform: a.platform,
    account_label: a.account_label,
    followers: accountInsights.find((i) => i.platform === a.platform)?.followers ?? 0,
  }));

  const todayFormatted = new Date().toLocaleDateString("de-AT", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <DashboardVisuals
      userName={user.name ?? ""}
      todayFormatted={todayFormatted}
      kpis={{ reach, engagementRate, followers, scheduledCount }}
      accounts={accountsData}
      upcomingPosts={upcomingPosts}
      topPosts={topPosts}
      accountInsights={accountInsights}
      totalAccounts={accountInsights.length}
    />
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getDb, Post, Media, SocialAccount } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getInsightsForUser } from "@/lib/social/insights";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();

  const media = db
    .prepare(
      "SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC LIMIT 5"
    )
    .all(user.id) as Media[];

  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
    )
    .all(user.id) as Post[];

  const accounts = db
    .prepare("SELECT * FROM social_accounts WHERE user_id = ?")
    .all(user.id) as SocialAccount[];

  const insightsMap = getInsightsForUser(user.id);

  let totals = { views: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
  const platformTotals: Record<string, { views: number; likes: number }> = {
    instagram: { views: 0, likes: 0 },
    facebook: { views: 0, likes: 0 },
    tiktok: { views: 0, likes: 0 },
  };
  for (const list of insightsMap.values()) {
    for (const i of list) {
      totals.views += i.views;
      totals.likes += i.likes;
      totals.comments += i.comments;
      totals.shares += i.shares;
      totals.reach += i.reach;
      if (platformTotals[i.platform]) {
        platformTotals[i.platform].views += i.views;
        platformTotals[i.platform].likes += i.likes;
      }
    }
  }

  const publishedPosts = posts.filter((p) => p.status === "published");
  const postsForClient = publishedPosts.map((p) => ({
    id: p.id,
    caption: p.caption,
    created_at: p.created_at,
    platforms: JSON.parse(p.platforms_json) as Array<{
      platform: string;
      account_id: number;
    }>,
    insights: insightsMap.get(p.id) ?? [],
  }));

  const scheduledCount = db
    .prepare(
      "SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'scheduled'"
    )
    .get(user.id) as { n: number };

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Hey{user.name ? `, ${user.name}` : ""} — hier ist deine Performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <KpiCard label="Views" value={totals.views} accent="cyan" />
        <KpiCard label="Likes" value={totals.likes} accent="pink" />
        <KpiCard label="Comments" value={totals.comments} accent="violet" />
        <KpiCard label="Shares" value={totals.shares} accent="emerald" />
        <KpiCard label="Reach" value={totals.reach} accent="amber" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <PlatformCard
          platform="instagram"
          views={platformTotals.instagram.views}
          likes={platformTotals.instagram.likes}
        />
        <PlatformCard
          platform="facebook"
          views={platformTotals.facebook.views}
          likes={platformTotals.facebook.likes}
        />
        <PlatformCard
          platform="tiktok"
          views={platformTotals.tiktok.views}
          likes={platformTotals.tiktok.likes}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MiniStat label="Media Files" value={media.length} />
        <MiniStat
          label="Geplante Posts"
          value={scheduledCount.n}
          href="/schedule"
        />
        <MiniStat
          label="Verbundene Accounts"
          value={accounts.length}
          href="/accounts"
        />
      </div>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">Top Posts</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Sortiert nach Views · Auto-Refresh alle 15 min
            </p>
          </div>
          <Link
            href="/schedule"
            className="text-xs text-neutral-400 hover:text-white"
          >
            Alle Posts →
          </Link>
        </div>
        <DashboardClient posts={postsForClient} />
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Letzte Uploads</h2>
          <Link
            href="/upload"
            className="text-xs text-neutral-400 hover:text-white"
          >
            Neuer Upload →
          </Link>
        </div>
        {media.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Uploads.</p>
        )}
        <ul className="space-y-2">
          {media.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between text-sm"
            >
              <div className="truncate">
                <span className="text-xs text-neutral-500 mr-2">
                  [{m.kind}]
                </span>
                {m.original_filename}
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                {m.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "pink" | "violet" | "emerald" | "amber";
}) {
  const colors: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-900/40 text-cyan-300",
    pink: "from-pink-500/20 to-pink-500/5 border-pink-900/40 text-pink-300",
    violet:
      "from-violet-500/20 to-violet-500/5 border-violet-900/40 text-violet-300",
    emerald:
      "from-emerald-500/20 to-emerald-500/5 border-emerald-900/40 text-emerald-300",
    amber:
      "from-amber-500/20 to-amber-500/5 border-amber-900/40 text-amber-300",
  };
  return (
    <div
      className={
        "rounded-xl border bg-gradient-to-br p-5 " + colors[accent]
      }
    >
      <div className="text-[11px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-white tabular-nums">
        {formatCompact(value)}
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  views,
  likes,
}: {
  platform: string;
  views: number;
  likes: number;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {platform}
      </div>
      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <div className="text-[10px] uppercase text-neutral-500">Views</div>
          <div className="text-xl font-semibold tabular-nums">
            {formatCompact(views)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-neutral-500">Likes</div>
          <div className="text-xl font-semibold tabular-nums">
            {formatCompact(likes)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 hover:border-neutral-700 transition">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

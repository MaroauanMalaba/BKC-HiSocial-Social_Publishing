"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

type Insight = {
  platform: string;
  external_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  fetched_at: number;
};

type DashPost = {
  id: number;
  caption: string;
  created_at: number;
  platforms: Array<{ platform: string; account_id: number }>;
  insights: Insight[];
};

export function DashboardClient({ posts }: { posts: DashPost[] }) {
  const [refreshing, setRefreshing] = useState(false);
  const [list, setList] = useState(posts);
  const [, startTransition] = useTransition();

  async function refreshAll() {
    setRefreshing(true);
    await fetch("/api/insights/refresh-all", { method: "POST" });
    const res = await fetch("/api/insights");
    const json = await res.json();
    startTransition(() => {
      setList(json.posts);
      setRefreshing(false);
    });
  }

  async function refreshOne(postId: number) {
    await fetch("/api/insights/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId }),
    });
    const res = await fetch("/api/insights");
    const json = await res.json();
    setList(json.posts);
  }

  const sorted = [...list].sort((a, b) => {
    const aViews = a.insights.reduce((s, i) => s + i.views, 0);
    const bViews = b.insights.reduce((s, i) => s + i.views, 0);
    return bViews - aViews;
  });

  if (posts.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Noch keine veröffentlichten Posts. Nach dem ersten Post erscheinen hier
        die Zahlen.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="text-xs rounded-md bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 disabled:opacity-50 flex items-center gap-2"
        >
          <span
            className={
              "inline-block h-2 w-2 rounded-full " +
              (refreshing
                ? "bg-cyan-400 animate-pulse"
                : "bg-neutral-500")
            }
          />
          {refreshing ? "Aktualisiere…" : "Jetzt aktualisieren"}
        </button>
      </div>

      <div className="space-y-2">
        {sorted.map((p, idx) => (
          <PostRow
            key={p.id}
            post={p}
            rank={idx + 1}
            onRefresh={() => refreshOne(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PostRow({
  post,
  rank,
  onRefresh,
}: {
  post: DashPost;
  rank: number;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const totalViews = post.insights.reduce((s, i) => s + i.views, 0);
  const totalLikes = post.insights.reduce((s, i) => s + i.likes, 0);
  const totalComments = post.insights.reduce((s, i) => s + i.comments, 0);
  const totalShares = post.insights.reduce((s, i) => s + i.shares, 0);

  const platforms = Array.from(new Set(post.platforms.map((p) => p.platform)));

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-neutral-800/40 text-left"
      >
        <div className="w-6 text-xs font-mono text-neutral-500">#{rank}</div>

        <div className="flex-1 min-w-0">
          <div className="text-sm truncate">
            {post.caption || (
              <span className="text-neutral-500 italic">Kein Caption</span>
            )}
          </div>
          <div className="flex gap-1.5 mt-1">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
            <span className="text-[10px] text-neutral-500 ml-1">
              {formatDistanceToNow(new Date(post.created_at), {
                addSuffix: true,
                locale: de,
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 text-sm tabular-nums">
          <Metric icon="👁" value={totalViews} tint="text-cyan-300" />
          <Metric icon="❤" value={totalLikes} tint="text-pink-300" />
          <Metric icon="💬" value={totalComments} tint="text-violet-300" />
          <Metric icon="↻" value={totalShares} tint="text-emerald-300" />
        </div>

        <button
          onClick={async (e) => {
            e.stopPropagation();
            setLoading(true);
            await onRefresh();
            setLoading(false);
          }}
          disabled={loading}
          className="text-xs text-neutral-400 hover:text-white px-2 py-1 disabled:opacity-50"
          title="Insights neu laden"
        >
          {loading ? "…" : "↻"}
        </button>
      </button>

      {open && post.insights.length > 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/60 p-4 fade-in-up">
          <div className="grid grid-cols-3 gap-3">
            {post.insights.map((i) => (
              <div
                key={i.platform}
                className="rounded-md border border-neutral-800 bg-neutral-900/60 p-3"
              >
                <PlatformBadge platform={i.platform} />
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                  <Cell label="Views" value={i.views} />
                  <Cell label="Likes" value={i.likes} />
                  <Cell label="Comments" value={i.comments} />
                  <Cell label="Shares" value={i.shares} />
                  <Cell label="Saves" value={i.saves} />
                  <Cell label="Reach" value={i.reach} />
                </div>
                <div className="text-[10px] text-neutral-500 mt-2">
                  Aktualisiert{" "}
                  {formatDistanceToNow(new Date(i.fetched_at), {
                    addSuffix: true,
                    locale: de,
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {open && post.insights.length === 0 && (
        <div className="border-t border-neutral-800 bg-neutral-950/60 p-4 text-xs text-neutral-500 fade-in-up">
          Noch keine Insights verfügbar — auf ↻ klicken um jetzt zu laden.
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  value,
  tint,
}: {
  icon: string;
  value: number;
  tint: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs opacity-60">{icon}</span>
      <span className={"number-roll " + tint} key={value}>
        {formatCompact(value)}
      </span>
    </span>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="font-mono tabular-nums text-neutral-200 mt-0.5">
        {formatCompact(value)}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    instagram: "bg-pink-900/30 text-pink-300 border-pink-900/60",
    facebook: "bg-blue-900/30 text-blue-300 border-blue-900/60",
    tiktok: "bg-neutral-800 text-neutral-300 border-neutral-700",
  };
  return (
    <span
      className={
        "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border " +
        (styles[platform] || "bg-neutral-800 text-neutral-400")
      }
    >
      {platform}
    </span>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

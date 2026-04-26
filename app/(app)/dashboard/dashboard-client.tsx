"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo } from "@/components/ui/platform-logos";

type Insight = {
  platform: string; external_id: string;
  views: number; likes: number; comments: number; shares: number; saves: number; reach: number;
  fetched_at: number;
};
type AccountInsight = {
  platform: string; followers: number; following: number; media_count: number;
  profile_views: number; impressions: number; reach: number; fetched_at: number;
};
type DashPost = {
  id: number; caption: string; created_at: number;
  platforms: Array<{ platform: string }>;
  insights: Insight[];
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function DashboardClient({ posts, initialAccountInsights }: {
  posts: DashPost[]; initialAccountInsights: AccountInsight[];
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingAccounts, setRefreshingAccounts] = useState(false);
  const [list, setList] = useState(posts);
  const [accountInsights, setAccountInsights] = useState(initialAccountInsights);
  const [, startTransition] = useTransition();

  async function refreshAll() {
    setRefreshing(true);
    await fetch("/api/insights/refresh-all", { method: "POST" });
    const res = await fetch("/api/insights");
    const json = await res.json();
    startTransition(() => { setList(json.posts); setRefreshing(false); });
  }

  async function refreshAccounts() {
    setRefreshingAccounts(true);
    const res = await fetch("/api/insights/accounts", { method: "POST" });
    const json = await res.json();
    startTransition(() => { setAccountInsights(json.insights ?? []); setRefreshingAccounts(false); });
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
    const aV = a.insights.reduce((s, i) => s + i.views, 0);
    const bV = b.insights.reduce((s, i) => s + i.views, 0);
    return bV - aV;
  });

  if (list.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>
        <Icon name="chart" size={32}/>
        <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500 }}>Noch keine veröffentlichten Posts.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 4 }}>
        <button
          onClick={refreshAccounts}
          disabled={refreshingAccounts}
          className="hs-btn hs-btn-glass"
          style={{ padding: "7px 14px", fontSize: 12, opacity: refreshingAccounts ? 0.5 : 1 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: refreshingAccounts ? "var(--green-action)" : "var(--text-3)", display: "inline-block" }}/>
          {refreshingAccounts ? "Aktualisiere…" : "Accounts"}
        </button>
        <button
          onClick={refreshAll}
          disabled={refreshing}
          className="hs-btn hs-btn-glass"
          style={{ padding: "7px 14px", fontSize: 12, opacity: refreshing ? 0.5 : 1 }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: refreshing ? "var(--green-action)" : "var(--text-3)", display: "inline-block" }}/>
          {refreshing ? "Aktualisiere…" : "Posts"}
        </button>
      </div>

      {sorted.map((p, idx) => (
        <PostRow key={p.id} post={p} rank={idx + 1} onRefresh={() => refreshOne(p.id)}/>
      ))}
    </div>
  );
}

function PostRow({ post, rank, onRefresh }: { post: DashPost; rank: number; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const totalViews    = post.insights.reduce((s, i) => s + i.views, 0);
  const totalLikes    = post.insights.reduce((s, i) => s + i.likes, 0);
  const totalComments = post.insights.reduce((s, i) => s + i.comments, 0);
  const totalReach    = post.insights.reduce((s, i) => s + i.reach, 0);
  const platforms     = Array.from(new Set(post.platforms.map((p) => p.platform)));

  return (
    <div className="glass" style={{ borderRadius: 14, overflow: "hidden" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
          cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: "var(--text-3)", fontVariantNumeric: "tabular-nums" }}>
          #{rank}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-1)" }}>
            {post.caption || <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Kein Caption</span>}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
            {platforms.map((p) => (
              <div key={p} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                border: "1px solid var(--glass-border)", background: "var(--glass-bg)",
                letterSpacing: ".05em", textTransform: "uppercase",
              }}>
                <PlatformLogo platform={p} size={12}/>
                {p}
              </div>
            ))}
            <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: 4 }}>
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: de })}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0 }}>
          <Metric label="Views"    value={totalViews}    color="var(--accent-blue)"/>
          <Metric label="Likes"    value={totalLikes}    color="#ec4899"/>
          <Metric label="Reach"    value={totalReach}    color="var(--green-action)"/>
          <Metric label="Comments" value={totalComments} color="#f59e0b"/>
        </div>

        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setLoading(true);
              await onRefresh();
              setLoading(false);
            }}
            disabled={loading}
            className="hs-btn hs-btn-icon hs-btn-ghost"
            style={{ opacity: loading ? 0.4 : 1 }}
            title="Insights neu laden"
          >
            <Icon name="rotate" size={14} className={loading ? "animate-spin" : ""}/>
          </button>
          <div className="hs-btn hs-btn-icon hs-btn-ghost" style={{ color: "var(--text-3)" }}>
            <Icon name={open ? "chevron_d" : "chevron_r"} size={14}/>
          </div>
        </div>
      </div>

      {open && (
        <div className="fade-in-up" style={{ borderTop: "1px solid var(--glass-border)", padding: 16, background: "rgba(0,0,0,0.1)" }}>
          {post.insights.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {post.insights.map((ins) => (
                <div key={ins.platform} style={{
                  padding: 16, borderRadius: 12,
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <PlatformLogo platform={ins.platform} size={20}/>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                      {ins.platform.charAt(0).toUpperCase() + ins.platform.slice(1)}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <StatCell label="Views"    value={ins.views}/>
                    <StatCell label="Likes"    value={ins.likes}/>
                    <StatCell label="Comments" value={ins.comments}/>
                    <StatCell label="Shares"   value={ins.shares}/>
                    <StatCell label="Saves"    value={ins.saves}/>
                    <StatCell label="Reach"    value={ins.reach}/>
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 10 }}>
                    {formatDistanceToNow(new Date(ins.fetched_at), { addSuffix: true, locale: de })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-3)", padding: "8px 0" }}>
              Noch keine Insights — auf ↻ klicken.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)" }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--text-1)", marginTop: 2 }}>
        {formatCompact(value)}
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color }}>{formatCompact(value)}</div>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo, PLATFORM_COLOR } from "@/components/ui/platform-logos";
import { DashboardClient } from "./dashboard-client";

// ── Types ────────────────────────────────────────────────────────────────────

type Insight = {
  platform: string; external_id: string;
  views: number; likes: number; comments: number; shares: number; saves: number; reach: number;
  fetched_at: number;
};
type DashPost = {
  id: number; caption: string; created_at: number;
  platforms: Array<{ platform: string }>;
  insights: Insight[];
};
type AcctRow = { platform: string; account_label: string; followers: number; };
type UpcomingPost = { id: number; caption: string; platforms: string[]; scheduled_at: number; post_type: string; };
type AccountIns = {
  platform: string; followers: number; following: number; media_count: number;
  profile_views: number; impressions: number; reach: number; fetched_at: number;
};

export type DashboardVisualsProps = {
  userName: string;
  todayFormatted: string;
  kpis: { reach: number; engagementRate: number; followers: number; scheduledCount: number; };
  accounts: AcctRow[];
  upcomingPosts: UpcomingPost[];
  topPosts: DashPost[];
  accountInsights: AccountIns[];
  totalAccounts: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function scheduleLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(todayStart.getTime() + 86_400_000);
  const dayAfter = new Date(tomorrow.getTime() + 86_400_000);
  const t = d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });
  if (d >= todayStart && d < tomorrow) return `Heute · ${t}`;
  if (d >= tomorrow && d < dayAfter) return `Morgen · ${t}`;
  return `${d.toLocaleDateString("de-AT", { weekday: "short" })} · ${t}`;
}

const TYPE_LABEL: Record<string, string> = {
  feed: "Post", reel: "Reel", story: "Story", carousel: "Karussell",
  video: "Video", short: "Short", post: "Post", article: "Artikel", document: "Dokument",
};
const TYPE_ICON: Record<string, string> = {
  reel: "video", story: "clock", video: "video", short: "bolt",
  carousel: "grid", article: "folder", document: "upload", feed: "image", post: "image",
};

// ── SVG primitives ────────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 60, gid }: {
  data: number[]; color: string; height?: number; gid: string;
}) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 90 - 5}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L100,100 L0,100 Z`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.42"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

function Donut({ value, label, color, size = 140 }: {
  value: number; label: string; color: string; size?: number;
}) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} stroke="var(--glass-border)" strokeWidth="9" fill="none"/>
        <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="9" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
      }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)" }}>{value}%</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Static chart data ─────────────────────────────────────────────────────────

const SPARK: Record<string, number[]> = {
  reach:     [12,15,11,18,22,19,28,32,30,38,42,48],
  engage:    [6,7,8,7,9,8,10,9,11,10,12,11],
  followers: [40,41,42,43,44,45,45,46,46,47,47,48],
  scheduled: [2,3,5,4,6,5,7,8,9,8,10,12],
};
const PERF: Record<string, number[]> = {
  "7T":  [82,88,84,92,98,94,102],
  "30T": [28,32,30,38,42,40,48,52,49,58,62,68,65,72,78,76,82,88,84,92,98,94,102,108,112,118,122,128,132,138],
  "90T": [45,52,48,60,72,68,85,92,88,110,118,125,138,148,140,160,168,155,178,190,185,200,210,220],
  "1J":  [55,72,88,95,112,105,128,148,138,165,180,195],
};
const PERIODS = ["7T","30T","90T","1J"];
const PLATFORMS_LIST = ["instagram","tiktok","youtube","facebook","linkedin"];

// ── Main component ────────────────────────────────────────────────────────────

export function DashboardVisuals({
  userName, todayFormatted, kpis, accounts, upcomingPosts, topPosts, accountInsights, totalAccounts,
}: DashboardVisualsProps) {
  const [period, setPeriod] = useState("30T");

  const stats = [
    { key: "reach",     label: "Reichweite",    value: fmt(kpis.reach),                          delta: 18.4, color: "#22c55e", icon: "eye",      spark: SPARK.reach },
    { key: "engage",    label: "Engagement",    value: `${kpis.engagementRate.toFixed(1)}%`,     delta:  4.2, color: "#3b82f6", icon: "heart",    spark: SPARK.engage },
    { key: "followers", label: "Follower",      value: fmt(kpis.followers),                      delta:  9.1, color: "#a855f7", icon: "users",    spark: SPARK.followers },
    { key: "scheduled", label: "Posts geplant", value: String(kpis.scheduledCount),              delta: 12.0, color: "#f59e0b", icon: "calendar", spark: SPARK.scheduled },
  ];

  return (
    <div style={{ padding: "12px 28px 40px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Topbar ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "8px 0 4px" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 6 }}>Übersicht · {todayFormatted}</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
            Hallo{userName ? `, ${userName}` : ""} — willkommen zurück.
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="glass" style={{
            padding: "9px 14px", borderRadius: 999,
            display: "flex", alignItems: "center", gap: 10,
            width: 260, color: "var(--text-3)", fontSize: 13, fontWeight: 500,
          }}>
            <Icon name="search" size={15}/>
            <span>Suchen, Filtern…</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "2px 6px", background: "var(--accent-blue-soft)", borderRadius: 6, color: "var(--text-2)" }}>⌘K</span>
          </div>
          <button className="hs-btn hs-btn-icon hs-btn-glass"><Icon name="bell" size={16}/></button>
          <Link href="/upload" className="hs-btn hs-btn-primary">
            <Icon name="plus" size={14}/>Neuer Post
          </Link>
        </div>
      </div>

      {/* ── KI Banner ── */}
      <div className="glass ai-shimmer s-enter s-d1" style={{
        padding: "18px 22px", display: "flex", alignItems: "center", gap: 14,
        background: "linear-gradient(110deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, var(--green-action), var(--accent-blue))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", boxShadow: "0 4px 14px var(--green-glow)",
        }}>
          <Icon name="sparkles" size={20}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--green-action)" }}>
            KI-Insight · vor 12 Min.
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, letterSpacing: "-0.01em", color: "var(--text-1)" }}>
            Deine Reels performen zwischen <strong>14–16 Uhr</strong> aktuell <strong>+38%</strong> besser.
            Tipp: Verschiebe den heute geplanten Post auf 14:30.
          </div>
        </div>
        <Link href="/upload" className="hs-btn hs-btn-glass" style={{ padding: "8px 14px", fontSize: 13, flexShrink: 0 }}>
          Anwenden
        </Link>
      </div>

      {/* ── KPI cards ── */}
      <div className="s-enter s-d2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.key} className="glass kpi-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, minHeight: 150 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-2)" }}>
                <Icon name={s.icon} size={14}/>
                <span className="h-eyebrow">{s.label}</span>
              </div>
              <span className="hs-chip hs-chip-green" style={{ fontSize: 10, padding: "2px 8px" }}>
                <Icon name="arrow_up" size={10}/>+{s.delta}%
              </span>
            </div>
            <div className="stat-num" style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1, color: "var(--text-1)" }}>
              {s.value}
            </div>
            <div style={{ marginTop: "auto", height: 38 }}>
              <Sparkline data={s.spark} color={s.color} height={38} gid={`sk-${s.key}`}/>
            </div>
          </div>
        ))}
      </div>

      {/* ── Performance + Account roundup ── */}
      <div className="s-enter s-d3" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>

        {/* Performance chart */}
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div className="h-eyebrow">Performance · letzte 30 Tage</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 4, color: "var(--text-1)" }}>Reichweite & Engagement</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {PERIODS.map((p) => (
                <button key={p}
                  onClick={() => setPeriod(p)}
                  className={p === period ? "hs-btn hs-btn-glass" : "hs-btn hs-btn-ghost"}
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >{p}</button>
              ))}
            </div>
          </div>

          <div className="spark-grid" style={{ height: 220, position: "relative", borderRadius: 12, padding: "8px 4px", overflow: "hidden" }}>
            <Sparkline data={PERF[period]} color="var(--green-action)" height={220} gid="perf-main"/>
            <div style={{
              position: "absolute", top: 30, right: 60,
              background: "var(--glass-bg-strong)", backdropFilter: "blur(20px)",
              border: "1px solid var(--glass-border)",
              padding: "10px 14px", borderRadius: 12, fontSize: 12,
              boxShadow: "0 6px 18px rgba(12,24,56,0.15)",
              pointerEvents: "none",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: ".08em" }}>HEUTE</div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
                {kpis.reach > 0 ? `${fmt(kpis.reach)} Impressions` : "Keine Daten"}
              </div>
              <div style={{ fontSize: 11, color: "var(--green-action)", fontWeight: 700 }}>+24% vs. Vorwoche</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--glass-border)", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green-action)", display: "inline-block", flexShrink: 0 }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>Reichweite</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-blue)", display: "inline-block", flexShrink: 0 }}/>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Engagement</span>
            </div>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>Quelle: alle Plattformen</span>
          </div>
        </div>

        {/* Account roundup */}
        <div className="glass" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="h-eyebrow">Verknüpfte Accounts</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 4, color: "var(--text-1)" }}>
              {totalAccounts} aktiv
            </div>
          </div>

          {PLATFORMS_LIST.map((platform) => {
            const acc = accounts.find((a) => a.platform === platform);
            const ins = accountInsights.find((i) => i.platform === platform);
            const followers = ins?.followers ?? acc?.followers ?? 0;
            return (
              <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--glass-border)" }}>
                <PlatformLogo platform={platform} size={28}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {acc ? acc.account_label : "Nicht verbunden"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                    {followers > 0 ? fmt(followers) : "—"}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: followers > 0 ? "var(--green-action)" : "var(--text-3)" }}>
                    {followers > 0 ? "Aktiv" : "Neu"}
                  </div>
                </div>
              </div>
            );
          })}

          <Link href="/accounts" className="hs-btn hs-btn-glass" style={{ justifyContent: "center", marginTop: 4 }}>
            <Icon name="plus" size={14}/>Neuen Account verbinden
          </Link>
        </div>
      </div>

      {/* ── Upcoming posts + Sentiment ── */}
      <div className="s-enter s-d4" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14 }}>

        {/* Upcoming posts */}
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div className="h-eyebrow">Geplante Posts</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 4, color: "var(--text-1)" }}>Nächste 48 Stunden</div>
            </div>
            <Link href="/schedule" className="hs-btn hs-btn-ghost" style={{ fontSize: 13 }}>
              Alle anzeigen <Icon name="chevron_r" size={14}/>
            </Link>
          </div>

          {upcomingPosts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📅</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Keine geplanten Posts</div>
              <div style={{ fontSize: 13 }}>Erstelle jetzt deinen nächsten Post.</div>
              <Link href="/upload" className="hs-btn hs-btn-primary" style={{ marginTop: 16, display: "inline-flex", justifyContent: "center" }}>
                <Icon name="plus" size={14}/>Neuer Post
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingPosts.map((u) => {
                const primary = u.platforms[0] ?? "instagram";
                const color = PLATFORM_COLOR[primary] ?? "#6b7a99";
                const typeLabel = TYPE_LABEL[u.post_type] ?? u.post_type;
                const typeIcon = TYPE_ICON[u.post_type] ?? "image";
                return (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: 12, borderRadius: 12,
                    background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg, ${color}, ${color}99)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                    }}>
                      <PlatformLogo platform={primary} size={22}/>
                      <span style={{
                        position: "absolute", bottom: -4, right: -4,
                        width: 22, height: 22, borderRadius: "50%",
                        background: "white", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)", color,
                      }}>
                        <Icon name={typeIcon} size={11}/>
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span className="hs-chip" style={{ fontSize: 10, padding: "2px 7px" }}>
                          <Icon name="clock" size={10}/>{scheduleLabel(u.scheduled_at)}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>· {typeLabel}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-1)" }}>
                        {u.caption || <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Kein Caption</span>}
                      </div>
                    </div>
                    <Link href="/schedule" className="hs-btn hs-btn-icon hs-btn-ghost">
                      <Icon name="chevron_r" size={16}/>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sentiment */}
        <div className="glass" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div className="h-eyebrow">Sentiment · KI-Analyse</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 4, color: "var(--text-1)" }}>Stimmung</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Donut value={72} label="Positiv" color="var(--green-action)" size={140}/>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Positiv", v: 72, color: "var(--green-action)" },
              { label: "Neutral", v: 21, color: "#94a3b8" },
              { label: "Negativ", v:  7, color: "#ef4444" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                  <span style={{ color: "var(--text-1)" }}>{s.label}</span>
                  <span style={{ color: "var(--text-2)" }}>{s.v}%</span>
                </div>
                <div style={{ height: 5, background: "var(--accent-blue-soft)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${s.v}%`, height: "100%", background: s.color, borderRadius: 999, transition: "width .4s ease" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Posts ── */}
      <div className="glass s-enter s-d5" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="h-eyebrow">Top Posts</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginTop: 4, color: "var(--text-1)" }}>
              Performance · sortiert nach Views
            </div>
          </div>
          <Link href="/schedule" className="hs-btn hs-btn-ghost" style={{ fontSize: 13 }}>
            Alle Posts <Icon name="chevron_r" size={14}/>
          </Link>
        </div>
        <DashboardClient posts={topPosts} initialAccountInsights={accountInsights}/>
      </div>

    </div>
  );
}

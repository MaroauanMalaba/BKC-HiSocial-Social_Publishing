import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getInsightsForUser, getAccountInsightsForUser } from "@/lib/social/insights";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo } from "@/components/ui/platform-logos";

// Pre-computed static sparkline paths (no Math.random → no hydration mismatch)
const SPARK: Record<string, number[]> = {
  impressions: [20, 28, 32, 38, 42, 48, 52, 56, 62, 68, 72, 82],
  reach:       [12, 18, 22, 28, 32, 38, 42, 48, 52, 58, 62, 68],
  interact:    [ 8, 12, 14, 18, 22, 24, 28, 32, 30, 34, 38, 42],
  clicks:      [12, 14, 12, 16, 14, 18, 16, 14, 12, 16, 14, 12],
};

function SparklineSvg({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 90 - 5}`);
  const line = `M${pts.join(" L")}`;
  const id = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox="0 0 100 100" width="100%" height={36} preserveAspectRatio="none" style={{ display: "block", marginTop: 6 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${id})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

const TOP_POSTS = [
  { platform: "instagram", title: "Office Tour Reel",       reach: "124K", eng: "12.4%", delta: 32, bg: "#1e3a8a" },
  { platform: "tiktok",    title: "5 Produktivitätstipps", reach: "98K",  eng: "18.2%", delta: 28, bg: "#000000" },
  { platform: "linkedin",  title: "ROI Case Study",         reach: "42K",  eng: "7.8%",  delta: 14, bg: "#0A66C2" },
];

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const insightsMap = getInsightsForUser(user.id);
  const accountInsights = getAccountInsightsForUser(user.id);

  let totals = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, views: 0 };
  const byPlatform: Record<string, typeof totals> = {};

  for (const list of insightsMap.values()) {
    for (const i of list) {
      totals.views    += i.views;
      totals.reach    += i.reach;
      totals.likes    += i.likes;
      totals.comments += i.comments;
      totals.shares   += i.shares;
      totals.saves    += i.saves;
      if (!byPlatform[i.platform]) byPlatform[i.platform] = { impressions: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, views: 0 };
      byPlatform[i.platform].views    += i.views;
      byPlatform[i.platform].reach    += i.reach;
      byPlatform[i.platform].likes    += i.likes;
      byPlatform[i.platform].comments += i.comments;
    }
  }

  const kpis = [
    { label: "Impressions", value: totals.views,    delta: 24, color: "var(--green-action)", icon: "eye",   spark: SPARK.impressions },
    { label: "Reichweite",  value: totals.reach,    delta: 18, color: "var(--accent-blue)",  icon: "trend", spark: SPARK.reach       },
    { label: "Interaktion", value: totals.likes + totals.comments, delta: 12, color: "#a855f7", icon: "heart", spark: SPARK.interact },
    { label: "Klicks/Saves",value: totals.saves,    delta: -3, color: "#f59e0b",             icon: "share", spark: SPARK.clicks      },
  ];

  const audienceAge = [
    { label: "18–24", v: 18, c: "#a855f7" },
    { label: "25–34", v: 42, c: "var(--green-action)" },
    { label: "35–44", v: 24, c: "var(--accent-blue)" },
    { label: "45–54", v: 11, c: "#f59e0b" },
    { label: "55+",   v:  5, c: "#ef4444" },
  ];

  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 6 }}>Performance · alle Kanäle · 30 Tage</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
            Insights & Analytics
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="/api/insights/export" download className="hs-btn hs-btn-glass">
            <Icon name="folder" size={14}/>Export
          </a>
          <a href="#ki-recommendation" className="hs-btn hs-btn-primary">
            <Icon name="sparkles" size={14}/>KI-Report
          </a>
        </div>
      </div>

      {/* KPI row */}
      <div className="s-enter s-d2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {kpis.map((k) => (
          <div key={k.label} className="glass kpi-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
                <Icon name={k.icon} size={14}/>
                <span className="h-eyebrow">{k.label}</span>
              </div>
              <span className={`hs-chip ${k.delta > 0 ? "hs-chip-green" : "hs-chip-amber"}`} style={{ fontSize: 10, padding: "2px 8px" }}>
                <Icon name={k.delta > 0 ? "arrow_up" : "arrow_down"} size={10}/>
                {Math.abs(k.delta)}%
              </span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.035em", color: k.color }}>
              {formatCompact(k.value)}
            </div>
            <SparklineSvg data={k.spark} color={k.color}/>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="s-enter s-d3" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        {/* Platform breakdown */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Plattform-Breakdown</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, color: "var(--text-1)" }}>
            Reichweite & Engagement
          </div>
          {Object.keys(byPlatform).length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["instagram", "tiktok", "linkedin", "youtube"].map((p, i) => (
                <div key={p}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <PlatformLogo platform={p} size={18}/>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", textTransform: "capitalize" }}>{p}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>
                      <span>0 Views</span><span>0 Likes</span>
                    </div>
                  </div>
                  <div style={{ height: 8, background: "var(--accent-blue-soft)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${[0,0,0,0][i]}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--green-action), var(--accent-blue))" }}/>
                  </div>
                </div>
              ))}
              <div style={{ textAlign: "center", padding: "16px 0 4px", fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
                Verbinde Accounts unter <a href="/accounts" style={{ color: "var(--accent-blue)", textDecoration: "none", fontWeight: 700 }}>Accounts</a>, um echte Daten zu sehen.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Object.entries(byPlatform).map(([platform, data]) => {
                const maxViews = Math.max(...Object.values(byPlatform).map((d) => d.views)) || 1;
                return (
                  <div key={platform}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <PlatformLogo platform={platform} size={18}/>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>
                        <span>{formatCompact(data.views)} Views</span>
                        <span>{formatCompact(data.likes)} Likes</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "var(--accent-blue-soft)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        width: `${(data.views / maxViews) * 100}%`,
                        height: "100%", borderRadius: 999,
                        background: "linear-gradient(90deg, var(--green-action), var(--accent-blue))",
                      }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audience demographics */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Audience · Demografie</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, color: "var(--text-1)" }}>
            Alter & Geschlecht
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {audienceAge.map((a) => (
              <div key={a.label}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: "var(--text-2)" }}>{a.label}</span>
                  <span style={{ color: "var(--text-1)" }}>{a.v}%</span>
                </div>
                <div style={{ height: 8, background: "var(--accent-blue-soft)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${a.v * 1.8}%`, maxWidth: "100%", height: "100%", background: a.c, borderRadius: 999, boxShadow: `0 0 8px ${a.c}55` }}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--glass-border)", fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>
            <span>♀ 58%</span><span>♂ 41%</span><span>⬡ 1%</span>
          </div>
        </div>
      </div>

      {/* Account insights */}
      {accountInsights.length > 0 && (
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Account-Übersicht</div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, color: "var(--text-1)" }}>
            Alle Kanäle
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {accountInsights.map((acc) => (
              <div key={acc.platform} style={{ padding: 16, borderRadius: 14, background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <PlatformLogo platform={acc.platform} size={24}/>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)" }}>
                    {acc.platform.charAt(0).toUpperCase() + acc.platform.slice(1)}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { l: "Follower", v: acc.followers },
                    { l: "Posts",    v: acc.media_count },
                    { l: "Reach",    v: acc.reach },
                    { l: "Impressions", v: acc.impressions },
                  ].map((s) => (
                    <div key={s.l}>
                      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)" }}>{s.l}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)", marginTop: 2 }}>
                        {formatCompact(s.v)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Posts */}
      <div className="glass s-enter s-d4" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 4 }}>Top Posts</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)" }}>Was funktioniert hat</div>
          </div>
          <Link href="/schedule" className="hs-btn hs-btn-ghost" style={{ fontSize: 13 }}>
            Alle Posts <Icon name="chevron_r" size={14}/>
          </Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {TOP_POSTS.map((p, i) => (
            <div key={i} className="card-lift" style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: 14, borderRadius: 14,
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${p.bg}, ${p.bg}99)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
              }}>
                <span style={{
                  position: "absolute", top: -6, left: -6,
                  width: 24, height: 24, borderRadius: "50%",
                  background: "var(--glass-bg-strong)",
                  border: "1px solid var(--glass-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                }}>
                  <PlatformLogo platform={p.platform} size={14}/>
                </span>
                <span style={{
                  position: "absolute", top: 6, right: 6,
                  padding: "1px 6px", borderRadius: 6,
                  background: "rgba(255,255,255,0.92)", fontSize: 9, fontWeight: 800,
                  letterSpacing: ".05em", color: "#1e3a8a",
                }}>#{i + 1}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)", marginBottom: 6 }}>{p.title}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-2)", fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="eye" size={11}/> {p.reach}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon name="heart" size={11}/> {p.eng}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green-action)" }}>+{p.delta}% vs. avg</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI insight panel */}
      <div id="ki-recommendation" className="glass ai-shimmer" style={{
        padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
        background: "linear-gradient(110deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))",
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, var(--green-action), var(--accent-blue))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", boxShadow: "0 4px 14px var(--green-glow)",
        }}>
          <Icon name="sparkles" size={18}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--green-action)" }}>KI-Empfehlung</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 2, color: "var(--text-1)" }}>
            Freitag zwischen <strong>14–16 Uhr</strong> zeigt konsistent <strong>+38%</strong> mehr Engagement. Plane deine nächsten Posts gezielt für dieses Zeitfenster.
          </div>
        </div>
        <Link href="/upload" className="hs-btn hs-btn-primary">
          <Icon name="plus" size={14}/>Post planen
        </Link>
      </div>
    </div>
  );
}

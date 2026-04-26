import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Post } from "@/lib/db";
import { Icon } from "@/components/ui/icons";
import { PLATFORM_COLOR } from "@/components/ui/platform-logos";
import { CalendarClient, CalPost } from "./calendar-client";

function tryParse(json: string): Record<string, unknown> {
  try { return JSON.parse(json); } catch { return {}; }
}

export default async function SchedulePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();

  const posts = db.prepare(
    "SELECT * FROM posts WHERE user_id = ? ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 500"
  ).all(user.id) as Post[];

  const counts = {
    published: posts.filter((p) => p.status === "published").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    draft:     posts.filter((p) => p.status === "draft").length,
  };

  const calPosts: CalPost[] = posts.map((p) => {
    const meta = tryParse(p.platforms_json);
    const platforms: string[] = Array.isArray(meta.platforms) ? (meta.platforms as string[]) : [];
    return {
      id:           p.id,
      caption:      p.caption,
      platforms,
      scheduled_at: p.scheduled_at,
      created_at:   p.created_at,
      status:       p.status,
    };
  });

  const now = Date.now();
  const upcoming = calPosts
    .filter((p) => p.status === "scheduled" && p.scheduled_at && p.scheduled_at > now)
    .sort((a, b) => (a.scheduled_at ?? 0) - (b.scheduled_at ?? 0))
    .slice(0, 6);

  const KI_TIPS = [
    { icon: "clock",    title: "Beste Posting-Zeit",  body: "Di & Do · 14–16 Uhr liefern +38% mehr Reichweite als der Wochendurchschnitt." },
    { icon: "trend",    title: "Wachstumsmuster",     body: "Video-Posts performen 2,4× besser als statische Bilder — plane mehr Reels." },
    { icon: "sparkles", title: "Nächste Empfehlung",  body: "Freitag 15:30 Uhr — hohes Engagement-Fenster laut KI-Analyse der letzten 90 Tage." },
    { icon: "users",    title: "Audience-Peak",       body: "25–34 J., 58 % weiblich. Aktivste Phase: Wochentags 12–13 Uhr & 19–21 Uhr." },
  ];

  const TEMPLATES = [
    { label: "Montags-Motivation",   icon: "sparkles", sub: "Wochenstart-Hook + CTA",   color: "var(--green-action)" },
    { label: "Behind the Scenes",    icon: "eye",      sub: "Story-Format · Reel",       color: "var(--accent-blue)" },
    { label: "Case Study / ROI",     icon: "trend",    sub: "LinkedIn + Instagram Feed", color: "#a855f7"            },
    { label: "Team-Vorstellung",     icon: "users",    sub: "Persönlichkeit zeigen",     color: "#f59e0b"            },
    { label: "Produkt-Feature Drop", icon: "bolt",     sub: "Announcement · Countdown",  color: "#ef4444"            },
  ];

  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 6 }}>Kalender · Multi-Channel</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
            Content-Kalender
          </h1>
        </div>
        <Link href="/upload" className="hs-btn hs-btn-primary">
          <Icon name="plus" size={14}/>Neuer Post
        </Link>
      </div>

      {/* Stats */}
      <div className="s-enter s-d2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Veröffentlicht", value: counts.published, icon: "check",  color: "var(--green-action)" },
          { label: "Geplant",        value: counts.scheduled, icon: "clock",  color: "var(--accent-blue)"  },
          { label: "Entwürfe",       value: counts.draft,     icon: "folder", color: "var(--text-2)"       },
        ].map((s) => (
          <div key={s.label} className="glass card-lift" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--text-2)" }}>
              <Icon name={s.icon} size={14}/>
              <span className="h-eyebrow">{s.label}</span>
            </div>
            <div className="stat-num" style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="s-enter s-d3"><CalendarClient posts={calPosts}/></div>

      {/* ── Anstehende Posts ── */}
      <div className="glass s-enter s-d4" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 4 }}>Planung · Übersicht</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)" }}>
              Anstehende Posts
            </div>
          </div>
          <Link href="/upload" className="hs-btn hs-btn-primary">
            <Icon name="plus" size={14}/>Post planen
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "36px 0",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            color: "var(--text-3)",
          }}>
            <Icon name="calendar" size={32}/>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-2)" }}>Noch keine geplanten Posts</div>
            <div style={{ fontSize: 12 }}>Plane deinen nächsten Post und fülle den Kalender.</div>
            <Link href="/upload" className="hs-btn hs-btn-primary" style={{ marginTop: 4 }}>
              <Icon name="plus" size={14}/>Jetzt planen
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {upcoming.map((p) => {
              const d = new Date(p.scheduled_at ?? p.created_at);
              const color = PLATFORM_COLOR[p.platforms[0]] ?? "#888";
              return (
                <div key={p.id} className="card-lift" style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  borderLeft: `4px solid ${color}`,
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {p.platforms.slice(0, 3).map((pl) => (
                        <span key={pl} style={{
                          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                          background: PLATFORM_COLOR[pl] ?? "#888",
                        }}/>
                      ))}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                      textTransform: "uppercase", color: "var(--accent-blue)", marginLeft: "auto",
                    }}>
                      Geplant
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: "var(--text-1)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.caption || "Kein Caption"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>
                    <Icon name="clock" size={10}/>
                    {d.toLocaleDateString("de-AT", { weekday: "short", day: "numeric", month: "short" })}
                    {" · "}
                    {d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Content-Strategie + Post-Vorlagen ── */}
      <div className="s-enter s-d5" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* KI Content-Strategie */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>KI-Empfehlung</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16, color: "var(--text-1)" }}>
            Content-Strategie
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {KI_TIPS.map((tip) => (
              <div key={tip.title} style={{
                display: "flex", gap: 12, padding: "12px 14px", borderRadius: 12,
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: "rgba(34,197,94,0.12)", color: "var(--green-action)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={tip.icon} size={15}/>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>{tip.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>{tip.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Post-Vorlagen */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Templates · Schnellstart</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16, color: "var(--text-1)" }}>
            Post-Vorlagen
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TEMPLATES.map((tpl) => (
              <Link key={tpl.label} href="/upload" style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                borderRadius: 12, textDecoration: "none",
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                transition: "all .15s ease",
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: `${tpl.color}18`, color: tpl.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={tpl.icon} size={14}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{tpl.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{tpl.sub}</div>
                </div>
                <Icon name="chevron_r" size={14}/>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

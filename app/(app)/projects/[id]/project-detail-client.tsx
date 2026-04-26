"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo } from "@/components/ui/platform-logos";

type Project = {
  id: number; user_id: number; name: string; description: string; label: string;
  theme: string; status: string; tags: string; goal: string;
  deadline: number | null; post_count_published: number; post_count_total: number;
  created_at: number;
};
type AccountInsight = {
  platform: string; followers: number; reach: number; impressions: number;
};

// ── Theme gradients ───────────────────────────────────────────────────────────
const THEMES: Record<string, string> = {
  blue:   "linear-gradient(135deg, #1e3a8a, #4338ca, #22c55e)",
  purple: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)",
  green:  "linear-gradient(135deg, #15803d, #22c55e, #3b82f6)",
  orange: "linear-gradient(135deg, #ea580c, #f59e0b, #22c55e)",
  pink:   "linear-gradient(135deg, #be185d, #ec4899, #a855f7)",
  teal:   "linear-gradient(135deg, #0f766e, #14b8a6, #3b82f6)",
};

// ── AI Insights data ──────────────────────────────────────────────────────────
const AI_INSIGHTS = [
  { icon: "clock",     label: "Beste Posting-Zeit",   val: "Di & Do · 14–16 Uhr",          desc: "+38% Reach in dieser Zeitspanne über 30 Tage" },
  { icon: "smile",     label: "Sentiment-Analyse",    val: "72% positiv",                   desc: "Hauptthemen: Team-Kultur, Innovation, ROI" },
  { icon: "trend",     label: "Trend-Erkennung",      val: '„Behind the Scenes"',           desc: "+142% Suchvolumen in DACH letzte 14 Tage" },
  { icon: "sparkles",  label: "Caption-Vorschlag",    val: "Frage statt Aussage",           desc: "Posts mit Frage erzielen +28% Kommentare" },
  { icon: "target",    label: "Performance-Prognose", val: "+24K Reach",                    desc: "Erwartet bei Veröffentlichung um 14:30 heute" },
  { icon: "users",     label: "Audience-Insights",    val: "25–34 J., 58% ♀, München+Berlin", desc: "Top-Interessen: Strategy, Productivity, Travel" },
  { icon: "hash",      label: "Hashtag-Empfehlungen", val: "#strategy #b2bgrowth #munich",  desc: "7 weitere mit hohem Reichweiten-Potenzial" },
  { icon: "globe",     label: "Wettbewerber-Vergleich",val: "Du liegst Platz 3 / 12",       desc: "+1 Platz vs. Vormonat · 2 Plätze auf #1" },
];

// ── Per-platform display data ─────────────────────────────────────────────────
const PLATFORM_STATIC: Record<string, { eng: string; best: string; delta: number }> = {
  instagram: { eng: "12.4%", best: "14:30", delta: 32 },
  tiktok:    { eng: "18.2%", best: "18:00", delta: 28 },
  linkedin:  { eng: "7.8%",  best: "09:15", delta: 14 },
  youtube:   { eng: "4.2%",  best: "12:00", delta: -4 },
  facebook:  { eng: "5.1%",  best: "11:00", delta: 8  },
};
const PLATFORM_ORDER = ["instagram", "tiktok", "linkedin", "youtube", "facebook"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
function fmtDeadline(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" });
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function Donut({ value, label, size = 90 }: { value: number; label: string; size?: number }) {
  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 72 72" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="36" cy="36" r={r} stroke="var(--glass-border)" strokeWidth="6" fill="none"/>
        <circle cx="36" cy="36" r={r} stroke="var(--green-action)" strokeWidth="6" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ.toFixed(2)}
          strokeDashoffset={offset.toFixed(2)}
          style={{ filter: "drop-shadow(0 0 6px var(--green-glow))" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)" }}>{value}%</div>
        <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ProjectDetailClient({ project, accountInsights }: { project: Project; accountInsights: AccountInsight[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const tags: string[] = JSON.parse(project.tags || "[]");
  const progress = project.post_count_total > 0
    ? Math.round((project.post_count_published / project.post_count_total) * 100)
    : 0;

  const gradient = THEMES[project.theme] ?? THEMES.blue;

  const platformsWithData = PLATFORM_ORDER.filter((p) => {
    const ins = accountInsights.find((a) => a.platform === p);
    return ins || PLATFORM_STATIC[p];
  }).slice(0, 4);

  async function deleteProject() {
    if (!confirm("Projekt löschen?")) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <div style={{ padding: "12px 28px 40px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "8px 0 4px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Link href="/projects" className="hs-btn hs-btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}>
              <span style={{ display:"inline-flex", transform:"rotate(180deg)" }}><Icon name="chevron_r" size={12}/></span>Projekte
            </Link>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>
            <span className="h-eyebrow">{project.name}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", margin: 0, color: "var(--text-1)" }}>
            {project.name}
          </h1>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            Projekt-Detail · {project.post_count_published} von {project.post_count_total} Posts veröffentlicht
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={deleteProject} disabled={deleting} className="hs-btn hs-btn-ghost" style={{ fontSize: 13, color: "#ef4444", opacity: deleting ? 0.5 : 1 }}>
            <Icon name="x" size={14}/>Löschen
          </button>
          <Link href="/upload" className="hs-btn hs-btn-primary">
            <Icon name="plus" size={14}/>Post hinzufügen
          </Link>
        </div>
      </div>

      {/* ── Project hero ── */}
      <div className="glass" style={{ padding: 24, display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 22, alignItems: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20,
          background: gradient,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28, fontWeight: 800, color: "white", letterSpacing: "-0.03em",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 24px rgba(30,58,138,0.4)",
          flexShrink: 0,
        }}>{project.label}</div>

        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            {project.status === "active" && <span className="hs-chip hs-chip-green" style={{ fontSize: 11 }}>● Aktiv</span>}
            {project.status === "paused" && <span className="hs-chip hs-chip-amber" style={{ fontSize: 11 }}>⏸ Pausiert</span>}
            {project.status === "completed" && <span className="hs-chip" style={{ fontSize: 11 }}>✓ Abgeschlossen</span>}
            {tags.map((t) => <span key={t} className="hs-chip" style={{ fontSize: 11 }}>{t}</span>)}
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px", color: "var(--text-1)" }}>
            {project.name}
          </h2>
          {project.description && (
            <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0, maxWidth: 600, lineHeight: 1.5 }}>
              {project.description}
            </p>
          )}
          {project.goal && (
            <p style={{ fontSize: 13, color: "var(--text-3)", margin: "6px 0 0", fontStyle: "italic" }}>
              Ziel: {project.goal}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end", flexShrink: 0 }}>
          <Donut value={progress} label="Fortschritt" size={90}/>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>Deadline · {fmtDeadline(project.deadline)}</div>
        </div>
      </div>

      {/* ── KI-Insights grid ── */}
      <div className="glass" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: "linear-gradient(135deg, var(--green-action), var(--accent-blue))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", boxShadow: "0 4px 12px var(--green-glow)",
            }}>
              <Icon name="sparkles" size={16}/>
            </div>
            <div>
              <div className="h-eyebrow" style={{ color: "var(--green-action)" }}>KI-Generierte Insights · Live</div>
              <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)" }}>Was die KI über dieses Projekt weiß</div>
            </div>
          </div>
          <span className="hs-chip hs-chip-green" style={{ fontSize: 11 }}>
            <Icon name="bolt" size={10}/>vor 4 Min. aktualisiert
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {AI_INSIGHTS.map((ins) => (
            <div key={ins.label} style={{
              padding: 14, borderRadius: 14,
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              display: "flex", flexDirection: "column", gap: 8,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)",
                pointerEvents: "none",
              }}/>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-action)" }}>
                <Icon name={ins.icon} size={14}/>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{ins.label}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.015em", lineHeight: 1.2, color: "var(--text-1)" }}>{ins.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.4 }}>{ins.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Background context + per-account ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* KI Background context */}
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Icon name="sparkles" size={14}/>
            <span className="h-eyebrow" style={{ color: "var(--green-action)" }}>KI-Hintergrund-Kontext</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, color: "var(--text-1)" }}>
            Was du vor dem Posten wissen solltest
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, lineHeight: 1.5, color: "var(--text-2)" }}>
            {[
              {
                title: "Markt-Kontext",
                text: 'Consulting-Posts performen seit März +24% in DACH. „Office-Story"-Format hat 3.2× höheres Share-Verhältnis als Produkt-Demos.',
                border: "var(--green-action)", bg: "rgba(34,197,94,0.06)",
              },
              {
                title: "Audience-Pulse",
                text: "Deine Zielgruppe (CEOs/CMOs, 35–44) ist Mo–Mi am aktivsten. Vermeide Posts Fr nach 17 Uhr.",
                border: "var(--accent-blue)", bg: "rgba(59,130,246,0.06)",
              },
              {
                title: "Wettbewerber-Move",
                text: '„McKinsey DACH" hat 3 ähnliche Posts in 7 Tagen. Differenzierung über Lokalität (München) empfohlen.',
                border: "#a855f7", bg: "rgba(168,85,247,0.06)",
              },
              {
                title: "Risiko-Hinweis",
                text: "Aktueller LinkedIn-Algorithmus bestraft Links im Hauptpost. Setze sie in den ersten Kommentar.",
                border: "#f59e0b", bg: "rgba(245,158,11,0.06)",
              },
            ].map((c) => (
              <div key={c.title} style={{ padding: "12px 14px", borderRadius: 12, background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                <b style={{ color: "var(--text-1)" }}>{c.title}: </b>{c.text}
              </div>
            ))}
          </div>
        </div>

        {/* Per-account insights */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Pro Account</div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 16, color: "var(--text-1)" }}>
            Insights je Plattform
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {platformsWithData.map((platform, i) => {
              const ins = accountInsights.find((a) => a.platform === platform);
              const stat = PLATFORM_STATIC[platform];
              const reach = ins?.reach ?? 0;
              const delta = stat?.delta ?? 0;
              return (
                <div key={platform} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderTop: i > 0 ? "1px solid var(--glass-border)" : "none",
                }}>
                  <PlatformLogo platform={platform} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </span>
                      <span className={`hs-chip ${delta > 0 ? "hs-chip-green" : "hs-chip-amber"}`} style={{ fontSize: 10, padding: "1px 7px" }}>
                        {delta > 0 ? "+" : ""}{delta}%
                      </span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 11 }}>
                      <div>
                        <div style={{ color: "var(--text-3)", fontWeight: 600 }}>Reichweite</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-1)" }}>{reach > 0 ? fmt(reach) : "—"}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-3)", fontWeight: 600 }}>Engagement</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-1)" }}>{stat?.eng ?? "—"}</div>
                      </div>
                      <div>
                        <div style={{ color: "var(--text-3)", fontWeight: 600 }}>Beste Zeit</div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--green-action)" }}>{stat?.best ?? "—"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {platformsWithData.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-3)", padding: "16px 0", textAlign: "center" }}>
                Verbinde Accounts unter <Link href="/accounts" style={{ color: "var(--accent-blue)" }}>Accounts</Link>, um Daten zu sehen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

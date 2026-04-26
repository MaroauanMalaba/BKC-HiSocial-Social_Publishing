"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

type Project = {
  id: number; name: string; description: string; label: string; theme: string;
  status: "active" | "paused" | "completed"; tags: string; goal: string;
  deadline: number | null; post_count_published: number; post_count_total: number;
  created_at: number;
};

const THEMES: Record<string, string> = {
  blue:   "linear-gradient(135deg, #1e3a8a, #4338ca, #22c55e)",
  purple: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)",
  green:  "linear-gradient(135deg, #15803d, #22c55e, #3b82f6)",
  orange: "linear-gradient(135deg, #ea580c, #f59e0b, #22c55e)",
  pink:   "linear-gradient(135deg, #be185d, #ec4899, #a855f7)",
  teal:   "linear-gradient(135deg, #0f766e, #14b8a6, #3b82f6)",
};
const THEME_KEYS = Object.keys(THEMES);
const THEME_DOT: Record<string, string> = {
  blue: "#1e3a8a", purple: "#7c3aed", green: "#15803d",
  orange: "#ea580c", pink: "#be185d", teal: "#0f766e",
};

const STATUS_META = {
  active:    { label: "Aktiv",      chip: "hs-chip-green" },
  paused:    { label: "Pausiert",   chip: "hs-chip-amber" },
  completed: { label: "Abgeschlossen", chip: "hs-chip" },
};

function MiniDonut({ value }: { value: number }) {
  const r = 14, circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
      <svg width="40" height="40" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r={r} stroke="var(--glass-border)" strokeWidth="4" fill="none"/>
        <circle cx="18" cy="18" r={r} stroke="var(--green-action)" strokeWidth="4" fill="none"
          strokeLinecap="round" strokeDasharray={circ.toFixed(2)} strokeDashoffset={offset.toFixed(2)}/>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{value}%</div>
    </div>
  );
}

function fmtDeadline(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });
}

// ── New Project Modal ─────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Project) => void }) {
  const [name, setName]           = useState("");
  const [label, setLabel]         = useState("");
  const [theme, setTheme]         = useState("blue");
  const [desc, setDesc]           = useState("");
  const [goal, setGoal]           = useState("");
  const [deadline, setDeadline]   = useState("");
  const [total, setTotal]         = useState("0");
  const [tagsRaw, setTagsRaw]     = useState("");
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr("Name ist erforderlich."); return; }
    setSaving(true); setErr(null);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        label: (label.trim() || name.trim().slice(0,2)).toUpperCase(),
        theme,
        description: desc.trim(),
        goal: goal.trim(),
        deadline: deadline ? new Date(deadline).getTime() : undefined,
        post_count_total: parseInt(total, 10) || 0,
        tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(json.error ?? "Fehler"); return; }
    onCreate(json.project);
    onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(12,24,56,0.38)",
      backdropFilter: "blur(12px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass" style={{ width: 520, padding: 28, borderRadius: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 4 }}>Neues Projekt</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)" }}>Kampagne erstellen</div>
          </div>
          <button onClick={onClose} className="hs-btn hs-btn-icon hs-btn-ghost"><Icon name="x" size={16}/></button>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name + Label row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Projektname *</label>
              <input className="hs-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q2 Kampagne 2026" required/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Kürzel</label>
              <input className="hs-input" value={label} onChange={(e) => setLabel(e.target.value.slice(0,4))} placeholder="Q2" style={{ width: 72, textAlign: "center", fontWeight: 800, letterSpacing: "-0.02em" }}/>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 8 }}>Farbe</label>
            <div style={{ display: "flex", gap: 8 }}>
              {THEME_KEYS.map((t) => (
                <button key={t} type="button" onClick={() => setTheme(t)} style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: THEMES[t], border: theme === t ? "3px solid var(--text-1)" : "3px solid transparent",
                  cursor: "pointer", transition: "border .12s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}/>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Beschreibung</label>
            <textarea className="hs-input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Multi-Channel-Kampagne rund um…" rows={3} style={{ resize: "vertical" }}/>
          </div>

          {/* Goal + Deadline row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Ziel Posts</label>
              <input className="hs-input" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="24"/>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Deadline</label>
              <input className="hs-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}/>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Tags (Komma-getrennt)</label>
            <input className="hs-input" value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Q2 2026, B2B, Launch"/>
          </div>

          {/* Goal text */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Kampagnenziel</label>
            <input className="hs-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="100K Reichweite, 4K LinkedIn-Follower…"/>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
            {err ? (
              <span style={{ fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="x" size={14}/>{err}
              </span>
            ) : <span/>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={onClose} className="hs-btn hs-btn-ghost" style={{ padding: "9px 18px", fontSize: 13 }}>Abbrechen</button>
              <button type="submit" disabled={saving} className="hs-btn hs-btn-primary" style={{ padding: "9px 22px", fontSize: 13, opacity: saving ? 0.6 : 1 }}>
                <Icon name="plus" size={14}/>{saving ? "Erstelle…" : "Erstellen"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const tags: string[] = JSON.parse(project.tags || "[]");
  const status = STATUS_META[project.status] ?? STATUS_META.active;
  const progress = project.post_count_total > 0
    ? Math.round((project.post_count_published / project.post_count_total) * 100)
    : 0;

  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: "none" }}>
      <div className="glass" style={{
        padding: 22, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer",
        transition: "transform .15s ease, box-shadow .15s ease",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        {/* Top row: icon + chips */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, flexShrink: 0,
            background: THEMES[project.theme] ?? THEMES.blue,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "white", letterSpacing: "-0.03em",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), 0 6px 16px rgba(30,58,138,0.35)",
          }}>{project.label}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              <span className={`hs-chip ${status.chip}`} style={{ fontSize: 10 }}>● {status.label}</span>
              {tags.slice(0, 3).map((t) => (
                <span key={t} className="hs-chip" style={{ fontSize: 10 }}>{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)", lineHeight: 1.2 }}>
              {project.name}
            </div>
          </div>
        </div>

        {/* Description */}
        {project.description && (
          <p style={{
            fontSize: 13, color: "var(--text-2)", margin: 0, lineHeight: 1.5,
            overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {project.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 12, borderTop: "1px solid var(--glass-border)" }}>
          <MiniDonut value={progress}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>
              {project.post_count_published}/{project.post_count_total} Posts
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>
              Deadline · {fmtDeadline(project.deadline)}
            </div>
          </div>
          <div className="hs-btn hs-btn-icon hs-btn-ghost" style={{ flexShrink: 0 }}>
            <Icon name="chevron_r" size={15}/>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleCreate(p: Project) {
    setProjects((prev) => [p, ...prev]);
    router.push(`/projects/${p.id}`);
  }

  return (
    <>
      {/* Header actions */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setShowModal(true)} className="hs-btn hs-btn-primary">
          <Icon name="plus" size={14}/>Neues Projekt
        </button>
      </div>

      {/* Content */}
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
            background: "linear-gradient(135deg, #1e3a8a, #4338ca, #22c55e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
          }}>
            <Icon name="folder" size={32}/>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em", color: "var(--text-1)", marginBottom: 8 }}>
            Noch keine Projekte
          </div>
          <p style={{ fontSize: 14, color: "var(--text-3)", maxWidth: 380, margin: "0 auto 28px", lineHeight: 1.5 }}>
            Erstelle ein Projekt um Kampagnen zu planen, KI-Insights zu erhalten und dein Team zu koordinieren.
          </p>
          <button onClick={() => setShowModal(true)} className="hs-btn hs-btn-primary" style={{ fontSize: 15, padding: "12px 28px" }}>
            <Icon name="plus" size={16}/>Erstes Projekt erstellen
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {projects.map((p) => <ProjectCard key={p.id} project={p}/>)}
        </div>
      )}

      {showModal && (
        <NewProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate}/>
      )}
    </>
  );
}

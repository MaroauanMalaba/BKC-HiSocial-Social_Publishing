import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, TeamMember, User } from "@/lib/db";
import { TeamClient } from "./team-client";

type TeamMemberRow = TeamMember & { name: string | null };

export default async function TeamPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const rows = db.prepare(`
    SELECT tm.*, u.name
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE tm.workspace_owner_id = ?
    ORDER BY tm.created_at DESC
  `).all(user.id) as TeamMemberRow[];

  const totalCount  = rows.length;
  const adminCount  = rows.filter((r) => r.role === "admin").length;
  const editorCount = rows.filter((r) => r.role === "editor").length;
  const viewerCount = rows.filter((r) => r.role === "viewer").length;
  const pendingCount = rows.filter((r) => r.status === "pending").length;

  const initialMembers = rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? null,
    role: r.role as "admin" | "editor" | "viewer",
    status: r.status as "pending" | "active",
  }));

  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div className="h-eyebrow" style={{ marginBottom: 6 }}>Workspace · Zugriff</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
          Team
        </h1>
      </div>

      {/* Stats bar */}
      <div className="glass s-enter s-d2" style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, textAlign: "center" }}>
        {[
          { label: "Gesamt",     value: totalCount,   color: "var(--text-1)" },
          { label: "Admins",     value: adminCount,   color: "var(--accent-blue)" },
          { label: "Editoren",   value: editorCount,  color: "#15803d" },
          { label: "Viewer",     value: viewerCount,  color: "#b45309" },
          { label: "Ausstehend", value: pendingCount, color: "#f59e0b" },
        ].map((s, i) => (
          <div key={s.label}>
            <div className={`stat-num${i > 0 ? ` sn-${i + 1}` : ""}`} style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", color: "var(--text-3)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <TeamClient initialMembers={initialMembers}/>

      {/* Rollen + Workspace info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Role permissions */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Rollen</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, color: "var(--text-1)" }}>Berechtigungen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {[
              { r: "Owner",  desc: "Voller Zugriff · Abrechnung · Account-Verwaltung", color: "var(--accent-blue)", bg: "var(--accent-blue-soft)" },
              { r: "Admin",  desc: "Posts, Medien, Einstellungen, Team (kein Löschen)", color: "var(--accent-blue)", bg: "var(--accent-blue-soft)" },
              { r: "Editor", desc: "Posts erstellen, planen & veröffentlichen, Medien",  color: "#15803d",            bg: "rgba(34,197,94,0.12)"    },
              { r: "Viewer", desc: "Nur lesen — Dashboard, Kalender & Insights",          color: "#b45309",            bg: "rgba(251,191,36,0.14)"   },
            ].map((x) => (
              <div key={x.r} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, background: "var(--glass-bg)",
              }}>
                <span style={{
                  padding: "2px 10px", borderRadius: 999, fontWeight: 700, fontSize: 12,
                  flexShrink: 0, background: x.bg, color: x.color,
                }}>{x.r}</span>
                <span style={{ fontSize: 12, color: "var(--text-3)", flex: 1 }}>{x.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace info */}
        <div className="glass" style={{ padding: 22 }}>
          <div className="h-eyebrow" style={{ marginBottom: 4 }}>Workspace</div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, color: "var(--text-1)" }}>HiSocial Studio</div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 13 }}>
            {[
              { label: "Plan",                    value: "Studio · 49 €/Monat" },
              { label: "Mitglieder (inkl. Owner)", value: `${totalCount + 1}` },
              { label: "Einladungen ausstehend",   value: `${pendingCount}` },
              { label: "2FA verpflichtend",        toggle: true },
              { label: "KI-Auto-Suggest",          toggle: true },
            ].map((s, i, arr) => (
              <div key={s.label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 0",
                borderBottom: i < arr.length - 1 ? "1px solid var(--glass-border)" : "none",
              }}>
                <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{s.label}</span>
                {s.toggle ? (
                  <span style={{
                    width: 36, height: 20, borderRadius: 999, background: "var(--green-action)",
                    position: "relative", flexShrink: 0,
                    boxShadow: "0 0 8px rgba(34,197,94,0.35)",
                    display: "inline-block",
                  }}>
                    <span style={{ position: "absolute", right: 2, top: 2, width: 16, height: 16, borderRadius: "50%", background: "white" }}/>
                  </span>
                ) : (
                  <span style={{ fontWeight: 700, color: "var(--text-1)" }}>{s.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

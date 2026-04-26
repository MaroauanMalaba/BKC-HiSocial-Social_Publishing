"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";

type Member = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "active";
};

const ROLE_META = {
  admin:  { label: "Admin",   color: "var(--accent-blue)",  bg: "var(--accent-blue-soft)" },
  editor: { label: "Editor",  color: "#15803d",              bg: "rgba(34,197,94,0.12)"    },
  viewer: { label: "Viewer",  color: "#b45309",              bg: "rgba(251,191,36,0.14)"   },
};

const ROLE_DESC = {
  admin:  "Vollzugriff — Posts, Medien, Einstellungen, Team",
  editor: "Posts erstellen, planen & veröffentlichen, Medien hochladen",
  viewer: "Nur lesen — Dashboard, Kalender & Insights",
};

export function TeamClient({ initialMembers }: { initialMembers: Member[] }) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [email, setEmail]     = useState("");
  const [role, setRole]       = useState<Member["role"]>("editor");
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "Fehler" }); return; }
    setMembers((m) => [json.member, ...m]);
    setEmail("");
    setMsg({ ok: true, text: `${email} wurde eingeladen.` });
  }

  async function changeRole(id: number, newRole: string) {
    setMembers((m) => m.map((x) => x.id === id ? { ...x, role: newRole as Member["role"] } : x));
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  async function remove(id: number) {
    setRemoving(id);
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    setMembers((m) => m.filter((x) => x.id !== id));
    setRemoving(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Invite card */}
      <div className="glass" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)",
          }}>
            <Icon name="plus" size={16}/>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>Mitglied einladen</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>Neue Person per E-Mail hinzufügen</div>
          </div>
        </div>

        <form onSubmit={invite} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="hs-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.com"
              required
              style={{ flex: 1 }}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Member["role"])}
              className="hs-input"
              style={{ width: "auto", minWidth: 120, fontSize: 13 }}
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Role descriptions */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((r) => (
              <div key={r} style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                padding: "6px 12px", borderRadius: 10,
                background: role === r ? ROLE_META[r].bg : "var(--glass-bg)",
                border: `1px solid ${role === r ? "transparent" : "var(--glass-border)"}`,
                cursor: "pointer",
                transition: "all .12s ease",
              }} onClick={() => setRole(r)}>
                <span style={{ fontWeight: 700, color: ROLE_META[r].color }}>{ROLE_META[r].label}</span>
                <span style={{ color: "var(--text-3)" }}>— {ROLE_DESC[r]}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {msg ? (
              <span style={{ fontSize: 13, fontWeight: 500, color: msg.ok ? "#4ade80" : "#f87171", display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name={msg.ok ? "check" : "x"} size={14}/>{msg.text}
              </span>
            ) : <span/>}
            <button
              type="submit"
              disabled={saving}
              className="hs-btn hs-btn-primary"
              style={{ padding: "9px 22px", fontSize: 13, opacity: saving ? 0.6 : 1 }}
            >
              <Icon name="plus" size={14}/>
              {saving ? "Einladen…" : "Einladen"}
            </button>
          </div>
        </form>
      </div>

      {/* Member list */}
      <div className="glass" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)",
          }}>
            <Icon name="users" size={16}/>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>Mitglieder</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{members.length} {members.length === 1 ? "Person" : "Personen"} im Team</div>
          </div>
        </div>

        {members.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            color: "var(--text-3)", fontSize: 14,
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 600, color: "var(--text-2)", marginBottom: 6 }}>Noch niemand eingeladen</div>
            <div>Füge oben Teammitglieder hinzu um gemeinsam zu arbeiten.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map((m) => {
              const meta = ROLE_META[m.role];
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px", borderRadius: 14,
                  background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                  transition: "opacity .15s ease",
                  opacity: removing === m.id ? 0.4 : 1,
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg, var(--accent-blue-soft), var(--glass-bg-strong))",
                    border: "1.5px solid var(--glass-border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "var(--accent-blue)",
                  }}>
                    {(m.name || m.email)[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.name || m.email}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.name ? m.email : "Noch kein Account"}
                    </div>
                  </div>

                  {/* Status badge */}
                  {m.status === "pending" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: "rgba(251,191,36,0.14)", color: "#b45309", flexShrink: 0,
                      border: "1px solid rgba(251,191,36,0.2)",
                    }}>
                      Ausstehend
                    </span>
                  )}
                  {m.status === "active" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                      background: "rgba(34,197,94,0.1)", color: "#15803d", flexShrink: 0,
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}>
                      Aktiv
                    </span>
                  )}

                  {/* Role select */}
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: "5px 12px 5px 10px",
                      borderRadius: 999, border: "1px solid var(--glass-border)",
                      background: meta.bg, color: meta.color,
                      cursor: "pointer", outline: "none", flexShrink: 0,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    <option value="admin">Admin</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>

                  {/* Remove */}
                  <button
                    onClick={() => remove(m.id)}
                    disabled={removing === m.id}
                    style={{
                      background: "none", border: "none", cursor: removing === m.id ? "not-allowed" : "pointer",
                      color: "var(--text-3)", padding: "6px", borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title="Entfernen"
                  >
                    <Icon name="x" size={15}/>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

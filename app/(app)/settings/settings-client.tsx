"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

type Section = "profile" | "password" | "integrations" | "danger";

type TeamMemberRow = {
  id: number;
  email: string;
  name: string | null;
  role: "admin" | "editor" | "viewer";
  status: "pending" | "active";
};

export function SettingsClient({ initialName, initialEmail, initialZernioId, isOAuth }: {
  initialName: string;
  initialEmail: string;
  initialZernioId: string;
  isOAuth: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ProfileSection initialName={initialName} initialEmail={initialEmail}/>
      {!isOAuth && <PasswordSection/>}
      <IntegrationsSection initialZernioId={initialZernioId}/>
      <TeamSection/>
      <DangerSection/>
    </div>
  );
}

/* ─── Profile ─── */
function ProfileSection({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const [name, setName]   = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "Fehler" }); return; }
    setMsg({ ok: true, text: "Profil gespeichert." });
    router.refresh();
  }

  return (
    <SettingsCard icon="users" title="Profil" subtitle="Name und E-Mail-Adresse">
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name">
          <input
            className="hs-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
          />
        </Field>
        <Field label="E-Mail">
          <input
            className="hs-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="deine@email.com"
            required
          />
        </Field>
        <FormFooter saving={saving} msg={msg}/>
      </form>
    </SettingsCard>
  );
}

/* ─── Password ─── */
function PasswordSection() {
  const [old, setOld]       = useState("");
  const [next, setNext]     = useState("");
  const [confirm, setConf]  = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setMsg({ ok: false, text: "Passwörter stimmen nicht überein" }); return; }
    setSaving(true); setMsg(null);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ old_password: old, new_password: next }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "Fehler" }); return; }
    setMsg({ ok: true, text: "Passwort geändert." });
    setOld(""); setNext(""); setConf("");
  }

  return (
    <SettingsCard icon="lock" title="Passwort" subtitle="Passwort ändern">
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Aktuelles Passwort">
          <input className="hs-input" type="password" value={old} onChange={(e) => setOld(e.target.value)} placeholder="••••••••" required/>
        </Field>
        <Field label="Neues Passwort">
          <input className="hs-input" type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min. 8 Zeichen" required minLength={8}/>
        </Field>
        <Field label="Passwort bestätigen">
          <input className="hs-input" type="password" value={confirm} onChange={(e) => setConf(e.target.value)} placeholder="••••••••" required/>
        </Field>
        <FormFooter saving={saving} msg={msg}/>
      </form>
    </SettingsCard>
  );
}

/* ─── Integrations ─── */
function IntegrationsSection({ initialZernioId }: { initialZernioId: string }) {
  const [zernioId, setZernioId] = useState(initialZernioId);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zernio_profile_id: zernioId.trim() }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setMsg({ ok: false, text: json.error ?? "Fehler" }); return; }
    setMsg({ ok: true, text: "Zernio-Profil gespeichert." });
    router.refresh();
  }

  return (
    <SettingsCard icon="link" title="Integrationen" subtitle="Social-Media-Dienste konfigurieren">
      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Zernio Profil-ID">
          <input
            className="hs-input"
            type="text"
            value={zernioId}
            onChange={(e) => setZernioId(e.target.value)}
            placeholder="Zernio-Profil-ID (z.B. prof_abc123)"
          />
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 6, lineHeight: 1.5 }}>
            Deine Zernio-Profil-ID findest du im Zernio-Dashboard unter Settings → API. Sie wird benötigt, um Social-Media-Accounts zu verbinden und Posts zu veröffentlichen.
          </p>
        </Field>

        <div style={{
          padding: "12px 16px", borderRadius: 12,
          background: "var(--accent-blue-soft)", border: "1px solid rgba(96,165,250,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="globe" size={14}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-blue)" }}>Accounts verbinden</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
            Nach dem Speichern der Profil-ID kannst du unter{" "}
            <a href="/accounts" style={{ color: "var(--accent-blue)", textDecoration: "none", fontWeight: 600 }}>Accounts</a>
            {" "}deine Social-Media-Kanäle verbinden.
          </p>
        </div>

        <FormFooter saving={saving} msg={msg}/>
      </form>
    </SettingsCard>
  );
}

/* ─── Team ─── */
const ROLE_META = {
  admin:  { label: "Admin",   color: "var(--accent-blue)",  bg: "var(--accent-blue-soft)" },
  editor: { label: "Editor",  color: "#15803d",              bg: "rgba(34,197,94,0.12)"    },
  viewer: { label: "Viewer",  color: "#b45309",              bg: "rgba(251,191,36,0.14)"   },
};
const ROLE_DESC = {
  admin:  "Vollzugriff — Posts, Medien, Einstellungen, Team (kein Account-Löschen)",
  editor: "Posts erstellen, planen & veröffentlichen, Medien hochladen",
  viewer: "Nur lesen — Dashboard, Kalender & Insights",
};

function TeamSection() {
  const [members, setMembers]   = useState<TeamMemberRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [email, setEmail]       = useState("");
  const [role, setRole]         = useState<"admin" | "editor" | "viewer">("editor");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => { setMembers(d.members ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
    setMembers((m) => [...m, json.member]);
    setEmail("");
    setMsg({ ok: true, text: `${email} wurde eingeladen.` });
  }

  async function changeRole(id: number, newRole: string) {
    setMembers((m) => m.map((x) => x.id === id ? { ...x, role: newRole as TeamMemberRow["role"] } : x));
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
  }

  async function remove(id: number) {
    setMembers((m) => m.filter((x) => x.id !== id));
    await fetch(`/api/team/${id}`, { method: "DELETE" });
  }

  return (
    <SettingsCard icon="users" title="Team" subtitle="Mitglieder & Berechtigungen">
      {/* Member list */}
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--text-3)", padding: "8px 0" }}>Lade…</div>
      ) : members.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-3)", padding: "8px 0" }}>
          Noch keine Teammitglieder. Lade jemanden ein.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {members.map((m) => {
            const meta = ROLE_META[m.role];
            return (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 14,
                background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, var(--accent-blue-soft), var(--glass-bg-strong))",
                  border: "1px solid var(--glass-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: "var(--accent-blue)",
                }}>
                  {(m.name || m.email)[0].toUpperCase()}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name || m.email}
                  </div>
                  {m.name && (
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.email}
                    </div>
                  )}
                </div>
                {/* Status badge */}
                {m.status === "pending" && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "rgba(251,191,36,0.14)", color: "#b45309", flexShrink: 0 }}>
                    Ausstehend
                  </span>
                )}
                {/* Role select */}
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                  style={{
                    fontSize: 12, fontWeight: 700, padding: "4px 10px 4px 8px",
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
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 8, flexShrink: 0 }}
                  title="Entfernen"
                >
                  <Icon name="x" size={15}/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Role legend */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {(Object.keys(ROLE_META) as Array<keyof typeof ROLE_META>).map((r) => (
          <div key={r} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{
              padding: "2px 10px", borderRadius: 999, fontWeight: 700, flexShrink: 0,
              background: ROLE_META[r].bg, color: ROLE_META[r].color,
            }}>{ROLE_META[r].label}</span>
            <span style={{ color: "var(--text-3)" }}>{ROLE_DESC[r]}</span>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <form onSubmit={invite} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <input
              className="hs-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@beispiel.com"
              required
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamMemberRow["role"])}
            className="hs-input"
            style={{ width: "auto", minWidth: 110, fontSize: 13 }}
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
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
            style={{ padding: "9px 20px", fontSize: 13, opacity: saving ? 0.6 : 1 }}
          >
            <Icon name="plus" size={14}/>
            {saving ? "Einladen…" : "Einladen"}
          </button>
        </div>
      </form>
    </SettingsCard>
  );
}

/* ─── Danger Zone ─── */
function DangerSection() {
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function deleteAccount() {
    if (!confirm) { setConfirm(true); return; }
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <SettingsCard icon="x" title="Gefahrenzone" subtitle="Irreversible Aktionen">
      <div style={{
        padding: "16px", borderRadius: 12,
        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
          Abmelden
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.5 }}>
          Beendet deine aktuelle Session. Du kannst dich jederzeit wieder anmelden.
        </p>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
          }}
          className="hs-btn hs-btn-glass"
          style={{ padding: "8px 16px", fontSize: 13 }}
        >
          <Icon name="logout" size={14}/>Abmelden
        </button>
      </div>
    </SettingsCard>
  );
}

/* ─── Helpers ─── */
function SettingsCard({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="glass" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--glass-border)" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--accent-blue)",
        }}>
          <Icon name={icon} size={16}/>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FormFooter({ saving, msg }: { saving: boolean; msg: { ok: boolean; text: string } | null }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 4 }}>
      {msg ? (
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: msg.ok ? "#4ade80" : "#f87171",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Icon name={msg.ok ? "check" : "x"} size={14}/>
          {msg.text}
        </span>
      ) : <span/>}
      <button
        type="submit"
        disabled={saving}
        className="hs-btn hs-btn-primary"
        style={{ padding: "9px 20px", fontSize: 13, opacity: saving ? 0.6 : 1 }}
      >
        <Icon name="check" size={14}/>
        {saving ? "Speichere…" : "Speichern"}
      </button>
    </div>
  );
}

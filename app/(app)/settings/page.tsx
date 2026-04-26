import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { Icon } from "@/components/ui/icons";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const publishedCount = (db.prepare("SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'published'").get(user.id) as { n: number }).n;
  const scheduledCount = (db.prepare("SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'scheduled'").get(user.id) as { n: number }).n;
  const mediaCount     = (db.prepare("SELECT COUNT(*) as n FROM media WHERE user_id = ?").get(user.id) as { n: number }).n;

  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <div className="h-eyebrow" style={{ marginBottom: 6 }}>Account · Workspace</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
          Einstellungen
        </h1>
      </div>

      {/* Account overview */}
      <div className="glass" style={{ padding: 22, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: "linear-gradient(135deg, #60a5fa, #1e3a8a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 22,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 8px 20px rgba(30,58,138,0.4)",
          flexShrink: 0,
        }}>
          {(user.name || user.email || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
            {user.name || "Kein Name gesetzt"}
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 2 }}>{user.email}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4, fontWeight: 600 }}>
            Mitglied seit {new Date(user.created_at).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" })}
            {" · "}{user.auth_provider === "meta" ? "Meta OAuth" : "E-Mail Login"}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, textAlign: "center" }}>
          {[
            { label: "Posts",   value: publishedCount },
            { label: "Geplant", value: scheduledCount },
            { label: "Medien",  value: mediaCount },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)" }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3)", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings forms */}
      <SettingsClient
        initialName={user.name ?? ""}
        initialEmail={user.email ?? ""}
        initialZernioId={user.zernio_profile_id ?? ""}
        isOAuth={user.auth_provider !== "password"}
      />
    </div>
  );
}

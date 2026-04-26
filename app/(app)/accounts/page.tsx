import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedAccounts } from "@/lib/social/zernio";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo } from "@/components/ui/platform-logos";
import { AccountManager } from "./account-manager";

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin"];

export default async function AccountsPage({ searchParams }: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { connected, error } = await searchParams;

  const accounts = user.zernio_profile_id
    ? await getConnectedAccounts(user.zernio_profile_id).catch(() => [])
    : [];

  const connectedCount = accounts.filter((a) => !a.disconnected).length;

  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 6 }}>Einstellungen · Integrationen</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
            Accounts verbinden
          </h1>
        </div>
      </div>

      {/* Notification banners */}
      {connected && (
        <div style={{
          padding: "14px 18px", borderRadius: 14, fontSize: 14, fontWeight: 500,
          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#15803d",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon name="check" size={16}/>
          {connected.charAt(0).toUpperCase() + connected.slice(1)} erfolgreich verbunden.
        </div>
      )}
      {error && (
        <div style={{
          padding: "16px 18px", borderRadius: 14, fontSize: 14,
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{ flexShrink: 0, marginTop: 1, color: "#ef4444" }}><Icon name="x" size={16}/></div>
          <div>
            <div style={{ fontWeight: 700, color: "#b91c1c", marginBottom: 4 }}>
              {error === "no_facebook_pages"
                ? "Keine Facebook-Seite gefunden"
                : "Verbindung fehlgeschlagen"}
            </div>
            <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.5 }}>
              {error === "no_facebook_pages"
                ? "Facebook erlaubt das Posten nur über Facebook-Seiten (Pages), nicht über persönliche Profile. Erstelle eine Facebook-Seite unter facebook.com/pages/create und versuche es erneut."
                : error}
            </div>
          </div>
        </div>
      )}

      {/* Hero glass card */}
      <div className="glass" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: "linear-gradient(135deg, var(--green-action), var(--accent-blue))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", boxShadow: "0 6px 16px var(--green-glow)",
        }}>
          <Icon name="globe" size={22}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
            Verbinde alle deine Kanäle in einem Workspace
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            Sicherer OAuth-Login. BKC Consulting & HiSocial speichern keine Passwörter.
          </div>
        </div>
        <a
          href="/api/zernio/connect?platform=instagram"
          className="hs-btn hs-btn-primary"
        >
          <Icon name="plus" size={14}/>Plattform hinzufügen
        </a>
      </div>

      {/* Stats row */}
      <div className="s-enter s-d2" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Verbunden", value: `${connectedCount}/5`, sub: "● Accounts aktiv",   color: "var(--green-action)" },
          { label: "Plattformen", value: PLATFORMS.length.toString(), sub: "Social Networks",    color: "var(--accent-blue)" },
          { label: "Letzter Sync", value: "2′",     sub: "vor 2 Minuten · auto", color: "var(--text-2)" },
        ].map((s) => (
          <div key={s.label} className="glass card-lift" style={{ padding: 18 }}>
            <div className="h-eyebrow" style={{ marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-1)", marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: s.color }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Platform cards */}
      <div className="s-enter s-d3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {PLATFORMS.map((p) => {
          const connected = accounts.filter((a) => a.platform === p && !a.disconnected);
          return (
            <div key={p} className="glass platform-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PlatformLogo platform={p} size={32}/>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </div>
                  <div style={{ fontSize: 11, color: connected.length ? "var(--green-action)" : "var(--text-3)", fontWeight: 600 }}>
                    {connected.length > 0 ? `${connected.length} verbunden` : "Nicht verbunden"}
                  </div>
                </div>
              </div>
              {connected.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {connected.map((a) => (
                    <div key={a._id} className="hs-chip hs-chip-green" style={{ justifyContent: "flex-start" }}>
                      <Icon name="check" size={10}/>
                      {a.username ? `@${a.username}` : a.name}
                    </div>
                  ))}
                </div>
              )}
              <a
                href={`/api/zernio/connect?platform=${p}`}
                className="hs-btn hs-btn-glass"
                style={{ justifyContent: "center", marginTop: "auto" }}
              >
                {connected.length > 0 ? "Weiteren verbinden" : `${p.charAt(0).toUpperCase() + p.slice(1)} verbinden`}
              </a>
            </div>
          );
        })}
      </div>

      {/* Account list */}
      {accounts.length > 0 && (
        <div className="glass" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--text-1)" }}>
              Deine Accounts
            </div>
          </div>
          <AccountManager initialAccounts={accounts}/>
        </div>
      )}
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { PlatformLogo } from "@/components/ui/platform-logos";

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin"];

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left hero panel */}
      <div style={{
        flex: "1 1 52%",
        position: "relative",
        padding: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0c1838 100%)",
        color: "white",
        overflow: "hidden",
      }}>
        {/* Orbs */}
        <div style={{
          position: "absolute", width: 360, height: 360, borderRadius: "50%",
          top: -80, right: -80,
          background: "radial-gradient(circle, rgba(34,197,94,0.45), transparent 65%)",
          filter: "blur(20px)", pointerEvents: "none",
        }}/>
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          bottom: -60, left: -40,
          background: "radial-gradient(circle, rgba(96,165,250,0.55), transparent 65%)",
          filter: "blur(20px)", pointerEvents: "none",
        }}/>

        {/* Co-brand pill */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "8px 14px", borderRadius: 999,
            background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(20px)", fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", opacity: 0.7 }}>BKC CONSULTING</span>
            <span style={{ opacity: 0.5 }}>×</span>
            <span style={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: 14 }}>HiSocial</span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{ fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}>
            Ein Studio.<br/>
            <span style={{
              background: "linear-gradient(120deg, #34d671, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Alle Kanäle.
            </span>
          </h1>
          <p style={{ fontSize: 17, fontWeight: 500, lineHeight: 1.5, marginTop: 22, maxWidth: 380, color: "rgba(255,255,255,0.78)" }}>
            Plane, publishe und analysiere deine Social-Media-Inhalte mit KI-Unterstützung — alles an einem Ort.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            {PLATFORMS.map((p) => (
              <div key={p} style={{
                width: 38, height: 38, borderRadius: 12,
                background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)",
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(20px)",
              }}>
                <PlatformLogo platform={p} size={20}/>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: ".08em", textTransform: "uppercase" }}>
          Powered by BKC Consulting · v2.4
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: "1 1 48%",
        padding: "60px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "var(--bg-base)",
      }}>
        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          <div className="h-eyebrow" style={{ marginBottom: 14 }}>Willkommen zurück</div>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.035em", margin: "0 0 8px", color: "var(--text-1)" }}>Anmelden</h2>
          <p style={{ fontSize: 15, color: "var(--text-2)", margin: "0 0 28px" }}>
            Melde dich in deinem Workspace an, um zu publishen.
          </p>
          <LoginForm/>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body: Record<string, string> = { email, password };
    if (mode === "register" && name) body.name = name;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Fehler");
      return;
    }

    if (mode === "register") {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) { setMode("login"); return; }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Mode toggle */}
      <div className="glass" style={{
        padding: 4, borderRadius: 999, display: "flex", gap: 2,
      }}>
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(""); }}
            className={m === mode ? "hs-btn hs-btn-primary" : "hs-btn hs-btn-ghost"}
            style={{ flex: 1, justifyContent: "center", padding: "8px 14px", fontSize: 13 }}
          >
            {m === "login" ? "Anmelden" : "Registrieren"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "register" && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Name (optional)</label>
            <input
              className="hs-input"
              type="text"
              placeholder="Jonas Müller"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>E-Mail</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}>
              <Icon name="mail" size={16}/>
            </span>
            <input
              className="hs-input"
              type="email"
              placeholder="jonas@bkc-consulting.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-2)", display: "block", marginBottom: 6 }}>Passwort</label>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-3)" }}>
              <Icon name="lock" size={16}/>
            </span>
            <input
              className="hs-input"
              type="password"
              placeholder="••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
        </div>

        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171",
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="hs-btn hs-btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "14px", fontSize: 15, marginTop: 4, opacity: loading ? 0.6 : 1 }}
        >
          <Icon name="bolt" size={16}/>
          {loading ? "Einen Moment…" : mode === "login" ? "Anmelden" : "Account erstellen"}
        </button>
      </form>
    </div>
  );
}

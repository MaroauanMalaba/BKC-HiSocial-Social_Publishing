"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
      // After register, log in immediately
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) {
        setMode("login");
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg border border-neutral-700 overflow-hidden text-sm">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(""); }}
          className={"flex-1 py-2 transition " + (mode === "login" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white")}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(""); }}
          className={"flex-1 py-2 transition " + (mode === "register" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white")}
        >
          Registrieren
        </button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <input
            type="text"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
          />
        )}
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />
        <input
          type="password"
          placeholder="Passwort"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />

        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-900/40 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-neutral-100 hover:bg-white text-neutral-900 font-medium py-2 text-sm transition disabled:opacity-50"
        >
          {loading ? "..." : mode === "login" ? "Einloggen" : "Account erstellen"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";

type Platform = {
  platform: string;
  display_name?: string;
};

export function AccountManager({ initialPlatforms }: { initialPlatforms: Platform[] }) {
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [loading, setLoading] = useState(false);

  async function openConnectFlow() {
    setLoading(true);
    try {
      const res = await fetch("/api/ayrshare/connect");
      const json = await res.json();
      setLoading(false);
      if (json.url) {
        window.open(json.url, "_blank", "width=600,height=700");
      } else {
        alert(json.error || "Fehler beim Öffnen des Connect-Fensters");
      }
    } catch (e) {
      setLoading(false);
      alert("Netzwerkfehler: " + String(e));
    }
  }

  async function refresh() {
    const res = await fetch("/api/ayrshare/platforms");
    const json = await res.json();
    if (json.platforms) setPlatforms(json.platforms);
  }

  const all = ["instagram", "facebook", "tiktok", "youtube", "linkedin", "twitter"];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex items-center justify-between">
        <div>
          <div className="font-medium text-white">Social Accounts verbinden</div>
          <div className="text-sm text-neutral-400 mt-1">
            Verbinde Instagram, Facebook, TikTok und mehr — in einem Schritt.
          </div>
        </div>
        <button
          onClick={openConnectFlow}
          disabled={loading}
          className="rounded-lg bg-white text-neutral-900 font-medium px-4 py-2 text-sm hover:bg-neutral-100 transition disabled:opacity-50"
        >
          {loading ? "Lädt..." : platforms.length > 0 ? "Accounts verwalten" : "Accounts verbinden"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {all.map((p) => {
          const connected = platforms.find((pl) => pl.platform === p);
          return (
            <div
              key={p}
              className={
                "rounded-xl border p-5 flex flex-col gap-2 " +
                (connected
                  ? "border-green-900/40 bg-green-900/10"
                  : "border-neutral-800 bg-neutral-900/20 opacity-50")
              }
            >
              <div className="text-xs uppercase tracking-widest text-white/60">{p}</div>
              <div className="text-sm font-medium text-white">
                {connected ? (connected.display_name || "Verbunden") : "Nicht verbunden"}
              </div>
              <div className={"text-xs " + (connected ? "text-green-400" : "text-neutral-500")}>
                {connected ? "✓ aktiv" : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={refresh}
        className="text-xs text-neutral-500 hover:text-neutral-300 transition"
      >
        Status aktualisieren
      </button>
    </div>
  );
}

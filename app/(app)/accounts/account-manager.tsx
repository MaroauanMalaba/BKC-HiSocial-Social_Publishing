"use client";

import { useState } from "react";
import { PlatformLogo } from "@/components/ui/platform-logos";
import { Icon } from "@/components/ui/icons";

type ZernioAccount = {
  _id: string;
  platform: string;
  name: string;
  username?: string;
  disconnected?: boolean;
};

export function AccountManager({ initialAccounts }: { initialAccounts: ZernioAccount[] }) {
  const [accounts, setAccounts] = useState<ZernioAccount[]>(initialAccounts);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    const res = await fetch("/api/zernio/accounts");
    const json = await res.json();
    if (json.accounts) setAccounts(json.accounts);
    setRefreshing(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {accounts.map((a, i) => (
        <div key={a._id} style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 0",
          borderTop: i ? "1px solid var(--glass-border)" : "none",
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12, flexShrink: 0,
            background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PlatformLogo platform={a.platform} size={24}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>
                {a.name}
              </span>
              {a.disconnected
                ? <span className="hs-chip hs-chip-amber">⚠ Getrennt</span>
                : <span className="hs-chip hs-chip-green"><Icon name="check" size={10}/>Verbunden</span>
              }
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, marginTop: 2 }}>
              {a.username ? `@${a.username}` : "—"} · {a.platform.charAt(0).toUpperCase() + a.platform.slice(1)}
            </div>
          </div>
          {a.disconnected ? (
            <a href={`/api/zernio/connect?platform=${a.platform}`} className="hs-btn hs-btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
              Erneuern
            </a>
          ) : (
            <button className="hs-btn hs-btn-glass" style={{ padding: "8px 14px", fontSize: 13 }}>
              Verwalten
            </button>
          )}
        </div>
      ))}
      <div style={{ paddingTop: 16, borderTop: "1px solid var(--glass-border)" }}>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="hs-btn hs-btn-ghost"
          style={{ fontSize: 13, opacity: refreshing ? 0.5 : 1 }}
        >
          <Icon name="rotate" size={14}/>
          {refreshing ? "Aktualisiere…" : "Status aktualisieren"}
        </button>
      </div>
    </div>
  );
}

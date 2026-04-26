"use client";

import { useState } from "react";

type ZernioAccount = {
  id: string;
  platform: string;
  name: string;
  username?: string;
  disconnected?: boolean;
};

const PLATFORMS = [
  { id: "instagram", label: "Instagram", color: "from-pink-500/20 to-orange-500/10 border-pink-900/40" },
  { id: "facebook", label: "Facebook", color: "from-blue-500/20 to-indigo-500/10 border-blue-900/40" },
  { id: "tiktok", label: "TikTok", color: "from-neutral-700/40 to-neutral-800/20 border-neutral-700" },
  { id: "youtube", label: "YouTube", color: "from-red-500/20 to-red-900/10 border-red-900/40" },
  { id: "linkedin", label: "LinkedIn", color: "from-blue-600/20 to-blue-900/10 border-blue-800/40" },
];

export function AccountManager({ initialAccounts }: { initialAccounts: ZernioAccount[] }) {
  const [accounts, setAccounts] = useState<ZernioAccount[]>(initialAccounts);

  async function refresh() {
    const res = await fetch("/api/zernio/accounts");
    const json = await res.json();
    if (json.accounts) setAccounts(json.accounts);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {PLATFORMS.map((p) => {
          const connected = accounts.filter((a) => a.platform === p.id && !a.disconnected);
          return (
            <div key={p.id} className={"rounded-xl border bg-gradient-to-br p-5 flex flex-col gap-4 " + p.color}>
              <div>
                <div className="text-xs uppercase tracking-widest text-white/60">{p.label}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums text-white">{connected.length}</div>
                <div className="text-xs text-white/60 mt-1">
                  {connected.length > 0
                    ? connected.map((a) => a.username ? `@${a.username}` : a.name).join(", ")
                    : "Nicht verbunden"}
                </div>
              </div>
              <div className="mt-auto">
                <a
                  href={`/api/zernio/connect?platform=${p.id}`}
                  className="block rounded-md bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 text-xs font-medium text-white text-center transition"
                >
                  {connected.length > 0 ? "Weiteren verbinden" : `${p.label} verbinden`}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {accounts.length > 0 && (
        <div className="rounded-xl border border-neutral-800 overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-900/60">
              <tr>
                <Th>Plattform</Th>
                <Th>Name</Th>
                <Th>Username</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-neutral-800">
                  <Td><PlatformBadge platform={a.platform} /></Td>
                  <Td>{a.name}</Td>
                  <Td className="text-neutral-400">{a.username ? `@${a.username}` : "—"}</Td>
                  <Td>
                    {a.disconnected
                      ? <span className="text-xs text-red-400">Getrennt</span>
                      : <span className="text-xs text-green-400">✓ Aktiv</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={refresh} className="text-xs text-neutral-500 hover:text-neutral-300 transition">
        Status aktualisieren
      </button>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    instagram: "bg-pink-900/30 text-pink-300 border-pink-900/60",
    facebook: "bg-blue-900/30 text-blue-300 border-blue-900/60",
    tiktok: "bg-neutral-800 text-neutral-300 border-neutral-700",
    youtube: "bg-red-900/30 text-red-300 border-red-900/60",
    linkedin: "bg-blue-800/30 text-blue-300 border-blue-700/60",
  };
  return (
    <span className={"text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border " + (styles[platform] || "bg-neutral-800 text-neutral-400")}>
      {platform}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-xs uppercase tracking-wide text-neutral-500 px-4 py-2">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={"px-4 py-2 " + className}>{children}</td>;
}

"use client";

import { useState } from "react";

type Account = {
  id: number;
  platform: string;
  account_label: string;
  external_id: string | null;
  token_expires_at: number | null;
  created_at: number;
};

export function AccountManager({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);

  async function refresh() {
    const res = await fetch("/api/accounts");
    const json = await res.json();
    setAccounts(json.accounts);
  }

  async function remove(id: number) {
    if (!confirm("Account wirklich entfernen?")) return;
    await fetch("/api/accounts?id=" + id, { method: "DELETE" });
    await refresh();
  }

  const byPlatform = {
    instagram: accounts.filter((a) => a.platform === "instagram"),
    facebook: accounts.filter((a) => a.platform === "facebook"),
    tiktok: accounts.filter((a) => a.platform === "tiktok"),
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <ConnectCard
          title="Instagram & Facebook"
          color="from-pink-500/20 to-blue-500/10 border-pink-900/40"
          count={byPlatform.instagram.length + byPlatform.facebook.length}
          description="Pages + Instagram Business Accounts"
          action={
            <a
              href="/api/oauth/meta/start"
              className="rounded-md bg-[#1877F2] hover:bg-[#1464cf] px-3 py-2 text-xs font-medium text-white text-center"
            >
              {byPlatform.instagram.length + byPlatform.facebook.length > 0
                ? "Neu verbinden"
                : "Mit Facebook verbinden"}
            </a>
          }
        />
        <ConnectCard
          title="TikTok"
          color="from-neutral-700/40 to-neutral-800/20 border-neutral-700"
          count={byPlatform.tiktok.length}
          description="TikTok Accounts"
          action={
            <a
              href="/api/oauth/tiktok/start"
              className="rounded-md bg-black border border-neutral-700 hover:border-neutral-500 px-3 py-2 text-xs font-medium text-white text-center"
            >
              {byPlatform.tiktok.length > 0 ? "Weiteren verbinden" : "TikTok verbinden"}
            </a>
          }
        />
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/60">
            <tr>
              <Th>Plattform</Th>
              <Th>Label</Th>
              <Th>Externe ID</Th>
              <Th>Token läuft ab</Th>
              <Th>Erstellt</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-neutral-800">
                <Td><PlatformBadge platform={a.platform} /></Td>
                <Td>{a.account_label}</Td>
                <Td className="font-mono text-xs">
                  {a.external_id || <span className="text-neutral-500">—</span>}
                </Td>
                <Td className="text-xs text-neutral-400">
                  {a.token_expires_at
                    ? new Date(a.token_expires_at).toLocaleDateString("de-AT")
                    : <span className="text-neutral-500">—</span>}
                </Td>
                <Td className="text-xs text-neutral-400">
                  {new Date(a.created_at).toLocaleDateString("de-AT")}
                </Td>
                <Td>
                  <button
                    onClick={() => remove(a.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    entfernen
                  </button>
                </Td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500">
                  Noch keine Accounts verbunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConnectCard({
  title, count, description, color, action,
}: {
  title: string;
  count: number;
  description: string;
  color: string;
  action: React.ReactNode;
}) {
  return (
    <div className={"rounded-xl border bg-gradient-to-br p-5 flex flex-col gap-4 " + color}>
      <div>
        <div className="text-xs uppercase tracking-widest text-white/60">{title}</div>
        <div className="mt-2 text-3xl font-semibold tabular-nums text-white">{count}</div>
        <div className="text-xs text-white/60">{description}</div>
      </div>
      <div className="mt-auto">{action}</div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const styles: Record<string, string> = {
    instagram: "bg-pink-900/30 text-pink-300 border-pink-900/60",
    facebook: "bg-blue-900/30 text-blue-300 border-blue-900/60",
    tiktok: "bg-neutral-800 text-neutral-300 border-neutral-700",
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

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

const PLATFORM_HELP: Record<string, string> = {
  instagram:
    "External ID = Instagram Business Account ID. Token = Long-Lived Page Access Token.",
  facebook:
    "External ID = Facebook Page ID. Token = Page Access Token (long-lived).",
  tiktok:
    "External ID = (optional) TikTok open_id. Token = TikTok user access_token mit video.publish scope.",
};

export function AccountManager({
  initialAccounts,
}: {
  initialAccounts: Account[];
}) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [platform, setPlatform] = useState("instagram");
  const [label, setLabel] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/accounts");
    const json = await res.json();
    setAccounts(json.accounts);
  }

  async function addAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        account_label: label,
        external_id: externalId || undefined,
        access_token: accessToken,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "Save failed");
      return;
    }
    setLabel("");
    setExternalId("");
    setAccessToken("");
    await refresh();
  }

  async function remove(id: number) {
    if (!confirm("Account wirklich entfernen?")) return;
    await fetch("/api/accounts?id=" + id, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={addAccount}
        className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4"
      >
        <h2 className="font-medium">Account hinzufügen</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Plattform
            </label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-neutral-700"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="tiktok">TikTok</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">
              Label (intern)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="z.B. @bkc_main"
              className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-neutral-700"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            External ID
          </label>
          <input
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-neutral-700"
          />
        </div>
        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Access Token
          </label>
          <textarea
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            required
            rows={2}
            className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-neutral-700 font-mono text-xs"
          />
        </div>
        <p className="text-xs text-neutral-500">{PLATFORM_HELP[platform]}</p>
        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 rounded-md p-2">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-white text-neutral-900 font-medium px-4 py-2 text-sm hover:bg-neutral-200 disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Account speichern"}
        </button>
      </form>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/60">
            <tr>
              <Th>Plattform</Th>
              <Th>Label</Th>
              <Th>External ID</Th>
              <Th>Erstellt</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-t border-neutral-800">
                <Td>{a.platform}</Td>
                <Td>{a.account_label}</Td>
                <Td className="font-mono text-xs">
                  {a.external_id || <span className="text-neutral-500">—</span>}
                </Td>
                <Td className="text-xs text-neutral-400">
                  {new Date(a.created_at).toLocaleString("de-AT")}
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
                <td colSpan={5} className="p-6 text-center text-neutral-500">
                  Keine Accounts verbunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs uppercase tracking-wide text-neutral-500 px-4 py-2">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={"px-4 py-2 " + className}>{children}</td>;
}

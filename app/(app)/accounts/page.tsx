import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, SocialAccount } from "@/lib/db";
import { AccountManager } from "./account-manager";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { connected, error } = await searchParams;

  const db = getDb();
  const accounts = db
    .prepare(
      "SELECT id, platform, account_label, external_id, token_expires_at, created_at FROM social_accounts WHERE user_id = ? ORDER BY platform, created_at DESC"
    )
    .all(user.id) as Pick<SocialAccount, "id" | "platform" | "account_label" | "external_id" | "token_expires_at" | "created_at">[];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verknüpfte Accounts</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Mit Facebook verbinden importiert automatisch alle Pages und Instagram Business Accounts.
        </p>
      </div>

      {connected && (
        <div className="rounded-md bg-green-900/20 border border-green-900/40 p-3 text-sm text-green-300">
          ✔ {connected === "meta" ? "Meta erfolgreich verknüpft." : "TikTok erfolgreich verknüpft."}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-900/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <AccountManager initialAccounts={accounts} />
    </div>
  );
}

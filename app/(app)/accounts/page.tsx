import { requireUser } from "@/lib/auth";
import { getDb, SocialAccount } from "@/lib/db";
import { AccountManager } from "./account-manager";

export default async function AccountsPage() {
  const user = await requireUser();
  const db = getDb();
  const accounts = db
    .prepare(
      "SELECT id, platform, account_label, external_id, token_expires_at, created_at FROM social_accounts WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(user.id) as Pick<
    SocialAccount,
    | "id"
    | "platform"
    | "account_label"
    | "external_id"
    | "token_expires_at"
    | "created_at"
  >[];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Social Accounts</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Verknüpfe TikTok-, Instagram- und Facebook-Accounts. Access Tokens
          werden lokal in der SQLite DB gespeichert.
        </p>
      </div>

      <AccountManager initialAccounts={accounts} />
    </div>
  );
}

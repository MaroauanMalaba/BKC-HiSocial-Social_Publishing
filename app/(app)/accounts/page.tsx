import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedAccounts } from "@/lib/social/zernio";
import { AccountManager } from "./account-manager";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { connected, error } = await searchParams;

  const accounts = user.zernio_profile_id
    ? await getConnectedAccounts(user.zernio_profile_id).catch(() => [])
    : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verknüpfte Accounts</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Verbinde Instagram, Facebook, TikTok, YouTube und LinkedIn — jeder Account mit einem Klick.
        </p>
      </div>

      {connected && (
        <div className="rounded-md bg-green-900/20 border border-green-900/40 p-3 text-sm text-green-300">
          ✔ {connected} erfolgreich verbunden.
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

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedPlatforms } from "@/lib/social/ayrshare";
import { AccountManager } from "./account-manager";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const platforms = user.ayrshare_profile_key
    ? await getConnectedPlatforms(user.ayrshare_profile_key).catch(() => [])
    : [];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Verknüpfte Accounts</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Verbinde deine Social Media Accounts — Instagram, Facebook, TikTok und mehr in einem Schritt.
        </p>
      </div>

      <AccountManager initialPlatforms={platforms} />
    </div>
  );
}

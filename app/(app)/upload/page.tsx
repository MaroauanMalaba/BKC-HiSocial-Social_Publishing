import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, SocialAccount } from "@/lib/db";
import { UploadComposer } from "./upload-composer";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const accounts = db
    .prepare(
      "SELECT id, platform, account_label, external_id FROM social_accounts WHERE user_id = ? ORDER BY platform"
    )
    .all(user.id) as Pick<
    SocialAccount,
    "id" | "platform" | "account_label" | "external_id"
  >[];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload & Post</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Bild oder Video hochladen → automatisch komprimieren → jetzt posten
          oder schedulen.
        </p>
      </div>
      <UploadComposer
        accounts={accounts.map((a) => ({
          id: a.id,
          platform: a.platform,
          label: a.account_label,
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedAccounts } from "@/lib/social/zernio";
import { UploadComposer } from "./upload-composer";

export default async function UploadPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const connectedAccounts = user.zernio_profile_id
    ? await getConnectedAccounts(user.zernio_profile_id).catch(() => [])
    : [];

  const platforms = connectedAccounts
    .filter((a) => !a.disconnected)
    .map((a) => ({
      platform: a.platform,
      label: a.username ? `@${a.username}` : a.name,
    }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Upload & Post</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Bild oder Video hochladen → automatisch komprimieren → jetzt posten oder schedulen.
        </p>
      </div>
      <UploadComposer platforms={platforms} />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedAccounts } from "@/lib/social/zernio";
import { Icon } from "@/components/ui/icons";
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
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 6 }}>Composer · Multi-Channel Publishing</div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
            Neuer Post
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/schedule" className="hs-btn hs-btn-glass">
            <Icon name="clock" size={14}/>Geplante Posts
          </Link>
        </div>
      </div>

      <UploadComposer platforms={platforms} userName={user.name || user.email || ""}/>
    </div>
  );
}

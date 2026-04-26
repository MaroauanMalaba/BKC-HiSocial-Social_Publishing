import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedAccounts } from "@/lib/social/zernio";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.zernio_profile_id) return NextResponse.json({ accounts: [] });

  const accounts = await getConnectedAccounts(user.zernio_profile_id).catch(() => []);
  return NextResponse.json({ accounts });
}

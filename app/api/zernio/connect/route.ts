import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getOrCreateZernioProfile, getConnectUrl } from "@/lib/social/zernio";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = req.nextUrl.searchParams.get("platform");
  if (!platform) return NextResponse.json({ error: "platform required" }, { status: 400 });

  if (!process.env.ZERNIO_API_KEY)
    return NextResponse.json({ error: "ZERNIO_API_KEY not configured" }, { status: 500 });

  try {
    const db = getDb();
    let profileId = user.zernio_profile_id;

    if (!profileId) {
      profileId = await getOrCreateZernioProfile(user.name || user.email || `User ${user.id}`);
      db.prepare("UPDATE users SET zernio_profile_id = ? WHERE id = ?").run(profileId, user.id);
    }

    const appBase = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const callbackUrl = `${appBase}/accounts?connected=${platform}`;
    const authUrl = await getConnectUrl(platform, profileId, callbackUrl);

    return NextResponse.redirect(authUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createProfile, generateConnectUrl } from "@/lib/social/ayrshare";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  let profileKey = user.ayrshare_profile_key;

  if (!profileKey) {
    profileKey = await createProfile(
      user.name || user.email || `User ${user.id}`,
      user.email
    );
    db.prepare("UPDATE users SET ayrshare_profile_key = ? WHERE id = ?").run(
      profileKey,
      user.id
    );
  }

  const url = await generateConnectUrl(profileKey);
  return NextResponse.json({ url });
}

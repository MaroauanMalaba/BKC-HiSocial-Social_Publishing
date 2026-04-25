import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getConnectedPlatforms } from "@/lib/social/ayrshare";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.ayrshare_profile_key) return NextResponse.json({ platforms: [] });

  const platforms = await getConnectedPlatforms(user.ayrshare_profile_key).catch(() => []);
  return NextResponse.json({ platforms });
}

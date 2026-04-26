import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { refreshAccountInsights, getAccountInsightsForUser } from "@/lib/social/insights";

export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const insights = getAccountInsightsForUser(user.id);
  return NextResponse.json({ insights });
}

export async function POST() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  await refreshAccountInsights(user.id);
  const insights = getAccountInsightsForUser(user.id);
  return NextResponse.json({ ok: true, insights });
}

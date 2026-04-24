import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getDb, SocialAccount } from "@/lib/db";

const schema = z.object({
  platform: z.enum(["tiktok", "instagram", "facebook"]),
  account_label: z.string().min(1),
  external_id: z.string().optional(),
  access_token: z.string().min(1),
  refresh_token: z.string().optional(),
  token_expires_at: z.number().optional(),
});

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT id, platform, account_label, external_id, token_expires_at, created_at FROM social_accounts WHERE user_id = ? ORDER BY created_at DESC"
    )
    .all(user.id);
  return NextResponse.json({ accounts: rows });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const db = getDb();
  db.prepare(
    `INSERT INTO social_accounts (user_id, platform, account_label, external_id,
       access_token, refresh_token, token_expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    parsed.data.platform,
    parsed.data.account_label,
    parsed.data.external_id ?? null,
    parsed.data.access_token,
    parsed.data.refresh_token ?? null,
    parsed.data.token_expires_at ?? null,
    Date.now()
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const db = getDb();
  db.prepare("DELETE FROM social_accounts WHERE id = ? AND user_id = ?").run(
    id,
    user.id
  );
  return NextResponse.json({ ok: true });
}

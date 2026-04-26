import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, hashPassword, verifyPassword, findUserByEmail } from "@/lib/auth";
import { getDb } from "@/lib/db";

const schema = z.object({
  name:         z.string().min(1).max(100).optional(),
  email:        z.string().email().optional(),
  new_password: z.string().min(8).optional(),
  old_password: z.string().optional(),
  zernio_profile_id: z.string().optional(),
});

export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  return NextResponse.json({
    id:   user.id,
    name: user.name,
    email: user.email,
    auth_provider: user.auth_provider,
    zernio_profile_id: user.zernio_profile_id,
    created_at: user.created_at,
  });
}

export async function PATCH(req: NextRequest) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid" }, { status: 400 });

  const { name, email, new_password, old_password, zernio_profile_id } = parsed.data;
  const db = getDb();

  // Password change requires old password
  if (new_password) {
    if (!old_password)
      return NextResponse.json({ error: "Aktuelles Passwort erforderlich" }, { status: 400 });
    if (!user.password_hash)
      return NextResponse.json({ error: "Kein Passwort gesetzt (OAuth-Login)" }, { status: 400 });
    const valid = await verifyPassword(old_password, user.password_hash);
    if (!valid)
      return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 400 });
    const hash = await hashPassword(new_password);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  }

  // Email uniqueness check
  if (email && email.toLowerCase() !== user.email?.toLowerCase()) {
    const existing = findUserByEmail(email);
    if (existing && existing.id !== user.id)
      return NextResponse.json({ error: "E-Mail bereits in Verwendung" }, { status: 409 });
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(email.toLowerCase().trim(), user.id);
  }

  if (name !== undefined)
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, user.id);

  if (zernio_profile_id !== undefined)
    db.prepare("UPDATE users SET zernio_profile_id = ? WHERE id = ?").run(zernio_profile_id || null, user.id);

  return NextResponse.json({ ok: true });
}

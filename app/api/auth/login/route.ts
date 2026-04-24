import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email und Passwort erforderlich" }, { status: 400 });

  const user = findUserByEmail(email);
  if (!user || !user.password_hash)
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid)
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });

  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}

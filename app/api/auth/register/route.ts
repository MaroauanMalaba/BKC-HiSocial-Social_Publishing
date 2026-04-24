import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, hashPassword, registerUser } from "@/lib/auth";

// Internal-only registration — no invite gate needed for a small team tool.
export async function POST(req: NextRequest) {
  const { email, password, name } = await req.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email und Passwort erforderlich" }, { status: 400 });
  if (password.length < 8)
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });

  const existing = findUserByEmail(email);
  if (existing)
    return NextResponse.json({ error: "Email bereits registriert" }, { status: 409 });

  const hash = await hashPassword(password);
  registerUser(email, hash, name || null);
  return NextResponse.json({ ok: true });
}

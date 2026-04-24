import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  findUserByEmail,
  hashPassword,
  registerUser,
  createSession,
  setSessionCookie,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (findUserByEmail(parsed.data.email))
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 400 }
    );

  const hash = await hashPassword(parsed.data.password);
  const user = registerUser(parsed.data.email, hash, parsed.data.name ?? null);
  const token = await createSession(user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}

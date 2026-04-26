import { NextRequest, NextResponse } from "next/server";
import { requireUser, findUserByEmail } from "@/lib/auth";
import { getDb, TeamMember } from "@/lib/db";

export async function GET() {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const db = getDb();
  const members = db.prepare(`
    SELECT tm.*, u.name
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE tm.workspace_owner_id = ?
    ORDER BY tm.created_at ASC
  `).all(user.id) as TeamMember[];

  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const { email, role } = body as { email?: string; role?: string };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });

  if (!["admin", "editor", "viewer"].includes(role ?? ""))
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });

  if (email.toLowerCase() === (user.email ?? "").toLowerCase())
    return NextResponse.json({ error: "Du kannst dich nicht selbst einladen" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare(
    "SELECT id FROM team_members WHERE workspace_owner_id = ? AND email = ?"
  ).get(user.id, email.toLowerCase()) as { id: number } | undefined;

  if (existing)
    return NextResponse.json({ error: "Diese Person ist bereits eingeladen" }, { status: 409 });

  const invitedUser = findUserByEmail(email);
  const now = Date.now();

  const info = db.prepare(
    "INSERT INTO team_members (workspace_owner_id, email, user_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(user.id, email.toLowerCase(), invitedUser?.id ?? null, role, invitedUser ? "active" : "pending", now);

  const member = db.prepare(`
    SELECT tm.*, u.name
    FROM team_members tm
    LEFT JOIN users u ON u.id = tm.user_id
    WHERE tm.id = ?
  `).get(info.lastInsertRowid) as TeamMember;

  return NextResponse.json({ member }, { status: 201 });
}

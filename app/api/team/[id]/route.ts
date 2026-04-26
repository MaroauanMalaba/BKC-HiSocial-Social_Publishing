import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { role } = body as { role?: string };

  if (!["admin", "editor", "viewer"].includes(role ?? ""))
    return NextResponse.json({ error: "Ungültige Rolle" }, { status: 400 });

  const db = getDb();
  const member = db.prepare(
    "SELECT id FROM team_members WHERE id = ? AND workspace_owner_id = ?"
  ).get(Number(id), user.id);

  if (!member)
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });

  db.prepare("UPDATE team_members SET role = ? WHERE id = ?").run(role, Number(id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const { id } = await params;
  const db = getDb();
  const member = db.prepare(
    "SELECT id FROM team_members WHERE id = ? AND workspace_owner_id = ?"
  ).get(Number(id), user.id);

  if (!member)
    return NextResponse.json({ error: "Mitglied nicht gefunden" }, { status: 404 });

  db.prepare("DELETE FROM team_members WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}

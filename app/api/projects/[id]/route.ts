import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Project } from "@/lib/db";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional(),
  label: z.string().min(1).max(4).optional(),
  theme: z.enum(["blue","purple","green","orange","pink","teal"]).optional(),
  status: z.enum(["active","paused","completed"]).optional(),
  tags: z.array(z.string()).optional(),
  goal: z.string().optional(),
  deadline: z.number().nullable().optional(),
  post_count_published: z.number().int().min(0).optional(),
  post_count_total: z.number().int().min(0).optional(),
});

async function getOwned(id: string, userId: number) {
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(Number(id), userId) as Project | undefined;
  return project;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getOwned(id, user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getOwned(id, user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const db = getDb();
  const updates: string[] = [];
  const vals: unknown[] = [];
  const d = parsed.data;
  if (d.name !== undefined)                { updates.push("name = ?");                vals.push(d.name); }
  if (d.description !== undefined)         { updates.push("description = ?");         vals.push(d.description); }
  if (d.label !== undefined)               { updates.push("label = ?");               vals.push(d.label.toUpperCase()); }
  if (d.theme !== undefined)               { updates.push("theme = ?");               vals.push(d.theme); }
  if (d.status !== undefined)              { updates.push("status = ?");              vals.push(d.status); }
  if (d.tags !== undefined)                { updates.push("tags = ?");                vals.push(JSON.stringify(d.tags)); }
  if (d.goal !== undefined)                { updates.push("goal = ?");                vals.push(d.goal); }
  if (d.deadline !== undefined)            { updates.push("deadline = ?");            vals.push(d.deadline); }
  if (d.post_count_published !== undefined){ updates.push("post_count_published = ?");vals.push(d.post_count_published); }
  if (d.post_count_total !== undefined)    { updates.push("post_count_total = ?");    vals.push(d.post_count_total); }
  if (updates.length === 0) return NextResponse.json({ project });
  vals.push(Number(id));
  db.prepare(`UPDATE projects SET ${updates.join(", ")} WHERE id = ?`).run(...vals);
  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(Number(id)) as Project;
  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const project = await getOwned(id, user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDb();
  db.prepare("DELETE FROM projects WHERE id = ?").run(Number(id));
  return NextResponse.json({ ok: true });
}

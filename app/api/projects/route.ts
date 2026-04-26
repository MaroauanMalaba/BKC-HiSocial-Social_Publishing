import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Project } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().default(""),
  label: z.string().min(1).max(4).default("?"),
  theme: z.enum(["blue","purple","green","orange","pink","teal"]).default("blue"),
  status: z.enum(["active","paused","completed"]).default("active"),
  tags: z.array(z.string()).default([]),
  goal: z.string().default(""),
  deadline: z.number().optional(),
  post_count_total: z.number().int().min(0).default(0),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const rows = db.prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC").all(user.id) as Project[];
  return NextResponse.json({ projects: rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { name, description, label, theme, status, tags, goal, deadline, post_count_total } = parsed.data;
  const now = Date.now();
  const db = getDb();
  const info = db.prepare(`
    INSERT INTO projects (user_id, name, description, label, theme, status, tags, goal, deadline, post_count_total, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, name, description, label.toUpperCase(), theme, status, JSON.stringify(tags), goal, deadline ?? null, post_count_total, now);
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(Number(info.lastInsertRowid)) as Project;
  return NextResponse.json({ project }, { status: 201 });
}

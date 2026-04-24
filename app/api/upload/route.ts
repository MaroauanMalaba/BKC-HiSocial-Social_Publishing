import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { newMediaId } from "@/lib/storage";
import { processMedia } from "@/lib/compression";

export const runtime = "nodejs";

const ALLOWED_VIDEO = [".mp4", ".mov", ".webm", ".mkv", ".avi"];
const ALLOWED_IMAGE = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const isVideo = ALLOWED_VIDEO.includes(ext);
  const isImage = ALLOWED_IMAGE.includes(ext);
  if (!isVideo && !isImage)
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 }
    );

  const { path: outPath } = newMediaId(ext);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(outPath, buf);

  const db = getDb();
  const now = Date.now();
  const info = db
    .prepare(
      `INSERT INTO media (user_id, kind, original_filename, original_path,
         original_size, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .run(user.id, isVideo ? "video" : "image", file.name, outPath, buf.length, now);
  const id = Number(info.lastInsertRowid);

  processMedia(id).catch((e) => console.error("processMedia error", e));

  return NextResponse.json({ id, status: "pending" });
}

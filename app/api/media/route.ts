import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getDb, Media } from "@/lib/db";

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const media = db
    .prepare(
      "SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC LIMIT 100"
    )
    .all(user.id) as Media[];
  return NextResponse.json({
    media: media.map((m) => ({
      id: m.id,
      kind: m.kind,
      filename: m.original_filename,
      status: m.status,
      progress: m.progress,
      progress_fps: m.progress_fps,
      progress_speed: m.progress_speed,
      error: m.error,
      original_size: m.original_size,
      compressed_size: m.compressed_size,
      width: m.width,
      height: m.height,
      duration_seconds: m.duration_seconds,
      created_at: m.created_at,
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireUser } from "@/lib/auth";

const DATA_DIR = path.join(process.cwd(), "data");

export async function GET(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const p = req.nextUrl.searchParams.get("p");
  if (!p) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  const absolute = path.resolve(path.join(DATA_DIR, p));
  if (!absolute.startsWith(DATA_DIR + path.sep))
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  if (!fs.existsSync(absolute))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = path.extname(absolute).toLowerCase();
  const type =
    ext === ".mp4"
      ? "video/mp4"
      : ext === ".webm"
      ? "video/webm"
      : ext === ".jpg" || ext === ".jpeg"
      ? "image/jpeg"
      : ext === ".png"
      ? "image/png"
      : "application/octet-stream";

  const buf = fs.readFileSync(absolute);
  const body = new Uint8Array(buf);
  return new NextResponse(body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=60" },
  });
}

import path from "path";
import fs from "fs";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const COMPRESSED_DIR = path.join(DATA_DIR, "compressed");

for (const dir of [UPLOAD_DIR, COMPRESSED_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function newMediaId(ext: string): { id: string; path: string } {
  const id = crypto.randomBytes(12).toString("hex");
  return { id, path: path.join(UPLOAD_DIR, id + ext) };
}

export function compressedPathFor(id: string, ext: string): string {
  return path.join(COMPRESSED_DIR, id + ext);
}

export function publicServePath(absPath: string): string {
  const rel = path.relative(DATA_DIR, absPath);
  return "/api/media/file?p=" + encodeURIComponent(rel);
}

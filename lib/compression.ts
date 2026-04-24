import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { getDb, Media } from "./db";
import { compressedPathFor } from "./storage";

export type CompressResult = {
  outputPath: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
};

export async function compressImage(
  mediaId: string,
  inputPath: string
): Promise<CompressResult> {
  const outputPath = compressedPathFor(mediaId, ".jpg");
  const img = sharp(inputPath).rotate();
  const meta = await img.metadata();

  await img
    .resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outputPath);

  const stat = fs.statSync(outputPath);
  return {
    outputPath,
    size: stat.size,
    width: meta.width,
    height: meta.height,
  };
}

export function probeVideo(
  inputPath: string
): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) return reject(err);
      const stream = data.streams.find((s) => s.codec_type === "video");
      resolve({
        width: stream?.width,
        height: stream?.height,
        duration: data.format.duration,
      });
    });
  });
}

export async function compressVideo(
  mediaId: string,
  inputPath: string,
  onProgress?: (p: { percent: number; fps?: number; speed?: number }) => void
): Promise<CompressResult> {
  const outputPath = compressedPathFor(mediaId, ".mp4");
  const probe = await probeVideo(inputPath);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset veryfast",
        "-crf 23",
        "-movflags +faststart",
        "-pix_fmt yuv420p",
        "-vf scale='min(1080,iw)':-2",
        "-b:a 128k",
      ])
      .format("mp4")
      .on("progress", (info) => {
        let percent = typeof info.percent === "number" ? info.percent : 0;
        if ((!percent || isNaN(percent)) && probe.duration && info.timemark) {
          const [h, m, s] = info.timemark.split(":").map(Number);
          const sec = (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
          percent = Math.min(100, (sec / probe.duration) * 100);
        }
        onProgress?.({
          percent: Math.max(0, Math.min(100, percent || 0)),
          fps: typeof info.currentFps === "number" ? info.currentFps : undefined,
          speed:
            typeof (info as { currentKbps?: number }).currentKbps === "number"
              ? (info as { currentKbps: number }).currentKbps
              : undefined,
        });
      })
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });

  const stat = fs.statSync(outputPath);
  return {
    outputPath,
    size: stat.size,
    width: probe.width,
    height: probe.height,
    duration: probe.duration,
  };
}

export async function processMedia(mediaId: number): Promise<void> {
  const db = getDb();
  const media = db.prepare("SELECT * FROM media WHERE id = ?").get(mediaId) as
    | Media
    | undefined;
  if (!media) return;

  db.prepare(
    "UPDATE media SET status = 'processing', progress = 0 WHERE id = ?"
  ).run(mediaId);

  try {
    const publicId = path.parse(media.original_path).name;
    const updateProgress = db.prepare(
      "UPDATE media SET progress = ?, progress_fps = ?, progress_speed = ? WHERE id = ?"
    );
    let lastWrite = 0;
    const result =
      media.kind === "image"
        ? await compressImage(publicId, media.original_path)
        : await compressVideo(publicId, media.original_path, (p) => {
            const now = Date.now();
            if (now - lastWrite < 250 && p.percent < 99) return;
            lastWrite = now;
            updateProgress.run(
              p.percent,
              p.fps ?? null,
              p.speed ?? null,
              mediaId
            );
          });

    db.prepare(
      `UPDATE media SET status = 'ready', compressed_path = ?, compressed_size = ?,
         width = ?, height = ?, duration_seconds = ? WHERE id = ?`
    ).run(
      result.outputPath,
      result.size,
      result.width ?? null,
      result.height ?? null,
      result.duration ?? null,
      mediaId
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    db.prepare("UPDATE media SET status = 'failed', error = ? WHERE id = ?").run(
      msg,
      mediaId
    );
  }
}

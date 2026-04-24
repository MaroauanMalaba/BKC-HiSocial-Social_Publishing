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
  inputPath: string
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

  db.prepare("UPDATE media SET status = 'processing' WHERE id = ?").run(
    mediaId
  );

  try {
    const publicId = path.parse(media.original_path).name;
    const result =
      media.kind === "image"
        ? await compressImage(publicId, media.original_path)
        : await compressVideo(publicId, media.original_path);

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

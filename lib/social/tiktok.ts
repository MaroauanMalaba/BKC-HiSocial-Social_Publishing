import fs from "fs";
import { PublishInput, PublishResult } from "./types";

const TT = "https://open.tiktokapis.com/v2";

export async function publishTikTok(
  input: PublishInput
): Promise<PublishResult> {
  try {
    const token = input.account.access_token;
    if (!token)
      return { ok: false, platform: "tiktok", error: "Missing access token" };

    if (input.mediaKind !== "video") {
      return {
        ok: false,
        platform: "tiktok",
        error: "TikTok upload supports videos only in this build",
      };
    }

    if (!fs.existsSync(input.mediaPath)) {
      return { ok: false, platform: "tiktok", error: "Media file missing" };
    }

    const stat = fs.statSync(input.mediaPath);
    const videoSize = stat.size;
    const chunkSize = Math.min(videoSize, 10 * 1024 * 1024);
    const totalChunkCount = Math.ceil(videoSize / chunkSize);

    const initRes = await fetch(`${TT}/post/publish/video/init/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: {
          title: input.caption.slice(0, 2200),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
          video_cover_timestamp_ms: 1000,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: videoSize,
          chunk_size: chunkSize,
          total_chunk_count: totalChunkCount,
        },
      }),
    });
    const initJson = await initRes.json();
    if (!initRes.ok || !initJson.data?.upload_url) {
      return {
        ok: false,
        platform: "tiktok",
        error: JSON.stringify(initJson),
      };
    }

    const uploadUrl: string = initJson.data.upload_url;
    const publishId: string = initJson.data.publish_id;

    const fd = fs.openSync(input.mediaPath, "r");
    try {
      for (let i = 0; i < totalChunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, videoSize) - 1;
        const len = end - start + 1;
        const buf = Buffer.alloc(len);
        fs.readSync(fd, buf, 0, len, start);

        const upRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end}/${videoSize}`,
          },
          body: buf,
        });
        if (!upRes.ok && upRes.status !== 201 && upRes.status !== 206) {
          const t = await upRes.text();
          return {
            ok: false,
            platform: "tiktok",
            error: `Upload chunk ${i} failed: ${upRes.status} ${t}`,
          };
        }
      }
    } finally {
      fs.closeSync(fd);
    }

    return { ok: true, platform: "tiktok", externalId: publishId };
  } catch (e) {
    return {
      ok: false,
      platform: "tiktok",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

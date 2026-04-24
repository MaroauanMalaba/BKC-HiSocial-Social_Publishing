import fs from "fs";
import path from "path";
import { PublishInput, PublishResult } from "./types";
import { publicServePath } from "../storage";

const GRAPH = "https://graph.facebook.com/v21.0";

function publicUrlFor(absMediaPath: string): string {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) {
    throw new Error(
      "PUBLIC_BASE_URL not configured — Meta requires a publicly reachable URL for media. Set in .env (e.g. an ngrok URL)."
    );
  }
  return base.replace(/\/$/, "") + publicServePath(absMediaPath);
}

export async function publishInstagram(
  input: PublishInput
): Promise<PublishResult> {
  try {
    const igUserId = input.account.external_id;
    const token = input.account.access_token;
    if (!igUserId || !token)
      return { ok: false, platform: "instagram", error: "Missing IG user id or token" };

    if (!fs.existsSync(input.mediaPath)) {
      return { ok: false, platform: "instagram", error: "Media file missing" };
    }

    const mediaUrl = publicUrlFor(input.mediaPath);

    const createBody: Record<string, string> = {
      caption: input.caption,
      access_token: token,
    };
    if (input.mediaKind === "image") {
      createBody.image_url = mediaUrl;
    } else {
      createBody.media_type = "REELS";
      createBody.video_url = mediaUrl;
    }

    const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      body: new URLSearchParams(createBody),
    });
    const createJson = await createRes.json();
    if (!createRes.ok || !createJson.id) {
      return {
        ok: false,
        platform: "instagram",
        error: JSON.stringify(createJson),
      };
    }

    if (input.mediaKind === "video") {
      await waitForMediaReady(createJson.id, token);
    }

    const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({
        creation_id: createJson.id,
        access_token: token,
      }),
    });
    const pubJson = await pubRes.json();
    if (!pubRes.ok || !pubJson.id) {
      return {
        ok: false,
        platform: "instagram",
        error: JSON.stringify(pubJson),
      };
    }

    return { ok: true, platform: "instagram", externalId: pubJson.id };
  } catch (e) {
    return {
      ok: false,
      platform: "instagram",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function waitForMediaReady(
  creationId: string,
  token: string,
  maxAttempts = 30
) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(
      `${GRAPH}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`
    );
    const json = await res.json();
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR") throw new Error("IG media status ERROR");
  }
  throw new Error("IG media never reached FINISHED state");
}

export async function publishFacebook(
  input: PublishInput
): Promise<PublishResult> {
  try {
    const pageId = input.account.external_id;
    const token = input.account.access_token;
    if (!pageId || !token)
      return {
        ok: false,
        platform: "facebook",
        error: "Missing page id or page access token",
      };

    if (!fs.existsSync(input.mediaPath)) {
      return { ok: false, platform: "facebook", error: "Media file missing" };
    }

    if (input.mediaKind === "image") {
      const form = new FormData();
      const buf = fs.readFileSync(input.mediaPath);
      form.append(
        "source",
        new Blob([buf]),
        path.basename(input.mediaPath)
      );
      form.append("caption", input.caption);
      form.append("access_token", token);

      const res = await fetch(`${GRAPH}/${pageId}/photos`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok || !json.id) {
        return {
          ok: false,
          platform: "facebook",
          error: JSON.stringify(json),
        };
      }
      return { ok: true, platform: "facebook", externalId: json.id };
    }

    const form = new FormData();
    const buf = fs.readFileSync(input.mediaPath);
    form.append(
      "source",
      new Blob([buf]),
      path.basename(input.mediaPath)
    );
    form.append("description", input.caption);
    form.append("access_token", token);

    const res = await fetch(`${GRAPH}/${pageId}/videos`, {
      method: "POST",
      body: form,
    });
    const json = await res.json();
    if (!res.ok || !json.id) {
      return {
        ok: false,
        platform: "facebook",
        error: JSON.stringify(json),
      };
    }
    return { ok: true, platform: "facebook", externalId: json.id };
  } catch (e) {
    return {
      ok: false,
      platform: "facebook",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

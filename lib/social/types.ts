export type Platform = "tiktok" | "instagram" | "facebook";

export type PublishResult =
  | { ok: true; platform: Platform; externalId: string; url?: string }
  | { ok: false; platform: Platform; error: string };

export type PublishInput = {
  mediaPath: string;
  mediaKind: "image" | "video";
  caption: string;
  account: {
    id: number;
    external_id: string | null;
    access_token: string | null;
    meta_json: string | null;
  };
};

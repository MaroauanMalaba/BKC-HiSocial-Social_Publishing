import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, verifyOAuthState } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

const TT = "https://open.tiktokapis.com/v2";

type TikTokTokenRes = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  error?: string;
  error_description?: string;
};

type TikTokUser = {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
      avatar_url?: string;
      username?: string;
    };
  };
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.redirect(`${appBaseUrl()}/login`);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error_description");

  if (err) return redirectBack("error", err);
  if (!code) return redirectBack("error", "Missing code");

  const stateCheck = await verifyOAuthState("tiktok", state);
  if (!stateCheck.ok) return redirectBack("error", "Bad state");

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret)
    return redirectBack("error", "TikTok credentials missing");

  const redirectUri = `${appBaseUrl()}/api/oauth/tiktok/callback`;

  const tokenRes = await fetch(`${TT}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenJson = (await tokenRes.json()) as TikTokTokenRes;
  if (!tokenJson.access_token)
    return redirectBack(
      "error",
      tokenJson.error_description || "TikTok token exchange failed"
    );

  const profileRes = await fetch(
    `${TT}/user/info/?fields=open_id,display_name,avatar_url,username`,
    {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    }
  );
  const profile = (await profileRes.json()) as TikTokUser;
  const tkUser = profile.data?.user;

  const db = getDb();
  const openId = tokenJson.open_id || tkUser?.open_id || "";
  const label = tkUser?.username
    ? `@${tkUser.username}`
    : tkUser?.display_name || "TikTok";

  db.prepare(
    `INSERT INTO social_accounts (user_id, platform, account_label, external_id,
       access_token, refresh_token, token_expires_at, meta_json, created_at)
     VALUES (?, 'tiktok', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, platform, external_id) DO UPDATE SET
       access_token = excluded.access_token,
       refresh_token = excluded.refresh_token,
       token_expires_at = excluded.token_expires_at,
       account_label = excluded.account_label,
       meta_json = excluded.meta_json`
  ).run(
    user.id,
    label,
    openId || null,
    tokenJson.access_token,
    tokenJson.refresh_token ?? null,
    tokenJson.expires_in ? Date.now() + tokenJson.expires_in * 1000 : null,
    JSON.stringify({
      display_name: tkUser?.display_name,
      avatar_url: tkUser?.avatar_url,
      source: "tiktok_oauth",
    }),
    Date.now()
  );

  const target = new URL(stateCheck.returnTo || "/accounts", appBaseUrl());
  target.searchParams.set("connected", "tiktok");
  return NextResponse.redirect(target.toString());
}

function redirectBack(flag: string, msg: string) {
  const u = new URL("/accounts", appBaseUrl());
  u.searchParams.set(flag, msg);
  return NextResponse.redirect(u.toString());
}

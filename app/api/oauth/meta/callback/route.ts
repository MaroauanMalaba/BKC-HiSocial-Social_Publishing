import { NextRequest, NextResponse } from "next/server";
import {
  appBaseUrl,
  verifyOAuthState,
} from "@/lib/oauth";
import {
  createSession,
  setSessionCookie,
  upsertOAuthUser,
} from "@/lib/auth";
import { getDb } from "@/lib/db";

const GRAPH = "https://graph.facebook.com/v21.0";

type MetaTokenRes = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

type MetaMe = {
  id: string;
  name?: string;
  email?: string;
};

type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string };
};

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorMsg = url.searchParams.get("error_description");

  if (errorMsg) {
    return redirectToLogin("error", errorMsg);
  }
  if (!code) return redirectToLogin("error", "Missing code");

  const stateCheck = await verifyOAuthState("meta", state);
  if (!stateCheck.ok) return redirectToLogin("error", "Bad state");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret)
    return redirectToLogin("error", "Meta App credentials missing");

  const redirectUri = `${appBaseUrl()}/api/oauth/meta/callback`;

  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }).toString()
  );
  const tokenJson = (await tokenRes.json()) as MetaTokenRes & {
    error?: { message: string };
  };
  if (!tokenRes.ok || !tokenJson.access_token) {
    return redirectToLogin(
      "error",
      tokenJson.error?.message || "Token exchange failed"
    );
  }

  const longLivedRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: tokenJson.access_token,
      }).toString()
  );
  const longJson = (await longLivedRes.json()) as MetaTokenRes;
  const userToken = longJson.access_token || tokenJson.access_token;
  const userTokenExpires = longJson.expires_in
    ? Date.now() + longJson.expires_in * 1000
    : null;

  const meRes = await fetch(
    `${GRAPH}/me?fields=id,name,email&access_token=${encodeURIComponent(userToken)}`
  );
  const me = (await meRes.json()) as MetaMe;
  if (!me.id) return redirectToLogin("error", "Could not fetch profile");

  const user = upsertOAuthUser({
    provider: "meta",
    providerUserId: me.id,
    email: me.email ?? null,
    name: me.name ?? null,
    avatarUrl: `https://graph.facebook.com/v21.0/${me.id}/picture?type=large`,
  });

  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(userToken)}`
  );
  const pagesJson = (await pagesRes.json()) as { data?: MetaPage[] };
  const pages = pagesJson.data ?? [];

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO social_accounts (user_id, platform, account_label, external_id,
       access_token, refresh_token, token_expires_at, meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)
     ON CONFLICT(user_id, platform, external_id) DO UPDATE SET
       access_token = excluded.access_token,
       account_label = excluded.account_label,
       meta_json = excluded.meta_json,
       token_expires_at = excluded.token_expires_at`
  );

  const now = Date.now();
  let fbCount = 0;
  let igCount = 0;
  for (const page of pages) {
    upsert.run(
      user.id,
      "facebook",
      page.name,
      page.id,
      page.access_token,
      null,
      JSON.stringify({ page_id: page.id, source: "meta_oauth" }),
      now
    );
    fbCount++;

    if (page.instagram_business_account?.id) {
      const igId = page.instagram_business_account.id;
      const igProfileRes = await fetch(
        `${GRAPH}/${igId}?fields=username&access_token=${encodeURIComponent(page.access_token)}`
      );
      const igProfile = (await igProfileRes.json()) as { username?: string };
      const label = igProfile.username
        ? `@${igProfile.username}`
        : `IG via ${page.name}`;
      upsert.run(
        user.id,
        "instagram",
        label,
        igId,
        page.access_token,
        null,
        JSON.stringify({
          page_id: page.id,
          ig_business_account_id: igId,
          source: "meta_oauth",
        }),
        now
      );
      igCount++;
    }
  }

  const session = await createSession(user.id);
  await setSessionCookie(session);

  const target = new URL(stateCheck.returnTo || "/dashboard", appBaseUrl());
  target.searchParams.set("connected", "meta");
  target.searchParams.set("fb", String(fbCount));
  target.searchParams.set("ig", String(igCount));
  if (userTokenExpires) {
    target.searchParams.set(
      "expires",
      String(Math.round((userTokenExpires - now) / 86400000))
    );
  }
  return NextResponse.redirect(target.toString());
}

function redirectToLogin(flag: string, msg: string) {
  const u = new URL("/login", appBaseUrl());
  u.searchParams.set(flag, msg);
  return NextResponse.redirect(u.toString());
}

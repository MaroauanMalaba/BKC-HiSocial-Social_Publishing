import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl, verifyOAuthState } from "@/lib/oauth";
import { upsertOAuthUser, createSession, setSessionCookie } from "@/lib/auth";
import { getDb } from "@/lib/db";

const GRAPH = "https://graph.facebook.com/v21.0";

function redirectBack(flag: string, msg: string) {
  const u = new URL("/login", appBaseUrl());
  u.searchParams.set(flag, msg);
  return NextResponse.redirect(u.toString());
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const err = req.nextUrl.searchParams.get("error_description");

  if (err) return redirectBack("error", err);
  if (!code) return redirectBack("error", "Kein Code erhalten");

  const stateCheck = await verifyOAuthState("meta", state);
  if (!stateCheck.ok) return redirectBack("error", "Ungültiger State");

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret)
    return redirectBack("error", "META credentials fehlen in .env");

  const redirectUri = `${appBaseUrl()}/api/oauth/meta/callback`;

  // Short-lived token
  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
  );
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token)
    return redirectBack("error", tokenJson.error?.message || "Token-Austausch fehlgeschlagen");

  // Long-lived token
  const llRes = await fetch(
    `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenJson.access_token}`
  );
  const llJson = await llRes.json();
  const longToken = llJson.access_token || tokenJson.access_token;

  // User info
  const meRes = await fetch(`${GRAPH}/me?fields=id,name,email,picture&access_token=${longToken}`);
  const me = await meRes.json();

  const user = upsertOAuthUser({
    provider: "meta",
    providerUserId: me.id,
    email: me.email ?? null,
    name: me.name ?? null,
    avatarUrl: me.picture?.data?.url ?? null,
  });

  // Import Pages + Instagram accounts
  const db = getDb();
  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`
  );
  const pages = await pagesRes.json();

  if (Array.isArray(pages.data)) {
    for (const page of pages.data) {
      db.prepare(
        `INSERT INTO social_accounts (user_id, platform, account_label, external_id, access_token, created_at)
         VALUES (?, 'facebook', ?, ?, ?, ?)
         ON CONFLICT(user_id, platform, external_id) DO UPDATE SET
           access_token = excluded.access_token, account_label = excluded.account_label`
      ).run(user.id, page.name, page.id, page.access_token, Date.now());

      if (page.instagram_business_account?.id) {
        const igId = page.instagram_business_account.id;
        const igRes = await fetch(
          `${GRAPH}/${igId}?fields=id,name,username&access_token=${page.access_token}`
        );
        const ig = await igRes.json();
        db.prepare(
          `INSERT INTO social_accounts (user_id, platform, account_label, external_id, access_token, created_at)
           VALUES (?, 'instagram', ?, ?, ?, ?)
           ON CONFLICT(user_id, platform, external_id) DO UPDATE SET
             access_token = excluded.access_token, account_label = excluded.account_label`
        ).run(
          user.id,
          ig.username ? `@${ig.username}` : (ig.name || "Instagram"),
          igId,
          page.access_token,
          Date.now()
        );
      }
    }
  }

  const token = await createSession(user.id);
  await setSessionCookie(token);

  const target = new URL(stateCheck.returnTo || "/dashboard", appBaseUrl());
  return NextResponse.redirect(target.toString());
}

import { NextResponse } from "next/server";
import { appBaseUrl, setOAuthState } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/auth";

const SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_content_publish",
  "business_management",
].join(",");

export async function GET() {
  const appId = process.env.META_APP_ID;
  if (!appId)
    return NextResponse.json({ error: "META_APP_ID missing" }, { status: 500 });

  const user = await getCurrentUser();
  const returnTo = user ? "/accounts" : "/dashboard";

  const state = await setOAuthState({ provider: "meta", returnTo });
  const redirectUri = encodeURIComponent(`${appBaseUrl()}/api/oauth/meta/callback`);

  const url =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`;

  return NextResponse.redirect(url);
}

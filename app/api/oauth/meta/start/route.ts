import { NextResponse } from "next/server";
import { appBaseUrl, setOAuthState } from "@/lib/oauth";

const META_SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
].join(",");

export async function GET() {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "META_APP_ID missing in .env" },
      { status: 500 }
    );
  }

  const state = await setOAuthState({ provider: "meta", returnTo: "/dashboard" });
  const redirectUri = `${appBaseUrl()}/api/oauth/meta/callback`;

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_SCOPES);
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}

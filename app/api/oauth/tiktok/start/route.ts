import { NextResponse } from "next/server";
import { appBaseUrl, setOAuthState } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/auth";

const TIKTOK_SCOPES = ["user.info.basic", "video.publish", "video.list"].join(
  ","
);

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.redirect(`${appBaseUrl()}/login?error=login+required`);

  const key = process.env.TIKTOK_CLIENT_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "TIKTOK_CLIENT_KEY missing in .env" },
      { status: 500 }
    );
  }

  const state = await setOAuthState({
    provider: "tiktok",
    returnTo: "/accounts",
  });
  const redirectUri = `${appBaseUrl()}/api/oauth/tiktok/callback`;

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", key);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", TIKTOK_SCOPES);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}

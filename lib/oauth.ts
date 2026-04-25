import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me"
);
const COOKIE = "oauth_state";

export function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function setOAuthState(payload: {
  provider: string;
  returnTo?: string;
}): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(SECRET);
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return token;
}

export async function verifyOAuthState(
  provider: string,
  received: string | null
): Promise<{ ok: boolean; returnTo?: string }> {
  if (!received) return { ok: false };
  try {
    const { payload } = await jwtVerify(received, SECRET);
    if (payload.provider !== provider) return { ok: false };
    return { ok: true, returnTo: payload.returnTo as string | undefined };
  } catch {
    return { ok: false };
  }
}

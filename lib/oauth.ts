import crypto from "crypto";
import { cookies } from "next/headers";

const STATE_COOKIE = "oauth_state";

export function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000"
  );
}

export async function setOAuthState(payload: {
  provider: string;
  returnTo?: string;
}): Promise<string> {
  const state = crypto.randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(
    STATE_COOKIE,
    JSON.stringify({ state, ...payload }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    }
  );
  return state;
}

export async function verifyOAuthState(
  provider: string,
  received: string | null
): Promise<{ ok: boolean; returnTo?: string }> {
  const store = await cookies();
  const raw = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);
  if (!raw || !received) return { ok: false };
  try {
    const parsed = JSON.parse(raw) as {
      state: string;
      provider: string;
      returnTo?: string;
    };
    if (parsed.state !== received || parsed.provider !== provider)
      return { ok: false };
    return { ok: true, returnTo: parsed.returnTo };
  } catch {
    return { ok: false };
  }
}

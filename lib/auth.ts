import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getDb, User } from "./db";

const COOKIE_NAME = "hisocial_session";
const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-please-change-me"
);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const id = Number(payload.sub);
    if (!id) return null;
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as
      | User
      | undefined;
    return user || null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function registerUser(
  email: string,
  passwordHash: string,
  name: string | null
): User {
  const db = getDb();
  const now = Date.now();
  const info = db
    .prepare(
      "INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)"
    )
    .run(email.toLowerCase().trim(), passwordHash, name, now);
  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(info.lastInsertRowid) as User;
}

export function findUserByEmail(email: string): User | null {
  const db = getDb();
  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as User | undefined;
  return user || null;
}

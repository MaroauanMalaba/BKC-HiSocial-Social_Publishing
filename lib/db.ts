import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data", "db");
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, "app.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      account_label TEXT NOT NULL,
      external_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at INTEGER,
      meta_json TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, platform, external_id)
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      original_path TEXT NOT NULL,
      original_size INTEGER NOT NULL,
      compressed_path TEXT,
      compressed_size INTEGER,
      width INTEGER,
      height INTEGER,
      duration_seconds REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL NOT NULL DEFAULT 0,
      progress_fps REAL,
      progress_speed REAL,
      error TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      caption TEXT NOT NULL DEFAULT '',
      platforms_json TEXT NOT NULL,
      scheduled_at INTEGER,
      status TEXT NOT NULL DEFAULT 'draft',
      results_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_media_user ON media(user_id);

    CREATE TABLE IF NOT EXISTS post_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      shares INTEGER NOT NULL DEFAULT 0,
      saves INTEGER NOT NULL DEFAULT 0,
      reach INTEGER NOT NULL DEFAULT 0,
      raw_json TEXT,
      fetched_at INTEGER NOT NULL,
      UNIQUE(post_id, platform)
    );

    CREATE INDEX IF NOT EXISTS idx_insights_post ON post_insights(post_id);
  `);

  const mediaCols = db.prepare("PRAGMA table_info(media)").all() as Array<{
    name: string;
  }>;
  const names = new Set(mediaCols.map((c) => c.name));
  if (!names.has("progress"))
    db.exec("ALTER TABLE media ADD COLUMN progress REAL NOT NULL DEFAULT 0");
  if (!names.has("progress_fps"))
    db.exec("ALTER TABLE media ADD COLUMN progress_fps REAL");
  if (!names.has("progress_speed"))
    db.exec("ALTER TABLE media ADD COLUMN progress_speed REAL");
}

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: number;
};

export type SocialAccount = {
  id: number;
  user_id: number;
  platform: "tiktok" | "instagram" | "facebook";
  account_label: string;
  external_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: number | null;
  meta_json: string | null;
  created_at: number;
};

export type Media = {
  id: number;
  user_id: number;
  kind: "image" | "video";
  original_filename: string;
  original_path: string;
  original_size: number;
  compressed_path: string | null;
  compressed_size: number | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  status: "pending" | "processing" | "ready" | "failed";
  progress: number;
  progress_fps: number | null;
  progress_speed: number | null;
  error: string | null;
  created_at: number;
};

export type PostInsight = {
  id: number;
  post_id: number;
  platform: "tiktok" | "instagram" | "facebook";
  external_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  raw_json: string | null;
  fetched_at: number;
};

export type Post = {
  id: number;
  user_id: number;
  media_id: number;
  caption: string;
  platforms_json: string;
  scheduled_at: number | null;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  results_json: string | null;
  created_at: number;
  updated_at: number;
};

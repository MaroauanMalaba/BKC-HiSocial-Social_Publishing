import cron from "node-cron";
import { publishPost } from "./social";
import { refreshPostInsights, refreshAccountInsights } from "./social/insights";
import { getDb, Post, User } from "./db";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;

  cron.schedule("* * * * *", async () => {
    const db = getDb();
    const now = Date.now();
    const due = db
      .prepare(
        "SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 5"
      )
      .all(now) as Post[];

    for (const post of due) {
      try {
        await publishPost(post.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        db.prepare(
          "UPDATE posts SET status = 'failed', results_json = ?, updated_at = ? WHERE id = ?"
        ).run(
          JSON.stringify({ error: msg }),
          Date.now(),
          post.id
        );
      }
    }
  });

  cron.schedule("*/15 * * * *", async () => {
    const db = getDb();
    const posts = db
      .prepare(
        "SELECT id FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 50"
      )
      .all() as Pick<Post, "id">[];
    for (const p of posts) {
      try { await refreshPostInsights(p.id); } catch { /* continue */ }
    }

    // Refresh account-level insights for all users with a Zernio profile
    const users = db.prepare("SELECT id FROM users WHERE zernio_profile_id IS NOT NULL").all() as Pick<User, "id">[];
    for (const u of users) {
      try { await refreshAccountInsights(u.id); } catch { /* continue */ }
    }
  });

  console.log(
    "[scheduler] started — publish every 1min, insights every 15min"
  );
}

import cron from "node-cron";
import { getDb, Post } from "./db";
import { publishPost } from "./social";

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

  console.log("[scheduler] started — polling every minute");
}

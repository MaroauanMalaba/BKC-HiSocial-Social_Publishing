import { getDb, Post, Media, SocialAccount } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireUser();
  const db = getDb();

  const media = db
    .prepare(
      "SELECT * FROM media WHERE user_id = ? ORDER BY created_at DESC LIMIT 5"
    )
    .all(user.id) as Media[];

  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 10"
    )
    .all(user.id) as Post[];

  const accounts = db
    .prepare("SELECT * FROM social_accounts WHERE user_id = ?")
    .all(user.id) as SocialAccount[];

  const pendingScheduled = db
    .prepare(
      "SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'scheduled'"
    )
    .get(user.id) as { n: number };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Willkommen{user.name ? `, ${user.name}` : ""} 👋
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Media Files" value={media.length} />
        <Stat
          label="Geplante Posts"
          value={pendingScheduled.n}
          href="/schedule"
        />
        <Stat
          label="Verbundene Accounts"
          value={accounts.length}
          href="/accounts"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Letzte Uploads</h2>
            <Link
              href="/upload"
              className="text-xs text-neutral-400 hover:text-white"
            >
              Neuer Upload →
            </Link>
          </div>
          {media.length === 0 && (
            <p className="text-sm text-neutral-500">
              Noch keine Uploads. Lade ein Bild oder Video hoch.
            </p>
          )}
          <ul className="space-y-2">
            {media.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="truncate">
                  <span className="text-xs text-neutral-500 mr-2">
                    [{m.kind}]
                  </span>
                  {m.original_filename}
                </div>
                <StatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium">Letzte Posts</h2>
          </div>
          {posts.length === 0 && (
            <p className="text-sm text-neutral-500">Noch keine Posts.</p>
          )}
          <ul className="space-y-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="truncate">#{p.id} — {p.caption.slice(0, 40) || "(kein Caption)"}</div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 hover:border-neutral-700 transition">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "ready" || status === "published"
      ? "bg-green-900/40 text-green-300"
      : status === "failed"
      ? "bg-red-900/40 text-red-300"
      : status === "scheduled"
      ? "bg-blue-900/40 text-blue-300"
      : "bg-neutral-800 text-neutral-400";
  return (
    <span className={"text-xs px-2 py-0.5 rounded " + color}>{status}</span>
  );
}

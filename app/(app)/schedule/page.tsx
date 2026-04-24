import { requireUser } from "@/lib/auth";
import { getDb, Post } from "@/lib/db";
import { format } from "date-fns";

export default async function SchedulePage() {
  const user = await requireUser();
  const db = getDb();
  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE user_id = ? ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 200"
    )
    .all(user.id) as Post[];

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Schedule & Posts</h1>
        <p className="text-neutral-400 mt-1 text-sm">
          Alle Posts mit ihrem Status und dem Publishing-Ergebnis pro Plattform.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-900/60">
            <tr>
              <Th>ID</Th>
              <Th>Caption</Th>
              <Th>Platforms</Th>
              <Th>Zeitpunkt</Th>
              <Th>Status</Th>
              <Th>Resultate</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => {
              const platforms = JSON.parse(p.platforms_json) as Array<{
                platform: string;
                account_id: number;
              }>;
              const results = p.results_json ? JSON.parse(p.results_json) : null;
              return (
                <tr
                  key={p.id}
                  className="border-t border-neutral-800 align-top"
                >
                  <Td className="font-mono text-xs">{p.id}</Td>
                  <Td className="max-w-xs truncate">
                    {p.caption || <span className="text-neutral-500">—</span>}
                  </Td>
                  <Td>
                    <div className="flex gap-1 flex-wrap">
                      {platforms.map((pl, i) => (
                        <span
                          key={i}
                          className="text-xs bg-neutral-800 rounded px-2 py-0.5"
                        >
                          {pl.platform}
                        </span>
                      ))}
                    </div>
                  </Td>
                  <Td className="text-xs">
                    {p.scheduled_at
                      ? format(new Date(p.scheduled_at), "dd.MM.yyyy HH:mm")
                      : "(sofort)"}
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="text-xs max-w-xs">
                    {results &&
                      Array.isArray(results) &&
                      results.map(
                        (
                          r:
                            | { ok: true; platform: string; externalId: string }
                            | { ok: false; platform: string; error: string },
                          i: number
                        ) => (
                          <div key={i} className="truncate">
                            <span className="font-medium">{r.platform}:</span>{" "}
                            {r.ok ? (
                              <span className="text-green-400">
                                ok ({r.externalId})
                              </span>
                            ) : (
                              <span className="text-red-400" title={r.error}>
                                {r.error.slice(0, 60)}
                              </span>
                            )}
                          </div>
                        )
                      )}
                  </Td>
                </tr>
              );
            })}
            {posts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-neutral-500">
                  Noch keine Posts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left text-xs uppercase tracking-wide text-neutral-500 px-4 py-2">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={"px-4 py-2 " + className}>{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "published"
      ? "bg-green-900/40 text-green-300"
      : status === "failed"
      ? "bg-red-900/40 text-red-300"
      : status === "scheduled"
      ? "bg-blue-900/40 text-blue-300"
      : status === "publishing"
      ? "bg-yellow-900/40 text-yellow-300"
      : "bg-neutral-800 text-neutral-400";
  return (
    <span className={"text-xs px-2 py-0.5 rounded " + color}>{status}</span>
  );
}

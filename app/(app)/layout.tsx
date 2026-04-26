import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AppSidebar } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const db = getDb();
  const publishedCount = (db.prepare("SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'published'").get(user.id) as { n: number }).n;
  const scheduledCount = (db.prepare("SELECT COUNT(*) as n FROM posts WHERE user_id = ? AND status = 'scheduled'").get(user.id) as { n: number }).n;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <AppSidebar
        userName={user.name || user.email || "?"}
        publishedCount={publishedCount}
        scheduledCount={scheduledCount}
      />
      <main style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

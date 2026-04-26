import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Project } from "@/lib/db";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const db = getDb();
  const projects = db.prepare(
    "SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC"
  ).all(user.id) as Project[];
  return (
    <div style={{ padding: "20px 28px 40px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="h-eyebrow" style={{ marginBottom: 6 }}>Campaigns · Workspace</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.035em", margin: 0, color: "var(--text-1)" }}>
          Projekte
        </h1>
      </div>
      <ProjectsClient initialProjects={projects}/>
    </div>
  );
}

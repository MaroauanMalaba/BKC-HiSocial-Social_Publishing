import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb, Project, AccountInsight } from "@/lib/db";
import { ProjectDetailClient } from "./project-detail-client";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const db = getDb();
  const project = db.prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?").get(Number(id), user.id) as Project | undefined;
  if (!project) notFound();
  const accountInsights = db.prepare("SELECT * FROM account_insights WHERE user_id = ?").all(user.id) as AccountInsight[];
  return <ProjectDetailClient project={project} accountInsights={accountInsights}/>;
}

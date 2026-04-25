import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-neutral-500">
            BKC · HiSocial
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Social Publishing</h1>
          <p className="text-neutral-400 mt-2 text-sm">
            Intern. Für das Team.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6">
          <LoginForm />

          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-900/40 p-3 text-xs text-red-300 mt-4">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

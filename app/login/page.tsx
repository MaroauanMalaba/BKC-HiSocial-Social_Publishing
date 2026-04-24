import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

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
            Ein Klick — alle deine Facebook Pages und Instagram Business
            Accounts werden automatisch verknüpft.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 space-y-4">
          <a
            href="/api/oauth/meta/start"
            className="flex items-center justify-center gap-3 rounded-lg bg-[#1877F2] hover:bg-[#1464cf] text-white font-medium px-5 py-3 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24h11.495v-9.294H9.691v-3.622h3.129V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24h-1.917c-1.504 0-1.796.715-1.796 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
            </svg>
            Mit Facebook einloggen
          </a>

          <div className="text-xs text-neutral-500 space-y-1">
            <p>
              Verbindet in einem Schritt: Login + alle Facebook Pages + alle
              verknüpften Instagram Business Accounts.
            </p>
            <p className="text-neutral-600">
              Dein Instagram-Konto muss ein Business- oder Creator-Profil sein,
              verknüpft mit einer Facebook Page.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-900/40 p-3 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

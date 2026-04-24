import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r border-neutral-800 bg-neutral-950 px-4 py-6 flex flex-col gap-6">
        <div>
          <div className="text-xs text-neutral-500 uppercase tracking-wide">
            BKC HiSocial
          </div>
          <div className="text-sm font-medium mt-1">Social Publishing</div>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/upload" label="Upload & Post" />
          <NavLink href="/schedule" label="Schedule" />
          <NavLink href="/accounts" label="Accounts" />
        </nav>

        <div className="mt-auto">
          <div className="flex items-center gap-3 rounded-lg bg-neutral-900/60 border border-neutral-800 p-2 mb-2">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-neutral-700 flex items-center justify-center text-xs">
                {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">
                {user.name || user.email}
              </div>
              <div className="text-[10px] text-neutral-500 uppercase">
                {user.auth_provider === "meta" ? "via Facebook" : "lokal"}
              </div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 rounded-md text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
    >
      {label}
    </Link>
  );
}

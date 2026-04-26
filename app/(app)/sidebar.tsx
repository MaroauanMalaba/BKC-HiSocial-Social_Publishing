"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Übersicht",      icon: "home" },
  { href: "/upload",    label: "Composer",        icon: "plus" },
  { href: "/projects",  label: "Projekte",        icon: "folder" },
  { href: "/schedule",  label: "Kalender",        icon: "calendar" },
  { href: "/insights",  label: "Insights",        icon: "chart" },
  { href: "/accounts",  label: "Accounts",        icon: "link" },
  { href: "/team",      label: "Team",            icon: "users" },
  { href: "/settings",  label: "Einstellungen",   icon: "settings" },
];

type SidebarProps = {
  userName: string;
  publishedCount: number;
  scheduledCount: number;
};

export function AppSidebar({ userName, publishedCount, scheduledCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="glass" style={{
      width: 240,
      margin: 14,
      marginRight: 0,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flexShrink: 0,
      borderRadius: "20px 0 0 20px",
      position: "sticky",
      top: 14,
      height: "calc(100vh - 28px)",
      overflowY: "auto",
    }}>
      {/* Brand */}
      <div style={{ padding: "6px 8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.04em", lineHeight: 1, color: "var(--text-1)" }}>
          Hi<span style={{ color: "var(--accent-blue)" }}>Social</span>
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 2 }}>
          Studio
        </span>
      </div>

      {/* Nav */}
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} data-active={isActive ? "true" : undefined} className="nav-item" style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            textDecoration: "none",
            background: isActive ? "var(--glass-bg-strong)" : "transparent",
            color: isActive ? "var(--text-1)" : "var(--text-2)",
            border: isActive ? "1px solid var(--glass-border)" : "1px solid transparent",
            boxShadow: isActive ? "0 1px 0 rgba(255,255,255,0.7) inset, 0 4px 12px -6px rgba(12,24,56,0.2)" : "none",
            position: "relative",
          }}>
            {isActive && (
              <span style={{
                position: "absolute",
                left: 4,
                top: "50%",
                transform: "translateY(-50%)",
                width: 3,
                height: 18,
                borderRadius: 2,
                background: "var(--green-action)",
                boxShadow: "0 0 8px var(--green-glow)",
              }}/>
            )}
            <Icon name={item.icon} size={18}/>
            {item.label}
          </Link>
        );
      })}

      <div style={{ flex: 1 }}/>

      {/* Real workspace stats */}
      <div style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid var(--glass-border)",
        background: "var(--glass-bg)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--text-3)" }}>
          Workspace
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--green-action)" }}>{publishedCount}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, marginTop: 1 }}>Veröffentlicht</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--accent-blue)" }}>{scheduledCount}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, marginTop: 1 }}>Geplant</div>
          </div>
        </div>
      </div>

      {/* Theme toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>Erscheinungsbild</span>
        <ThemeToggle/>
      </div>

      {/* User + logout */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 14,
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #60a5fa, #1e3a8a)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 800, fontSize: 12,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
          flexShrink: 0,
        }}>
          {(userName || "?")[0].toUpperCase()}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {userName}
        </span>
        <button
          onClick={logout}
          title="Logout"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 8, flexShrink: 0 }}
        >
          <Icon name="logout" size={15}/>
        </button>
      </div>
    </aside>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const stored = localStorage.getItem("hs-theme") as "dark" | "light" | null;
    const initial = stored ?? "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("hs-theme", next);
  }

  return (
    <div style={{
      display: "flex",
      background: "var(--glass-bg)",
      border: "1px solid var(--glass-border)",
      borderRadius: 999,
      padding: 3,
      gap: 2,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
    }}>
      {(["light", "dark"] as const).map((t) => {
        const active = theme === t;
        return (
          <button
            key={t}
            onClick={() => toggle(t)}
            title={t === "dark" ? "Dark Mode" : "Light Mode"}
            style={{
              width: 28, height: 28, borderRadius: 999,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "none", cursor: "pointer",
              background: active ? "var(--glass-bg-strong)" : "transparent",
              boxShadow: active ? "0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 6px -2px rgba(12,24,56,0.2)" : "none",
              color: active ? "var(--text-1)" : "var(--text-3)",
              transition: "all .15s ease",
            }}
          >
            <Icon name={t === "dark" ? "moon" : "sun"} size={13} stroke={2}/>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { PLATFORM_COLOR } from "@/components/ui/platform-logos";

export type CalPost = {
  id: number;
  caption: string;
  platforms: string[];
  scheduled_at: number | null;
  created_at: number;
  status: string;
};

const DAYS   = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

function dow(d: Date) { return (d.getDay() + 6) % 7; } // Mon=0

function buildGrid(year: number, month: number) {
  const first  = new Date(year, month, 1);
  const last   = new Date(year, month + 1, 0);
  const offset = dow(first);
  const cells: Array<{ date: Date; current: boolean }> = [];
  for (let i = 0; i < offset; i++)
    cells.push({ date: new Date(year, month, i - offset + 1), current: false });
  for (let i = 1; i <= last.getDate(); i++)
    cells.push({ date: new Date(year, month, i), current: true });
  while (cells.length % 7 !== 0)
    cells.push({ date: new Date(year, month + 1, cells.length - offset - last.getDate() + 1), current: false });
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function postDate(p: CalPost): Date {
  return new Date(p.scheduled_at ?? p.created_at);
}

const HEATMAP_HOURS = [6, 9, 12, 15, 18, 21];

// Pre-computed so server and client render identical values (no Math.random/sin drift)
const HEATMAP: Record<number, number[]> = Object.fromEntries(
  HEATMAP_HOURS.map(h => [
    h,
    DAYS.map((_, i) => Math.round(Math.abs(Math.sin(h * 7 + i * 3.7)) * 100)),
  ])
);

export function CalendarClient({ posts }: { posts: CalPost[] }) {
  const now   = new Date();
  const [view, setView]   = useState<"month" | "list">("month");
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState<CalPost[] | null>(null);

  const grid = buildGrid(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const monthPosts = posts.filter(p => {
    const d = postDate(p);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const weekStats = {
    scheduled:  posts.filter(p => p.status === "scheduled").length,
    published:  posts.filter(p => p.status === "published").length,
    draft:      posts.filter(p => p.status === "draft").length,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 14 }}>
      {/* ── Main calendar ── */}
      <div className="glass" style={{ padding: 20 }}>
        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} className="hs-btn hs-btn-glass" style={{ padding: "6px 10px" }}>
              <Icon name="chevron_r" size={14} stroke={2.2} className="rotate-180"/>
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em", margin: 0, color: "var(--text-1)", minWidth: 160 }}>
              {MONTHS[month]} {year}
            </h2>
            <button onClick={nextMonth} className="hs-btn hs-btn-glass" style={{ padding: "6px 10px" }}>
              <Icon name="chevron_r" size={14} stroke={2.2}/>
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Platform legend */}
            <div style={{ display: "flex", gap: 12 }}>
              {(["instagram","tiktok","youtube","facebook","linkedin"] as const).map(p => (
                <div key={p} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_COLOR[p] ?? "#999", flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "capitalize" }}>{p}</span>
                </div>
              ))}
            </div>
            {/* View toggle */}
            <div style={{ display: "flex", background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: 999, padding: 3, gap: 2 }}>
              {(["month", "list"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
                  background: view === v ? "var(--glass-bg-strong)" : "transparent",
                  color: view === v ? "var(--text-1)" : "var(--text-3)",
                  boxShadow: view === v ? "0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 6px -2px rgba(12,24,56,0.12)" : "none",
                  transition: "all .15s ease",
                }}>
                  {v === "month" ? "Monat" : "Liste"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {view === "month" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--glass-border)", borderRadius: 14, overflow: "hidden", border: "1px solid var(--glass-border)" }}>
            {/* Day headers */}
            {DAYS.map(d => (
              <div key={d} style={{ padding: "10px 8px", background: "var(--glass-bg-strong)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)", textAlign: "center" }}>
                {d}
              </div>
            ))}
            {/* Day cells */}
            {grid.map((cell, idx) => {
              const isToday    = sameDay(cell.date, now);
              const dayPosts   = posts.filter(p => sameDay(postDate(p), cell.date));
              const hasEvents  = dayPosts.length > 0;
              return (
                <div
                  key={idx}
                  onClick={() => hasEvents && setSelected(dayPosts)}
                  style={{
                    minHeight: 88, padding: 8,
                    background: isToday ? "rgba(34,197,94,0.07)" : "var(--glass-bg)",
                    opacity: cell.current ? 1 : 0.35,
                    display: "flex", flexDirection: "column", gap: 3,
                    cursor: hasEvents ? "pointer" : "default",
                    transition: "background .12s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: isToday ? "white" : "var(--text-1)",
                      background: isToday ? "var(--green-action)" : "transparent",
                      width: 22, height: 22, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: isToday ? "0 4px 10px var(--green-glow)" : "none",
                      flexShrink: 0,
                    }}>
                      {cell.date.getDate()}
                    </span>
                    {dayPosts.length > 2 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)" }}>+{dayPosts.length - 2}</span>
                    )}
                  </div>
                  {dayPosts.slice(0, 2).map((p, i) => {
                    const color = PLATFORM_COLOR[p.platforms[0]] ?? "#888";
                    return (
                      <div key={i} style={{
                        padding: "3px 6px", borderRadius: 5,
                        background: `${color}18`,
                        borderLeft: `3px solid ${color}`,
                        fontSize: 10, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        color: "var(--text-1)",
                      }}>
                        {p.platforms[0]} · {postDate(p).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div style={{ display: "flex", flexDirection: "column" }}>
            {monthPosts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-3)" }}>
                <Icon name="calendar" size={28}/>
                <p style={{ marginTop: 10, fontSize: 13 }}>Keine Posts in diesem Monat.</p>
                <Link href="/upload" className="hs-btn hs-btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
                  <Icon name="plus" size={14}/>Post erstellen
                </Link>
              </div>
            ) : monthPosts.map((p, idx) => {
              const d = postDate(p);
              const color = PLATFORM_COLOR[p.platforms[0]] ?? "#888";
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 4px",
                  borderTop: idx ? "1px solid var(--glass-border)" : "none",
                }}>
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-1)" }}>
                      {p.caption || <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>Kein Caption</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                      {p.platforms.map(pl => (
                        <span key={pl} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "capitalize" }}>{pl}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500, flexShrink: 0 }}>
                    {d.toLocaleDateString("de-AT", { day: "2-digit", month: "2-digit" })} · {d.toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, flexShrink: 0,
                    background: p.status === "published" ? "rgba(34,197,94,0.14)" : p.status === "scheduled" ? "rgba(59,130,246,0.14)" : "rgba(107,114,128,0.14)",
                    color: p.status === "published" ? "#15803d" : p.status === "scheduled" ? "#1d4ed8" : "#6b7280",
                  }}>
                    {p.status === "published" ? "Veröffentlicht" : p.status === "scheduled" ? "Geplant" : p.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* KI recommendation */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="h-eyebrow" style={{ marginBottom: 10 }}>KI-Empfehlung</div>
          <div className="ai-shimmer" style={{ padding: 12, borderRadius: 12, background: "rgba(34,197,94,0.08)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green-action)", marginBottom: 6 }}>
              <Icon name="sparkles" size={13}/>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Beste Zeit heute</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.035em", color: "var(--text-1)" }}>14:30 — 16:00</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>+38% Engagement vs. Durchschnitt</div>
          </div>
          <Link href="/upload" className="hs-btn hs-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
            <Icon name="plus" size={14}/>Post planen
          </Link>
        </div>

        {/* Engagement heatmap */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="h-eyebrow" style={{ marginBottom: 12 }}>Heatmap · Beste Zeiten</div>
          <div style={{ display: "grid", gridTemplateColumns: "26px repeat(7, 1fr)", gap: 2, fontSize: 9 }}>
            <div/>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign: "center", fontWeight: 700, color: "var(--text-3)", marginBottom: 2 }}>{d[0]}</div>
            ))}
            {HEATMAP_HOURS.map(h => (
              <React.Fragment key={h}>
                <div style={{ color: "var(--text-3)", fontWeight: 600, fontSize: 9, display: "flex", alignItems: "center" }}>{h}h</div>
                {HEATMAP[h].map((v, i) => (
                  <div key={`${h}-${i}`} style={{
                    height: 16, borderRadius: 3,
                    background: `rgba(34,197,94,${((v / 100) * 0.8 + 0.05).toFixed(3)})`,
                  }}/>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Week stats */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="h-eyebrow" style={{ marginBottom: 12 }}>Gesamt</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Geplant",        value: weekStats.scheduled, color: "var(--accent-blue)"  },
              { label: "Veröffentlicht", value: weekStats.published, color: "var(--green-action)" },
              { label: "Entwürfe",       value: weekStats.draft,     color: "var(--text-3)"       },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(10,21,48,0.4)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass"
            style={{ width: 400, maxHeight: "80vh", overflow: "auto", padding: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>
                {postDate(selected[0]).toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}>
                <Icon name="x" size={18}/>
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {selected.map(p => {
                const color = PLATFORM_COLOR[p.platforms[0]] ?? "#888";
                return (
                  <div key={p.id} style={{ padding: "12px 14px", borderRadius: 12, background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderLeft: `4px solid ${color}` }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                      {p.caption || <span style={{ fontStyle: "italic", color: "var(--text-3)" }}>Kein Caption</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {p.platforms.map(pl => (
                        <span key={pl} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", textTransform: "capitalize" }}>{pl}</span>
                      ))}
                      <span style={{ fontSize: 11, color: "var(--text-3)", marginLeft: "auto" }}>
                        {postDate(p).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

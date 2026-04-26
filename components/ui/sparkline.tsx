"use client";

export function Sparkline({ data, color = "var(--green-action)", height = 60, fill = true }: {
  data: number[]; color?: string; height?: number; fill?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${100 - ((v - min) / range) * 90 - 5}`);
  const path = `M${points.join(" L")}`;
  const fillPath = `${path} L${w},100 L0,100 Z`;
  const gradId = `sg-${color.replace(/[^a-z0-9]/gi, "")}${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg viewBox={`0 0 ${w} 100`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block" }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={fillPath} fill={`url(#${gradId})`}/>
        </>
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

export function Donut({ value, label, color = "var(--green-action)", size = 110 }: {
  value: number; label: string; color?: string; size?: number;
}) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="50" cy="50" r={r} stroke="var(--glass-border)" strokeWidth="8" fill="none"/>
        <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="8" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}/>
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 1,
      }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, letterSpacing: "-0.03em" }}>{value}%</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>{label}</div>
      </div>
    </div>
  );
}

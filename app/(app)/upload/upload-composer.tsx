"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { PlatformLogo } from "@/components/ui/platform-logos";
import { PLATFORM_FORMATS, defaultFormat } from "@/lib/social/platform-formats";

type PlatformOption = { platform: string; label: string };
type MediaInfo = {
  id: number; status: string; kind?: string; filename?: string;
  original_size?: number; compressed_size?: number; progress?: number;
  progress_fps?: number | null; progress_speed?: number | null;
  duration_seconds?: number | null; error?: string | null;
};

export function UploadComposer({ platforms, userName }: { platforms: PlatformOption[]; userName: string }) {
  const [uploading, setUploading]       = useState(false);
  const [mediaList, setMediaList]       = useState<MediaInfo[]>([]);
  const [caption, setCaption]           = useState("");
  const [selected, setSelected]         = useState<Set<string>>(new Set());
  const [platformFormats, setPlatformFormats] = useState<Record<string, string>>({});
  const [scheduleMode, setScheduleMode] = useState<"now"|"scheduled"|"draft">("now");
  const [scheduledAt, setScheduledAt]   = useState("");
  const [result, setResult]             = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [posting, setPosting]           = useState(false);
  const [dragging, setDragging]         = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const pollRefs   = useRef<Map<number, number>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter  = useRef(0);

  const safePlatforms = Array.isArray(platforms) ? platforms : [];

  useEffect(() => {
    return () => pollRefs.current.forEach((t) => window.clearInterval(t));
  }, []);

  async function uploadFiles(files: FileList) {
    setError(null); setResult(null);
    for (const file of Array.from(files)) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      setUploading(false);
      if (!res.ok) { setError(json.error || "Upload fehlgeschlagen"); return; }
      setMediaList((prev) => [...prev, { id: json.id, status: "pending" }]);
      startPolling(json.id);
    }
  }

  function startPolling(id: number) {
    const t = window.setInterval(async () => {
      const res  = await fetch("/api/media");
      const json = await res.json();
      const m    = json.media.find((x: MediaInfo) => x.id === id);
      if (m) {
        setMediaList((prev) => prev.map((p) => (p.id === id ? m : p)));
        if (m.status === "ready" || m.status === "failed") {
          window.clearInterval(pollRefs.current.get(id));
          pollRefs.current.delete(id);
        }
      }
    }, 500);
    pollRefs.current.set(id, t);
  }

  function togglePlatform(p: string) {
    const next = new Set(selected);
    if (next.has(p)) { next.delete(p); } else {
      next.add(p);
      setPlatformFormats((prev) => ({ ...prev, [p]: prev[p] ?? defaultFormat(p) }));
    }
    setSelected(next);
  }

  const readyMedia      = mediaList.filter((m) => m.status === "ready");
  const processingMedia = mediaList.filter((m) => m.status === "processing" || m.status === "pending");
  const activeCount     = processingMedia.length;

  const captionLimit = selected.size === 0 ? 2200 : Math.min(
    ...Array.from(selected).map((p) => {
      const fmt = platformFormats[p] ?? defaultFormat(p);
      return PLATFORM_FORMATS[p]?.find((f) => f.id === fmt)?.maxChars ?? 2200;
    }).filter((n) => n > 0)
  );

  const canPost = readyMedia.length > 0 && processingMedia.length === 0 && !posting && selected.size > 0 && scheduleMode !== "draft";

  async function submitPost() {
    if (readyMedia.length === 0) return;
    if (selected.size === 0) { setError("Wähle mindestens eine Plattform"); return; }
    const allStory = Array.from(selected).every((p) => (platformFormats[p] ?? defaultFormat(p)) === "story");
    if (!allStory && !caption.trim()) { setError("Caption fehlt"); return; }
    setPosting(true); setError(null);
    const body: Record<string, unknown> = {
      media_ids: readyMedia.map((m) => m.id),
      caption,
      platforms: Array.from(selected),
      platform_formats: platformFormats,
      post_type: platformFormats[Array.from(selected)[0]] ?? "feed",
      is_draft: scheduleMode === "draft",
    };
    if (scheduleMode === "scheduled" && scheduledAt) body.scheduled_at = new Date(scheduledAt).getTime();
    const res  = await fetch("/api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) { setError(json.error || "Post fehlgeschlagen"); return; }
    setResult(json.status === "scheduled" ? `Post #${json.id} geplant` : `Post #${json.id} wird veröffentlicht`);
    setMediaList([]); setCaption(""); setSelected(new Set());
    setPlatformFormats({}); setScheduleMode("now"); setScheduledAt("");
  }

  if (safePlatforms.length === 0) {
    return (
      <div className="glass" style={{ padding: 22, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center",
          justifyContent: "center", color: "#fbbf24",
        }}>
          <Icon name="bolt" size={20}/>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>Noch keine Accounts verbunden</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 2 }}>
            Verbinde mindestens einen Social-Media-Account, um Posts zu veröffentlichen.
          </div>
        </div>
        <Link href="/accounts" className="hs-btn hs-btn-primary">
          <Icon name="plus" size={14}/>Account verbinden
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>

      {/* ── Left column ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 1 · Platform selector + Format */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="h-eyebrow" style={{ marginBottom: 10 }}>Plattformen wählen</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {safePlatforms.map((p) => {
              const sel = selected.has(p.platform);
              return (
                <button
                  key={p.platform}
                  type="button"
                  onClick={() => togglePlatform(p.platform)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 14px 8px 8px", borderRadius: 999, cursor: "pointer",
                    background: sel ? "var(--glass-bg-strong)" : "var(--glass-bg)",
                    border: sel ? "1.5px solid var(--green-action)" : "1px solid var(--glass-border)",
                    boxShadow: sel ? "0 0 0 4px rgba(34,197,94,0.12)" : "none",
                    transition: "all .15s ease",
                  }}
                >
                  <PlatformLogo platform={p.platform} size={22}/>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>{p.label}</span>
                  {sel && <Icon name="check" size={14}/>}
                </button>
              );
            })}
          </div>

          {/* Format picker — shown per selected platform */}
          {selected.size > 0 && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--glass-border)" }}>
              <div className="h-eyebrow" style={{ marginBottom: 10 }}>Format</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from(selected).map((platform) => {
                  const formats = PLATFORM_FORMATS[platform] ?? [];
                  if (formats.length <= 1) return null;
                  const currentFmt = platformFormats[platform] ?? defaultFormat(platform);
                  return (
                    <div key={platform} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flexShrink: 0 }}><PlatformLogo platform={platform} size={16}/></div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {formats.map((fmt) => {
                          const active = currentFmt === fmt.id;
                          return (
                            <button
                              key={fmt.id}
                              type="button"
                              title={fmt.desc}
                              onClick={() => setPlatformFormats((prev) => ({ ...prev, [platform]: fmt.id }))}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "5px 12px", borderRadius: 999, cursor: "pointer",
                                fontSize: 12, fontWeight: 600, transition: "all .15s ease",
                                background: active ? "var(--glass-bg-strong)" : "var(--glass-bg)",
                                border: active ? "1.5px solid var(--green-action)" : "1px solid var(--glass-border)",
                                color: active ? "var(--text-1)" : "var(--text-3)",
                                boxShadow: active ? "0 0 0 3px rgba(34,197,94,0.12), 0 1px 0 rgba(255,255,255,0.7) inset" : "none",
                              }}
                            >
                              <Icon name={fmt.icon} size={11}/>
                              {fmt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2 · Drag & Drop zone (always visible) */}
        <div
          className="glass"
          onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setDragging(false); }}
          onDrop={(e) => {
            e.preventDefault(); dragCounter.current = 0; setDragging(false);
            if (e.dataTransfer.files?.length && !uploading) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: 22, minHeight: 180, cursor: "pointer",
            border: `2px dashed ${dragging ? "var(--green-action)" : "var(--accent-blue)"}`,
            background: dragging
              ? "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))"
              : "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(34,197,94,0.04))",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 8, transition: "all .2s ease",
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 18, flexShrink: 0,
            background: "var(--glass-bg-strong)", border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--accent-blue)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
          }}>
            <Icon name="upload" size={26}/>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-1)" }}>
              {dragging ? "Loslassen zum Hochladen" : "Dateien hier ablegen"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
              Bilder & Videos werden automatisch komprimiert · max 2 GB
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            className="hs-btn hs-btn-glass"
            style={{ marginTop: 6 }}
          >
            <Icon name="folder" size={14}/>Aus Mediathek wählen
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); }}
          disabled={uploading || mediaList.length >= 10}
          style={{ display: "none" }}
        />

        {/* 3 · Compression card (only when files exist) */}
        {mediaList.length > 0 && (
          <div className="glass" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div className="h-eyebrow">Hochgeladen · Komprimierung</div>
              {activeCount > 0 && (
                <span className="hs-chip hs-chip-green" style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="bolt" size={10}/>{activeCount} aktiv
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {mediaList.map((m, i) => (
                <CompressionRow
                  key={m.id}
                  media={m}
                  index={i}
                  onRemove={() => setMediaList((prev) => prev.filter((x) => x.id !== m.id))}
                />
              ))}
            </div>
          </div>
        )}

        {/* 4 · Caption editor */}
        <div className="glass" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="h-eyebrow">Caption</div>
            <button
              type="button"
              disabled={aiLoading}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const firstPlatform = Array.from(selected)[0] ?? "instagram";
                  const res  = await fetch("/api/ai/caption", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      platform: firstPlatform,
                      post_type: platformFormats[firstPlatform] ?? defaultFormat(firstPlatform),
                      existing_caption: caption.trim() || undefined,
                    }),
                  });
                  const json = await res.json();
                  if (res.ok && json.caption) setCaption(json.caption);
                  else setError(json.error ?? "KI-Vorschlag fehlgeschlagen");
                } catch { setError("KI-Vorschlag fehlgeschlagen"); }
                finally  { setAiLoading(false); }
              }}
              className="hs-btn hs-btn-glass"
              style={{ padding: "6px 12px", fontSize: 12, opacity: aiLoading ? 0.6 : 1 }}
            >
              <Icon name="sparkles" size={12}/>{aiLoading ? "Generiere…" : "KI-Vorschlag"}
            </button>
          </div>
          <textarea
            rows={4}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Was möchtest du schreiben?"
            className="hs-input"
            style={{ minHeight: 110, resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.5 }}
          />
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 12, fontWeight: 600,
            color: caption.length > captionLimit ? "#f87171" : "var(--text-3)",
          }}>
            <span>{caption.length} / {captionLimit.toLocaleString("de-AT")} Zeichen</span>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="hash" size={12}/>{(caption.match(/#\w+/g) || []).length} Hashtags
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="smile" size={12}/>{(caption.match(/\p{Emoji_Presentation}/gu) || []).length} Emojis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right column ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* 1 · Live preview */}
        <div className="glass" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="h-eyebrow">Live-Vorschau</div>
            {selected.size > 0 && (
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from(selected).map((p) => (
                  <div key={p} style={{ padding: 4 }}><PlatformLogo platform={p} size={18}/></div>
                ))}
              </div>
            )}
          </div>

          {/* Instagram-style post mockup */}
          <div style={{
            background: "#fafafa", borderRadius: 14, padding: 14,
            border: "1px solid var(--glass-border)", color: "#262626",
          }}>
            {/* Post header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf)",
                padding: 2, flexShrink: 0,
              }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  background: "#1e3a8a", display: "flex", alignItems: "center",
                  justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800,
                }}>
                  {(userName || "?")[0].toUpperCase()}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{userName || "Dein Account"}</div>
                <div style={{ fontSize: 10, color: "#737373" }}>Sponsored · München</div>
              </div>
              <span style={{ fontSize: 18, color: "#737373", lineHeight: 1 }}>⋯</span>
            </div>

            {/* Media placeholder */}
            <div style={{
              height: 220, borderRadius: 10, marginBottom: 10,
              background: readyMedia.length > 0
                ? "linear-gradient(135deg, #1e3a8a, #4338ca, #1e40af)"
                : "var(--glass-bg)",
              border: readyMedia.length === 0 ? "2px dashed var(--glass-border)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: readyMedia.length > 0 ? "white" : "var(--text-3)",
              position: "relative", overflow: "hidden",
            }}>
              {readyMedia.length > 0 ? (
                <>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    backdropFilter: "blur(20px)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="play" size={20}/>
                  </div>
                  <span style={{
                    position: "absolute", top: 10, left: 10,
                    padding: "3px 8px",
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: 6, fontSize: 10, fontWeight: 700, color: "white",
                    textTransform: "uppercase",
                  }}>
                    {(() => {
                      const firstPlatform = Array.from(selected)[0];
                      const fmt = firstPlatform ? (platformFormats[firstPlatform] ?? defaultFormat(firstPlatform)) : "feed";
                      const fmtLabel = firstPlatform
                        ? (PLATFORM_FORMATS[firstPlatform]?.find((f) => f.id === fmt)?.label ?? fmt)
                        : "Feed";
                      return readyMedia[0].kind === "video"
                        ? `${fmtLabel}${readyMedia[0].duration_seconds ? ` · ${readyMedia[0].duration_seconds.toFixed(0)}s` : ""}`
                        : fmtLabel;
                    })()}
                  </span>
                </>
              ) : (
                <Icon name="image" size={28}/>
              )}
            </div>

            {/* Action icons */}
            <div style={{ display: "flex", gap: 12, padding: "6px 0 8px", fontSize: 20, color: "#262626" }}>
              <Icon name="heart" size={20}/>
              <Icon name="message" size={20}/>
              <Icon name="share" size={20}/>
            </div>

            {/* Like count */}
            <div style={{ fontSize: 11, fontWeight: 700 }}>Gefällt 0 Personen</div>

            {/* Caption preview */}
            <div style={{ fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
              {caption ? (
                <>
                  <strong>{userName || "Dein Account"}</strong>{" "}
                  {caption.slice(0, 80)}{caption.length > 80 ? "… " : " "}
                  <span style={{ color: "#737373" }}>mehr</span>
                </>
              ) : (
                <span style={{ color: "#737373" }}>Caption hier…</span>
              )}
            </div>
          </div>
        </div>

        {/* 2 · Publish schedule */}
        <div className="glass" style={{ padding: 18 }}>
          <div className="h-eyebrow" style={{ marginBottom: 10 }}>Veröffentlichen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {([
              { id: "now",       t: "Jetzt veröffentlichen", s: "Sofort auf alle gewählten Kanäle" },
              { id: "scheduled", t: "Geplant",               s: "Heute · 14:30 (KI-empfohlen)" },
              { id: "draft",     t: "Als Entwurf speichern", s: "Privat im Workspace" },
            ] as const).map((o) => {
              const sel = scheduleMode === o.id;
              return (
                <div
                  key={o.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setScheduleMode(o.id)}
                  onKeyDown={(e) => e.key === "Enter" && setScheduleMode(o.id)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: sel ? "var(--glass-bg-strong)" : "transparent",
                    border: sel ? "1.5px solid var(--green-action)" : "1px solid var(--glass-border)",
                    transition: "all .15s ease",
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                    border: `2px solid ${sel ? "var(--green-action)" : "var(--glass-border)"}`,
                    background: sel ? "var(--green-action)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s ease",
                  }}>
                    {sel && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }}/>}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>{o.t}</div>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1, fontWeight: 500 }}>{o.s}</div>
                  </div>
                </div>
              );
            })}
            {scheduleMode === "scheduled" && (
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="hs-input"
                style={{ fontSize: 13, marginTop: 4 }}
              />
            )}
          </div>
        </div>

        {/* 3 · KI forecast */}
        <div className="glass ai-shimmer" style={{
          padding: 16,
          background: "linear-gradient(110deg, rgba(34,197,94,0.06), rgba(59,130,246,0.06))",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green-action)", marginBottom: 6 }}>
            <Icon name="sparkles" size={14}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
              KI-Performance-Prognose
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--text-1)" }}>
            Erwartete Reichweite: <strong style={{ color: "var(--green-action)" }}>+24K</strong> · Engagement <strong>9.2%</strong>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
            Basierend auf 142 ähnlichen Posts der letzten 90 Tage.
          </div>
        </div>

        {/* Error / result */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#f87171", display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon name="x" size={16}/>{error}
          </div>
        )}
        {result && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 500,
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
            color: "#4ade80", display: "flex", alignItems: "center", gap: 10,
          }}>
            <Icon name="check" size={16}/>{result}
          </div>
        )}

        {/* 4 · Submit */}
        {scheduleMode === "draft" ? (
          <button
            onClick={submitPost}
            disabled={readyMedia.length === 0 || posting || selected.size === 0}
            className="hs-btn hs-btn-glass"
            style={{
              width: "100%", justifyContent: "center", padding: "14px", fontSize: 15,
              opacity: (readyMedia.length === 0 || posting || selected.size === 0) ? 0.4 : 1,
            }}
          >
            <Icon name="folder" size={16}/>
            {posting ? "Wird gespeichert…" : "Als Entwurf speichern"}
          </button>
        ) : (
          <button
            onClick={submitPost}
            disabled={!canPost}
            className="hs-btn hs-btn-primary"
            style={{
              width: "100%", justifyContent: "center", padding: "14px", fontSize: 15,
              opacity: canPost ? 1 : 0.4,
            }}
          >
            <Icon name="bolt" size={16}/>
            {posting ? "Wird gesendet…" : scheduleMode === "scheduled" ? "Post schedulen" : "Jetzt veröffentlichen"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Compression row ────────────────────────────────────────────────────────────

function CompressionRow({ media, index, onRemove }: {
  media: MediaInfo; index: number; onRemove: () => void;
}) {
  const pct         = Math.max(0, Math.min(100, media.progress ?? 0));
  const isProcessing = media.status === "processing";
  const isPending    = media.status === "pending";
  const isReady      = media.status === "ready";
  const isFailed     = media.status === "failed";
  const isActive     = isPending || isProcessing;

  const savedPct = media.original_size && media.compressed_size
    ? Math.round((1 - media.compressed_size / media.original_size) * 100)
    : null;

  const thumbColor = isReady ? "#22c55e" : isFailed ? "#ef4444" : "#1e3a8a";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0",
      borderTop: index ? "1px solid var(--glass-border)" : "none",
    }}>
      {/* Thumbnail */}
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${thumbColor}, ${thumbColor}99)`,
        display: "flex", alignItems: "center", justifyContent: "center", color: "white",
        position: "relative", overflow: "hidden",
      }}>
        <Icon name={media.kind === "video" ? "video" : "image"} size={20}/>
        {media.kind === "video" && (
          <span style={{
            position: "absolute", bottom: 3, right: 3,
            fontSize: 8, fontWeight: 800, color: "white",
            background: "rgba(0,0,0,0.6)", padding: "1px 4px", borderRadius: 3,
          }}>HD</span>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "-0.005em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: "var(--text-1)",
          }}>
            {media.filename ?? `media-${media.id}`}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", flexShrink: 0, marginLeft: 8 }}>
            {media.original_size ? `${(media.original_size / 1024 / 1024).toFixed(1)} MB` : ""}{" "}
            · {isProcessing ? `${pct.toFixed(0)}%` : isReady ? "Fertig" : isPending ? "Warte…" : "Fehler"}
          </span>
        </div>

        <div className="loader-bar">
          <div className="loader-bar-fill" style={{
            width: isReady ? "100%" : `${Math.max(pct, 4)}%`,
            animation: isReady ? "none" : undefined,
            background: isReady
              ? "linear-gradient(90deg, var(--green-action), #34d671)"
              : isFailed
              ? "linear-gradient(90deg, #ef4444, #b91c1c)"
              : undefined,
          }}/>
        </div>

        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
          {isPending    && "Warte auf Komprimierung…"}
          {isProcessing && (
            <span>
              Komprimiere…
              {media.progress_fps != null && ` · ${media.progress_fps.toFixed(0)} fps`}
              {media.duration_seconds != null && ` · ${media.duration_seconds.toFixed(1)}s`}
            </span>
          )}
          {isReady && media.original_size != null && media.compressed_size != null && (
            <span>
              {(media.original_size / 1024 / 1024).toFixed(1)} MB → {(media.compressed_size / 1024 / 1024).toFixed(1)} MB
              {savedPct !== null && savedPct > 0 && (
                <strong style={{ color: "var(--green-action)", marginLeft: 8 }}>−{savedPct}%</strong>
              )}
            </span>
          )}
          {isFailed && <span style={{ color: "#f87171" }}>{media.error ?? "Fehlgeschlagen"}</span>}
        </div>
      </div>

      {isReady ? (
        <span style={{ color: "var(--green-action)", flexShrink: 0 }}><Icon name="check" size={18}/></span>
      ) : isActive ? (
        <button
          className="hs-btn hs-btn-icon hs-btn-ghost"
          onClick={onRemove}
          style={{ flexShrink: 0 }}
          title="Abbrechen"
        >
          <Icon name="x" size={15}/>
        </button>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";

type PlatformOption = { platform: string; label: string };
type MediaInfo = {
  id: number;
  status: string;
  kind?: string;
  filename?: string;
  original_size?: number;
  compressed_size?: number;
  progress?: number;
  progress_fps?: number | null;
  progress_speed?: number | null;
  duration_seconds?: number | null;
  error?: string | null;
};

type PostType = "feed" | "story" | "reel";

export function UploadComposer({ platforms }: { platforms: PlatformOption[] }) {
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState<MediaInfo[]>([]);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [postType, setPostType] = useState<PostType>("feed");
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const pollRefs = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    return () => pollRefs.current.forEach((t) => window.clearInterval(t));
  }, []);

  async function uploadFiles(files: FileList) {
    setError(null);
    setResult(null);
    for (const file of Array.from(files)) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      setUploading(false);
      if (!res.ok) { setError(json.error || "Upload failed"); return; }
      const newMedia: MediaInfo = { id: json.id, status: "pending" };
      setMediaList((prev) => [...prev, newMedia]);
      startPolling(json.id);
    }
  }

  function startPolling(id: number) {
    const t = window.setInterval(async () => {
      const res = await fetch("/api/media");
      const json = await res.json();
      const m = json.media.find((x: MediaInfo) => x.id === id);
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

  function removeMedia(id: number) {
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  }

  function togglePlatform(platform: string) {
    const next = new Set(selected);
    if (next.has(platform)) next.delete(platform);
    else next.add(platform);
    setSelected(next);
  }

  const readyMedia = mediaList.filter((m) => m.status === "ready");
  const processingMedia = mediaList.filter((m) => m.status === "processing" || m.status === "pending");
  const isCarousel = readyMedia.length > 1;

  async function submitPost() {
    if (readyMedia.length === 0) return;
    if (selected.size === 0) { setError("Wähle mindestens eine Plattform"); return; }
    if (postType !== "story" && !caption.trim()) { setError("Caption fehlt"); return; }
    setPosting(true);
    setError(null);

    const body: Record<string, unknown> = {
      media_ids: readyMedia.map((m) => m.id),
      caption,
      platforms: Array.from(selected),
      post_type: postType,
    };
    if (schedule && scheduledAt) body.scheduled_at = new Date(scheduledAt).getTime();

    const res = await fetch("/api/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) { setError(json.error || "Post failed"); return; }
    setResult(json.status === "scheduled" ? `✔ Post #${json.id} geplant` : `✔ Post #${json.id} wird veröffentlicht`);
    setMediaList([]);
    setCaption("");
    setSelected(new Set());
    setPostType("feed");
    setSchedule(false);
    setScheduledAt("");
  }

  if (platforms.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-900/50 bg-yellow-900/20 p-5 text-sm">
        Du hast noch keine Social Accounts verbunden.{" "}
        <a href="/accounts" className="underline">
          Jetzt verbinden →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Dateien {isCarousel && <span className="text-xs text-neutral-400 ml-1">({readyMedia.length} Bilder — Carousel)</span>}
          </label>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); }}
            disabled={uploading || mediaList.length >= 10}
            className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-neutral-800 file:text-neutral-100 hover:file:bg-neutral-700"
          />
          {uploading && <p className="text-xs text-neutral-500 mt-2">Lade hoch…</p>}
        </div>

        {mediaList.map((m) => (
          <div key={m.id} className="relative">
            <CompressionStatus media={m} />
            {m.status === "ready" && (
              <button onClick={() => removeMedia(m.id)} className="absolute top-0 right-0 text-xs text-red-400 hover:text-red-300">✕ entfernen</button>
            )}
          </div>
        ))}

        {processingMedia.length > 0 && (
          <p className="text-xs text-neutral-500">{processingMedia.length} Datei(en) werden noch komprimiert…</p>
        )}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <label className="block text-sm font-medium mb-2">Post-Typ</label>
        <div className="flex gap-2">
          {(["feed", "story", "reel"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPostType(t)}
              className={"text-xs rounded-full px-3 py-1.5 border transition " + (postType === t ? "bg-white text-neutral-900 border-white" : "text-neutral-400 border-neutral-700 hover:border-neutral-500")}
            >
              {t === "feed" ? "Feed" : t === "story" ? "Story" : "Reel"}
            </button>
          ))}
        </div>
        {isCarousel && postType !== "feed" && (
          <p className="text-xs text-yellow-400 mt-2">Carousel ist nur für Feed Posts — Story/Reel braucht eine einzelne Datei.</p>
        )}
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Caption</label>
          <textarea
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm outline-none ring-1 ring-neutral-700 focus:ring-neutral-500"
            placeholder="Was willst du schreiben?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Plattformen auswählen
          </label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => {
              const active = selected.has(p.platform);
              return (
                <button
                  key={p.platform}
                  type="button"
                  onClick={() => togglePlatform(p.platform)}
                  className={
                    "text-xs rounded-full px-3 py-1.5 border transition " +
                    (active
                      ? "bg-white text-neutral-900 border-white"
                      : "bg-transparent text-neutral-300 border-neutral-700 hover:border-neutral-500")
                  }
                >
                  {p.platform} · {p.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={schedule}
              onChange={(e) => setSchedule(e.target.checked)}
            />
            Schedulen
          </label>
          {schedule && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="ml-3 rounded-md bg-neutral-800 px-3 py-1.5 text-sm outline-none ring-1 ring-neutral-700"
            />
          )}
        </div>
        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 rounded-md p-2">
            {error}
          </div>
        )}
        {result && (
          <div className="text-sm text-green-400 bg-green-900/20 rounded-md p-2">
            {result}
          </div>
        )}
        <button
          onClick={submitPost}
          disabled={
            readyMedia.length === 0 || processingMedia.length > 0 || posting || selected.size === 0
          }
          className="rounded-md bg-white text-neutral-900 font-medium px-4 py-2 text-sm hover:bg-neutral-200 disabled:opacity-50"
        >
          {posting
            ? "Sende…"
            : schedule
            ? "Post schedulen"
            : "Jetzt posten"}
        </button>
      </div>
    </div>
  );
}

function CompressionStatus({ media }: { media: MediaInfo }) {
  const pct = Math.max(0, Math.min(100, media.progress ?? 0));
  const isProcessing = media.status === "processing";
  const isPending = media.status === "pending";
  const isReady = media.status === "ready";
  const isFailed = media.status === "failed";

  const savedPct =
    media.original_size && media.compressed_size
      ? Math.round((1 - media.compressed_size / media.original_size) * 100)
      : null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <StatusDot status={media.status} />
          <span className="font-mono uppercase tracking-wide text-neutral-400">
            {isPending && "warte auf FFmpeg…"}
            {isProcessing && "komprimiere…"}
            {isReady && "fertig komprimiert"}
            {isFailed && "fehlgeschlagen"}
          </span>
        </div>
        <span className="font-mono text-neutral-300">
          {isReady ? "100%" : isProcessing ? `${pct.toFixed(1)}%` : "—"}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden relative">
        <div
          className={
            "h-full transition-all duration-300 ease-out rounded-full " +
            (isFailed
              ? "bg-red-500"
              : isReady
              ? "bg-green-500"
              : "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500")
          }
          style={{
            width: isReady ? "100%" : `${Math.max(pct, isProcessing ? 2 : 0)}%`,
          }}
        />
        {(isPending || isProcessing) && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent shimmer-slide" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Metric
          label="fps"
          value={
            isProcessing && media.progress_fps
              ? media.progress_fps.toFixed(0)
              : "—"
          }
        />
        <Metric
          label="bitrate"
          value={
            isProcessing && media.progress_speed
              ? `${(media.progress_speed / 1000).toFixed(1)} Mbps`
              : "—"
          }
        />
        <Metric
          label="dauer"
          value={
            media.duration_seconds
              ? `${media.duration_seconds.toFixed(1)}s`
              : "—"
          }
        />
      </div>

      {isReady &&
        media.original_size != null &&
        media.compressed_size != null && (
          <div className="rounded-md bg-green-900/20 border border-green-900/40 p-3 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-green-300 font-medium">
                {(media.original_size / 1024 / 1024).toFixed(2)} MB →{" "}
                {(media.compressed_size / 1024 / 1024).toFixed(2)} MB
              </span>
              {savedPct !== null && savedPct > 0 && (
                <span className="font-mono text-green-400">
                  −{savedPct}%
                </span>
              )}
            </div>
          </div>
        )}

      {media.error && (
        <div className="rounded-md bg-red-900/20 border border-red-900/40 p-3 text-xs text-red-300">
          {media.error}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "ready"
      ? "bg-green-400"
      : status === "failed"
      ? "bg-red-400"
      : "bg-cyan-400";
  const pulse = status === "processing" || status === "pending";
  return (
    <span className="relative inline-flex h-2 w-2">
      {pulse && (
        <span
          className={
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping " +
            color
          }
        />
      )}
      <span
        className={
          "relative inline-flex rounded-full h-2 w-2 " + color
        }
      />
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-800/60 border border-neutral-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="font-mono text-sm text-neutral-200 mt-0.5">{value}</div>
    </div>
  );
}

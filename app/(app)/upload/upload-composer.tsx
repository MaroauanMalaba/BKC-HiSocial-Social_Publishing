"use client";

import { useState, useEffect, useRef } from "react";

type Account = { id: number; platform: string; label: string };
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

export function UploadComposer({ accounts }: { accounts: Account[] }) {
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaInfo | null>(null);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(json.error || "Upload failed");
      return;
    }
    setMedia({ id: json.id, status: "pending" });
    startPolling(json.id);
  }

  function startPolling(id: number) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      const res = await fetch("/api/media");
      const json = await res.json();
      const m = json.media.find((x: MediaInfo) => x.id === id);
      if (m) {
        setMedia(m);
        if (m.status === "ready" || m.status === "failed") {
          if (pollRef.current) window.clearInterval(pollRef.current);
        }
      }
    }, 500);
  }

  function toggleAccount(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function submitPost() {
    if (!media || media.status !== "ready") return;
    if (selected.size === 0) {
      setError("Wähle mindestens einen Account");
      return;
    }
    setPosting(true);
    setError(null);
    const platforms = Array.from(selected).map((id) => {
      const acc = accounts.find((a) => a.id === id)!;
      return { account_id: acc.id, platform: acc.platform };
    });

    const body: Record<string, unknown> = {
      media_id: media.id,
      caption,
      platforms,
    };
    if (schedule && scheduledAt) {
      body.scheduled_at = new Date(scheduledAt).getTime();
    }

    const res = await fetch("/api/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(json.error || "Post failed");
      return;
    }
    setResult(
      json.status === "scheduled"
        ? `✔ Post #${json.id} geplant`
        : `✔ Post #${json.id} wird jetzt veröffentlicht`
    );
    setMedia(null);
    setCaption("");
    setSelected(new Set());
    setSchedule(false);
    setScheduledAt("");
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-yellow-900/50 bg-yellow-900/20 p-5 text-sm">
        Du hast noch keine Social Accounts verbunden.{" "}
        <a href="/accounts" className="underline">
          Jetzt Account hinzufügen →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <label className="block text-sm font-medium mb-2">
          Datei (Bild oder Video)
        </label>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile(f);
          }}
          disabled={uploading}
          className="block w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:bg-neutral-800 file:text-neutral-100 hover:file:bg-neutral-700"
        />
        {uploading && (
          <p className="text-xs text-neutral-500 mt-2">Lade hoch…</p>
        )}
        {media && <CompressionStatus media={media} />}
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
            Accounts auswählen
          </label>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => {
              const active = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAccount(a.id)}
                  className={
                    "text-xs rounded-full px-3 py-1.5 border " +
                    (active
                      ? "bg-white text-neutral-900 border-white"
                      : "bg-transparent text-neutral-300 border-neutral-700 hover:border-neutral-500")
                  }
                >
                  {a.platform} · {a.label}
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
            !media || media.status !== "ready" || posting || selected.size === 0
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

"use client";

import { useRef, useState } from "react";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

export default function PrivateVideoPlayer({ assetId }: { assetId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const player = useRef<HTMLVideoElement>(null);
  const position = useRef(0);

  async function load() {
    setLoading(true);
    setError(null);
    position.current = player.current?.currentTime ?? 0;
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/cast-screentime/video-assets/${encodeURIComponent(assetId)}/playback-url`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Unable to authorize video playback.");
      const payload = await response.json() as { url?: string };
      if (!payload.url?.startsWith("https://")) throw new Error("Playback link is unavailable.");
      setUrl(payload.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load video.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm" aria-label="Source video">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Source video</h2>
        <button type="button" onClick={() => void load()} disabled={loading}
          className="rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium disabled:opacity-60">
          {loading ? "Loading…" : url ? "Refresh playback link" : "Load video"}
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      {url ? (
        <video ref={player} src={url} controls preload="metadata" className="mt-3 w-full rounded-xl"
          onLoadedMetadata={() => { if (player.current) player.current.currentTime = position.current; }}
          onError={() => setError("Playback failed or the link expired. Refresh the playback link to try again.")} />
      ) : null}
    </section>
  );
}

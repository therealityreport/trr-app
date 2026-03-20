/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useCallback, useEffect } from "react";

interface ReverseImageCandidate {
  title: string;
  source_domain: string;
  page_url: string;
  thumbnail_b64: string | null;
  width: number | null;
  height: number | null;
}

interface ReplaceGettyDrawerProps {
  assetId: string;
  onClose: () => void;
  onReplaced: () => void;
}

export function ReplaceGettyDrawer({ assetId, onClose, onReplaced }: ReplaceGettyDrawerProps) {
  const [candidates, setCandidates] = useState<ReverseImageCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/trr-api/media-assets/${assetId}/reverse-image-search`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed");
        setCandidates([]);
        return;
      }
      setCandidates(data.candidates ?? []);
    } catch {
      setError("Failed to connect to search service");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  // Fetch candidates on mount
  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleReplace = async (candidate: ReverseImageCandidate) => {
    setReplacing(candidate.page_url);
    try {
      const res = await fetch(`/api/admin/trr-api/media-assets/${assetId}/replace-from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_url: candidate.page_url,
          source_domain: candidate.source_domain,
          expected_width: candidate.width,
          expected_height: candidate.height,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? "Replace failed");
        setReplacing(null);
        return;
      }
      onReplaced();
    } catch {
      setError("Failed to replace image");
      setReplacing(null);
    }
  };

  const MIN_WIDTH = 1080;

  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">Remove Watermarks</span>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-white/50">Searching for alternatives...</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-white/10" />
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-400">{error}</p>
      )}

      {!loading && candidates && candidates.length === 0 && !error && (
        <p className="mt-3 text-xs text-white/50">
          No alternative sources found above {MIN_WIDTH}px for this image.
        </p>
      )}

      {!loading && candidates && candidates.length > 0 && (
        <div className="mt-3 space-y-2">
          {candidates.map((candidate) => {
            const meetsMin = candidate.width != null && candidate.width >= MIN_WIDTH;
            const isReplacing = replacing === candidate.page_url;

            return (
              <div
                key={candidate.page_url}
                className={`flex items-start gap-3 rounded p-2 ${
                  meetsMin ? "bg-white/10" : "bg-white/5 opacity-50"
                }`}
              >
                {candidate.thumbnail_b64 ? (
                  <img
                    src={candidate.thumbnail_b64}
                    alt=""
                    className="h-12 w-16 flex-shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded bg-white/10 text-[10px] text-white/30">
                    No preview
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">
                    {candidate.source_domain}
                  </p>
                  <p className="truncate text-[10px] text-white/50">
                    {candidate.title || "Untitled"}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {candidate.width && candidate.height
                      ? `${candidate.width} × ${candidate.height}`
                      : "Unknown size"}
                  </p>
                </div>
                {meetsMin && (
                  <button
                    onClick={() => handleReplace(candidate)}
                    disabled={replacing !== null}
                    className="flex-shrink-0 rounded bg-blue-500/80 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isReplacing ? "Replacing..." : "Use This"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type CandidateFace = {
  face_index?: number;
  bbox?: number[];
  det_score?: number;
  face_width?: number;
  face_height?: number;
  face_area_ratio?: number;
  blur_score?: number | null;
  passed?: boolean;
  reasons?: string[];
};

type BuilderMetadata = {
  builder?: string;
  assigned_person_id?: string | null;
  raw_face_count?: number;
  image_width?: number;
  image_height?: number;
  candidate_faces?: CandidateFace[];
  contract_key?: string;
  model_name?: string;
  selected_face_index?: number;
};

type ReviewQueueItem = {
  id: string;
  person_id: string;
  person_name?: string | null;
  review_status: string;
  review_notes?: Record<string, unknown>;
  embedding_status: string;
  source_url?: string | null;
  hosted_url?: string | null;
  metadata?: {
    cast_reference_builder?: BuilderMetadata;
    [key: string]: unknown;
  };
  updated_at?: string | null;
};

type ReviewQueuePayload = {
  items?: ReviewQueueItem[];
};

const breadcrumbs = buildAdminSectionBreadcrumb("Cast Reference Review", "/admin/cast-reference-review");
const ACCENT = "#7A0307";

function readBuilder(item: ReviewQueueItem | null): BuilderMetadata {
  const metadata = item?.metadata?.cast_reference_builder;
  return metadata && typeof metadata === "object" ? metadata : {};
}

function readCandidates(item: ReviewQueueItem | null): CandidateFace[] {
  const candidates = readBuilder(item).candidate_faces;
  return Array.isArray(candidates) ? candidates : [];
}

function readImageUrl(item: ReviewQueueItem | null): string {
  return String(item?.hosted_url || item?.source_url || "").trim();
}

function formatReason(item: ReviewQueueItem | null): string {
  const notes = item?.review_notes || {};
  const reason = notes.builder_review_reason;
  if (typeof reason === "string" && reason.trim()) {
    return reason.replaceAll("_", " ");
  }
  const builderError = notes.builder_error;
  if (typeof builderError === "string" && builderError.trim()) {
    return builderError;
  }
  return "Needs face confirmation";
}

function candidateLabel(candidate: CandidateFace, index: number): string {
  const faceIndex = typeof candidate.face_index === "number" ? candidate.face_index : index;
  return `Face ${faceIndex + 1}`;
}

function faceBoxStyle(candidate: CandidateFace, builder: BuilderMetadata): CSSProperties | null {
  const bbox = candidate.bbox;
  const width = Number(builder.image_width || 0);
  const height = Number(builder.image_height || 0);
  if (!Array.isArray(bbox) || bbox.length < 4 || width <= 0 || height <= 0) {
    return null;
  }
  const [x1, y1, x2, y2] = bbox.map((value) => Number(value || 0));
  return {
    left: `${Math.max(0, Math.min(100, (x1 / width) * 100))}%`,
    top: `${Math.max(0, Math.min(100, (y1 / height) * 100))}%`,
    width: `${Math.max(0.5, Math.min(100, ((x2 - x1) / width) * 100))}%`,
    height: `${Math.max(0.5, Math.min(100, ((y2 - y1) / height) * 100))}%`,
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "Request failed";
    throw new Error(error);
  }
  return payload;
}

export default function CastReferenceReviewPageClient() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0] || null,
    [items, selectedId],
  );
  const builder = readBuilder(selectedItem);
  const candidates = readCandidates(selectedItem);
  const imageUrl = readImageUrl(selectedItem);

  const loadQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminWithAuth("/api/admin/trr-api/face-references/review-queue?limit=100", {
        cache: "no-store",
      });
      const payload = await parseJson<ReviewQueuePayload>(response);
      const nextItems = Array.isArray(payload.items) ? payload.items : [];
      setItems(nextItems);
      setSelectedId((current) => (current && nextItems.some((item) => item.id === current) ? current : nextItems[0]?.id || null));
      setSelectedFaceIndex(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load review queue");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!checking && user && hasAccess) {
      void loadQueue();
    }
  }, [checking, user, hasAccess]);

  useEffect(() => {
    setSelectedFaceIndex(null);
  }, [selectedItem?.id]);

  const approveSelectedFace = async () => {
    if (!selectedItem || selectedFaceIndex === null) return;
    setWorking(true);
    setError(null);
    setStatusMessage(null);
    try {
      await parseJson(
        await fetchAdminWithAuth(`/api/admin/trr-api/face-references/${selectedItem.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: "approved",
            review_notes: {
              decision: "selected_gallery_face",
              selected_face_index: selectedFaceIndex,
            },
          }),
        }),
      );
      await parseJson(
        await fetchAdminWithAuth(`/api/admin/trr-api/face-references/${selectedItem.id}/reembed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selected_face_index: selectedFaceIndex }),
        }),
      );
      setStatusMessage("Reference approved and rebuilt.");
      await loadQueue();
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Failed to approve reference");
    } finally {
      setWorking(false);
    }
  };

  const rejectSelectedSeed = async () => {
    if (!selectedItem) return;
    setWorking(true);
    setError(null);
    setStatusMessage(null);
    try {
      await parseJson(
        await fetchAdminWithAuth(`/api/admin/trr-api/face-references/${selectedItem.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: "rejected",
            review_notes: {
              decision: "rejected_gallery_seed",
              reason: "not_a_clear_cast_reference",
            },
          }),
        }),
      );
      setStatusMessage("Reference rejected.");
      await loadQueue();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : "Failed to reject reference");
    } finally {
      setWorking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <AdminGlobalHeader bodyClassName="px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <AdminBreadcrumbs items={breadcrumbs} className="mb-3" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Facebank queue
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-black sm:text-4xl">
                Confirm gallery reference faces
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-black/70">
                Review gallery photos that the builder could not trust automatically. Pick the cast member face before it becomes a screen-time reference.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadQueue()}
              disabled={loading || working}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-black px-4 py-2 text-sm font-semibold transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
      </AdminGlobalHeader>

      <main className="mx-auto grid max-w-7xl gap-5 px-6 py-6 lg:grid-cols-[18rem_minmax(0,1fr)_22rem]">
        <section className="min-h-[32rem] border border-black bg-white">
          <div className="border-b border-black px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Queue
            </p>
            <p className="mt-1 text-sm text-black/65">{loading ? "Loading..." : `${items.length} pending`}</p>
          </div>
          <div className="max-h-[42rem] overflow-y-auto">
            {items.length === 0 && !loading ? (
              <p className="px-4 py-5 text-sm leading-6 text-black/65">No uncertain gallery seeds are waiting for review.</p>
            ) : null}
            {items.map((item) => {
              const active = item.id === selectedItem?.id;
              const itemBuilder = readBuilder(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`block w-full border-b border-black px-4 py-4 text-left transition ${
                    active ? "bg-black text-white" : "bg-white text-black hover:bg-black/[0.04]"
                  }`}
                >
                  <span className="block text-sm font-semibold">{item.person_name || "Unknown person"}</span>
                  <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-black/60"}`}>
                    {formatReason(item)}
                  </span>
                  <span className={`mt-2 block text-[11px] uppercase tracking-[0.16em] ${active ? "text-white/60" : "text-black/45"}`}>
                    {itemBuilder.raw_face_count ?? readCandidates(item).length} faces detected
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="min-h-[32rem] border border-black bg-white">
          <div className="border-b border-black px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Gallery image
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{selectedItem?.person_name || "No seed selected"}</h2>
          </div>
          <div className="p-4">
            {imageUrl ? (
              <div className="relative inline-block max-w-full border border-black bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic reviewed gallery URLs are not known to Next image config. */}
                <img src={imageUrl} alt="" className="block max-h-[42rem] max-w-full object-contain" />
                <div className="absolute inset-0">
                  {candidates.map((candidate, index) => {
                    const style = faceBoxStyle(candidate, builder);
                    const faceIndex = typeof candidate.face_index === "number" ? candidate.face_index : index;
                    const selected = selectedFaceIndex === faceIndex;
                    if (!style) return null;
                    return (
                      <button
                        type="button"
                        key={`${faceIndex}-${index}`}
                        onClick={() => setSelectedFaceIndex(faceIndex)}
                        className={`absolute border-2 transition ${
                          selected ? "border-[#7A0307] bg-[#7A0307]/15" : "border-white bg-black/10 hover:bg-white/20"
                        }`}
                        style={style}
                        aria-label={`Select ${candidateLabel(candidate, index)}`}
                      >
                        <span className={`absolute -left-0.5 -top-6 px-2 py-0.5 text-[11px] font-semibold ${selected ? "bg-[#7A0307] text-white" : "bg-white text-black"}`}>
                          {faceIndex + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[28rem] items-center justify-center border border-black text-sm text-black/60">
                No image URL available.
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-[32rem] border border-black bg-white">
          <div className="border-b border-black px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
              Decision
            </p>
            <p className="mt-1 text-sm text-black/65">{formatReason(selectedItem)}</p>
          </div>
          <div className="space-y-4 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50">Model contract</p>
              <p className="mt-1 break-words text-sm leading-6 text-black">{builder.contract_key || "Not recorded"}</p>
            </div>

            <div className="space-y-2">
              {candidates.map((candidate, index) => {
                const faceIndex = typeof candidate.face_index === "number" ? candidate.face_index : index;
                const selected = selectedFaceIndex === faceIndex;
                return (
                  <button
                    type="button"
                    key={`${faceIndex}-${index}`}
                    onClick={() => setSelectedFaceIndex(faceIndex)}
                    className={`w-full border px-3 py-3 text-left transition ${
                      selected ? "border-black bg-black text-white" : "border-black bg-white text-black hover:bg-black/[0.04]"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{candidateLabel(candidate, index)}</span>
                      <span className="text-xs">{candidate.passed === false ? "quality issue" : "candidate"}</span>
                    </span>
                    <span className={`mt-2 block text-xs leading-5 ${selected ? "text-white/70" : "text-black/60"}`}>
                      confidence {typeof candidate.det_score === "number" ? candidate.det_score.toFixed(2) : "-"} · blur{" "}
                      {typeof candidate.blur_score === "number" ? candidate.blur_score.toFixed(1) : "-"}
                    </span>
                    {candidate.reasons?.length ? (
                      <span className={`mt-1 block text-xs leading-5 ${selected ? "text-white/70" : "text-black/60"}`}>
                        {candidate.reasons.join(", ").replaceAll("_", " ")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {error ? <p className="border border-[#7A0307] px-3 py-2 text-sm text-[#7A0307]">{error}</p> : null}
            {statusMessage ? <p className="border border-black px-3 py-2 text-sm text-black">{statusMessage}</p> : null}

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => void approveSelectedFace()}
                disabled={!selectedItem || selectedFaceIndex === null || working}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7A0307] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Approve selected face
              </button>
              <button
                type="button"
                onClick={() => void rejectSelectedSeed()}
                disabled={!selectedItem || working}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-black px-4 py-3 text-sm font-semibold text-black transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Reject seed
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

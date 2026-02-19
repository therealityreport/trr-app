"use client";

import { useMemo, useState } from "react";

export interface FandomSyncOptions {
  manual_page_urls?: string[];
  max_candidates?: number;
  include_allpages_scan?: boolean;
  allpages_max_pages?: number;
  community_domains?: string[];
  save_source_variants?: boolean;
  selected_page_urls?: string[];
}

export interface FandomSyncPreviewResponse {
  candidate_pages?: Array<{ url: string; title?: string; source?: string; score?: number }>;
  selected_pages?: Array<{ url: string; title?: string; source?: string; score?: number }>;
  warnings?: string[];
  profile?: Record<string, unknown>;
  season_profile?: Record<string, unknown>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPreview: (options: FandomSyncOptions) => Promise<void>;
  onCommit: (options: FandomSyncOptions) => Promise<void>;
  previewData: FandomSyncPreviewResponse | null;
  previewLoading: boolean;
  commitLoading: boolean;
  entityLabel: string;
}

function JsonBlock({ value }: { value: unknown }) {
  if (!value) return null;
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function FandomSyncModal({
  isOpen,
  onClose,
  onPreview,
  onCommit,
  previewData,
  previewLoading,
  commitLoading,
  entityLabel,
}: Props) {
  const [manualUrlsText, setManualUrlsText] = useState("");
  const [includeAllPagesScan, setIncludeAllPagesScan] = useState(true);
  const [step, setStep] = useState<"preview" | "confirm">("preview");

  const manualUrls = useMemo(
    () =>
      manualUrlsText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    [manualUrlsText]
  );

  if (!isOpen) return null;

  const profile = (previewData?.profile ?? previewData?.season_profile ?? null) as Record<string, unknown> | null;
  const selectedPageUrls = (previewData?.selected_pages ?? []).map((item) => item.url).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Sync by Fandom</p>
              <h3 className="text-lg font-bold text-zinc-900">{entityLabel}</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("preview");
                onClose();
              }}
              className="rounded-lg border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-5">
          {step === "preview" ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Optional manual page URLs (one per line)
                </label>
                <textarea
                  value={manualUrlsText}
                  onChange={(event) => setManualUrlsText(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-800"
                  placeholder="https://real-housewives.fandom.com/wiki/Lisa_Barlow"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={includeAllPagesScan}
                  onChange={(event) => setIncludeAllPagesScan(event.target.checked)}
                />
                Include Special:AllPages scan
              </label>

              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-sm text-zinc-600">Preview is read-only. Save persists to Supabase.</p>
              </div>

              {previewData?.warnings && previewData.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Warnings</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {previewData.warnings.map((warning, idx) => (
                      <li key={`${warning}-${idx}`}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {previewData && (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Selected Pages
                    </p>
                    <ul className="space-y-1 text-sm">
                      {(previewData.selected_pages ?? []).map((page, idx) => (
                        <li key={`${page.url}-${idx}`} className="break-all text-zinc-700">
                          {page.title ? `${page.title}: ` : ""}
                          <span className="text-zinc-500">{page.url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Candidate Pages
                    </p>
                    <ul className="space-y-1 text-sm">
                      {(previewData.candidate_pages ?? []).slice(0, 10).map((page, idx) => (
                        <li key={`${page.url}-${idx}`} className="break-all text-zinc-700">
                          {page.title ? `${page.title}: ` : ""}
                          <span className="text-zinc-500">{page.url}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {profile && (
                <div className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Casting Summary
                      </p>
                      <p className="text-sm text-zinc-700">{String(profile.casting_summary ?? profile.summary ?? "—")}</p>
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Bio Card</p>
                      <JsonBlock value={profile.bio_card} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Dynamic Sections
                    </p>
                    <JsonBlock value={profile.dynamic_sections} />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Citations</p>
                      <JsonBlock value={profile.citations} />
                    </div>
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Conflicts</p>
                      <JsonBlock value={profile.conflicts} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onPreview({
                      manual_page_urls: manualUrls,
                      include_allpages_scan: includeAllPagesScan,
                      save_source_variants: true,
                    })
                  }
                  disabled={previewLoading}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {previewLoading ? "Loading..." : "Run Preview"}
                </button>
                <button
                  type="button"
                  disabled={!previewData || previewLoading}
                  onClick={() => setStep("confirm")}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm text-zinc-700">Save will persist the previewed Fandom payload to Supabase.</p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("preview")}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onCommit({
                      manual_page_urls: manualUrls,
                      selected_page_urls: selectedPageUrls,
                      include_allpages_scan: includeAllPagesScan,
                      save_source_variants: true,
                    })
                  }
                  disabled={commitLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {commitLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  type FandomBioCard,
  type FandomDynamicSection,
  type FandomSyncOptions,
  type FandomSyncPreviewResponse,
  fandomSectionBucket,
  normalizeFandomBioCard,
  normalizeFandomDynamicSections,
  normalizeFandomPreviewProfile,
  normalizeFandomWarnings,
} from "@/lib/admin/fandom-sync-types";

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

function toText(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toText(item)).filter((item): item is string => Boolean(item));
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) => toText(item) ?? JSON.stringify(item)).filter(Boolean);
    return items.join(", ");
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => {
        const text = toText(entry);
        return text ? `${key}: ${text}` : `${key}: ${JSON.stringify(entry)}`;
      })
      .filter(Boolean);
    return entries.join(" | ");
  }
  return toText(value) ?? "—";
}

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function BioCardPanel({ value }: { value: FandomBioCard | null | undefined }) {
  const card = normalizeFandomBioCard(value);
  if (!card) return null;
  const sections: Array<{ key: string; label: string }> = [
    { key: "general", label: "General" },
    { key: "appearance", label: "Appearance" },
    { key: "relationships", label: "Relationships" },
    { key: "production", label: "Production" },
  ];
  const visible = sections.filter(({ key }) => card[key] && typeof card[key] === "object");
  if (visible.length === 0) return null;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {visible.map(({ key, label }) => {
        const section = card[key];
        if (!section) return null;
        return (
          <div key={key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            <div className="space-y-1.5">
              {Object.entries(section).map(([field, fieldValue]) => (
                <div key={field} className="text-sm text-zinc-700">
                  <span className="font-medium text-zinc-900">{field.replaceAll("_", " ")}:</span>{" "}
                  {formatValue(fieldValue)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ title, section }: { title: string; section: FandomDynamicSection }) {
  const paragraphs = toStringList(section.paragraphs);
  const bullets = toStringList(section.bullets);
  const tableRows = Array.isArray(section.table_rows) ? section.table_rows : [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      {paragraphs.length > 0 && (
        <div className="space-y-2 text-sm text-zinc-700">
          {paragraphs.map((paragraph, idx) => (
            <p key={`${title}-p-${idx}`}>{paragraph}</p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {bullets.map((bullet, idx) => (
            <li key={`${title}-b-${idx}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {tableRows.length > 0 && (
        <div className="mt-2">
          <JsonBlock value={tableRows} />
        </div>
      )}
    </div>
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

  const warnings = normalizeFandomWarnings(previewData?.warnings);
  const profile = normalizeFandomPreviewProfile(previewData);
  const selectedPageUrls = (previewData?.selected_pages ?? []).map((item) => item.url).filter(Boolean);
  const sections = normalizeFandomDynamicSections(profile?.dynamic_sections);
  const canonicalSections = sections.filter((section) => fandomSectionBucket(section) !== "other");
  const otherSections = sections.filter((section) => fandomSectionBucket(section) === "other");
  const biographySection = canonicalSections.find((section) => fandomSectionBucket(section) === "biography");
  const taglinesSection = canonicalSections.find((section) => fandomSectionBucket(section) === "taglines");
  const reunionSection = canonicalSections.find((section) => fandomSectionBucket(section) === "reunion");
  const castingSection = canonicalSections.find((section) => fandomSectionBucket(section) === "casting");

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

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Warnings</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {warnings.map((warning, idx) => (
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
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Casting Summary
                      </p>
                      <p className="text-sm text-zinc-700">{String(profile.casting_summary ?? profile.summary ?? "—")}</p>
                    </div>
                  </div>
                  <BioCardPanel value={profile.bio_card} />
                  <div className="grid gap-3 lg:grid-cols-2">
                    {castingSection && <SectionCard title="Casting" section={castingSection} />}
                    {biographySection && <SectionCard title="Biography" section={biographySection} />}
                    {taglinesSection && <SectionCard title="Taglines" section={taglinesSection} />}
                    {reunionSection && <SectionCard title="Reunion Seating" section={reunionSection} />}
                  </div>
                  {otherSections.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Other Sections
                      </p>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {otherSections.map((section, idx) => (
                          <SectionCard
                            key={`${section.title ?? section.canonical_title ?? "section"}-${idx}`}
                            title={String(section.title ?? section.canonical_title ?? `Section ${idx + 1}`)}
                            section={section}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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

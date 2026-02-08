"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  clearAdvancedFilters,
  countActiveAdvancedFilters,
  toggleInList,
  type AdvancedFilterState,
  type ContentTypeFilter,
  type PeopleGroupFilter,
  type SeededFilter,
  type TextOverlayFilter,
} from "@/lib/admin/advanced-filters";

const CONTENT_TYPE_OPTIONS: Array<{ value: ContentTypeFilter; label: string }> = [
  { value: "confessional", label: "Confessionals" },
  { value: "reunion", label: "Reunion" },
  { value: "promo", label: "Promo Portraits" },
  { value: "episode_still", label: "Episode Still" },
  { value: "intro", label: "Intro Card" },
  { value: "wwhl", label: "WWHL" },
  { value: "other", label: "Other" },
];

export function AdvancedFilterDrawer({
  isOpen,
  onClose,
  filters,
  onChange,
  availableSources,
  showSeeded,
  sortOptions,
  defaults,
  unknownTextCount,
  onDetectTextForVisible,
  textOverlayDetectError,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: AdvancedFilterState;
  onChange: (next: AdvancedFilterState) => void;
  availableSources: string[];
  showSeeded?: boolean;
  sortOptions: Array<{ value: string; label: string }>;
  defaults?: Partial<AdvancedFilterState>;
  unknownTextCount?: number;
  onDetectTextForVisible?: () => Promise<void> | void;
  textOverlayDetectError?: string | null;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const activeCount = useMemo(
    () => countActiveAdvancedFilters(filters, defaults),
    [filters, defaults]
  );

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleText = (value: TextOverlayFilter) =>
    onChange({ ...filters, text: toggleInList(filters.text, value) });
  const togglePeople = (value: PeopleGroupFilter) =>
    onChange({ ...filters, people: toggleInList(filters.people, value) });
  const toggleSeeded = (value: SeededFilter) =>
    onChange({ ...filters, seeded: toggleInList(filters.seeded, value) });
  const toggleContentType = (value: ContentTypeFilter) =>
    onChange({
      ...filters,
      contentTypes: toggleInList(filters.contentTypes, value),
    });
  const toggleSource = (value: string) =>
    onChange({ ...filters, sources: toggleInList(filters.sources, value) });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                Filters
              </p>
              <h3 className="text-lg font-bold text-zinc-900">
                Advanced Filtering
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                {activeCount > 0 ? `${activeCount} active` : "No filters active"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(clearAdvancedFilters(defaults))}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5">
          <section>
            <h4 className="text-sm font-bold text-zinc-900">Text Overlay</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Selecting both (or none) does not filter.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { value: "text", label: "TEXT" },
                  { value: "no_text", label: "NO TEXT" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleText(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    filters.text.includes(opt.value)
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {typeof unknownTextCount === "number" &&
              unknownTextCount > 0 &&
              onDetectTextForVisible && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs text-amber-800">
                    {unknownTextCount} visible images are missing text-overlay
                    classification.
                  </p>
                  <button
                    type="button"
                    onClick={() => onDetectTextForVisible()}
                    className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    Detect For Visible
                  </button>
                </div>
              )}

            {textOverlayDetectError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">{textOverlayDetectError}</p>
              </div>
            )}
          </section>

          <section>
            <h4 className="text-sm font-bold text-zinc-900">Sources</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Select none, one, or many.
            </p>
            <div className="mt-3 space-y-2">
              {availableSources.length === 0 ? (
                <p className="text-xs text-zinc-500">No sources available.</p>
              ) : (
                availableSources.map((src) => (
                  <label key={src} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(src)}
                      onChange={() => toggleSource(src)}
                      className="h-4 w-4"
                    />
                    <span className="text-zinc-800">{src}</span>
                  </label>
                ))
              )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold text-zinc-900">Solo / Group</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Selecting both (or none) does not filter.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  { value: "solo", label: "SOLO" },
                  { value: "group", label: "GROUP" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => togglePeople(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    filters.people.includes(opt.value)
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {showSeeded && (
            <section>
              <h4 className="text-sm font-bold text-zinc-900">Seeded</h4>
              <p className="mt-1 text-xs text-zinc-500">
                Selecting both (or none) does not filter.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    { value: "seeded", label: "SEEDED" },
                    { value: "not_seeded", label: "NOT SEEDED" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSeeded(opt.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      filters.seeded.includes(opt.value)
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="text-sm font-bold text-zinc-900">Content Type</h4>
            <div className="mt-3 space-y-2">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.contentTypes.includes(opt.value)}
                    onChange={() => toggleContentType(opt.value)}
                    className="h-4 w-4"
                  />
                  <span className="text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold text-zinc-900">Sort By</h4>
            <div className="mt-3 space-y-2">
              {sortOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sort"
                    checked={filters.sort === opt.value}
                    onChange={() => onChange({ ...filters, sort: opt.value })}
                    className="h-4 w-4"
                  />
                  <span className="text-zinc-800">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

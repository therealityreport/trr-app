"use client";

import { useState } from "react";
import {
  buildPersonExternalIdUrl,
  getPersonExternalIdSourceLabel,
  PERSON_EXTERNAL_ID_SOURCES,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";

export type PersonExternalIdDraft = {
  source_id: PersonExternalIdSource;
  external_id: string;
};

type Props = {
  drafts: PersonExternalIdDraft[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  notice: string | null;
  onChangeDraft: (index: number, field: keyof PersonExternalIdDraft, value: string) => void;
  onAddDraft: () => void;
  onRemoveDraft: (index: number) => void;
  onSave: () => void;
};

export function PersonExternalIdsEditor({
  drafts,
  loading,
  saving,
  error,
  notice,
  onChangeDraft,
  onAddDraft,
  onRemoveDraft,
  onSave,
}: Props) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-zinc-900">External IDs</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Edit the normalized IDs and social handles used across the admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onAddDraft();
              setEditingIndex(drafts.length);
            }}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Add ID
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save IDs"}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && !error && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}

      <div className="mt-4 space-y-3">
        {drafts.map((draft, index) => {
          const previewUrl = draft.external_id.trim()
            ? buildPersonExternalIdUrl(draft.source_id, draft.external_id)
            : null;
          const isEditing = editingIndex === index || draft.external_id.trim().length === 0;
          const sourceLabel = getPersonExternalIdSourceLabel(draft.source_id);

          return (
            <div
              key={`${draft.source_id}-${index}`}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    {sourceLabel}
                  </p>
                  <p className="mt-1 break-all text-sm text-zinc-900">
                    {draft.external_id.trim() || `No ${sourceLabel} value set`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingIndex((current) => (current === index ? null : index))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
                    aria-label={`${isEditing ? "Hide" : "Edit"} ${sourceLabel}`}
                    title={`${isEditing ? "Hide" : "Edit"} ${sourceLabel}`}
                  >
                    <EditIcon />
                  </button>
                  {previewUrl ? (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-100"
                      aria-label={`Open ${sourceLabel} link`}
                      title={`Open ${sourceLabel} link`}
                    >
                      <OpenLinkIcon />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (editingIndex === index) {
                        setEditingIndex(null);
                      }
                      onRemoveDraft(index);
                    }}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Source
                    </span>
                    <select
                      value={draft.source_id}
                      onChange={(event) => onChangeDraft(index, "source_id", event.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    >
                      {PERSON_EXTERNAL_ID_SOURCES.map((source) => (
                        <option key={source} value={source}>
                          {getPersonExternalIdSourceLabel(source)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block min-w-0">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      External ID / Handle
                    </span>
                    <input
                      value={draft.external_id}
                      onChange={(event) => onChangeDraft(index, "external_id", event.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      placeholder={`Enter ${getPersonExternalIdSourceLabel(draft.source_id)} value`}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}

        {drafts.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-500">
            No external IDs configured yet.
          </div>
        )}
      </div>
    </div>
  );
}

function EditIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11.8 2.2a1.7 1.7 0 0 1 2.4 2.4l-7.5 7.5-3 .6.6-3z" />
      <path d="M10.7 3.3l2 2" />
    </svg>
  );
}

function OpenLinkIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 3h3v3" />
      <path d="M6.5 9.5L13 3" />
    </svg>
  );
}

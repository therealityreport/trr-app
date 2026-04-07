"use client";

import type { ReactNode } from "react";

export type ShowCreditsCastViewMode = "gallery" | "list";
export type ShowCreditsGalleryColumns = 4 | 5 | 6;

export interface ShowCreditsCrewRoleLine {
  creditId: string;
  role: string | null;
  episodesLabel: string | null;
  yearsLabel: string | null;
}

export interface ShowCreditsCrewGroupedRow {
  personId: string;
  personName: string | null;
  roleLines: ShowCreditsCrewRoleLine[];
}

export interface ShowCreditsCrewSectionData {
  title: string;
  groupedRows: ShowCreditsCrewGroupedRow[];
}

interface ShowCreditsCastViewControlsProps {
  viewMode: ShowCreditsCastViewMode;
  galleryColumns: ShowCreditsGalleryColumns;
  onViewModeChange: (viewMode: ShowCreditsCastViewMode) => void;
  onGalleryColumnsChange: (columns: ShowCreditsGalleryColumns) => void;
}

interface ShowCreditsCastMembersProps<T extends { id: string | number }> {
  members: T[];
  viewMode: ShowCreditsCastViewMode;
  galleryColumns: ShowCreditsGalleryColumns;
  renderMember: (member: T) => ReactNode;
}

interface ShowCreditsCrewSectionsProps {
  sections: ShowCreditsCrewSectionData[];
  renderPersonName?: (row: ShowCreditsCrewGroupedRow) => ReactNode;
}

const CAST_VIEW_BUTTON_BASE_CLASS =
  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition";
const CAST_VIEW_BUTTON_ACTIVE_CLASS = "border-zinc-900 bg-zinc-900 text-white";
const CAST_VIEW_BUTTON_INACTIVE_CLASS = "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50";

const CAST_GALLERY_COLUMNS = [4, 5, 6] as const;

const iconClassName = "h-3.5 w-3.5";

function GalleryIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={iconClassName}>
      <path
        d="M2 2.75A.75.75 0 0 1 2.75 2h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 2 6.25zm7 0A.75.75 0 0 1 9.75 2h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 9 6.25zm-7 7A.75.75 0 0 1 2.75 9h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 2 13.25zm7 0A.75.75 0 0 1 9.75 9h3.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 9 13.25z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={iconClassName}>
      <path
        d="M3 4h10M3 8h10M3 12h10M1.75 4h.5M1.75 8h.5M1.75 12h.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

const buildCastViewButtonClassName = (active: boolean): string =>
  `${CAST_VIEW_BUTTON_BASE_CLASS} ${active ? CAST_VIEW_BUTTON_ACTIVE_CLASS : CAST_VIEW_BUTTON_INACTIVE_CLASS}`;

export const resolveShowCreditsGalleryGridClass = (
  columns: ShowCreditsGalleryColumns
): string => {
  if (columns === 5) {
    return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";
  }
  if (columns === 6) {
    return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6";
  }
  return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
};

export function ShowCreditsCastViewControls({
  viewMode,
  galleryColumns,
  onViewModeChange,
  onGalleryColumnsChange,
}: ShowCreditsCastViewControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        aria-label="Gallery View"
        aria-pressed={viewMode === "gallery"}
        onClick={() => onViewModeChange("gallery")}
        className={buildCastViewButtonClassName(viewMode === "gallery")}
      >
        <GalleryIcon />
        <span>Gallery</span>
      </button>
      <button
        type="button"
        aria-label="List View"
        aria-pressed={viewMode === "list"}
        onClick={() => onViewModeChange("list")}
        className={buildCastViewButtonClassName(viewMode === "list")}
      >
        <ListIcon />
        <span>List</span>
      </button>
      {viewMode === "gallery" && (
        <div className="ml-1 flex items-center gap-2">
          {CAST_GALLERY_COLUMNS.map((columns) => {
            const active = galleryColumns === columns;
            return (
              <button
                key={`show-credits-gallery-columns-${columns}`}
                type="button"
                aria-label={`${columns} per row`}
                aria-pressed={active}
                onClick={() => onGalleryColumnsChange(columns)}
                className={buildCastViewButtonClassName(active)}
              >
                {columns} per row
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ShowCreditsCastMembers<T extends { id: string | number }>({
  members,
  viewMode,
  galleryColumns,
  renderMember,
}: ShowCreditsCastMembersProps<T>) {
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {members.map((member) => (
          <div key={String(member.id)}>{renderMember(member)}</div>
        ))}
      </div>
    );
  }

  return (
    <div className={resolveShowCreditsGalleryGridClass(galleryColumns)}>
      {members.map((member) => (
        <div key={String(member.id)}>{renderMember(member)}</div>
      ))}
    </div>
  );
}

export function ShowCreditsCrewSections({
  sections,
  renderPersonName,
}: ShowCreditsCrewSectionsProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.title} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/80">
          <div className="border-b border-zinc-200 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-900">{section.title}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200">
              <thead className="bg-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Episodes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {section.groupedRows.map((row) => (
                  <tr key={`${section.title}-${row.personId}`}>
                    <td className="align-top px-4 py-3 text-sm font-semibold text-zinc-900">
                      {renderPersonName ? renderPersonName(row) : row.personName || "Unknown"}
                    </td>
                    <td className="align-top px-4 py-3 text-sm text-zinc-600">
                      <div className="space-y-2">
                        {row.roleLines.map((roleLine) => (
                          <div key={roleLine.creditId}>{roleLine.role || "Unspecified"}</div>
                        ))}
                      </div>
                    </td>
                    <td className="align-top px-4 py-3 text-sm text-zinc-500">
                      <div className="space-y-2">
                        {row.roleLines.map((roleLine) => {
                          const label =
                            [roleLine.episodesLabel, roleLine.yearsLabel].filter(Boolean).join(" • ") || "IMDb";
                          return <div key={`${roleLine.creditId}-episodes`}>{label}</div>;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

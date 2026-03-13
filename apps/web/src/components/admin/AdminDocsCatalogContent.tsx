"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ADMIN_JOB_DOCS,
  ADMIN_JOB_DOCS_BY_CATEGORY,
  type AdminJobDocEntry,
  type AdminJobMigrationStatus,
  type AdminJobRuntime,
  resolveAdminJobMigrationStatus,
} from "@/lib/admin/docs/job-catalog";

type AdminDocsCatalogContentProps = {
  entries?: readonly AdminJobDocEntry[];
};

function formatMigrationStatusLabel(status: ReturnType<typeof resolveAdminJobMigrationStatus>): string {
  return status
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getFilterPillClassName(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-semibold transition ${
    active
      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
  }`;
}

export function AdminDocsCatalogContent({
  entries = ADMIN_JOB_DOCS,
}: AdminDocsCatalogContentProps) {
  const [selectedMigrationStatus, setSelectedMigrationStatus] = useState<AdminJobMigrationStatus | "all">("all");
  const [selectedPageLabel, setSelectedPageLabel] = useState<string>("all");
  const [selectedCurrentRuntime, setSelectedCurrentRuntime] = useState<AdminJobRuntime | "all">("all");

  const migrationStatusOptions = Array.from(
    new Set(entries.map((entry) => resolveAdminJobMigrationStatus(entry))),
  );
  const pageOptions = Array.from(new Set(entries.map((entry) => entry.pageLabel)));
  const currentRuntimeOptions = Array.from(new Set(entries.map((entry) => entry.currentRuntime)));

  const filteredEntries = entries.filter((entry) => {
    const migrationStatus = resolveAdminJobMigrationStatus(entry);

    if (selectedMigrationStatus !== "all" && migrationStatus !== selectedMigrationStatus) {
      return false;
    }
    if (selectedPageLabel !== "all" && entry.pageLabel !== selectedPageLabel) {
      return false;
    }
    if (selectedCurrentRuntime !== "all" && entry.currentRuntime !== selectedCurrentRuntime) {
      return false;
    }
    return true;
  });

  const groupedEntries = ADMIN_JOB_DOCS_BY_CATEGORY.map(({ category, entries: categoryEntries }) => ({
    category,
    entries: categoryEntries.filter((entry) => filteredEntries.some((candidate) => candidate.id === entry.id)),
  })).filter((group) => group.entries.length > 0);

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Operational Docs</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-900">Exact admin pages, buttons, and triggers</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This catalog maps live TRR-APP admin job flows to their exact UI surface. Every row uses the current
              button label from the app and includes the route or proxy path behind that trigger, plus the current
              runtime plane, the target runtime, and the migration status for that job family.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <span className="font-semibold text-zinc-900">{entries.length}</span> documented job flows
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Filters</p>
            <h3 className="text-lg font-semibold text-zinc-900">Slice the catalog by runtime and route surface</h3>
            <p className="text-sm text-zinc-600">
              Combine pill filters to narrow the documented job flows without leaving the page.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Migration Status
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMigrationStatus("all")}
                  aria-pressed={selectedMigrationStatus === "all"}
                  className={getFilterPillClassName(selectedMigrationStatus === "all")}
                >
                  All ({entries.length})
                </button>
                {migrationStatusOptions.map((status) => {
                  const count = entries.filter(
                    (entry) => resolveAdminJobMigrationStatus(entry) === status,
                  ).length;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setSelectedMigrationStatus(status)}
                      aria-pressed={selectedMigrationStatus === status}
                      className={getFilterPillClassName(selectedMigrationStatus === status)}
                    >
                      {formatMigrationStatusLabel(status)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Page</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPageLabel("all")}
                  aria-pressed={selectedPageLabel === "all"}
                  className={getFilterPillClassName(selectedPageLabel === "all")}
                >
                  All ({entries.length})
                </button>
                {pageOptions.map((pageLabel) => {
                  const count = entries.filter((entry) => entry.pageLabel === pageLabel).length;

                  return (
                    <button
                      key={pageLabel}
                      type="button"
                      onClick={() => setSelectedPageLabel(pageLabel)}
                      aria-pressed={selectedPageLabel === pageLabel}
                      className={getFilterPillClassName(selectedPageLabel === pageLabel)}
                    >
                      {pageLabel} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Current Runtime
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCurrentRuntime("all")}
                  aria-pressed={selectedCurrentRuntime === "all"}
                  className={getFilterPillClassName(selectedCurrentRuntime === "all")}
                >
                  All ({entries.length})
                </button>
                {currentRuntimeOptions.map((runtime) => {
                  const count = entries.filter((entry) => entry.currentRuntime === runtime).length;

                  return (
                    <button
                      key={runtime}
                      type="button"
                      onClick={() => setSelectedCurrentRuntime(runtime)}
                      aria-pressed={selectedCurrentRuntime === runtime}
                      className={getFilterPillClassName(selectedCurrentRuntime === runtime)}
                    >
                      {runtime} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Showing <span className="font-semibold text-zinc-900">{filteredEntries.length}</span> of{" "}
            <span className="font-semibold text-zinc-900">{entries.length}</span> documented job flows
          </div>
        </div>
      </section>

      <div className="space-y-10">
        {groupedEntries.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
            <h3 className="text-lg font-semibold text-zinc-900">No documented job flows match these filters</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Clear one or more pills above to restore the full catalog.
            </p>
          </section>
        ) : null}
        {groupedEntries.map((group) => (
          <section key={group.category}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-zinc-900">{group.category}</h3>
                <p className="text-sm text-zinc-500">
                  {group.entries.length} documented {group.entries.length === 1 ? "entry" : "entries"}
                </p>
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              {group.entries.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-zinc-900">{entry.title}</h4>
                      <p className="mt-2 text-sm text-zinc-600">{entry.summary}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Page</p>
                        <Link
                          href={entry.pageHref}
                          className="mt-1 inline-flex text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4"
                        >
                          {entry.pageLabel}
                        </Link>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Path Pattern
                        </p>
                        <p className="mt-1 break-all font-mono text-xs text-zinc-700">
                          {entry.pagePathPattern ?? entry.pageHref}
                        </p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Current Runtime
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">{entry.currentRuntime}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Target Runtime
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">{entry.targetRuntime}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Migration Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">
                          {formatMigrationStatusLabel(resolveAdminJobMigrationStatus(entry))}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Page Container
                      </p>
                      <p className="mt-1 text-sm text-zinc-700">
                        {entry.pageContainerBreadcrumb.join(" / ")}
                      </p>
                    </div>
                    {entry.runtimeNotes ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          Runtime Notes
                        </p>
                        <p className="mt-1 text-sm text-amber-900">{entry.runtimeNotes}</p>
                      </div>
                    ) : null}
                    {entry.notes ? <p className="text-xs text-zinc-500">{entry.notes}</p> : null}
                  </div>

                  <div className="mt-4 space-y-3">
                    {entry.triggers.map((trigger) => (
                      <section key={`${entry.id}-${trigger.label}-${trigger.routeReference}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                            {trigger.label}
                          </span>
                          <span className="rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                            {trigger.triggerType}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              UI Location
                            </p>
                            <p className="mt-1 text-sm text-zinc-700">{trigger.uiLocation}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                              Route / API Reference
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-zinc-700">
                              {trigger.routeReference}
                            </p>
                          </div>
                          {trigger.notes ? <p className="text-xs text-zinc-500">{trigger.notes}</p> : null}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

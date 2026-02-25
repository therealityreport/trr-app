"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

interface SurveyColumnDefinition {
  name: string;
  label: string;
  type: string;
  multiValue?: boolean;
  isMeta?: boolean;
}

interface SurveyMetadata {
  key: string;
  title: string;
  description?: string;
  tableName: string;
  previewColumns: string[];
  columns: SurveyColumnDefinition[];
  allowShowFilters?: boolean;
  allowEpisodeFilters?: boolean;
}

interface SurveyListResponse {
  items: SurveyMetadata[];
}

interface SurveyRowsResponse {
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  columns: SurveyColumnDefinition[];
}

interface SurveyDetailResponse {
  item: Record<string, unknown>;
}

interface FilterState {
  from?: string;
  to?: string;
  showId?: string;
  seasonNumber?: string;
  episodeNumber?: string;
}

const BASE_COLUMNS = ["id", "created_at", "app_user_id", "app_username", "source"] as const;

export default function AdminSurveyResponsesPage() {
  const router = useRouter();
  const { user, userKey, checking, hasAccess } = useAdminGuard();
  const [surveys, setSurveys] = useState<SurveyMetadata[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [tableData, setTableData] = useState<SurveyRowsResponse | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  const withAuthFetch = useCallback(async (url: string, init?: RequestInit, skipJsonHeader = false) => {
    const current = auth.currentUser;
    if (!current) throw new Error("Not authenticated");
    const token = await current.getIdToken();
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${token}`);
    if (!skipJsonHeader && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || response.statusText);
    }
    return response;
  }, []);

  useEffect(() => {
    if (checking || !userKey || !hasAccess) return;
    const loadMetadata = async () => {
      setMetadataLoading(true);
      setMetadataError(null);
      try {
        const res = await withAuthFetch("/api/admin/surveys", { method: "GET" });
        const data = (await res.json()) as SurveyListResponse;
        setSurveys(data.items);
        setSelectedKey((current) => {
          if (current && data.items.some((survey) => survey.key === current)) {
            return current;
          }
          return data.items[0]?.key ?? null;
        });
      } catch (error) {
        console.error(error);
        setMetadataError(error instanceof Error ? error.message : "Failed to load surveys");
      } finally {
        setMetadataLoading(false);
      }
    };
    void loadMetadata();
  }, [checking, hasAccess, userKey, withAuthFetch]);

  const activeSurvey = useMemo(() => surveys.find((survey) => survey.key === selectedKey) ?? null, [surveys, selectedKey]);

  const visibleColumns = useMemo(() => {
    if (!tableData || !activeSurvey) return [] as string[];
    const available = new Set(tableData.columns.map((column) => column.name));
    const ordering = [...BASE_COLUMNS, ...activeSurvey.previewColumns];
    const unique: string[] = [];
    for (const column of ordering) {
      if (available.has(column) && !unique.includes(column)) {
        unique.push(column);
      }
    }
    const fallback = tableData.columns
      .map((column) => column.name)
      .filter((column) => !unique.includes(column));
    return [...unique, ...fallback];
  }, [tableData, activeSurvey]);

  const loadResponses = useCallback(async () => {
    if (!selectedKey) return;
    setTableLoading(true);
    setTableError(null);
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams();
      params.set("limit", String(pageSize));
      params.set("offset", String(offset));
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.showId) params.set("showId", filters.showId);
      if (filters.seasonNumber) params.set("seasonNumber", filters.seasonNumber);
      if (filters.episodeNumber) params.set("episodeNumber", filters.episodeNumber);
      const res = await withAuthFetch(`/api/admin/surveys/${selectedKey}/responses?${params.toString()}`);
      const data = (await res.json()) as SurveyRowsResponse;
      setTableData(data);
    } catch (error) {
      console.error(error);
      setTableError(error instanceof Error ? error.message : "Failed to load responses");
    } finally {
      setTableLoading(false);
    }
  }, [filters.episodeNumber, filters.from, filters.seasonNumber, filters.showId, filters.to, page, pageSize, selectedKey, withAuthFetch]);

  useEffect(() => {
    if (!selectedKey || !hasAccess) return;
    void loadResponses();
  }, [selectedKey, filters, page, pageSize, hasAccess, loadResponses]);

  const handleSurveyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedKey(event.target.value);
    setPage(1);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  const refreshDetail = useCallback(
    async (responseId: string) => {
      if (!selectedKey) return;
      setDetailLoading(true);
      try {
        const res = await withAuthFetch(`/api/admin/surveys/${selectedKey}/responses/${responseId}`);
        const data = (await res.json()) as SurveyDetailResponse;
        setDetailRow(data.item);
      } catch (error) {
        console.error(error);
      } finally {
        setDetailLoading(false);
      }
    },
    [selectedKey, withAuthFetch],
  );

  const openDetail = (row: Record<string, unknown>) => {
    const id = row.id as string | undefined;
    if (!id) return;
    setDetailRow(row);
    void refreshDetail(id);
  };

  const closeDetail = () => setDetailRow(null);

  const handleExport = useCallback(async () => {
    if (!selectedKey) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.showId) params.set("showId", filters.showId);
      if (filters.seasonNumber) params.set("seasonNumber", filters.seasonNumber);
      if (filters.episodeNumber) params.set("episodeNumber", filters.episodeNumber);
      const res = await withAuthFetch(`/api/admin/surveys/${selectedKey}/export?${params.toString()}`, { method: "GET" }, true);
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") ?? "";
      const match = contentDisposition.match(/filename=([^;]+)/i);
      const filename = match ? match[1].replace(/"/g, "") : `${selectedKey}-responses.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to export responses");
    } finally {
      setExporting(false);
    }
  }, [filters.episodeNumber, filters.from, filters.seasonNumber, filters.showId, filters.to, selectedKey, withAuthFetch]);

  const formatValue = (column: string, value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (column === "ranking" && Array.isArray(value)) {
      const labels = value
        .map((entry) => {
          if (entry && typeof entry === "object" && "label" in entry) {
            return String((entry as { label?: unknown }).label ?? "");
          }
          return String(entry);
        })
        .filter(Boolean);
      return labels.join(" › ");
    }
    if (Array.isArray(value)) return value.join(", ");
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") return JSON.stringify(value);
    if (column.includes("_at")) {
      const date = new Date(String(value));
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString();
      }
    }
    return String(value);
  };

  const renderTableBody = () => {
    if (tableLoading) {
      return (
        <tr>
          <td colSpan={visibleColumns.length} className="py-10 text-center text-sm text-zinc-500">
            Loading responses…
          </td>
        </tr>
      );
    }
    if (tableError) {
      return (
        <tr>
          <td colSpan={visibleColumns.length} className="py-6 text-center text-sm text-red-600">
            {tableError}
          </td>
        </tr>
      );
    }
    if (!tableData || tableData.rows.length === 0) {
      return (
        <tr>
          <td colSpan={visibleColumns.length} className="py-6 text-center text-sm text-zinc-500">
            No responses for this survey and filter set.
          </td>
        </tr>
      );
    }
    return tableData.rows.map((row) => (
      <tr
        key={row.id as string}
        className="cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50"
        onClick={() => openDetail(row)}
      >
        {visibleColumns.map((column) => (
          <td key={column} className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
            {formatValue(column, row[column])}
          </td>
        ))}
      </tr>
    ));
  };

  if (checking || metadataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-600">Preparing admin tools…</div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (metadataError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">{metadataError}</div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Survey Responses", "/admin/survey-responses")} className="mb-1" />
              <h1 className="text-2xl font-bold text-zinc-900">Survey Responses</h1>
              <p className="text-sm text-zinc-500">View, filter, and export survey submissions</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin")}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Back to Admin Dashboard
              </button>
              <button
                type="button"
                onClick={() => router.push("/hub")}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Back to Hub
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!selectedKey || exporting}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-6">
          <section className="mb-6 grid gap-6 rounded-2xl border border-white bg-white/80 p-4 shadow-sm sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Survey</label>
              <select
                value={selectedKey ?? ""}
                onChange={handleSurveyChange}
                className="mt-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              >
                {surveys.map((survey) => (
                  <option key={survey.key} value={survey.key}>
                    {survey.title}
                  </option>
                ))}
              </select>
              {activeSurvey?.description && (
                <p className="mt-2 text-xs text-zinc-500">{activeSurvey.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">From</label>
                <input
                  type="date"
                  value={filters.from ?? ""}
                  onChange={(event) => handleFilterChange("from", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">To</label>
                <input
                  type="date"
                  value={filters.to ?? ""}
                  onChange={(event) => handleFilterChange("to", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </div>
              {activeSurvey?.allowShowFilters && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Show ID</label>
                  <input
                    type="text"
                    value={filters.showId ?? ""}
                    onChange={(event) => handleFilterChange("showId", event.target.value)}
                    placeholder="e.g. RHOSLC"
                    className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
              )}
              {activeSurvey?.allowEpisodeFilters && (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Season #</label>
                    <input
                      type="number"
                      min={1}
                      value={filters.seasonNumber ?? ""}
                      onChange={(event) => handleFilterChange("seasonNumber", event.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Episode #</label>
                    <input
                      type="number"
                      min={1}
                      value={filters.episodeNumber ?? ""}
                      onChange={(event) => handleFilterChange("episodeNumber", event.target.value)}
                      className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 text-left text-sm">
                <thead>
                  <tr>
                    {visibleColumns.map((column) => (
                      <th key={column} className="bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                        {tableData?.columns.find((col) => col.name === column)?.label ?? column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderTableBody()}</tbody>
              </table>
            </div>
            {tableData && tableData.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <div>
                  Showing {tableData.offset + 1}–{Math.min(tableData.offset + tableData.limit, tableData.total)} of {tableData.total} responses
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || tableLoading}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-zinc-500">Page {page}</span>
                  <button
                    type="button"
                    disabled={!tableData || tableData.offset + tableData.limit >= tableData.total || tableLoading}
                    onClick={() => setPage((prev) => prev + 1)}
                    className="rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        {detailRow && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-8" onClick={closeDetail}>
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Response ID</p>
                  <p className="text-lg font-bold text-zinc-900">{String(detailRow.id)}</p>
                </div>
                <button type="button" onClick={closeDetail} className="text-sm font-semibold text-zinc-500 hover:text-zinc-900">
                  Close
                </button>
              </div>
              {detailLoading && (
                <p className="mt-4 text-xs text-zinc-500">Refreshing…</p>
              )}
              <div className="mt-6 space-y-4">
                {tableData?.columns.map((column) => (
                  <div key={column.name} className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{column.label}</p>
                    <p className="mt-1 break-all text-sm text-zinc-800">
                      {formatValue(column.name, detailRow[column.name]) || <span className="text-zinc-400">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientOnly>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

type NetworksStreamingType = "network" | "streaming";

interface NetworksStreamingRow {
  type: NetworksStreamingType;
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  has_logo: boolean;
  has_bw_variants: boolean;
  has_links: boolean;
}

interface NetworksStreamingSummary {
  totals: {
    total_available_shows: number;
    total_added_shows: number;
  };
  rows: NetworksStreamingRow[];
  generated_at: string;
}

interface NetworksStreamingSyncResult {
  entities_synced: number;
  providers_synced: number;
  links_enriched: number;
  logos_mirrored: number;
  variants_black_mirrored: number;
  variants_white_mirrored: number;
  unresolved_logos_count: number;
  unresolved_logos_truncated: boolean;
  unresolved_logos: Array<{
    type: NetworksStreamingType;
    id: string;
    name: string;
    reason: string;
  }>;
  failures: number;
}

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string };
    if (typeof payload.error === "string" && typeof payload.detail === "string") {
      return `${payload.error}: ${payload.detail}`;
    }
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    return fallback;
  } catch {
    return fallback;
  }
};

export default function AdminNetworksPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  const [summary, setSummary] = useState<NetworksStreamingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<NetworksStreamingSyncResult | null>(null);
  const [showUnresolved, setShowUnresolved] = useState(false);

  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    return { Authorization: `Bearer ${token}` };
  }, []);

  const loadNetworksStreamingSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/networks-streaming/summary", {
        method: "GET",
        cache: "no-store",
        headers,
      });
      if (!response.ok) {
        setSummaryError(await parseErrorPayload(response));
        setSummary(null);
        return;
      }
      const payload = (await response.json()) as NetworksStreamingSummary;
      setSummary(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load summary";
      setSummaryError(message);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (!checking && user && hasAccess) {
      void loadNetworksStreamingSummary();
    }
  }, [checking, hasAccess, loadNetworksStreamingSummary, user]);

  const onSyncNetworksStreaming = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/networks-streaming/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        setSyncError(await parseErrorPayload(response));
        return;
      }

      const payload = (await response.json()) as NetworksStreamingSyncResult;
      setSyncResult(payload);
      setShowUnresolved(Boolean(payload.unresolved_logos_count));
      await loadNetworksStreamingSummary();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to trigger sync";
      setSyncError(message);
    } finally {
      setSyncing(false);
    }
  }, [getAuthHeaders, loadNetworksStreamingSummary]);

  const missingLogoCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_logo).length,
    [summary?.rows],
  );
  const missingLinksCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_links).length,
    [summary?.rows],
  );
  const missingBwVariantsCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_bw_variants).length,
    [summary?.rows],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing networks dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin Tools</p>
              <h1 className="text-3xl font-bold text-zinc-900">Networks &amp; Streaming</h1>
              <p className="text-sm text-zinc-500">
                Coverage and sync health across network/streaming dimensions from the full Supabase show inventory.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Available Shows: {summary?.totals.total_available_shows ?? "-"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Added Shows: {summary?.totals.total_added_shows ?? "-"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing Logos: {missingLogoCount}</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing B/W Variants: {missingBwVariantsCount}</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing Links: {missingLinksCount}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadNetworksStreamingSummary()}
                  disabled={summaryLoading || syncing}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {summaryLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => void onSyncNetworksStreaming()}
                  disabled={syncing}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
                >
                  {syncing ? "Syncing..." : "Sync/Mirror Networks & Streaming"}
                </button>
              </div>
            </div>

            {summaryError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{summaryError}</div>
            ) : null}
            {syncError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{syncError}</div>
            ) : null}
            {syncResult ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <p className="font-semibold">Sync complete</p>
                <p className="mt-1">
                  Entities synced: {syncResult.entities_synced} | Providers synced: {syncResult.providers_synced} | Links enriched: {" "}
                  {syncResult.links_enriched} | Logos mirrored: {syncResult.logos_mirrored} | Black variants:{" "}
                  {syncResult.variants_black_mirrored} | White variants: {syncResult.variants_white_mirrored} | Unresolved:{" "}
                  {syncResult.unresolved_logos_count} | Failures: {syncResult.failures}
                </p>
                {syncResult.unresolved_logos_count > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowUnresolved((prev) => !prev)}
                    className="mt-2 text-xs font-semibold text-green-900 underline"
                  >
                    {showUnresolved ? "Hide unresolved logos" : "Show unresolved logos"}
                  </button>
                ) : null}
                {syncResult.unresolved_logos_count > 0 && showUnresolved ? (
                  <div className="mt-2 rounded border border-green-200 bg-white p-2 text-xs text-green-900">
                    <ul className="space-y-1">
                      {syncResult.unresolved_logos.map((item) => (
                        <li key={`${item.type}:${item.id}:${item.reason}`}>
                          <span className="font-semibold">{item.name}</span> ({item.type}) - {item.reason}
                        </li>
                      ))}
                    </ul>
                    {syncResult.unresolved_logos_truncated ? (
                      <p className="mt-2 text-[11px] text-green-800">
                        Showing first 300 unresolved entries. Check backend logs for full output.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Network / Streaming Service</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-700">Available Shows</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-700">Added Shows</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Logo</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Wikipedia</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Wikidata</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                        Loading networks and streaming summary...
                      </td>
                    </tr>
                  ) : null}

                  {!summaryLoading && (summary?.rows.length ?? 0) === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                        No rows available.
                      </td>
                    </tr>
                  ) : null}

                  {!summaryLoading
                    ? summary?.rows.map((row) => {
                        const wikidataHref = row.wikidata_id ? `https://www.wikidata.org/wiki/${row.wikidata_id}` : null;
                        return (
                          <tr key={`${row.type}:${row.name}`}>
                            <td className="px-3 py-2 text-zinc-700">{row.type === "network" ? "Network" : "Streaming"}</td>
                            <td className="px-3 py-2 font-medium text-zinc-900">{row.name}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{row.available_show_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{row.added_show_count}</td>
                            <td className="px-3 py-2">
                              {row.hosted_logo_url ? (
                                <img
                                  src={row.hosted_logo_url}
                                  alt={`${row.name} logo`}
                                  className="h-7 max-w-[120px] object-contain"
                                />
                              ) : (
                                <span className="text-zinc-500">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.wikipedia_url ? (
                                <a
                                  className="text-blue-700 underline"
                                  href={row.wikipedia_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Open
                                </a>
                              ) : (
                                <span className="text-zinc-500">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {row.wikidata_id && wikidataHref ? (
                                <a
                                  className="text-blue-700 underline"
                                  href={wikidataHref}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {row.wikidata_id}
                                </a>
                              ) : (
                                <span className="text-zinc-500">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {!row.has_logo ? (
                                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                                    Missing logo
                                  </span>
                                ) : null}
                                {!row.has_links ? (
                                  <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800">
                                    Missing links
                                  </span>
                                ) : null}
                                {!row.has_bw_variants ? (
                                  <span className="rounded-full border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                                    Missing B/W variants
                                  </span>
                                ) : null}
                                {row.has_logo && row.has_links && row.has_bw_variants ? (
                                  <span className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                                    Healthy
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}

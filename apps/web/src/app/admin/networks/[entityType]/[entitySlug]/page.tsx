"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import {
  buildNetworkDetailBreadcrumb,
  humanizeSlug,
} from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { parseEntityType, toEntitySlug, type NetworkStreamingEntityType } from "@/lib/admin/networks-streaming-entity";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

interface NetworkStreamingDetailShowRow {
  trr_show_id: string;
  show_name: string;
  canonical_slug: string | null;
  poster_url: string | null;
}

interface NetworkStreamingDetailLogoAsset {
  id: string;
  source: string;
  source_url: string;
  source_rank: number;
  hosted_logo_url: string | null;
  hosted_logo_content_type: string | null;
  base_logo_format: string;
  pixel_width: number | null;
  pixel_height: number | null;
  mirror_status: "mirrored" | "skipped" | "failed";
  failure_reason: string | null;
  is_primary: boolean;
  updated_at: string | null;
}

interface NetworkStreamingSuggestion {
  entity_type: NetworkStreamingEntityType;
  name: string;
  entity_slug: string;
  available_show_count: number;
  added_show_count: number;
}

interface NetworkStreamingDetailPayload {
  entity_type: NetworkStreamingEntityType;
  entity_key: string;
  entity_slug: string;
  display_name: string;
  available_show_count: number;
  added_show_count: number;
  core: {
    entity_id: string | null;
    origin_country: string | null;
    display_priority: number | null;
    tmdb_logo_path: string | null;
    logo_path: string | null;
    hosted_logo_key: string | null;
    hosted_logo_url: string | null;
    hosted_logo_black_url: string | null;
    hosted_logo_white_url: string | null;
    wikidata_id: string | null;
    wikipedia_url: string | null;
    wikimedia_logo_file: string | null;
    link_enriched_at: string | null;
    link_enrichment_source: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
    tiktok_id: string | null;
  };
  override: {
    id: string | null;
    display_name_override: string | null;
    wikidata_id_override: string | null;
    wikipedia_url_override: string | null;
    logo_source_urls_override: string[];
    source_priority_override: string[];
    aliases_override: string[];
    notes: string | null;
    is_active: boolean;
    updated_by: string | null;
    updated_at: string | null;
  };
  completion: {
    resolution_status: "resolved" | "manual_required" | "failed" | null;
    resolution_reason: string | null;
    last_attempt_at: string | null;
  };
  logo_assets: NetworkStreamingDetailLogoAsset[];
  shows: NetworkStreamingDetailShowRow[];
  family: {
    id: string;
    family_key: string;
    display_name: string;
    owner_wikidata_id: string | null;
    owner_label: string | null;
    members: Array<{
      id: string;
      entity_type: "network" | "streaming";
      entity_key: string;
      entity_display_name: string;
    }>;
  } | null;
  family_suggestions: Array<{
    owner_wikidata_id: string;
    owner_label: string;
    entity_count: number;
    entities: Array<{
      entity_type: "network" | "streaming";
      entity_key: string;
      display_name: string;
    }>;
  }>;
  shared_links: Array<{
    id: string;
    link_group: string;
    link_kind: string;
    coverage_type: string;
    coverage_value: string | null;
    source: string;
    url: string;
    is_active: boolean;
  }>;
  wikipedia_show_urls: Array<{
    id: string;
    show_url: string;
    show_title: string | null;
    wikidata_id: string | null;
    matched_show_id: string | null;
    match_method: string | null;
    is_applied: boolean;
  }>;
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

const firstParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const displayValue = (value: string | number | null | undefined): string =>
  value === null || value === undefined || `${value}`.trim() === "" ? "Missing" : `${value}`;

function MetadataRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm text-zinc-800 [overflow-wrap:anywhere]">{displayValue(value)}</div>
    </div>
  );
}

export default function AdminNetworkStreamingDetailPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const router = useRouter();
  const params = useParams<{ entityType: string; entitySlug: string }>();
  const routeEntityType = parseEntityType(firstParam(params?.entityType));
  const routeEntitySlug = toEntitySlug(firstParam(params?.entitySlug));

  const [detail, setDetail] = useState<NetworkStreamingDetailPayload | null>(null);
  const [notFoundSuggestions, setNotFoundSuggestions] = useState<NetworkStreamingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [familyActionBusy, setFamilyActionBusy] = useState<string | null>(null);
  const [familyActionMessage, setFamilyActionMessage] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  const ensureFamily = useCallback(async (): Promise<string> => {
    if (!detail) throw new Error("Detail not loaded");
    const existingFamilyId = typeof detail.family?.id === "string" ? detail.family.id : "";
    if (existingFamilyId) return existingFamilyId;

    const createResponse = await fetchWithAuth("/api/admin/trr-api/brands/families", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_name: `${detail.display_name} Family`,
      }),
    });
    const createPayload = (await createResponse.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!createResponse.ok || typeof createPayload.id !== "string") {
      throw new Error(createPayload.error || "Failed to create brand family");
    }

    const addMemberResponse = await fetchWithAuth(`/api/admin/trr-api/brands/families/${encodeURIComponent(createPayload.id)}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_type: detail.entity_type,
        entity_key: detail.entity_key,
        entity_display_name: detail.display_name,
        source: "manual",
      }),
    });
    if (!addMemberResponse.ok) {
      const addPayload = (await addMemberResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(addPayload.error || "Failed to add entity to family");
    }
    return createPayload.id;
  }, [detail, fetchWithAuth]);

  const handleCreateJoinFamily = useCallback(async () => {
    if (!detail) return;
    setFamilyActionBusy("family");
    setFamilyActionMessage(null);
    try {
      if (detail.family?.id) {
        setFamilyActionMessage("Entity is already linked to a family.");
        return;
      }
      const familyId = await ensureFamily();
      setFamilyActionMessage(`Linked to family ${familyId}.`);
      setRefreshNonce((current) => current + 1);
    } catch (actionError) {
      setFamilyActionMessage(actionError instanceof Error ? actionError.message : "Failed to create/join family");
    } finally {
      setFamilyActionBusy(null);
    }
  }, [detail, ensureFamily]);

  const handleWikipediaImport = useCallback(
    async (applyMatched: boolean) => {
      if (!detail) return;
      setFamilyActionBusy(applyMatched ? "wiki-apply" : "wiki");
      setFamilyActionMessage(null);
      try {
        const familyId = await ensureFamily();
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/families/${encodeURIComponent(familyId)}/wikipedia-import`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity_type: detail.entity_type,
              entity_key: detail.entity_key,
              apply_matched: applyMatched,
            }),
          },
        );
        const payload = (await response.json().catch(() => ({}))) as {
          imported_count?: number;
          matched_count?: number;
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "Wikipedia import failed");
        }
        setFamilyActionMessage(
          `Imported ${payload.imported_count ?? 0} URLs, matched ${payload.matched_count ?? 0} shows${
            applyMatched ? ", applied matched links." : "."
          }`,
        );
        setRefreshNonce((current) => current + 1);
      } catch (actionError) {
        setFamilyActionMessage(actionError instanceof Error ? actionError.message : "Wikipedia import failed");
      } finally {
        setFamilyActionBusy(null);
      }
    },
    [detail, ensureFamily, fetchWithAuth],
  );

  useEffect(() => {
    if (!routeEntityType || !routeEntitySlug || checking || !user || !hasAccess) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          entity_type: routeEntityType,
          entity_slug: routeEntitySlug,
        });
        const response = await fetchWithAuth(`/api/admin/networks-streaming/detail?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          if (response.status === 404) {
            const payload = (await response.json().catch(() => ({}))) as {
              suggestions?: NetworkStreamingSuggestion[];
            };
            if (!cancelled) {
              setError("not_found");
              setNotFoundSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
              setDetail(null);
            }
            return;
          }
          if (!cancelled) {
            setError(await parseErrorPayload(response));
            setNotFoundSuggestions([]);
            setDetail(null);
          }
          return;
        }
        const payload = (await response.json()) as NetworkStreamingDetailPayload;
        if (cancelled) return;
        setNotFoundSuggestions([]);
        setDetail({
          ...payload,
          family: payload.family ?? null,
          family_suggestions: Array.isArray(payload.family_suggestions) ? payload.family_suggestions : [],
          shared_links: Array.isArray(payload.shared_links) ? payload.shared_links : [],
          wikipedia_show_urls: Array.isArray(payload.wikipedia_show_urls) ? payload.wikipedia_show_urls : [],
        });

        const canonicalSlug = toEntitySlug(payload.entity_slug || payload.display_name);
        if (canonicalSlug && canonicalSlug !== routeEntitySlug) {
          router.replace(`/brands/networks-and-streaming/${payload.entity_type}/${canonicalSlug}`);
        }
      } catch (fetchError) {
        if (cancelled) return;
        const message = fetchError instanceof Error ? fetchError.message : "Failed to load entity detail";
        setError(message);
        setNotFoundSuggestions([]);
        setDetail(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [checking, fetchWithAuth, hasAccess, refreshNonce, routeEntitySlug, routeEntityType, router, user]);

  const pageTitle = useMemo(() => {
    if (detail?.display_name) return detail.display_name;
    if (!routeEntitySlug) return "Network";
    return humanizeSlug(routeEntitySlug);
  }, [detail?.display_name, routeEntitySlug]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing network detail...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (!routeEntityType || !routeEntitySlug) {
    return (
      <ClientOnly>
        <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Invalid entity detail URL.
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <AdminBreadcrumbs
              items={buildNetworkDetailBreadcrumb(pageTitle, `/brands/networks-and-streaming/${routeEntityType}/${routeEntitySlug}`)}
              className="mb-1"
            />
            <h1 className="mt-2 break-words text-3xl font-bold text-zinc-900">{pageTitle}</h1>
            <p className="mt-1 break-words text-sm text-zinc-500">
              {routeEntityType === "network"
                ? "Network"
                : routeEntityType === "streaming"
                  ? "Streaming service"
                  : "Production company"}{" "}
              profile with saved assets, metadata, and added shows.
            </p>
            <BrandsTabs
              activeTab={routeEntityType === "production" ? "production-companies" : "networks-streaming"}
              className="mt-4"
            />
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          {error && error !== "not_found" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}

          {error === "not_found" ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h2 className="text-lg font-semibold text-amber-900">Entity Not Found</h2>
              <p className="mt-1 text-sm text-amber-800 [overflow-wrap:anywhere]">
                Could not find a {routeEntityType} entity for slug <span className="font-semibold">{routeEntitySlug}</span>.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/brands/networks-and-streaming"
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Back to Network & Streaming Services
                </Link>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Suggestions</p>
                {notFoundSuggestions.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {notFoundSuggestions.map((item) => (
                      <li key={`${item.entity_type}:${item.entity_slug}`}>
                        <Link
                          href={`/brands/networks-and-streaming/${item.entity_type}/${item.entity_slug}`}
                          className="text-sm text-amber-900 underline [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </Link>
                        <span className="ml-2 text-xs text-amber-700">
                          ({item.available_show_count} available / {item.added_show_count} added)
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">No close matches found.</p>
                )}
              </div>
            </section>
          ) : null}

          {loading && !detail ? (
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
              Loading network detail...
            </div>
          ) : null}

          {detail ? (
            <>
              <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Type:{" "}
                    {detail.entity_type === "network"
                      ? "Network"
                      : detail.entity_type === "streaming"
                        ? "Streaming"
                        : "Production"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Available Shows: {detail.available_show_count}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Added Shows: {detail.added_show_count}
                  </span>
                  {detail.entity_type === "production" ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Logo optional</span>
                  ) : null}
                </div>
                <h2 className="text-lg font-semibold text-zinc-900">Saved Logos</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="min-w-0 rounded-lg border border-zinc-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Color Logo</div>
                    {detail.core.hosted_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={detail.core.hosted_logo_url} alt={`${detail.display_name} logo`} className="mt-2 h-12 object-contain" />
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">Missing</p>
                    )}
                  </div>
                  <div className="min-w-0 rounded-lg border border-zinc-200 p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Black Variant</div>
                    {detail.core.hosted_logo_black_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={detail.core.hosted_logo_black_url} alt={`${detail.display_name} black logo`} className="mt-2 h-12 object-contain" />
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">Missing</p>
                    )}
                  </div>
                  <div className="min-w-0 rounded-lg border border-zinc-800 bg-black p-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-100">White Variant</div>
                    {detail.core.hosted_logo_white_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={detail.core.hosted_logo_white_url} alt={`${detail.display_name} white logo`} className="mt-2 h-12 object-contain" />
                    ) : (
                      <p className="mt-2 text-sm text-zinc-300">Missing</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Override Logo URLs</p>
                  {detail.override.logo_source_urls_override.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {detail.override.logo_source_urls_override.map((url) => (
                        <li key={url}>
                          <a className="text-blue-700 underline [overflow-wrap:anywhere]" href={url} rel="noreferrer" target="_blank">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">Missing</p>
                  )}
                </div>
                <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                      Total Assets: {(detail.logo_assets ?? []).length}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                      Mirrored: {(detail.logo_assets ?? []).filter((asset) => asset.mirror_status === "mirrored").length}
                    </span>
                    <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                      Failed/Skipped: {(detail.logo_assets ?? []).filter((asset) => asset.mirror_status !== "mirrored").length}
                    </span>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-900">Mirrored Logo Gallery</h3>
                  {(detail.logo_assets ?? []).length > 0 ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {(detail.logo_assets ?? []).map((asset) => (
                        <div key={asset.id} className="min-w-0 rounded-lg border border-zinc-200 bg-white p-3">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                              {asset.source}
                            </span>
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                              rank {asset.source_rank}
                            </span>
                            {asset.is_primary ? (
                              <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                primary
                              </span>
                            ) : null}
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                asset.mirror_status === "mirrored"
                                  ? "bg-green-100 text-green-700"
                                  : asset.mirror_status === "skipped"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              }`}
                            >
                              {asset.mirror_status}
                            </span>
                          </div>
                          <div className="mt-2 h-14 rounded border border-zinc-200 bg-zinc-50 p-2">
                            {asset.hosted_logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={asset.hosted_logo_url} alt={`${detail.display_name} ${asset.source} logo`} className="h-full w-full object-contain" />
                            ) : (
                              <p className="text-xs text-zinc-500">No hosted asset</p>
                            )}
                          </div>
                          <div className="mt-2 space-y-1 text-[11px] text-zinc-600">
                            <p className="[overflow-wrap:anywhere]">Format: {asset.base_logo_format}</p>
                            <p>Dimensions: {asset.pixel_width ?? "-"} × {asset.pixel_height ?? "-"}</p>
                            {asset.failure_reason ? <p className="text-red-700">Reason: {asset.failure_reason}</p> : null}
                            <a className="text-blue-700 underline [overflow-wrap:anywhere]" href={asset.source_url} rel="noreferrer" target="_blank">
                              Source URL
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No mirrored logo assets yet.</p>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-zinc-900">Saved Info / URLs</h2>
                <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <MetadataRow label="Entity Key" value={detail.entity_key} />
                  <MetadataRow label="Entity ID" value={detail.core.entity_id} />
                  <MetadataRow label="Origin Country" value={detail.core.origin_country} />
                  <MetadataRow label="Display Priority" value={detail.core.display_priority} />
                  <MetadataRow label="TMDb Logo Path" value={detail.core.tmdb_logo_path} />
                  <MetadataRow label="Logo Path" value={detail.core.logo_path} />
                  <MetadataRow label="Hosted Logo Key" value={detail.core.hosted_logo_key} />
                  <MetadataRow label="Wikidata ID" value={detail.core.wikidata_id} />
                  <MetadataRow label="Wikipedia URL" value={detail.core.wikipedia_url} />
                  <MetadataRow label="Wikimedia Logo File" value={detail.core.wikimedia_logo_file} />
                  <MetadataRow label="Facebook ID" value={detail.core.facebook_id} />
                  <MetadataRow label="Instagram ID" value={detail.core.instagram_id} />
                  <MetadataRow label="Twitter ID" value={detail.core.twitter_id} />
                  <MetadataRow label="TikTok ID" value={detail.core.tiktok_id} />
                  <MetadataRow label="Link Enrichment Source" value={detail.core.link_enrichment_source} />
                  <MetadataRow label="Link Enriched At" value={detail.core.link_enriched_at} />
                  <MetadataRow label="Override Name" value={detail.override.display_name_override} />
                  <MetadataRow label="Override Wikidata ID" value={detail.override.wikidata_id_override} />
                  <MetadataRow label="Override Wikipedia URL" value={detail.override.wikipedia_url_override} />
                  <MetadataRow label="Override Source Priority" value={detail.override.source_priority_override.join(", ")} />
                  <MetadataRow label="Override Aliases" value={detail.override.aliases_override.join(", ")} />
                  <MetadataRow label="Override Notes" value={detail.override.notes} />
                  <MetadataRow label="Override Updated By" value={detail.override.updated_by} />
                  <MetadataRow label="Override Updated At" value={detail.override.updated_at} />
                  <MetadataRow label="Completion Status" value={detail.completion.resolution_status} />
                  <MetadataRow label="Completion Reason" value={detail.completion.resolution_reason} />
                  <MetadataRow label="Completion Last Attempt" value={detail.completion.last_attempt_at} />
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Brand Family</h2>
                    <p className="text-sm text-zinc-600">
                      Pair related network/streaming brands and apply shared link coverage rules.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCreateJoinFamily()}
                      disabled={familyActionBusy !== null}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {familyActionBusy === "family" ? "Working..." : detail.family ? "Already in Family" : "Create/Join Family"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleWikipediaImport(false)}
                      disabled={familyActionBusy !== null}
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {familyActionBusy === "wiki" ? "Importing..." : "Import Wiki Show URLs"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleWikipediaImport(true)}
                      disabled={familyActionBusy !== null}
                      className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {familyActionBusy === "wiki-apply" ? "Applying..." : "Import + Apply Matched"}
                    </button>
                  </div>
                </div>
                {familyActionMessage ? (
                  <p className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">{familyActionMessage}</p>
                ) : null}

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <article className="rounded-lg border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Current Family</h3>
                    {detail.family ? (
                      <div className="mt-2 space-y-2 text-sm text-zinc-700">
                        <p>
                          <span className="font-semibold">{detail.family.display_name}</span> ({detail.family.family_key})
                        </p>
                        <p>Owner: {detail.family.owner_label ?? detail.family.owner_wikidata_id ?? "Unknown"}</p>
                        <ul className="list-disc pl-5">
                          {detail.family.members.map((member) => (
                            <li key={member.id}>
                              {member.entity_display_name} [{member.entity_type}]
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">No family linked yet.</p>
                    )}
                  </article>

                  <article className="rounded-lg border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Suggested Pairings</h3>
                    {detail.family_suggestions.length > 0 ? (
                      <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                        {detail.family_suggestions.slice(0, 5).map((suggestion) => (
                          <li key={`${suggestion.owner_wikidata_id}:${suggestion.owner_label}`}>
                            <p className="font-semibold">{suggestion.owner_label}</p>
                            <p className="text-xs text-zinc-600">
                              {suggestion.entities
                                .map((entity) => `${entity.display_name} [${entity.entity_type}]`)
                                .join(", ")}
                            </p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">No owner-based suggestions currently available.</p>
                    )}
                  </article>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <article className="rounded-lg border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Shared Links</h3>
                    {detail.shared_links.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                        {detail.shared_links.map((link) => (
                          <li key={link.id} className="[overflow-wrap:anywhere]">
                            {link.link_group}/{link.link_kind} - {link.coverage_type}
                            {link.coverage_value ? ` (${link.coverage_value})` : ""} -{" "}
                            <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                              {link.url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">No shared links configured.</p>
                    )}
                  </article>

                  <article className="rounded-lg border border-zinc-200 p-3">
                    <h3 className="text-sm font-semibold text-zinc-900">Wikipedia Show URLs</h3>
                    {detail.wikipedia_show_urls.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-xs text-zinc-700">
                        {detail.wikipedia_show_urls.slice(0, 20).map((link) => (
                          <li key={link.id} className="[overflow-wrap:anywhere]">
                            <a href={link.show_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                              {link.show_title ?? link.show_url}
                            </a>{" "}
                            - {link.matched_show_id ? `matched (${link.match_method ?? "matched"})` : "unmatched"} -{" "}
                            {link.is_applied ? "applied" : "not applied"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">No imported Wikipedia show URLs.</p>
                    )}
                  </article>
                </div>
              </section>

              <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <h2 className="text-lg font-semibold text-zinc-900">Added Shows</h2>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">Show</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">TRR Show ID</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">Poster</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {detail.shows.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-8 text-center text-zinc-500">
                            No added shows linked to this entity.
                          </td>
                        </tr>
                      ) : (
                        detail.shows.map((show) => {
                          const showSlug = show.canonical_slug ?? show.trr_show_id;
                          return (
                            <tr key={show.trr_show_id}>
                              <td className="max-w-[320px] px-3 py-2 font-medium text-zinc-900 [overflow-wrap:anywhere]">
                                <Link
                                  className="text-zinc-900 underline-offset-2 hover:underline"
                                  href={`/shows/${encodeURIComponent(showSlug)}`}
                                >
                                  {show.show_name}
                                </Link>
                              </td>
                              <td className="max-w-[240px] px-3 py-2 font-mono text-xs text-zinc-600 [overflow-wrap:anywhere]">{show.trr_show_id}</td>
                              <td className="px-3 py-2">
                                {show.poster_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={show.poster_url} alt={`${show.show_name} poster`} className="h-12 w-8 rounded object-cover" />
                                ) : (
                                  <span className="text-zinc-500">Missing</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </ClientOnly>
  );
}

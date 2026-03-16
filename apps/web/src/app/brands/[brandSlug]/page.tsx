/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import BrandLogoOptionsModal from "@/components/admin/BrandLogoOptionsModal";
import BrandsTabs from "@/components/admin/BrandsTabs";
import { appendSearchParam } from "@/lib/admin/brands-workspace";
import {
  type BrandProfileAsset,
  type BrandProfilePayload,
  type BrandProfileShow,
  type BrandProfileSuggestion,
  type BrandProfileTarget,
  formatBrandTargetType,
} from "@/lib/admin/brand-profile";
import { buildBrandsPageBreadcrumb, humanizeSlug } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

type BrandProfileResponse = BrandProfilePayload & { suggestions?: BrandProfileSuggestion[] };

const COLOR_BADGE_CLASSNAMES: Record<string, string> = {
  network: "bg-cyan-100 text-cyan-900 border-cyan-200",
  streaming: "bg-amber-100 text-amber-900 border-amber-200",
  production: "bg-rose-100 text-rose-900 border-rose-200",
  franchise: "bg-violet-100 text-violet-900 border-violet-200",
  publication: "bg-emerald-100 text-emerald-900 border-emerald-200",
  social: "bg-sky-100 text-sky-900 border-sky-200",
  other: "bg-stone-200 text-stone-900 border-stone-300",
};

const pickAssetDisplayUrl = (asset: BrandProfileAsset): string | null =>
  canonicalizeHostedMediaUrl(asset.display_url) ?? asset.display_url;

const pickShowPosterUrl = (show: BrandProfileShow): string | null =>
  canonicalizeHostedMediaUrl(show.poster_url) ?? show.poster_url;

const joinClasses = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

const buildSectionSearchHref = (href: string, query: string): string =>
  appendSearchParam(href, "q", query);

function IdentityList({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (values.length === 0) return null;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm shadow-zinc-200/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            key={`${label}:${value}`}
            className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function EvidenceSection({ target }: { target: BrandProfileTarget }) {
  const evidenceLinks = [
    ...(target.discovered_from_urls ?? []),
    ...(target.discovered_from ? [target.discovered_from] : []),
    ...(target.shared_links ?? []).map((item) => item.url),
    ...(target.wikipedia_show_urls ?? []).map((item) => item.show_url),
  ].filter(Boolean);

  const uniqueEvidence = Array.from(new Set(evidenceLinks));
  const hasEvidence =
    uniqueEvidence.length > 0 ||
    target.source_link_kinds.length > 0 ||
    target.family !== null ||
    target.family_suggestions.length > 0;

  if (!hasEvidence) return null;

  return (
    <article className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-zinc-900">{target.target_label}</h3>
        <span
          className={joinClasses(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
            COLOR_BADGE_CLASSNAMES[target.target_type],
          )}
        >
          {formatBrandTargetType(target.target_type)}
        </span>
      </div>
      {target.source_link_kinds.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {target.source_link_kinds.map((kind) => (
            <span
              key={`${target.id}:${kind}`}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700"
            >
              {kind}
            </span>
          ))}
        </div>
      ) : null}
      {uniqueEvidence.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          {uniqueEvidence.map((url) => (
            <li key={`${target.id}:${url}`} className="rounded-2xl border border-zinc-100 bg-zinc-50 px-3 py-2">
              <a href={url} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300">
                {url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {target.family ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
          Family: <span className="font-semibold">{target.family.display_name}</span>
        </div>
      ) : null}
    </article>
  );
}

export default function BrandProfilePage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{ brandSlug: string }>();
  const brandSlug = Array.isArray(params?.brandSlug) ? params.brandSlug[0] ?? "" : params?.brandSlug ?? "";

  const [payload, setPayload] = useState<BrandProfileResponse | null>(null);
  const [suggestions, setSuggestions] = useState<BrandProfileSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [logoTarget, setLogoTarget] = useState<BrandProfileTarget | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user],
  );

  const loadProfile = useCallback(async () => {
    if (!brandSlug) {
      setPayload(null);
      setSuggestions([]);
      setError("Brand slug is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(
        `/api/admin/brands/profile?slug=${encodeURIComponent(brandSlug)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        suggestions?: BrandProfileSuggestion[];
      } & Partial<BrandProfileResponse>;

      if (!response.ok) {
        if (response.status === 404) {
          setPayload(null);
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setError("not_found");
          return;
        }
        throw new Error(data.error || "Failed to load brand profile");
      }

      setPayload(data as BrandProfileResponse);
      setSuggestions([]);
      setLogoTarget((current) => {
        if (!current) return null;
        return (data.targets ?? []).find((target) => target.id === current.id) ?? null;
      });
    } catch (loadError) {
      setPayload(null);
      setSuggestions([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load brand profile");
    } finally {
      setLoading(false);
    }
  }, [brandSlug, fetchWithAuth]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void loadProfile();
  }, [checking, hasAccess, loadProfile, user]);

  const primaryTarget = useMemo(
    () => payload?.targets.find((target) => target.id === payload.primary_target_id) ?? null,
    [payload],
  );

  const identityGroups = useMemo(() => {
    const targets = payload?.targets ?? [];
    const collect = (selector: (target: BrandProfileTarget) => string | null) =>
      Array.from(new Set(targets.map(selector).filter((value): value is string => Boolean(value))));

    return [
      { label: "Known Keys", values: collect((target) => target.target_key) },
      { label: "Wikipedia", values: collect((target) => target.wikipedia_url) },
      { label: "Wikidata IDs", values: collect((target) => target.wikidata_id) },
      { label: "Facebook IDs", values: collect((target) => target.facebook_id) },
      { label: "Instagram IDs", values: collect((target) => target.instagram_id) },
      { label: "Twitter IDs", values: collect((target) => target.twitter_id) },
      { label: "TikTok IDs", values: collect((target) => target.tiktok_id) },
    ].filter((group) => group.values.length > 0);
  }, [payload]);

  const showsByCategory = useMemo(() => {
    const grouped = new Map<string, BrandProfileShow[]>();
    for (const show of payload?.shows ?? []) {
      const key = show.categories[0] ?? "other";
      const current = grouped.get(key) ?? [];
      current.push(show);
      grouped.set(key, current);
    }
    return [...grouped.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  }, [payload]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing brand profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f5f5f4_0%,#fafaf9_36%,#ffffff_100%)]">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <AdminBreadcrumbs
              items={buildBrandsPageBreadcrumb(
                payload?.display_name ?? humanizeSlug(brandSlug),
                `/brands/${brandSlug}`,
              )}
              className="mb-1"
            />
            <div className="mt-4 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_80px_-40px_rgba(24,24,27,0.45)]">
              <div className="relative overflow-hidden border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,rgba(219,234,254,0)_40%),radial-gradient(circle_at_top_right,#fde68a_0%,rgba(253,230,138,0)_36%),linear-gradient(135deg,#111827_0%,#1f2937_100%)] px-6 py-8 text-white">
                <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/90">
                      Brand Profile
                    </p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                      {payload?.display_name ?? humanizeSlug(brandSlug)}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-200">
                      Editorial and platform footprint across the TRR brand graph, with related shows, saved assets,
                      and quick links back into existing brand workflows.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(payload?.categories ?? []).map((category) => (
                        <span
                          key={category}
                          className={joinClasses(
                            "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]",
                            COLOR_BADGE_CLASSNAMES[category],
                          )}
                        >
                          {formatBrandTargetType(category)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid min-w-[18rem] grid-cols-3 gap-3">
                    {[
                      ["Targets", String(payload?.counts.targets ?? 0)],
                      ["Shows", String(payload?.counts.shows ?? 0)],
                      ["Assets", String(payload?.counts.assets ?? 0)],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-200">
                          {label}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <BrandsTabs activeTab="brands" />
                <div className="flex flex-wrap gap-2">
                  {primaryTarget ? (
                    <button
                      type="button"
                      onClick={() => setLogoTarget(primaryTarget)}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Manage Logos
                    </button>
                  ) : null}
                  {primaryTarget?.detail_href ? (
                    <Link
                      href={primaryTarget.detail_href as Route}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Open Source Detail
                    </Link>
                  ) : primaryTarget ? (
                    <Link
                      href={buildSectionSearchHref(primaryTarget.section_href, primaryTarget.target_label) as Route}
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Open Section
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          {error && error !== "not_found" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-10 text-center shadow-sm">
              <p className="text-sm text-zinc-500">Loading brand profile...</p>
            </section>
          ) : null}

          {error === "not_found" ? (
            <section className="rounded-3xl border border-amber-200 bg-[linear-gradient(180deg,#fffbeb_0%,#fff7ed_100%)] p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-700">No Exact Match</p>
              <h2 className="mt-3 text-2xl font-semibold text-amber-950">
                No brand matched <span className="lowercase">/{brandSlug}</span>
              </h2>
              <p className="mt-2 text-sm text-amber-900/80">
                Exact friendly-slug matching is enabled for this page. Try one of the nearby brand candidates below.
              </p>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((item) => (
                  <Link
                    key={`${item.target_type}:${item.target_key}`}
                    href={item.href as Route}
                    className="rounded-2xl border border-amber-200 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={joinClasses(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                          COLOR_BADGE_CLASSNAMES[item.target_type],
                        )}
                      >
                        {formatBrandTargetType(item.target_type)}
                      </span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-zinc-900">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">/{item.slug}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {payload ? (
            <>
              <section className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
                <div className="rounded-3xl border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Identity</p>
                      <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Known Handles, Keys, and URLs</h2>
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                      /{payload.slug}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {identityGroups.length > 0 ? (
                      identityGroups.map((group) => (
                        <IdentityList key={group.label} label={group.label} values={group.values} />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                        No structured identity fields have been captured for this brand yet.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Underlying Targets</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Where This Brand Lives</h2>
                  <div className="mt-5 space-y-3">
                    {payload.targets.map((target) => (
                      <article
                        key={target.id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 shadow-sm shadow-zinc-200/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-zinc-900">
                                {target.target_label}
                              </h3>
                              <span
                                className={joinClasses(
                                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                                  COLOR_BADGE_CLASSNAMES[target.target_type],
                                )}
                              >
                                {formatBrandTargetType(target.target_type)}
                              </span>
                            </div>
                            <p className="mt-1 break-all text-xs text-zinc-500">{target.target_key}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setLogoTarget(target)}
                              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                            >
                              Manage Logos
                            </button>
                            <Link
                              href={
                                (target.detail_href ??
                                  buildSectionSearchHref(target.section_href, target.target_label)) as Route
                              }
                              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                            >
                              Open Source
                            </Link>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                          {typeof target.available_show_count === "number" ? (
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                              Available shows: {target.available_show_count}
                            </span>
                          ) : null}
                          {typeof target.added_show_count === "number" ? (
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                              Added shows: {target.added_show_count}
                            </span>
                          ) : null}
                          {target.family ? (
                            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                              Family: {target.family.display_name}
                            </span>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Related Shows</p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Shows Connected to This Brand</h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                    {payload.counts.shows} linked shows
                  </span>
                </div>
                {payload.shows.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                    No related shows are currently attached to this brand target set.
                  </div>
                ) : (
                  <div className="mt-6 space-y-6">
                    {showsByCategory.map(([category, shows]) => (
                      <div key={category}>
                        <div className="mb-3 flex items-center gap-2">
                          <span
                            className={joinClasses(
                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                              COLOR_BADGE_CLASSNAMES[category],
                            )}
                          >
                            {formatBrandTargetType(category as BrandProfileTarget["target_type"])}
                          </span>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {shows.map((show) => (
                            <Link
                              key={show.id}
                              href={
                                buildShowAdminUrl({
                                  showSlug: show.canonical_slug ?? show.id,
                                }) as Route
                              }
                              className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-3 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                            >
                              <div className="flex gap-3">
                                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                                  {pickShowPosterUrl(show) ? (
                                    <img
                                      src={pickShowPosterUrl(show) ?? ""}
                                      alt={show.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center bg-zinc-100 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                                      No Art
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950">
                                    {show.name}
                                  </p>
                                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                                    {show.source_labels.join(" · ")}
                                  </p>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Brand Assets</p>
                    <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Wordmarks, Icons, and Variants</h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
                    {payload.counts.assets} saved assets
                  </span>
                </div>
                {payload.assets.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                    No saved assets have been attached to the matched targets yet.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {payload.assets.map((asset) => (
                      <article
                        key={asset.id}
                        className="rounded-2xl border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-4 shadow-sm shadow-zinc-200/40"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={joinClasses(
                              "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                              COLOR_BADGE_CLASSNAMES[asset.target_type],
                            )}
                          >
                            {formatBrandTargetType(asset.target_type)}
                          </span>
                          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                            {asset.role}
                          </span>
                          {asset.variant ? (
                            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                              {asset.variant}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 flex min-h-28 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          {pickAssetDisplayUrl(asset) ? (
                            <img
                              src={pickAssetDisplayUrl(asset) ?? ""}
                              alt={`${asset.target_label} ${asset.role}`}
                              className="max-h-20 w-full object-contain"
                            />
                          ) : (
                            <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Missing</div>
                          )}
                        </div>
                        <div className="mt-4 space-y-1">
                          <p className="text-sm font-semibold text-zinc-900">{asset.target_label}</p>
                          <p className="text-xs text-zinc-500">
                            {asset.source_provider ?? "Stored"} · {asset.option_kind ?? "stored"}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Evidence</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Source Links and Family Context</h2>
                  <div className="mt-6 space-y-4">
                    {payload.targets.map((target) => (
                      <EvidenceSection key={target.id} target={target} />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Quick Access</p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-900">Jump Back Into Existing Workflows</h2>
                  <div className="mt-6 grid gap-3">
                    {payload.targets.map((target) => (
                      <div
                        key={`jump:${target.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-zinc-900">{target.target_label}</p>
                          <p className="text-xs text-zinc-500">{formatBrandTargetType(target.target_type)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setLogoTarget(target)}
                            className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                          >
                            Manage Logos
                          </button>
                          <Link
                            href={
                              (target.detail_href ??
                                buildSectionSearchHref(target.section_href, target.target_label)) as Route
                            }
                            className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
                          >
                            Open Workflow
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </>
          ) : null}
        </main>

        {logoTarget ? (
          <BrandLogoOptionsModal
            isOpen={Boolean(logoTarget)}
            onClose={() => setLogoTarget(null)}
            preferredUser={user}
            targetType={logoTarget.target_type}
            targetKey={logoTarget.target_key}
            targetLabel={logoTarget.target_label}
            onSaved={loadProfile}
          />
        ) : null}
      </div>
    </ClientOnly>
  );
}

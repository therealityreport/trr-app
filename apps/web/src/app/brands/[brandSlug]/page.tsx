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
  type BrandProfileSocialProfile,
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
type BrandPageTab = "overview" | "logos";

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

const formatCount = (value: number): string => value.toLocaleString("en-US");

const uniqueUrls = (values: Array<string | null | undefined>): string[] =>
  Array.from(new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)));

const metadataValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "Missing";
  const serialized = String(value).trim();
  return serialized || "Missing";
};

function MetadataCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | null | undefined;
  href?: string | null;
}) {
  const resolvedValue = metadataValue(value);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      {href && resolvedValue !== "Missing" ? (
        <a href={href} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm font-medium text-zinc-900 underline decoration-zinc-300">
          {resolvedValue}
        </a>
      ) : (
        <p className="mt-2 break-all text-sm font-medium text-zinc-900">{resolvedValue}</p>
      )}
    </div>
  );
}

function LogoGrid({
  assets,
  onManage,
  title,
  subtitle,
}: {
  assets: BrandProfileAsset[];
  onManage: (target: BrandProfileTarget) => void;
  title: string;
  subtitle: string;
}) {
  if (assets.length === 0) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white px-6 py-10 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">{title}</p>
        <h2 className="mt-3 text-2xl font-semibold text-zinc-900">{subtitle}</h2>
        <p className="mt-4 text-sm text-zinc-500">No saved logos are attached to this brand yet.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">{title}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-zinc-900">{subtitle}</h2>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          {assets.length} saved
        </span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <article
            key={asset.id}
            className="rounded-3xl border border-zinc-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_100%)] p-4 shadow-sm"
          >
            <div className="flex flex-wrap gap-2">
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
            </div>
            <div className="mt-4 flex min-h-36 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              {pickAssetDisplayUrl(asset) ? (
                <img
                  src={pickAssetDisplayUrl(asset) ?? ""}
                  alt={`${asset.target_label} ${asset.role}`}
                  className="max-h-24 w-full object-contain"
                />
              ) : (
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Missing</div>
              )}
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-sm font-semibold text-zinc-900">{asset.target_label}</p>
              <p className="text-xs text-zinc-500">{asset.source_provider ?? "stored"}{asset.variant ? ` · ${asset.variant}` : ""}</p>
            </div>
            {asset.source_url ? (
              <a
                href={asset.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block truncate text-xs text-zinc-500 underline decoration-zinc-300"
                title={asset.source_url}
              >
                {asset.source_url}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() =>
                onManage({
                  id: asset.target_id,
                  target_type: asset.target_type,
                  target_key: asset.target_key,
                  target_label: asset.target_label,
                  friendly_slug: "",
                  section_href: "",
                  detail_href: null,
                  entity_slug: null,
                  entity_id: null,
                  available_show_count: null,
                  added_show_count: null,
                  homepage_url: null,
                  wikipedia_url: null,
                  wikidata_id: null,
                  instagram_id: null,
                  twitter_id: null,
                  tiktok_id: null,
                  facebook_id: null,
                  discovered_from: null,
                  discovered_from_urls: [],
                  source_link_kinds: [],
                  family: null,
                  family_suggestions: [],
                  shared_links: [],
                  wikipedia_show_urls: [],
                })
              }
              className="mt-4 rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Manage Logos
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function SocialProfilesSection({
  profiles,
}: {
  profiles: BrandProfileSocialProfile[];
}) {
  if (profiles.length === 0) return null;

  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Social Profiles</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold text-zinc-900">Shared accounts auto-assigned to this brand</h2>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
          {profiles.length} profiles
        </span>
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {profiles.map((profile) => (
          <article key={`${profile.platform}:${profile.account_handle}`} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={`${profile.account_handle} avatar`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {profile.platform.slice(0, 2)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                    {profile.platform}
                  </span>
                  <p className="text-lg font-semibold text-zinc-900">@{profile.account_handle}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                    Posts {formatCount(profile.total_posts)}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                    Engagement {formatCount(profile.total_engagement)}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1">
                    Views {formatCount(profile.total_views)}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/social/${encodeURIComponent(profile.platform)}/${encodeURIComponent(profile.account_handle)}` as Route}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Open Profile
                </Link>
                {profile.profile_url ? (
                  <a
                    href={profile.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Open Platform
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Assigned Shows</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.assigned_shows.map((show) => (
                  <Link
                    key={`${profile.platform}:${profile.account_handle}:${show.id}`}
                    href={buildShowAdminUrl({ showSlug: show.canonical_slug ?? show.id }) as Route}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    {show.name}
                  </Link>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
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
  const [activeTab, setActiveTab] = useState<BrandPageTab>("overview");

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
      const response = await fetchWithAuth(`/api/admin/brands/profile?slug=${encodeURIComponent(brandSlug)}`, {
        method: "GET",
        cache: "no-store",
      });
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
      setLogoTarget((current) => (current ? (data.targets ?? []).find((target) => target.id === current.id) ?? null : null));
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
  const networkTarget = useMemo(
    () => payload?.targets.find((target) => ["network", "streaming", "production"].includes(target.target_type)) ?? primaryTarget ?? null,
    [payload, primaryTarget],
  );
  const overviewAssets = useMemo(() => (payload?.assets ?? []).slice(0, 6), [payload]);
  const allSourceUrls = useMemo(
    () =>
      uniqueUrls(
        (payload?.assets ?? []).flatMap((asset) => [asset.source_url, asset.discovered_from]),
      ),
    [payload],
  );
  const overviewSourceUrls = useMemo(() => allSourceUrls.slice(0, 6), [allSourceUrls]);
  const familyTargets = useMemo(
    () => (payload?.targets ?? []).filter((target) => target.family || target.family_suggestions.length > 0),
    [payload],
  );
  const compactMetadata = useMemo(() => {
    if (!networkTarget) return [];
    return [
      { label: "Brand Slug", value: payload?.slug ?? brandSlug },
      { label: "Entity Key", value: networkTarget.target_key },
      { label: "Entity ID", value: networkTarget.entity_id },
      { label: "Homepage", value: networkTarget.homepage_url, href: networkTarget.homepage_url },
      { label: "Wikidata ID", value: networkTarget.wikidata_id },
      { label: "Wikipedia URL", value: networkTarget.wikipedia_url, href: networkTarget.wikipedia_url },
      { label: "Available Shows", value: networkTarget.available_show_count },
      { label: "Added Shows", value: networkTarget.added_show_count },
    ];
  }, [brandSlug, networkTarget, payload?.slug]);

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

  if (!user || !hasAccess) return null;

  return (
    <ClientOnly>
      <div className="min-h-screen bg-[linear-gradient(180deg,#f5f5f4_0%,#fafaf9_36%,#ffffff_100%)]">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <AdminBreadcrumbs
              items={buildBrandsPageBreadcrumb(payload?.display_name ?? humanizeSlug(brandSlug), `/brands/${brandSlug}`)}
              className="mb-1"
            />
            <div className="mt-4 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_80px_-40px_rgba(24,24,27,0.45)]">
              <div className="relative overflow-hidden border-b border-zinc-200 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,rgba(219,234,254,0)_40%),radial-gradient(circle_at_top_right,#fde68a_0%,rgba(253,230,138,0)_36%),linear-gradient(135deg,#111827_0%,#1f2937_100%)] px-6 py-8 text-white">
                <div className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))]" />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/90">Brand Profile</p>
                    <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                      {payload?.display_name ?? humanizeSlug(brandSlug)}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-200">
                      Canonical brand view for shows, shared social accounts, and saved logo discovery.
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
                      <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-200">{label}</p>
                        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
                <BrandsTabs activeTab="brands" />
                <div className="flex flex-wrap gap-2">
                  {networkTarget ? (
                    <button
                      type="button"
                      onClick={() => setLogoTarget(networkTarget)}
                      className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                    >
                      Manage Logos
                    </button>
                  ) : null}
                  {networkTarget ? (
                    <Link
                      href={buildSectionSearchHref(networkTarget.section_href, networkTarget.target_label) as Route}
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
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
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
              <p className="mt-2 text-sm text-amber-900/80">Try one of the nearby brand candidates below.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suggestions.map((item) => (
                  <Link
                    key={`${item.target_type}:${item.target_key}`}
                    href={item.href as Route}
                    className="rounded-2xl border border-amber-200 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-sm"
                  >
                    <span
                      className={joinClasses(
                        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                        COLOR_BADGE_CLASSNAMES[item.target_type],
                      )}
                    >
                      {formatBrandTargetType(item.target_type)}
                    </span>
                    <p className="mt-3 text-base font-semibold text-zinc-900">{item.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">/{item.slug}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {payload ? (
            <>
              <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["overview", "Overview"],
                    ["logos", `Logos (${payload.assets.length})`],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setActiveTab(value)}
                      className={joinClasses(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        activeTab === value
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {activeTab === "overview" ? (
                <>
                  <LogoGrid
                    assets={overviewAssets}
                    onManage={(target) => setLogoTarget(target)}
                    title="Saved Logos"
                    subtitle="Overview"
                  />
                  {payload.assets.length > 6 ? (
                    <div className="-mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setActiveTab("logos")}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        View More Logos
                      </button>
                    </div>
                  ) : null}

                  <SocialProfilesSection profiles={payload.social_profiles ?? []} />

                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Saved Info / URLs</p>
                    <h2 className="mt-3 text-2xl font-semibold text-zinc-900">Cleaned brand metadata</h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {compactMetadata.map((item) => (
                        <MetadataCard key={item.label} label={item.label} value={item.value} href={item.href} />
                      ))}
                    </div>
                    <div className="mt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Source URLs</p>
                          <p className="mt-1 text-sm text-zinc-600">Showing the first 6 on overview.</p>
                        </div>
                        {allSourceUrls.length > 6 ? (
                          <button
                            type="button"
                            onClick={() => setActiveTab("logos")}
                            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                          >
                            View More
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-3">
                        {overviewSourceUrls.length > 0 ? (
                          overviewSourceUrls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 underline decoration-zinc-300"
                              title={url}
                            >
                              {url}
                            </a>
                          ))
                        ) : (
                          <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                            No source URLs saved yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  {payload.streaming_services.length > 0 ? (
                    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Show Coverage</p>
                          <h2 className="mt-3 text-2xl font-semibold text-zinc-900">STREAMING SERVICES</h2>
                        </div>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                          {payload.streaming_services.length} services
                        </span>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2.5">
                        {payload.streaming_services.map((service) => (
                          <span
                            key={service}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-950"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Added Shows</p>
                        <h2 className="mt-3 text-2xl font-semibold text-zinc-900">Shows currently assigned to this brand</h2>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                        {payload.shows.length} added shows
                      </span>
                    </div>
                    {payload.shows.length === 0 ? (
                      <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                        No added shows are currently linked to this brand.
                      </p>
                    ) : (
                      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {payload.shows.map((show) => (
                          <Link
                            key={show.id}
                            href={buildShowAdminUrl({ showSlug: show.canonical_slug ?? show.id }) as Route}
                            className="group rounded-3xl border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                          >
                            <div className="flex gap-4">
                              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                                {pickShowPosterUrl(show) ? (
                                  <img src={pickShowPosterUrl(show) ?? ""} alt={show.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center bg-zinc-100 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                                    No Art
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-950">{show.name}</p>
                                <p className="mt-2 line-clamp-3 text-xs text-zinc-500">{show.source_labels.join(" · ")}</p>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Brand Family</p>
                    <h2 className="mt-3 text-2xl font-semibold text-zinc-900">Family and ownership context</h2>
                    {familyTargets.length === 0 ? (
                      <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                        No family assignments or suggestions are attached to this brand yet.
                      </p>
                    ) : (
                      <div className="mt-6 grid gap-4 xl:grid-cols-2">
                        {familyTargets.map((target) => (
                          <article key={target.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={joinClasses(
                                  "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
                                  COLOR_BADGE_CLASSNAMES[target.target_type],
                                )}
                              >
                                {formatBrandTargetType(target.target_type)}
                              </span>
                              <p className="text-lg font-semibold text-zinc-900">{target.target_label}</p>
                            </div>
                            {target.family ? (
                              <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Current Family</p>
                                <p className="mt-2 text-sm font-medium text-zinc-900">{target.family.display_name}</p>
                              </div>
                            ) : null}
                            {target.family_suggestions.length > 0 ? (
                              <div className="mt-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Suggestions</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {target.family_suggestions.map((suggestion) => (
                                    <span key={`${target.id}:${suggestion.owner_wikidata_id}`} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700">
                                      {suggestion.owner_label}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <>
                  <LogoGrid
                    assets={payload.assets}
                    onManage={(target) => setLogoTarget(target)}
                    title="Saved Logos"
                    subtitle="Full library"
                  />
                  <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Source URLs</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-2xl font-semibold text-zinc-900">All discovered and saved source links</h2>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
                        {allSourceUrls.length} URLs
                      </span>
                    </div>
                    <div className="mt-6 grid gap-3">
                      {allSourceUrls.length > 0 ? (
                        allSourceUrls.map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 underline decoration-zinc-300"
                            title={url}
                          >
                            {url}
                          </a>
                        ))
                      ) : (
                        <p className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                          No source URLs saved yet.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              )}
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

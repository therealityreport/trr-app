"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import type { User } from "firebase/auth";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_SOCIAL_PATH, buildSocialPath } from "@/lib/admin/admin-route-paths";
import type {
  RedditDashboardSummary,
  ShowProfileSet,
  SocialHandleSummary,
  SocialLandingPlatform,
  SocialLandingPayload,
} from "@/lib/admin/social-landing";
import {
  buildSocialAccountProfileUrl,
  buildShowAdminUrl,
  normalizeSocialAccountProfileHandle,
} from "@/lib/admin/show-admin-routes";
import { normalizePersonExternalIdValue } from "@/lib/admin/person-external-ids";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const sectionEyebrowClass =
  "text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500";
const SOCIAL_LANDING_CACHE_KEY = "trr-admin-social-landing:v1";
const EDITABLE_SHOW_SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "twitter",
  "tiktok",
  "youtube",
] as const;
type EditableShowSocialPlatform = (typeof EDITABLE_SHOW_SOCIAL_PLATFORMS)[number];
type ShowHandleDraft = Record<EditableShowSocialPlatform, string>;
const SHOW_SOCIAL_HANDLE_FIELD_BY_PLATFORM: Record<EditableShowSocialPlatform, string> = {
  instagram: "instagram_handle",
  facebook: "facebook_handle",
  twitter: "twitter_handle",
  tiktok: "tiktok_handle",
  youtube: "youtube_handle",
};

const formatPlatformLabel = (platform: SocialLandingPlatform): string => {
  if (platform === "twitter") return "Twitter/X";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
};

const buildEmptyShowHandleDraft = (): ShowHandleDraft => ({
  instagram: "",
  facebook: "",
  twitter: "",
  tiktok: "",
  youtube: "",
});

const buildShowHandleDraft = (show: ShowProfileSet): ShowHandleDraft => {
  const draft = buildEmptyShowHandleDraft();
  for (const handle of show.handles) {
    if ((EDITABLE_SHOW_SOCIAL_PLATFORMS as readonly string[]).includes(handle.platform)) {
      draft[handle.platform as EditableShowSocialPlatform] = handle.handle;
    }
  }
  return draft;
};

const buildEditableShowHandleSummary = (
  platform: EditableShowSocialPlatform,
  rawValue: string,
): SocialHandleSummary | null => {
  const normalizedValue = normalizePersonExternalIdValue(platform, rawValue);
  if (!normalizedValue) return null;
  if (
    platform === "youtube" &&
    (normalizedValue.startsWith("channel/") ||
      normalizedValue.startsWith("user/") ||
      normalizedValue.startsWith("c/"))
  ) {
    return null;
  }
  const canonicalHandle = normalizeSocialAccountProfileHandle(normalizedValue);
  if (!canonicalHandle) return null;

  const displayLabel =
    platform === "youtube"
      ? normalizedValue.startsWith("@")
        ? `@${canonicalHandle}`
        : canonicalHandle
      : `@${canonicalHandle}`;

  return {
    platform,
    handle: canonicalHandle,
    display_label: displayLabel,
    href: buildSocialAccountProfileUrl({ platform, handle: canonicalHandle }),
    external: false,
  };
};

const applyShowHandleDraft = (
  show: ShowProfileSet,
  draft: ShowHandleDraft,
): ShowProfileSet => {
  const handles = EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) =>
    buildEditableShowHandleSummary(platform, draft[platform]),
  ).filter((handle): handle is SocialHandleSummary => handle !== null);

  return {
    ...show,
    handles,
  };
};

const loadLandingData = async (
  currentUser: User,
): Promise<SocialLandingPayload> => {
  const response = await fetchAdminWithAuth("/api/admin/social/landing", undefined, {
    allowDevAdminBypass: true,
    preferredUser: currentUser,
  });
  const data = (await response.json().catch(() => ({}))) as
    | ({ error?: string } & Partial<SocialLandingPayload>)
    | undefined;
  if (!response.ok) {
    throw new Error(data?.error || "Failed to load social landing data");
  }
  return {
    network_sets: Array.isArray(data?.network_sets) ? data.network_sets : [],
    show_sets: Array.isArray(data?.show_sets) ? data.show_sets : [],
    people_profiles: Array.isArray(data?.people_profiles) ? data.people_profiles : [],
    shared_pipeline: {
      sources: Array.isArray(data?.shared_pipeline?.sources)
        ? data.shared_pipeline.sources
        : [],
      runs: Array.isArray(data?.shared_pipeline?.runs)
        ? data.shared_pipeline.runs
        : [],
      review_items: Array.isArray(data?.shared_pipeline?.review_items)
        ? data.shared_pipeline.review_items
        : [],
    },
    reddit_dashboard: {
      active_community_count:
        typeof data?.reddit_dashboard?.active_community_count === "number"
          ? data.reddit_dashboard.active_community_count
          : 0,
      archived_community_count:
        typeof data?.reddit_dashboard?.archived_community_count === "number"
          ? data.reddit_dashboard.archived_community_count
          : 0,
      show_count:
        typeof data?.reddit_dashboard?.show_count === "number"
          ? data.reddit_dashboard.show_count
          : 0,
    },
  };
};

const readCachedLandingData = (): SocialLandingPayload | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOCIAL_LANDING_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: SocialLandingPayload } | null;
    const payload = parsed?.payload;
    if (!payload || typeof payload !== "object") return null;
    return {
      network_sets: Array.isArray(payload.network_sets) ? payload.network_sets : [],
      show_sets: Array.isArray(payload.show_sets) ? payload.show_sets : [],
      people_profiles: Array.isArray(payload.people_profiles) ? payload.people_profiles : [],
      shared_pipeline: {
        sources: Array.isArray(payload.shared_pipeline?.sources)
          ? payload.shared_pipeline.sources
          : [],
        runs: Array.isArray(payload.shared_pipeline?.runs)
          ? payload.shared_pipeline.runs
          : [],
        review_items: Array.isArray(payload.shared_pipeline?.review_items)
          ? payload.shared_pipeline.review_items
          : [],
      },
      reddit_dashboard: {
        active_community_count:
          typeof payload.reddit_dashboard?.active_community_count === "number"
            ? payload.reddit_dashboard.active_community_count
            : 0,
        archived_community_count:
          typeof payload.reddit_dashboard?.archived_community_count === "number"
            ? payload.reddit_dashboard.archived_community_count
            : 0,
        show_count:
          typeof payload.reddit_dashboard?.show_count === "number"
            ? payload.reddit_dashboard.show_count
            : 0,
      },
    };
  } catch {
    return null;
  }
};

const writeCachedLandingData = (payload: SocialLandingPayload): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SOCIAL_LANDING_CACHE_KEY,
      JSON.stringify({
        cached_at: new Date().toISOString(),
        payload,
      }),
    );
  } catch {
    // Ignore localStorage failures and keep the live response.
  }
};

const HandleChip = ({ handle }: { handle: SocialHandleSummary }) => {
  const className =
    "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50";
  const content = (
    <>
      <span className="text-zinc-500">{formatPlatformLabel(handle.platform)}</span>
      <span className="font-semibold text-zinc-900">{handle.display_label}</span>
    </>
  );

  if (!handle.href) {
    return <span className={className}>{content}</span>;
  }

  if (handle.external) {
    return (
      <a
        href={handle.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={handle.href as Route} className={className}>
      {content}
    </Link>
  );
};

const ShowCard = ({
  show,
  onSaveHandleOverrides,
}: {
  show: ShowProfileSet;
  onSaveHandleOverrides: (show: ShowProfileSet, draft: ShowHandleDraft) => Promise<void>;
}) => {
  const routeSlug = resolvePreferredShowRouteSlug({
    alternativeNames: show.alternative_names,
    canonicalSlug: show.canonical_slug,
    fallback: show.show_name,
  });
  const socialHref = buildShowAdminUrl({
    showSlug: routeSlug,
    tab: "social",
    socialView: "official",
  }) as Route;
  const [editingHandles, setEditingHandles] = useState(false);
  const [savingHandles, setSavingHandles] = useState(false);
  const [handleDraft, setHandleDraft] = useState<ShowHandleDraft>(() =>
    buildShowHandleDraft(show),
  );
  const [handleSaveMessage, setHandleSaveMessage] = useState<string | null>(null);
  const [handleSaveError, setHandleSaveError] = useState<string | null>(null);

  useEffect(() => {
    setHandleDraft(buildShowHandleDraft(show));
  }, [show]);

  const saveHandles = async () => {
    setSavingHandles(true);
    setHandleSaveError(null);
    setHandleSaveMessage(null);
    try {
      await onSaveHandleOverrides(show, handleDraft);
      setHandleSaveMessage("Saved social handle overrides.");
      setEditingHandles(false);
    } catch (error) {
      setHandleSaveError(
        error instanceof Error ? error.message : "Failed to save social handle overrides",
      );
    } finally {
      setSavingHandles(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-zinc-900">{show.show_name}</p>
          {show.fallback_note ? (
            <p className="mt-1 text-sm text-zinc-500">{show.fallback_note}</p>
          ) : (
            <p className="mt-1 text-sm text-zinc-500">
              Direct show profiles and shared-account duplicates where applicable.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingHandles((current) => !current);
              setHandleSaveError(null);
              setHandleSaveMessage(null);
              setHandleDraft(buildShowHandleDraft(show));
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:bg-zinc-100"
          >
            {editingHandles ? "Close Editor" : "Edit Handles"}
          </button>
          <Link
            href={socialHref}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 transition hover:bg-zinc-100"
          >
            Open Analytics
          </Link>
        </div>
      </div>

      {handleSaveError ? (
        <p className="mt-3 text-sm text-red-600">{handleSaveError}</p>
      ) : null}
      {handleSaveMessage ? (
        <p className="mt-3 text-sm text-zinc-500">{handleSaveMessage}</p>
      ) : null}

      {editingHandles ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) => (
              <label key={`${show.show_id}:${platform}`} className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {formatPlatformLabel(platform)}
                </span>
                <input
                  type="text"
                  value={handleDraft[platform]}
                  onChange={(event) =>
                    setHandleDraft((current) => ({
                      ...current,
                      [platform]: event.target.value,
                    }))
                  }
                  placeholder={`No ${formatPlatformLabel(platform)} handle`}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Leave a field blank to remove that stored handle. Saved values update this card immediately and refresh the
            linked profile route in the background.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingHandles(false);
                setHandleDraft(buildShowHandleDraft(show));
                setHandleSaveError(null);
              }}
              disabled={savingHandles}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void saveHandles();
              }}
              disabled={savingHandles}
              className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {savingHandles ? "Saving…" : "Save Handles"}
            </button>
          </div>
        </div>
      ) : show.handles.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {show.handles.map((handle) => (
            <HandleChip
              key={`${show.show_id}:${handle.platform}:${handle.handle}`}
              handle={handle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

const RedditDashboardCard = ({
  summary,
}: {
  summary: RedditDashboardSummary;
}) => {
  const totalCommunities =
    summary.active_community_count + summary.archived_community_count;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={sectionEyebrowClass}>Reddit</p>
          <h2 className="text-lg font-semibold text-zinc-900">REDDIT DASHBOARD</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Open the dedicated Reddit control center to review saved communities
            across shows and jump into existing community workflows.
          </p>
        </div>
        <Link
          href={buildSocialPath("reddit")}
          className="inline-flex rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Open Reddit Dashboard
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Total Communities
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {totalCommunities.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Active
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.active_community_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Archived
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.archived_community_count.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Shows Covered
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">
            {summary.show_count.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
};

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [landing, setLanding] = useState<SocialLandingPayload | null>(null);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sharedActionState, setSharedActionState] = useState<string | null>(null);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;

    let cancelled = false;
    const cachedPayload = readCachedLandingData();
    if (cachedPayload) {
      setLanding(cachedPayload);
      setLoadingLanding(false);
    }
    const load = async () => {
      setLoadingLanding(!cachedPayload);
      if (!cachedPayload) {
        setLoadError(null);
      }
      try {
        const payload = await loadLandingData(user);
        if (cancelled) return;
        setLanding(payload);
        writeCachedLandingData(payload);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        if (!cachedPayload) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load social landing data",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLanding(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  const runSharedIngest = async () => {
    if (!user) return;
    setSharedActionState("Running shared ingest…");
    try {
      const response = await fetchAdminWithAuth(
        "/api/admin/trr-api/social/shared/ingest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_scope: "bravo" }),
        },
        { allowDevAdminBypass: true, preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        run_id?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to start shared ingest");
      }

      setSharedActionState(
        data.message ||
          (data.run_id ? `Queued run ${data.run_id}` : "Shared ingest queued"),
      );

      const payload = await loadLandingData(user);
      setLanding(payload);
    } catch (error) {
      setSharedActionState(
        error instanceof Error
          ? error.message
          : "Failed to start shared ingest",
      );
    }
  };

  const saveShowHandleOverrides = async (
    show: ShowProfileSet,
    draft: ShowHandleDraft,
  ) => {
    if (!user) return;
    const payload = Object.fromEntries(
      EDITABLE_SHOW_SOCIAL_PLATFORMS.map((platform) => [
        SHOW_SOCIAL_HANDLE_FIELD_BY_PLATFORM[platform],
        draft[platform].trim(),
      ]),
    );

    const response = await fetchAdminWithAuth(
      `/api/admin/trr-api/shows/${encodeURIComponent(show.show_id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { allowDevAdminBypass: true, preferredUser: user },
    );
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error || "Failed to save show handle overrides");
    }

    const optimisticShow = applyShowHandleDraft(show, draft);
    setLanding((current) => {
      if (!current) return current;
      const nextPayload: SocialLandingPayload = {
        ...current,
        show_sets: current.show_sets.map((entry) =>
          entry.show_id === show.show_id ? optimisticShow : entry,
        ),
      };
      writeCachedLandingData(nextPayload);
      return nextPayload;
    });

    void loadLandingData(user)
      .then((payload) => {
        setLanding(payload);
        writeCachedLandingData(payload);
      })
      .catch(() => {
        // Keep the optimistic card state if the background refresh fails.
      });
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
            Access Required
          </p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in but do not have permission to view Social Analytics.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const networkSets = landing?.network_sets ?? [];
  const showSets = landing?.show_sets ?? [];
  const peopleProfiles = landing?.people_profiles ?? [];
  const redditDashboard = landing?.reddit_dashboard ?? {
    active_community_count: 0,
    archived_community_count: 0,
    show_count: 0,
  };

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs
                items={buildAdminSectionBreadcrumb("Social Analytics", ADMIN_SOCIAL_PATH)}
                className="mb-1"
              />
              <h1 className="text-3xl font-bold text-zinc-900">
                Social Analytics
              </h1>
              <p className="text-sm text-zinc-500">
                Review network profiles, dedicated show social sets, and cast
                handles already stored in TRR.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {loadingLanding ? (
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500 shadow-sm">
              Loading social landing data…
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              {loadError}
            </div>
          ) : (
            <div className="space-y-6">
              <RedditDashboardCard summary={redditDashboard} />

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>Networks</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      NETWORKS
                    </h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {networkSets.length} set
                    {networkSets.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-4">
                  {networkSets.map((network) => (
                    <div
                      key={network.key}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Profile Set
                          </p>
                          <h3 className="text-lg font-semibold text-zinc-900">
                            {network.title}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {network.description}
                          </p>
                        </div>
                        {network.key === "bravo-tv" ? (
                          <div className="flex flex-col items-start gap-2 sm:items-end">
                            <button
                              type="button"
                              onClick={() => {
                                void runSharedIngest();
                              }}
                              className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                            >
                              Run Shared Ingest
                            </button>
                            {sharedActionState ? (
                              <p className="text-xs text-zinc-500">
                                {sharedActionState}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {network.handles.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {network.handles.map((handle) => (
                            <HandleChip
                              key={`${network.key}:${handle.platform}:${handle.handle}`}
                              handle={handle}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-zinc-500">
                          No linked profiles are configured for this set.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>Shows</p>
                    <h2 className="text-lg font-semibold text-zinc-900">SHOWS</h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {showSets.length} covered
                  </span>
                </div>

                {showSets.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No covered shows found. Add shows in the Shows admin page
                    first.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {showSets.map((show) => (
                      <ShowCard
                        key={show.show_id}
                        show={show}
                        onSaveHandleOverrides={saveShowHandleOverrides}
                      />
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionEyebrowClass}>People</p>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      PEOPLE
                    </h2>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                    {peopleProfiles.length} profiles
                  </span>
                </div>

                {peopleProfiles.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    No cast members with stored social handles were found for the
                    current covered-show set.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {peopleProfiles.map((person) => (
                      <div
                        key={person.person_id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-base font-semibold text-zinc-900">
                              {person.full_name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {person.shows.map((show) => (
                                <span
                                  key={`${person.person_id}:${show.show_id}`}
                                  className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600"
                                >
                                  {show.show_name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {person.handles.map((handle) => (
                              <HandleChip
                                key={`${person.person_id}:${handle.platform}:${handle.handle}`}
                                handle={handle}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}

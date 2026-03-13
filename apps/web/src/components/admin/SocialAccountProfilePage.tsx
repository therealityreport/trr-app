"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import {
  type SocialAccountProfileHashtag,
  type SocialAccountProfileHashtagAssignment,
  type SocialAccountProfilePost,
  type SocialAccountProfileSummary,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
  type SocialAccountProfileCollaboratorTagAggregate,
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
  SOCIAL_ACCOUNT_PROFILE_TAB_LABELS,
} from "@/lib/admin/social-account-profile";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type Props = {
  platform: SocialPlatformSlug;
  handle: string;
  activeTab: SocialAccountProfileTab;
};

type PostsResponse = {
  items: SocialAccountProfilePost[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

type HashtagsResponse = {
  items: SocialAccountProfileHashtag[];
};

type CollaboratorsTagsResponse = {
  collaborators: SocialAccountProfileCollaboratorTagAggregate[];
  tags: SocialAccountProfileCollaboratorTagAggregate[];
};

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");

const formatInteger = (value: number | null | undefined): string => {
  return INTEGER_FORMATTER.format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatSeasonLabel = (seasonNumber?: number | null): string => {
  return seasonNumber ? `Season ${seasonNumber}` : "All seasons";
};

export default function SocialAccountProfilePage({ platform, handle, activeTab }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const [summary, setSummary] = useState<SocialAccountProfileSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostsResponse | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [hashtags, setHashtags] = useState<SocialAccountProfileHashtag[]>([]);
  const [hashtagsLoading, setHashtagsLoading] = useState(false);
  const [hashtagsError, setHashtagsError] = useState<string | null>(null);
  const [savingHashtag, setSavingHashtag] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<Record<string, SocialAccountProfileHashtagAssignment[]>>({});

  const [collaboratorsTags, setCollaboratorsTags] = useState<CollaboratorsTagsResponse | null>(null);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(false);
  const [collaboratorsError, setCollaboratorsError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [platform, handle]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    let cancelled = false;

    const loadSummary = async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfileSummary & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile summary");
        }
        if (cancelled) return;
        setSummary(data);
      } catch (error) {
        if (cancelled) return;
        setSummaryError(error instanceof Error ? error.message : "Failed to load social account profile summary");
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, [checking, handle, hasAccess, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "posts") return;
    let cancelled = false;

    const loadPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/posts?page=${page}&page_size=25`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as PostsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile posts");
        }
        if (cancelled) return;
        setPosts(data);
      } catch (error) {
        if (cancelled) return;
        setPostsError(error instanceof Error ? error.message : "Failed to load social account profile posts");
      } finally {
        if (!cancelled) setPostsLoading(false);
      }
    };

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, [activeTab, checking, handle, hasAccess, page, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "hashtags") return;
    let cancelled = false;

    const loadHashtags = async () => {
      setHashtagsLoading(true);
      setHashtagsError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as HashtagsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile hashtags");
        }
        if (cancelled) return;
        setHashtags(data.items ?? []);
        setDraftAssignments(
          Object.fromEntries(
            (data.items ?? []).map((item) => [item.hashtag, item.assignments?.map((assignment) => ({ ...assignment })) ?? []]),
          ),
        );
      } catch (error) {
        if (cancelled) return;
        setHashtagsError(error instanceof Error ? error.message : "Failed to load social account profile hashtags");
      } finally {
        if (!cancelled) setHashtagsLoading(false);
      }
    };

    void loadHashtags();
    return () => {
      cancelled = true;
    };
  }, [activeTab, checking, handle, hasAccess, platform, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || activeTab !== "collaborators-tags") return;
    let cancelled = false;

    const loadCollaboratorsTags = async () => {
      setCollaboratorsLoading(true);
      setCollaboratorsError(null);
      try {
        const response = await fetchAdminWithAuth(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/collaborators-tags`,
          undefined,
          { preferredUser: user },
        );
        const data = (await response.json().catch(() => ({}))) as CollaboratorsTagsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load social account profile collaborators and tags");
        }
        if (cancelled) return;
        setCollaboratorsTags(data);
      } catch (error) {
        if (cancelled) return;
        setCollaboratorsError(
          error instanceof Error ? error.message : "Failed to load social account profile collaborators and tags",
        );
      } finally {
        if (!cancelled) setCollaboratorsLoading(false);
      }
    };

    void loadCollaboratorsTags();
    return () => {
      cancelled = true;
    };
  }, [activeTab, checking, handle, hasAccess, platform, user]);

  const showOptions = useMemo(() => {
    return [...(summary?.per_show_counts ?? [])]
      .filter((item) => item.show_id && item.show_name)
      .map((item) => ({
        show_id: item.show_id as string,
        show_name: item.show_name as string,
        show_slug: item.show_slug ?? null,
      }));
  }, [summary?.per_show_counts]);

  const seasonOptionsByShow = useMemo(() => {
    const next = new Map<string, Array<{ season_id: string; season_number: number | null }>>();
    for (const season of summary?.per_season_counts ?? []) {
      if (!season.show_id || !season.season_id) continue;
      const existing = next.get(season.show_id) ?? [];
      existing.push({
        season_id: season.season_id,
        season_number: season.season_number ?? null,
      });
      existing.sort((a, b) => Number(a.season_number ?? 0) - Number(b.season_number ?? 0));
      next.set(season.show_id, existing);
    }
    return next;
  }, [summary?.per_season_counts]);

  const updateHashtagAssignments = (hashtag: string, nextAssignments: SocialAccountProfileHashtagAssignment[]) => {
    setDraftAssignments((current) => ({ ...current, [hashtag]: nextAssignments }));
    setSaveMessage(null);
  };

  const addHashtagAssignmentRow = (hashtag: string) => {
    const fallbackShow = showOptions[0];
    if (!fallbackShow) return;
    const nextAssignments = [...(draftAssignments[hashtag] ?? []), { show_id: fallbackShow.show_id, season_id: null }];
    updateHashtagAssignments(hashtag, nextAssignments);
  };

  const saveHashtagAssignments = async (hashtag: string) => {
    if (!user) return;
    const assignments = (draftAssignments[hashtag] ?? [])
      .filter((assignment) => assignment.show_id)
      .map((assignment) => ({
        show_id: assignment.show_id,
        season_id: assignment.season_id ?? null,
      }));

    setSavingHashtag(hashtag);
    setSaveMessage(null);
    try {
      const response = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/hashtags`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hashtags: [{ hashtag, assignments }] }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as HashtagsResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to save hashtag assignments");
      }
      setHashtags(data.items ?? hashtags);
      setDraftAssignments((current) => ({
        ...current,
        [hashtag]: (data.items ?? []).find((item) => item.hashtag === hashtag)?.assignments ?? assignments,
      }));
      setSaveMessage(`Saved assignments for #${hashtag}`);

      const summaryResponse = await fetchAdminWithAuth(
        `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/summary`,
        undefined,
        { preferredUser: user },
      );
      if (summaryResponse.ok) {
        const summaryData = (await summaryResponse.json().catch(() => null)) as SocialAccountProfileSummary | null;
        if (summaryData) setSummary(summaryData);
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save hashtag assignments");
    } finally {
      setSavingHashtag(null);
    }
  };

  const headerTitle = `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} · @${handle}`;
  const breadcrumbs = [
    ...buildAdminSectionBreadcrumb("Social Analytics", "/admin/social-media"),
    { label: `${SOCIAL_ACCOUNT_PLATFORM_LABELS[platform]} @${handle}`, href: buildSocialAccountProfileUrl({ platform, handle }) },
  ];

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-500">Loading admin access…</div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Access Required</p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">You do not have permission to view social account profiles.</p>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <AdminBreadcrumbs items={breadcrumbs} className="mb-2" />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                    Official Social Profile
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    All shows / all seasons
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold text-zinc-900">{headerTitle}</h1>
                <p className="mt-2 max-w-2xl text-sm text-zinc-500">
                  Cross-show account view for materialized posts, hashtags, collaborators, and tags.
                </p>
                {summary?.profile_url ? (
                  <a
                    href={summary.profile_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Open public profile
                  </a>
                ) : null}
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Posts</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.total_posts)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Engagement</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.total_engagement)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Views</p>
                  <p className="mt-2 text-2xl font-bold text-zinc-900">{formatInteger(summary?.total_views)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last Post</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDateTime(summary?.last_post_at)}</p>
                </div>
              </div>
            </div>

            <nav className="mt-6 flex flex-wrap gap-2" aria-label="Social account profile tabs">
              {(Object.keys(SOCIAL_ACCOUNT_PROFILE_TAB_LABELS) as SocialAccountProfileTab[]).map((tab) => {
                const isActive = tab === activeTab;
                return (
                  <Link
                    key={tab}
                    href={buildSocialAccountProfileUrl({ platform, handle, tab }) as Route}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {SOCIAL_ACCOUNT_PROFILE_TAB_LABELS[tab]}
                  </Link>
                );
              })}
            </nav>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {summaryLoading ? <div className="text-sm text-zinc-500">Loading account summary…</div> : null}
          {summaryError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{summaryError}</div>
          ) : null}

          {!summaryLoading && !summaryError && activeTab === "stats" ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-zinc-900">Distribution</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Shows</p>
                    <div className="mt-3 space-y-2">
                      {(summary?.per_show_counts ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-500">No show assignments yet.</p>
                      ) : (
                        (summary?.per_show_counts ?? []).map((item) => (
                          <div key={item.show_id ?? item.show_name} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                            <p className="font-semibold text-zinc-900">{item.show_name ?? "Unassigned show"}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatInteger(item.post_count)} posts · {formatInteger(item.engagement)} engagement
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Seasons</p>
                    <div className="mt-3 space-y-2">
                      {(summary?.per_season_counts ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-500">No season assignments yet.</p>
                      ) : (
                        (summary?.per_season_counts ?? []).map((item) => (
                          <div
                            key={item.season_id ?? `${item.show_id}-${item.season_number}`}
                            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3"
                          >
                            <p className="font-semibold text-zinc-900">
                              {item.show_name ?? "Unknown show"} · {formatSeasonLabel(item.season_number)}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {formatInteger(item.post_count)} posts · {formatInteger(item.engagement)} engagement
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Top Hashtags</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.top_hashtags ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No hashtags found yet.</p>
                    ) : (
                      (summary?.top_hashtags ?? []).map((item) => (
                        <div key={item.hashtag} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                          <div>
                            <p className="font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                            <p className="text-xs text-zinc-500">{item.assignments?.length ?? 0} assignments</p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-700">{formatInteger(item.usage_count)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-zinc-900">Source Status</h2>
                  <div className="mt-4 space-y-2">
                    {(summary?.source_status ?? []).length === 0 ? (
                      <p className="text-sm text-zinc-500">No shared-source metadata was found for this handle.</p>
                    ) : (
                      (summary?.source_status ?? []).map((item, index) => (
                        <div key={`${String(item.id ?? index)}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm">
                          <p className="font-semibold text-zinc-900">{String(item.source_scope ?? "bravo")}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Scrape {String(item.last_scrape_status ?? "Not run")} · Last scrape {formatDateTime(String(item.last_scrape_at ?? ""))}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {!summaryLoading && !summaryError && activeTab === "posts" ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Posts</h2>
                  <p className="text-sm text-zinc-500">All materialized posts for @{handle} across every show and season.</p>
                </div>
                <div className="text-sm text-zinc-500">
                  Page {posts?.pagination.page ?? page} of {posts?.pagination.total_pages ?? 1}
                </div>
              </div>
              {postsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading posts…</p> : null}
              {postsError ? <p className="mt-4 text-sm text-red-700">{postsError}</p> : null}
              {!postsLoading && !postsError ? (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-zinc-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                          <th className="pb-3 pr-4">Post</th>
                          <th className="pb-3 pr-4">Show</th>
                          <th className="pb-3 pr-4">Season</th>
                          <th className="pb-3 pr-4">Metrics</th>
                          <th className="pb-3">Published</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {(posts?.items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-sm text-zinc-500">
                              No posts found for this account.
                            </td>
                          </tr>
                        ) : (
                          (posts?.items ?? []).map((item) => (
                            <tr key={item.id}>
                              <td className="py-4 pr-4 align-top">
                                <div className="max-w-xl">
                                  <p className="font-semibold text-zinc-900">{item.title || item.excerpt || "Untitled post"}</p>
                                  {item.url ? (
                                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                      Open post
                                    </a>
                                  ) : null}
                                  {item.content ? <p className="mt-2 text-xs leading-5 text-zinc-600">{item.content}</p> : null}
                                </div>
                              </td>
                              <td className="py-4 pr-4 align-top text-zinc-700">{item.show_name ?? "Unassigned"}</td>
                              <td className="py-4 pr-4 align-top text-zinc-700">{formatSeasonLabel(item.season_number)}</td>
                              <td className="py-4 pr-4 align-top text-zinc-700">
                                <div className="space-y-1 text-xs">
                                  <div>{formatInteger(item.metrics.engagement)} engagement</div>
                                  <div>{formatInteger(item.metrics.views)} views</div>
                                  <div>{formatInteger(item.metrics.comments_count)} comments</div>
                                </div>
                              </td>
                              <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(item.posted_at)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || postsLoading}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((current) => current + 1)}
                      disabled={Boolean(posts && page >= posts.pagination.total_pages) || postsLoading}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {!summaryLoading && !summaryError && activeTab === "hashtags" ? (
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">Hashtags</h2>
                <p className="text-sm text-zinc-500">
                  Each hashtag shows current assignments plus show/season contexts observed on this account’s posts.
                </p>
                {saveMessage ? <p className="text-sm text-zinc-600">{saveMessage}</p> : null}
              </div>
              {hashtagsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading hashtags…</p> : null}
              {hashtagsError ? <p className="mt-4 text-sm text-red-700">{hashtagsError}</p> : null}
              {!hashtagsLoading && !hashtagsError ? (
                <div className="mt-4 space-y-4">
                  {hashtags.length === 0 ? (
                    <p className="text-sm text-zinc-500">No hashtags found for this account.</p>
                  ) : (
                    hashtags.map((item) => {
                      const assignments = draftAssignments[item.hashtag] ?? [];
                      return (
                        <div key={item.hashtag} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-lg font-semibold text-zinc-900">{item.display_hashtag ?? `#${item.hashtag}`}</p>
                              <p className="text-xs text-zinc-500">
                                {formatInteger(item.usage_count)} uses · Last seen {formatDateTime(item.latest_seen_at)}
                              </p>
                              <p className="mt-2 text-xs text-zinc-500">
                                Observed on {(item.observed_shows ?? []).map((show) => show.show_name).filter(Boolean).join(", ") || "no assigned shows yet"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => addHashtagAssignmentRow(item.hashtag)}
                                disabled={showOptions.length === 0}
                                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Add Assignment
                              </button>
                              <button
                                type="button"
                                onClick={() => void saveHashtagAssignments(item.hashtag)}
                                disabled={savingHashtag === item.hashtag}
                                className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {savingHashtag === item.hashtag ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            {assignments.length === 0 ? (
                              <p className="text-sm text-zinc-500">No assignments saved for this hashtag yet.</p>
                            ) : (
                              assignments.map((assignment, index) => {
                                const selectedShowId = assignment.show_id ?? showOptions[0]?.show_id ?? "";
                                const seasonOptions = seasonOptionsByShow.get(selectedShowId) ?? [];
                                return (
                                  <div key={`${item.hashtag}-${assignment.show_id ?? "show"}-${assignment.season_id ?? "all"}-${index}`} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 lg:grid-cols-[1fr_1fr_auto]">
                                    <label className="text-sm font-medium text-zinc-700">
                                      Show
                                      <select
                                        value={selectedShowId}
                                        onChange={(event) => {
                                          const nextShowId = event.target.value;
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.map((entry, entryIndex) =>
                                              entryIndex === index ? { ...entry, show_id: nextShowId, season_id: null } : entry,
                                            ),
                                          );
                                        }}
                                        className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                      >
                                        {showOptions.map((show) => (
                                          <option key={show.show_id} value={show.show_id}>
                                            {show.show_name}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="text-sm font-medium text-zinc-700">
                                      Season
                                      <select
                                        value={assignment.season_id ?? ""}
                                        onChange={(event) => {
                                          const nextSeasonId = event.target.value || null;
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.map((entry, entryIndex) =>
                                              entryIndex === index ? { ...entry, season_id: nextSeasonId } : entry,
                                            ),
                                          );
                                        }}
                                        className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                                      >
                                        <option value="">All seasons</option>
                                        {seasonOptions.map((season) => (
                                          <option key={season.season_id} value={season.season_id}>
                                            {formatSeasonLabel(season.season_number)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    <div className="flex items-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateHashtagAssignments(
                                            item.hashtag,
                                            assignments.filter((_, entryIndex) => entryIndex !== index),
                                          )
                                        }
                                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          {!summaryLoading && !summaryError && activeTab === "collaborators-tags" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {(["collaborators", "tags"] as const).map((kind) => {
                const items = collaboratorsTags?.[kind] ?? [];
                return (
                  <section key={kind} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {kind === "collaborators" ? "Collaborators" : "Tagged Accounts"}
                    </h2>
                    {collaboratorsLoading ? <p className="mt-4 text-sm text-zinc-500">Loading…</p> : null}
                    {collaboratorsError ? <p className="mt-4 text-sm text-red-700">{collaboratorsError}</p> : null}
                    {!collaboratorsLoading && !collaboratorsError ? (
                      <div className="mt-4 space-y-3">
                        {items.length === 0 ? (
                          <p className="text-sm text-zinc-500">
                            {kind === "collaborators" ? "No collaborator data is available for this platform yet." : "No tagged accounts were found for this profile."}
                          </p>
                        ) : (
                          items.map((item) => (
                            <div key={`${kind}-${item.handle}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-zinc-900">@{item.handle}</p>
                                  <p className="text-xs text-zinc-500">
                                    {formatInteger(item.usage_count)} mentions across {formatInteger(item.post_count)} posts
                                  </p>
                                </div>
                                {item.profile_url ? (
                                  <a
                                    href={item.profile_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    Open
                                  </a>
                                ) : null}
                              </div>
                              <p className="mt-2 text-xs text-zinc-500">
                                {(item.shows ?? []).map((show) => show.show_name).filter(Boolean).join(", ") || "No mapped show context"}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : null}
        </main>
      </div>
    </ClientOnly>
  );
}

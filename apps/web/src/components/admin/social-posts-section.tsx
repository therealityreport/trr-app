"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getClientAuthHeaders } from "@/lib/admin/client-auth";

// ============================================================================
// Types
// ============================================================================

type SocialPlatform =
  | "reddit"
  | "twitter"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "other";

interface SocialPost {
  id: string;
  trr_show_id: string;
  trr_season_id: string | null;
  platform: SocialPlatform;
  url: string;
  title: string | null;
  notes: string | null;
  created_by_firebase_uid: string;
  created_at: string;
  updated_at: string;
}

interface SocialPostsSectionProps {
  showId: string;
  showName: string;
  seasonId?: string | null;
}

// ============================================================================
// Platform Config
// ============================================================================

const PLATFORMS: { id: SocialPlatform; label: string; color: string; icon: string }[] = [
  { id: "reddit", label: "Reddit", color: "bg-orange-100 text-orange-700", icon: "R" },
  { id: "twitter", label: "Twitter/X", color: "bg-blue-100 text-blue-700", icon: "X" },
  { id: "instagram", label: "Instagram", color: "bg-pink-100 text-pink-700", icon: "IG" },
  { id: "tiktok", label: "TikTok", color: "bg-gray-900 text-white", icon: "TT" },
  { id: "youtube", label: "YouTube", color: "bg-red-100 text-red-700", icon: "YT" },
  { id: "other", label: "Other", color: "bg-zinc-100 text-zinc-700", icon: "?" },
];

const VALID_PLATFORMS = new Set<SocialPlatform>(PLATFORMS.map((platform) => platform.id));

const getPlatformConfig = (platform: SocialPlatform) =>
  PLATFORMS.find((entry) => entry.id === platform) ?? PLATFORMS[PLATFORMS.length - 1];

const normalizeOptionalText = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toValidHttpUrl = (rawValue: string): string | null => {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

const formatDate = (value: string): string => {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "Unknown date";
  return parsedDate.toLocaleDateString();
};

const sortPostsDescending = (posts: SocialPost[]): SocialPost[] => {
  return [...posts].sort((a, b) => {
    const aUpdated = Date.parse(a.updated_at);
    const bUpdated = Date.parse(b.updated_at);
    const aCreated = Date.parse(a.created_at);
    const bCreated = Date.parse(b.created_at);

    if (!Number.isNaN(aUpdated) || !Number.isNaN(bUpdated)) {
      const aTimestamp = Number.isNaN(aUpdated) ? Number.NEGATIVE_INFINITY : aUpdated;
      const bTimestamp = Number.isNaN(bUpdated) ? Number.NEGATIVE_INFINITY : bUpdated;
      if (aTimestamp !== bTimestamp) {
        return bTimestamp - aTimestamp;
      }
    }

    if (!Number.isNaN(aCreated) || !Number.isNaN(bCreated)) {
      const aTimestamp = Number.isNaN(aCreated) ? Number.NEGATIVE_INFINITY : aCreated;
      const bTimestamp = Number.isNaN(bCreated) ? Number.NEGATIVE_INFINITY : bCreated;
      if (aTimestamp !== bTimestamp) {
        return bTimestamp - aTimestamp;
      }
    }

    return a.id.localeCompare(b.id);
  });
};

const isSocialPost = (value: unknown): value is SocialPost => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SocialPost>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.trr_show_id === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.created_by_firebase_uid === "string" &&
    typeof candidate.created_at === "string" &&
    typeof candidate.updated_at === "string" &&
    (candidate.trr_season_id === null || typeof candidate.trr_season_id === "string") &&
    (candidate.title === null || typeof candidate.title === "string") &&
    (candidate.notes === null || typeof candidate.notes === "string") &&
    typeof candidate.platform === "string" &&
    VALID_PLATFORMS.has(candidate.platform as SocialPlatform)
  );
};

const buildPostsEndpoint = (showId: string, seasonId?: string | null): string => {
  const query = new URLSearchParams();
  if (seasonId) {
    query.set("trr_season_id", seasonId);
  }
  const suffix = query.toString();
  return `/api/admin/trr-api/shows/${showId}/social-posts${suffix ? `?${suffix}` : ""}`;
};

// ============================================================================
// Component
// ============================================================================

export default function SocialPostsSection({
  showId,
  showName,
  seasonId,
}: SocialPostsSectionProps) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Form state
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>("reddit");
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mountedRef = useRef(false);
  const fetchRequestIdRef = useRef(0);

  const normalizedFormUrl = useMemo(() => formUrl.trim(), [formUrl]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(
    async () => getClientAuthHeaders({ allowDevAdminBypass: true }),
    [],
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormPlatform("reddit");
    setFormUrl("");
    setFormTitle("");
    setFormNotes("");
    setEditingPost(null);
    setShowForm(false);
  }, []);

  const fetchPosts = useCallback(
    async ({ mode = "background" }: { mode?: "initial" | "background" } = {}) => {
      const requestId = ++fetchRequestIdRef.current;
      if (mode === "initial") {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(buildPostsEndpoint(showId, seasonId), { headers });
        const payload = (await response.json().catch(() => ({}))) as {
          posts?: unknown;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Failed to fetch posts");
        }

        if (!mountedRef.current || requestId !== fetchRequestIdRef.current) {
          return;
        }

        const normalizedPosts = Array.isArray(payload.posts)
          ? payload.posts.filter(isSocialPost).map((post) => ({
              ...post,
              title: normalizeOptionalText(post.title ?? ""),
              notes: normalizeOptionalText(post.notes ?? ""),
            }))
          : [];

        setPosts(sortPostsDescending(normalizedPosts));
      } catch (err) {
        if (!mountedRef.current || requestId !== fetchRequestIdRef.current) {
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        if (!mountedRef.current || requestId !== fetchRequestIdRef.current) {
          return;
        }
        if (mode === "initial") {
          setLoading(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [getAuthHeaders, seasonId, showId],
  );

  // Fetch posts
  useEffect(() => {
    void fetchPosts({ mode: "initial" });
  }, [fetchPosts]);

  // Start editing
  const startEdit = useCallback((post: SocialPost) => {
    setError(null);
    setSuccessMessage(null);
    setEditingPost(post);
    setFormPlatform(post.platform);
    setFormUrl(post.url);
    setFormTitle(post.title ?? "");
    setFormNotes(post.notes ?? "");
    setShowForm(true);
  }, []);

  // Submit form (create or update)
  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const normalizedUrl = toValidHttpUrl(formUrl);
    if (!normalizedUrl) {
      setError("URL must start with http:// or https:// and be valid.");
      return;
    }

    const normalizedTitle = normalizeOptionalText(formTitle);
    const normalizedNotes = normalizeOptionalText(formNotes);

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const authHeaders = await getAuthHeaders();
      if (editingPost) {
        // Update existing
        const response = await fetch(`/api/admin/social-posts/${editingPost.id}`, {
          method: "PUT",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            url: normalizedUrl,
            title: normalizedTitle,
            notes: normalizedNotes,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to update post");
        }
        setSuccessMessage("Post updated.");
      } else {
        // Create new
        const response = await fetch(`/api/admin/trr-api/shows/${showId}/social-posts`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            url: normalizedUrl,
            trr_season_id: seasonId ?? null,
            title: normalizedTitle,
            notes: normalizedNotes,
          }),
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to create post");
        }
        setSuccessMessage("Post created.");
      }

      resetForm();
      await fetchPosts({ mode: "background" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  }, [editingPost, fetchPosts, formNotes, formPlatform, formTitle, formUrl, getAuthHeaders, resetForm, seasonId, showId, submitting]);

  // Delete post
  const handleDelete = useCallback(
    async (post: SocialPost) => {
      if (deletingPostId || submitting) return;

      const confirmationMessage = post.title
        ? `Are you sure you want to delete "${post.title}"?`
        : "Are you sure you want to delete this post?";
      if (!window.confirm(confirmationMessage)) return;

      setDeletingPostId(post.id);
      setError(null);
      setSuccessMessage(null);

      try {
        const authHeaders = await getAuthHeaders();
        const response = await fetch(`/api/admin/social-posts/${post.id}`, {
          method: "DELETE",
          headers: authHeaders,
        });
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(data.error || "Failed to delete post");
        }
        setSuccessMessage("Post deleted.");
        await fetchPosts({ mode: "background" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete post");
      } finally {
        if (mountedRef.current) {
          setDeletingPostId(null);
        }
      }
    },
    [deletingPostId, fetchPosts, getAuthHeaders, submitting],
  );

  // Render loading state
  if (loading && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
        <p className="text-sm text-zinc-600">Loading social posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
            Social Media
          </p>
          <h3 className="text-xl font-bold text-zinc-900">{showName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void fetchPosts({ mode: "background" });
            }}
            disabled={refreshing || submitting || Boolean(deletingPostId)}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccessMessage(null);
              resetForm();
              setShowForm(true);
            }}
            disabled={submitting || Boolean(deletingPostId)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add Post
          </button>
        </div>
      </div>

      {/* Status */}
      {successMessage && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">{successMessage}</p>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="mt-2 text-xs font-semibold text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h4 className="mb-4 text-lg font-semibold text-zinc-900">
            {editingPost ? "Edit Post" : "Add New Post"}
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Platform */}
            <div>
              <label htmlFor="social-post-platform" className="mb-1 block text-sm font-semibold text-zinc-700">
                Platform
              </label>
              <select
                id="social-post-platform"
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value as SocialPlatform)}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
              >
                {PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.label}
                  </option>
                ))}
              </select>
            </div>

            {/* URL */}
            <div>
              <label htmlFor="social-post-url" className="mb-1 block text-sm font-semibold text-zinc-700">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                id="social-post-url"
                type="url"
                inputMode="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://reddit.com/r/..."
                required
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
              <p className="mt-1 text-xs text-zinc-500">Only `http://` and `https://` links are accepted.</p>
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label htmlFor="social-post-title" className="mb-1 block text-sm font-semibold text-zinc-700">
                Title (optional)
              </label>
              <input
                id="social-post-title"
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="E.g., S6 E5 Post-Episode Discussion"
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="social-post-notes" className="mb-1 block text-sm font-semibold text-zinc-700">
                Notes (optional)
              </label>
              <textarea
                id="social-post-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={2}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting || normalizedFormUrl.length === 0}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingPost ? "Update Post" : "Add Post"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Posts List */}
      {posts.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-500">
              {posts.length} post{posts.length !== 1 ? "s" : ""}
            </span>
            {refreshing && <span className="text-xs font-medium text-zinc-500">Refreshing list...</span>}
          </div>
          <div className="space-y-3">
            {posts.map((post) => {
              const platform = getPlatformConfig(post.platform);
              const safeHref = toValidHttpUrl(post.url);
              const isDeleting = deletingPostId === post.id;
              return (
                <div
                  key={post.id}
                  data-testid="social-post-row"
                  data-post-id={post.id}
                  className="flex items-start gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"
                >
                  {/* Platform Badge */}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${platform.color}`}
                    aria-hidden="true"
                  >
                    {platform.icon}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                          {platform.label}
                        </p>
                        {post.title ? (
                          <p className="font-semibold text-zinc-900">{post.title}</p>
                        ) : (
                          <p className="max-w-md truncate font-semibold text-zinc-900">
                            {post.url}
                          </p>
                        )}
                      </div>
                    </div>

                    {post.title && safeHref && (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block max-w-lg truncate text-sm text-blue-600 hover:underline"
                      >
                        {post.url}
                      </a>
                    )}

                    {post.title && !safeHref && (
                      <p className="mt-1 block max-w-lg truncate text-sm text-zinc-500">
                        Unsupported URL scheme
                      </p>
                    )}

                    {post.notes && (
                      <p className="mt-2 text-sm text-zinc-600">{post.notes}</p>
                    )}

                    <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                      <span>
                        Added {formatDate(post.created_at)}
                      </span>
                      <span>
                        Updated {formatDate(post.updated_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {safeHref ? (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        Open
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-400"
                        title="Unsupported URL"
                      >
                        Open
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      disabled={submitting || Boolean(deletingPostId)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDelete(post);
                      }}
                      disabled={submitting || Boolean(deletingPostId)}
                      aria-busy={isDeleting}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-200">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-zinc-500"
            >
              <path
                d="M4 12h16M4 6h16M4 18h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">No Social Posts Yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Add Reddit threads, Twitter posts, and other social media links for this show.
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccessMessage(null);
              setShowForm(true);
            }}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Add First Post
          </button>
        </div>
      ) : null}
    </div>
  );
}

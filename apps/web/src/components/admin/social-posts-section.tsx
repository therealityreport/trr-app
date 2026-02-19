"use client";

import { useState, useEffect, useCallback } from "react";
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

const getPlatformConfig = (platform: SocialPlatform) =>
  PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[PLATFORMS.length - 1];

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
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  // Form state
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>("reddit");
  const [formUrl, setFormUrl] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const url = new URL(`/api/admin/trr-api/shows/${showId}/social-posts`, window.location.origin);
      if (seasonId) {
        url.searchParams.set("trr_season_id", seasonId);
      }
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPosts(data.posts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [showId, seasonId, getAuthHeaders]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Reset form
  const resetForm = () => {
    setFormPlatform("reddit");
    setFormUrl("");
    setFormTitle("");
    setFormNotes("");
    setEditingPost(null);
    setShowForm(false);
  };

  // Start editing
  const startEdit = (post: SocialPost) => {
    setEditingPost(post);
    setFormPlatform(post.platform);
    setFormUrl(post.url);
    setFormTitle(post.title ?? "");
    setFormNotes(post.notes ?? "");
    setShowForm(true);
  };

  // Submit form (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const authHeaders = await getAuthHeaders();
      if (editingPost) {
        // Update existing
        const response = await fetch(`/api/admin/social-posts/${editingPost.id}`, {
          method: "PUT",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            url: formUrl,
            title: formTitle || null,
            notes: formNotes || null,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update post");
        }
      } else {
        // Create new
        const response = await fetch(`/api/admin/trr-api/shows/${showId}/social-posts`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: formPlatform,
            url: formUrl,
            trr_season_id: seasonId ?? null,
            title: formTitle || null,
            notes: formNotes || null,
          }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to create post");
        }
      }

      resetForm();
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete post
  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`/api/admin/social-posts/${postId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete post");
      }
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

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
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Add Post
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
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
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Platform
              </label>
              <select
                value={formPlatform}
                onChange={(e) => setFormPlatform(e.target.value as SocialPlatform)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
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
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://reddit.com/r/..."
                required
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Title */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Title (optional)
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="E.g., S6 E5 Post-Episode Discussion"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                Notes (optional)
              </label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any additional context..."
                rows={2}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={submitting || !formUrl}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingPost ? "Update Post" : "Add Post"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
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
          </div>
          <div className="space-y-3">
            {posts.map((post) => {
              const platform = getPlatformConfig(post.platform);
              return (
                <div
                  key={post.id}
                  className="flex items-start gap-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4"
                >
                  {/* Platform Badge */}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${platform.color}`}
                  >
                    {platform.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-zinc-500">
                          {platform.label}
                        </p>
                        {post.title ? (
                          <p className="font-semibold text-zinc-900">{post.title}</p>
                        ) : (
                          <p className="font-semibold text-zinc-900 truncate max-w-md">
                            {post.url}
                          </p>
                        )}
                      </div>
                    </div>

                    {post.title && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm text-blue-600 hover:underline truncate max-w-lg"
                      >
                        {post.url}
                      </a>
                    )}

                    {post.notes && (
                      <p className="mt-2 text-sm text-zinc-600">{post.notes}</p>
                    )}

                    <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                      <span>
                        Added {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => startEdit(post)}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-zinc-200 flex items-center justify-center">
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
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Add First Post
          </button>
        </div>
      ) : null}
    </div>
  );
}

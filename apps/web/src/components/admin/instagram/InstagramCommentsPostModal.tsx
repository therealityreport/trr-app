"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminModal from "@/components/admin/AdminModal";
import {
  readInstagramCommentsErrorMessage,
  type InstagramCommentsProxyErrorPayload,
} from "@/components/admin/instagram/comments-scrape-error";
import type {
  SocialAccountProfileComment,
  SocialAccountProfileCommentsResponse,
  SocialAccountProfilePost,
  SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { SOCIAL_ACCOUNT_PLATFORM_LABELS } from "@/lib/admin/social-account-profile";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  platform: SocialPlatformSlug;
  handle: string;
  post: SocialAccountProfilePost | null;
  fetchAdmin: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  refreshKey?: number;
};

type ProxyErrorPayload = InstagramCommentsProxyErrorPayload & {
  code?: string;
  retryable?: boolean;
  retry_after_seconds?: number;
};

const formatInteger = (value: number | null | undefined): string => {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getCaptionPreview = (post: SocialAccountProfilePost | null): string => {
  const text = String(post?.content || post?.excerpt || post?.title || "").trim();
  return text || "No caption saved for this post.";
};

const getModalTitle = (platform: SocialPlatformSlug, post: SocialAccountProfilePost | null): string => {
  const sourceId = String(post?.source_id || "").trim();
  const prefix = platform === "instagram" ? "Comments" : "Discussion";
  return sourceId ? `${prefix} for ${sourceId}` : `Post ${prefix}`;
};

const readRecordString = (value: Record<string, unknown> | null | undefined, key: string): string | null => {
  const field = value?.[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
};

const getCommentDisplayName = (item: SocialAccountProfileComment): string => {
  return (
    item.display_name ||
    item.author_full_name ||
    readRecordString(item.owner, "display_name") ||
    readRecordString(item.user, "display_name") ||
    item.ownerUsername ||
    item.username ||
    "Unknown"
  );
};

const getCommentUsername = (item: SocialAccountProfileComment): string | null => {
  return (
    item.ownerUsername ||
    item.username ||
    readRecordString(item.owner, "username") ||
    readRecordString(item.user, "username")
  );
};

const getCommentAvatarUrl = (item: SocialAccountProfileComment): string | null => {
  return (
    item.hosted_author_profile_pic_url ||
    item.ownerProfilePicUrl ||
    item.author_profile_pic_url ||
    readRecordString(item.owner, "avatar_url") ||
    readRecordString(item.user, "avatar_url") ||
    null
  );
};

const getCommentLikes = (item: SocialAccountProfileComment): number | null | undefined =>
  item.likes_count ?? item.likesCount ?? item.likes;

const getCommentReplies = (item: SocialAccountProfileComment): number =>
  Number(item.replies_count ?? item.repliesCount ?? item.reply_count ?? item.replies?.length ?? 0) || 0;

const getCommentCreatedAt = (item: SocialAccountProfileComment): string | null | undefined =>
  item.timestamp ?? item.created_at;

export default function InstagramCommentsPostModal({
  isOpen,
  onClose,
  platform,
  handle,
  post,
  fetchAdmin,
  refreshKey = 0,
}: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [comments, setComments] = useState<SocialAccountProfileCommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    setPage(1);
  }, [isOpen, post?.source_id]);

  useEffect(() => {
    if (!isOpen || !post?.source_id) {
      setComments(null);
      setCommentsLoading(false);
      setCommentsError(null);
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      post_source_id: post.source_id,
      page: String(page),
      page_size: "25",
    });

    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentsError(null);
      try {
        const response = await fetchAdmin(
          `/api/admin/trr-api/social/profiles/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/comments?${query.toString()}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => ({}))) as SocialAccountProfileCommentsResponse & ProxyErrorPayload;
        if (!response.ok) {
          throw new Error(readInstagramCommentsErrorMessage(data, "Failed to load post comments"));
        }
        if (controller.signal.aborted) return;
        setComments(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setCommentsError(error instanceof Error ? error.message : "Failed to load post comments");
      } finally {
        if (!controller.signal.aborted) {
          setCommentsLoading(false);
        }
      }
    };

    void loadComments();
    return () => controller.abort();
  }, [fetchAdmin, handle, isOpen, page, platform, post?.source_id, refreshKey]);

  const dialogTitle = useMemo(() => getModalTitle(platform, post), [platform, post]);
  const captionPreview = useMemo(() => getCaptionPreview(post), [post]);
  const items = comments?.items ?? [];
  const currentPage = comments?.pagination.page ?? page;
  const totalPages = comments?.pagination.total_pages ?? 1;
  const platformLabel = SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] ?? platform;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      ariaLabel={dialogTitle}
      initialFocusRef={closeButtonRef}
      panelClassName="max-h-[90vh] max-w-5xl overflow-y-auto p-0"
      preserveScrollPosition
    >
      <div className="flex min-h-0 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              <span>{platformLabel}</span>
              <span>{post?.source_id || "Unknown post"}</span>
              <span>{formatDateTime(post?.posted_at)}</span>
              <span>{formatInteger(post?.saved_comments)} saved</span>
            </div>
            <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700">{captionPreview}</p>
            {post?.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Post
              </a>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.14em] text-zinc-500">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Comment</th>
                  <th className="pb-3 pr-4">Likes</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {commentsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-zinc-500">
                      Loading post comments...
                    </td>
                  </tr>
                ) : commentsError ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-red-700">
                      {commentsError}
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-sm text-zinc-500">
                      No saved comments for this post yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item: SocialAccountProfileComment) => {
                    const displayName = getCommentDisplayName(item);
                    const username = getCommentUsername(item);
                    const avatarUrl = getCommentAvatarUrl(item);
                    const repliesCount = getCommentReplies(item);
                    return (
                      <tr key={item.id}>
                        <td className="py-4 pr-4 align-top text-zinc-700">
                          <div className="flex items-start gap-3">
                            {avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full border border-zinc-200 object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold uppercase text-zinc-500">
                                {displayName.slice(0, 1)}
                              </div>
                            )}
                            <div className="space-y-1">
                              <p>{displayName}</p>
                              {username ? <p className="text-xs text-zinc-500">@{username.replace(/^@/, "")}</p> : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 align-top text-zinc-700">
                          <div className="max-w-2xl">
                            <p className="whitespace-pre-wrap break-words leading-5 text-zinc-700">{item.text || "No text"}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                              {item.discussion_type ? (
                                <p>{item.discussion_type.replace(/_/g, " ")}</p>
                              ) : item.is_reply ? (
                                <p>reply</p>
                              ) : null}
                              {repliesCount > 0 ? <p>{formatInteger(repliesCount)} replies</p> : null}
                              {([...(item.hosted_media_urls ?? []), ...(item.media_urls ?? [])].filter(Boolean) as string[]).length > 0 ? (
                                <p>
                                  {formatInteger(
                                    ([...(item.hosted_media_urls ?? []), ...(item.media_urls ?? [])].filter(Boolean) as string[])
                                      .length,
                                  )}{" "}
                                  media
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 align-top text-zinc-700">{formatInteger(getCommentLikes(item))}</td>
                        <td className="py-4 align-top text-xs text-zinc-500">{formatDateTime(getCommentCreatedAt(item))}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={currentPage <= 1 || commentsLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <div className="text-sm text-zinc-500">
              Page {currentPage} of {totalPages}
            </div>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={commentsLoading || currentPage >= totalPages}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

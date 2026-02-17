"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Comment {
  comment_id: string;
  author: string;
  text: string;
  likes: number;
  is_reply: boolean;
  reply_count: number;
  created_at: string | null;
}

interface ThreadedComment extends Comment {
  replies: ThreadedComment[];
}

interface BasePost {
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  engagement: number;
  total_comments_available: number;
  comments: Comment[];
}

interface InstagramPost extends BasePost {
  likes: number;
  comments_count: number;
  views: number;
  media_type?: string | null;
  media_urls?: string[] | null;
  thumbnail_url?: string | null;
  mentions: string[];
}

interface TikTokPost extends BasePost {
  nickname: string;
  likes: number;
  comments_count: number;
  shares: number;
  views: number;
  hashtags: string[];
  duration_seconds?: number | null;
  thumbnail_url?: string | null;
  mentions: string[];
}

interface YouTubePost extends BasePost {
  title: string;
  views: number;
  likes: number;
  comments_count: number;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
}

interface TwitterPost extends BasePost {
  display_name: string;
  likes: number;
  retweets: number;
  replies_count: number;
  quotes: number;
  views: number;
  hashtags: string[];
  mentions: string[];
  media_urls?: string[] | null;
}

type AnyPost = InstagramPost | TikTokPost | YouTubePost | TwitterPost;

interface PlatformData {
  posts: AnyPost[];
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
}

interface WeekDetailResponse {
  week: {
    week_index: number;
    label: string;
    start: string;
    end: string;
  };
  season: {
    season_id: string;
    show_id: string;
    show_name: string | null;
    season_number: number;
  };
  source_scope: string;
  platforms: Record<string, PlatformData>;
  totals: {
    posts: number;
    total_comments: number;
    total_engagement: number;
  };
}

interface PostDetailResponse {
  platform: string;
  source_id: string;
  author: string;
  text: string;
  url: string;
  posted_at: string | null;
  title?: string;
  display_name?: string;
  stats: Record<string, number>;
  total_comments_in_db: number;
  comments: ThreadedComment[];
}

type PlatformFilter = "all" | "instagram" | "tiktok" | "twitter" | "youtube";
type SortField = "engagement" | "likes" | "views" | "comments_count" | "shares" | "retweets" | "posted_at";
type SortDir = "desc" | "asc";
type SourceScope = "bravo" | "creator" | "community";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PLATFORM_FILTERS: { key: PlatformFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "twitter", label: "Twitter/X" },
  { key: "youtube", label: "YouTube" },
];

const SORT_OPTIONS: { key: SortField; label: string }[] = [
  { key: "engagement", label: "Engagement" },
  { key: "likes", label: "Likes" },
  { key: "views", label: "Views" },
  { key: "comments_count", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "retweets", label: "Retweets" },
  { key: "posted_at", label: "Date" },
];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-pink-100 text-pink-800",
  tiktok: "bg-gray-100 text-gray-800",
  twitter: "bg-sky-100 text-sky-800",
  youtube: "bg-red-100 text-red-800",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "Twitter/X",
  youtube: "YouTube",
};

const STAT_LABELS: Record<string, string> = {
  likes: "Likes",
  comments_count: "Comments",
  views: "Views",
  shares: "Shares",
  retweets: "Retweets",
  replies_count: "Replies",
  quotes: "Quotes",
  engagement: "Total Engagement",
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const fmtNum = (n: number | null | undefined): string => {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

function getNum(post: AnyPost, key: string): number {
  return (post as unknown as Record<string, number>)[key] ?? 0;
}

function getStrArr(post: AnyPost, key: string): string[] {
  const val = (post as unknown as Record<string, unknown>)[key];
  return Array.isArray(val) ? (val as string[]) : [];
}

function getStr(post: AnyPost, key: string): string {
  const val = (post as unknown as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

function getPostThumbnailUrl(platform: string, post: AnyPost): string | null {
  if (platform === "youtube") {
    return getStr(post, "thumbnail_url") || null;
  }
  if (platform === "instagram") {
    const thumbnail = getStr(post, "thumbnail_url");
    if (thumbnail) return thumbnail;
    const mediaUrls = getStrArr(post, "media_urls");
    return mediaUrls[0] || null;
  }
  if (platform === "tiktok") {
    return getStr(post, "thumbnail_url") || null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Threaded comment component                                          */
/* ------------------------------------------------------------------ */

function ThreadedCommentItem({
  comment,
  depth = 0,
}: {
  comment: ThreadedComment;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasReplies = comment.replies && comment.replies.length > 0;

  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-gray-100" : ""}>
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">@{comment.author || "unknown"}</span>
          {comment.created_at && <span>{fmtDateTime(comment.created_at)}</span>}
          {comment.likes > 0 && (
            <span className="font-medium text-gray-600">{fmtNum(comment.likes)} likes</span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
          {comment.text}
        </p>
        {hasReplies && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
          >
            {expanded ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>
      {expanded && hasReplies && (
        <div>
          {comment.replies.map((reply) => (
            <ThreadedCommentItem
              key={reply.comment_id}
              comment={reply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post Stats Drawer                                                   */
/* ------------------------------------------------------------------ */

function PostStatsDrawer({
  showId,
  seasonNumber,
  platform,
  sourceId,
  onClose,
}: {
  showId: string;
  seasonNumber: string;
  platform: string;
  sourceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not authenticated");
        const token = await user.getIdToken();
        const url = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/posts/${platform}/${sourceId}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            (body as Record<string, string>).error || `HTTP ${res.status}`,
          );
        }
        if (!cancelled) setData(await res.json());
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showId, seasonNumber, platform, sourceId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">Post Stats</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4">
          {loading && (
            <div className="text-center text-gray-500 py-12">Loading all comments...</div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Post info */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[data.platform] ?? "bg-gray-100 text-gray-800"}`}
                  >
                    {PLATFORM_LABELS[data.platform] ?? data.platform}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    @{data.author}
                  </span>
                  <span className="text-xs text-gray-500">{fmtDateTime(data.posted_at)}</span>
                </div>
                {data.title && (
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{data.title}</h3>
                )}
                {data.text && (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3">
                    {data.text}
                  </p>
                )}
                {data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    View on {PLATFORM_LABELS[data.platform] ?? data.platform} ↗
                  </a>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {Object.entries(data.stats).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-gray-50 rounded-lg p-3 text-center"
                  >
                    <div className="text-lg font-bold text-gray-900">{fmtNum(value)}</div>
                    <div className="text-xs text-gray-500">{STAT_LABELS[key] ?? key}</div>
                  </div>
                ))}
              </div>

              {/* Comments section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  All Comments ({fmtNum(data.total_comments_in_db)} in database)
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  {data.stats.comments_count != null && data.stats.comments_count !== data.total_comments_in_db
                    ? `Platform reports ${fmtNum(data.stats.comments_count)} comments · ${fmtNum(data.total_comments_in_db)} scraped`
                    : `${fmtNum(data.total_comments_in_db)} comments scraped`}
                </p>

                {data.comments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-4">No comments in database.</p>
                ) : (
                  <div className="space-y-1 divide-y divide-gray-100">
                    {data.comments.map((c) => (
                      <ThreadedCommentItem key={c.comment_id} comment={c} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Engagement row                                                      */
/* ------------------------------------------------------------------ */

function EngagementRow({ platform, post }: { platform: string; post: AnyPost }) {
  const items: { label: string; value: number }[] = [];
  if (platform === "instagram") {
    items.push(
      { label: "Likes", value: getNum(post, "likes") },
      { label: "Comments", value: getNum(post, "comments_count") },
      { label: "Views", value: getNum(post, "views") },
    );
  } else if (platform === "tiktok") {
    items.push(
      { label: "Likes", value: getNum(post, "likes") },
      { label: "Comments", value: getNum(post, "comments_count") },
      { label: "Shares", value: getNum(post, "shares") },
      { label: "Views", value: getNum(post, "views") },
    );
  } else if (platform === "youtube") {
    items.push(
      { label: "Views", value: getNum(post, "views") },
      { label: "Likes", value: getNum(post, "likes") },
      { label: "Comments", value: getNum(post, "comments_count") },
    );
  } else if (platform === "twitter") {
    items.push(
      { label: "Likes", value: getNum(post, "likes") },
      { label: "Retweets", value: getNum(post, "retweets") },
      { label: "Replies", value: getNum(post, "replies_count") },
      { label: "Quotes", value: getNum(post, "quotes") },
      { label: "Views", value: getNum(post, "views") },
    );
  }
  return (
    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
      {items.map((item) => (
        <span key={item.label}>
          <span className="font-medium text-gray-800">{fmtNum(item.value)}</span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post card                                                           */
/* ------------------------------------------------------------------ */

function PostCard({
  platform,
  post,
  showId,
  seasonNumber,
}: {
  platform: string;
  post: AnyPost;
  showId: string;
  seasonNumber: string;
}) {
  const [statsOpen, setStatsOpen] = useState(false);
  const hashtags = getStrArr(post, "hashtags");
  const mentions = getStrArr(post, "mentions");
  const platformComments = getNum(post, "comments_count");
  const thumbnailUrl = getPostThumbnailUrl(platform, post);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${PLATFORM_COLORS[platform] ?? "bg-gray-100 text-gray-800"}`}
            >
              {PLATFORM_LABELS[platform] ?? platform}
            </span>
            <span className="text-sm font-medium text-gray-900">
              @{post.author || "unknown"}
            </span>
            {platform === "twitter" && getStr(post, "display_name") && (
              <span className="text-xs text-gray-500">{getStr(post, "display_name")}</span>
            )}
          </div>
          <span className="text-xs text-gray-500">{fmtDateTime(post.posted_at)}</span>
        </div>

        {/* Title (YouTube) */}
        {platform === "youtube" && getStr(post, "title") && (
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{getStr(post, "title")}</h3>
        )}

        {/* Thumbnail preview */}
        {thumbnailUrl && (
          <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={`${PLATFORM_LABELS[platform] ?? platform} post thumbnail`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
              className="h-44 w-full object-cover"
            />
          </div>
        )}

        {/* Post text */}
        {post.text && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-3 line-clamp-6">
            {post.text}
          </p>
        )}

        {/* Engagement metrics */}
        <EngagementRow platform={platform} post={post} />

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hashtags.map((tag) => (
              <span key={tag} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Mentions / tagged accounts */}
        {mentions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {mentions.map((m) => (
              <span key={m} className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                {m}
              </span>
            ))}
          </div>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {post.url && (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                View on {PLATFORM_LABELS[platform] ?? platform} ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Post Stats
              {platformComments > 0 && (
                <span className="ml-1 opacity-70">
                  · {fmtNum(platformComments)} comments
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Post Stats Drawer */}
      {statsOpen && (
        <PostStatsDrawer
          showId={showId}
          seasonNumber={seasonNumber}
          platform={platform}
          sourceId={post.source_id}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function WeekDetailPage() {
  const { hasAccess: isAdmin, checking: authLoading } = useAdminGuard();
  const params = useParams<{ showId: string; seasonNumber: string; weekIndex: string }>();
  const searchParams = useSearchParams();
  const { showId, seasonNumber, weekIndex } = params;
  const sourceScope: SourceScope = (() => {
    const raw = searchParams.get("source_scope") ?? searchParams.get("scope") ?? "bravo";
    if (raw === "creator" || raw === "community") return raw;
    return "bravo";
  })();

  const [data, setData] = useState<WeekDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortField, setSortField] = useState<SortField>("engagement");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchText, setSearchText] = useState("");

  const fetchData = useCallback(async () => {
    if (!showId || !seasonNumber || !weekIndex) return;
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();
      const url = `/api/admin/trr-api/shows/${showId}/seasons/${seasonNumber}/social/analytics/week/${weekIndex}?source_scope=${sourceScope}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error || `HTTP ${res.status}`,
        );
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load week detail");
    } finally {
      setLoading(false);
    }
  }, [showId, seasonNumber, sourceScope, weekIndex]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  // Build merged post list with sort + search
  const allPosts = useMemo(() => {
    if (!data) return [];
    const entries: { platform: string; post: AnyPost }[] = [];
    const needle = searchText.trim().toLowerCase();
    for (const [plat, pdata] of Object.entries(data.platforms)) {
      if (platformFilter !== "all" && plat !== platformFilter) continue;
      for (const post of pdata.posts) {
        if (needle) {
          const text = (post.text ?? "").toLowerCase();
          const author = (post.author ?? "").toLowerCase();
          const title = getStr(post, "title").toLowerCase();
          if (!text.includes(needle) && !author.includes(needle) && !title.includes(needle)) {
            continue;
          }
        }
        entries.push({ platform: plat, post });
      }
    }
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortField === "posted_at") {
      entries.sort((a, b) => {
        const ta = a.post.posted_at ? new Date(a.post.posted_at).getTime() : 0;
        const tb = b.post.posted_at ? new Date(b.post.posted_at).getTime() : 0;
        return (ta - tb) * dir;
      });
    } else {
      entries.sort((a, b) => {
        const va = getNum(a.post, sortField);
        const vb = getNum(b.post, sortField);
        return (va - vb) * dir;
      });
    }
    return entries;
  }, [data, platformFilter, sortField, sortDir, searchText]);

  // Filtered totals
  const filteredTotals = useMemo(() => {
    if (!data) return { posts: 0, total_comments: 0, total_engagement: 0 };
    if (platformFilter === "all") return data.totals;
    const pd = data.platforms[platformFilter];
    return pd?.totals ?? { posts: 0, total_comments: 0, total_engagement: 0 };
  }, [data, platformFilter]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Checking access...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href={`/admin/trr-shows/${showId}/seasons/${seasonNumber}?tab=social`}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          ← Back to Season Social Analytics
        </Link>

        {data && (
          <div className="mt-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {data.week.label}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {data.season.show_name} — Season {data.season.season_number} ·{" "}
              {fmtDate(data.week.start)} – {fmtDate(data.week.end)}
            </p>
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-500">
          Loading week detail...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Platform filter tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {PLATFORM_FILTERS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setPlatformFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  platformFilter === tab.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tab.label}
                {tab.key !== "all" && data.platforms[tab.key] && (
                  <span className="ml-1 text-xs opacity-70">
                    ({data.platforms[tab.key].totals.posts})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort & search controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Sort field */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="sort-field" className="text-xs font-medium text-gray-500">
                Sort by
              </label>
              <select
                id="sort-field"
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort direction toggle */}
            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={sortDir === "desc" ? "Highest first" : "Lowest first"}
            >
              {sortDir === "desc" ? "↓ High to Low" : "↑ Low to High"}
            </button>

            {/* Text search */}
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Result count */}
            <span className="text-xs text-gray-500">
              {allPosts.length} {allPosts.length === 1 ? "post" : "posts"}
            </span>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.posts)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Posts</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_comments)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Comments</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">
                {fmtNum(filteredTotals.total_engagement)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Engagement</div>
            </div>
          </div>

          {/* Post cards */}
          {allPosts.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No posts found for this week.
            </div>
          ) : (
            <div className="space-y-4">
              {allPosts.map(({ platform, post }) => (
                <PostCard
                  key={`${platform}-${post.source_id}`}
                  platform={platform}
                  post={post}
                  showId={showId}
                  seasonNumber={seasonNumber}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownRight, Heart, MessageCircle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminCommentThreadItem = {
  id: string;
  authorName: string;
  authorHandle?: string | null;
  authorRole?: string | null;
  avatarUrl?: string | null;
  avatarAlt?: string | null;
  body?: string | null;
  timestamp?: string | null;
  timestampLabel?: string | null;
  likes?: number | null;
  replyCount?: number | null;
  mediaUrls?: string[];
  replies?: AdminCommentThreadItem[];
};

type AdminCommentThreadProps = {
  items: AdminCommentThreadItem[];
  emptyLabel?: string;
  className?: string;
  maxDepth?: number;
  defaultExpandedDepth?: number;
  renderMedia?: (item: AdminCommentThreadItem) => React.ReactNode;
};

const getInitials = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return "?";
  const words = normalized.split(/\s+/).filter(Boolean);
  const initials = words.length > 1 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : normalized.slice(0, 2);
  return initials.toUpperCase();
};

const formatCount = (value: number | null | undefined): string =>
  new Intl.NumberFormat("en-US").format(Number.isFinite(Number(value)) ? Number(value) : 0);

const isLikelyImageUrl = (url: string): boolean => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.includes("image");

function DefaultCommentMedia({ item }: { item: AdminCommentThreadItem }) {
  const mediaUrls = item.mediaUrls ?? [];
  if (mediaUrls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {mediaUrls.map((mediaUrl, index) => (
        <a
          key={`${item.id}-media-${index + 1}`}
          href={mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Comment media ${index + 1}`}
          className="inline-flex items-center rounded-md border border-border/50 bg-background px-2 py-1 text-xs font-medium text-primary transition hover:bg-muted"
        >
          {isLikelyImageUrl(mediaUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt={`Comment media ${index + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-14 rounded object-cover"
            />
          ) : (
            `Comment media ${index + 1}`
          )}
        </a>
      ))}
    </div>
  );
}

function AdminCommentItem({
  item,
  depth,
  seenIds,
  maxDepth,
  defaultExpandedDepth,
  renderMedia,
}: {
  item: AdminCommentThreadItem;
  depth: number;
  seenIds: ReadonlySet<string>;
  maxDepth: number;
  defaultExpandedDepth: number;
  renderMedia?: (item: AdminCommentThreadItem) => React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = React.useState(depth < defaultExpandedDepth);
  const replies = Array.isArray(item.replies) ? item.replies : [];
  const visited = React.useMemo(() => {
    const next = new Set(seenIds);
    next.add(item.id);
    return next;
  }, [item.id, seenIds]);
  const visibleReplies = replies.filter((reply) => !visited.has(reply.id));
  const suppressedReplies = replies.length - visibleReplies.length;
  const hasReplies = replies.length > 0;
  const hasDepthBudget = depth < maxDepth;
  const displayName = item.authorName || item.authorHandle || "Unknown";
  const handle = String(item.authorHandle || "").replace(/^@/, "");
  const timestampLabel = item.timestampLabel || item.timestamp || null;
  const replyCount = Math.max(Number(item.replyCount ?? 0) || 0, replies.length);
  const media = renderMedia ? renderMedia(item) : <DefaultCommentMedia item={item} />;

  if (seenIds.has(item.id)) {
    return (
      <div className="ml-8 border-l-2 border-amber-200 py-2 pl-4 text-xs text-amber-700">
        Comment already rendered in this thread.
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={cn("relative group", depth > 0 ? "ml-8 border-l-2 border-border/40 pl-4" : "mb-6")}
      aria-label={`Comment by ${displayName}`}
    >
      <div className="flex gap-4">
        <Avatar className={cn("border border-border/50", depth > 0 ? "size-8" : "size-10")}>
          {item.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.avatarUrl}
              alt={item.avatarAlt || `${displayName} avatar`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="size-full rounded-full object-cover"
            />
          ) : (
            <AvatarFallback aria-hidden="true">{getInitials(displayName)}</AvatarFallback>
          )}
        </Avatar>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{displayName}</span>
            {handle ? <span className="text-xs text-muted-foreground">@{handle}</span> : null}
            {item.authorRole ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {item.authorRole}
              </span>
            ) : null}
            {timestampLabel ? (
              <time className="text-xs text-muted-foreground" dateTime={item.timestamp ?? undefined}>
                {timestampLabel}
              </time>
            ) : null}
          </header>

          {item.body ? <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">{item.body}</p> : null}
          {media}

          <nav className="mt-2 flex flex-wrap items-center gap-4" aria-label="Comment actions">
            {item.likes != null ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Heart aria-hidden="true" className="size-3.5" />
                {formatCount(item.likes)}
              </span>
            ) : null}
            {replyCount > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded((current) => !current)}
                className="h-7 gap-1.5 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                aria-expanded={isExpanded}
              >
                {isExpanded ? <CornerDownRight aria-hidden="true" data-icon="inline-start" /> : <MessageCircle aria-hidden="true" data-icon="inline-start" />}
                {isExpanded ? "Hide" : "Show"} {formatCount(replyCount)} {replyCount === 1 ? "reply" : "replies"}
              </Button>
            ) : null}
          </nav>
        </div>
      </div>

      {isExpanded && hasReplies && hasDepthBudget ? (
        <section className="mt-4 flex flex-col gap-4" aria-label={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}>
          <AnimatePresence>
            {visibleReplies.map((reply) => (
              <AdminCommentItem
                key={reply.id}
                item={reply}
                depth={depth + 1}
                seenIds={visited}
                maxDepth={maxDepth}
                defaultExpandedDepth={defaultExpandedDepth}
                renderMedia={renderMedia}
              />
            ))}
          </AnimatePresence>
          {suppressedReplies > 0 ? (
            <p className="ml-8 border-l-2 border-amber-200 py-1 pl-4 text-xs text-amber-700">
              {suppressedReplies} nested replies skipped due to thread cycle.
            </p>
          ) : null}
        </section>
      ) : null}
      {isExpanded && hasReplies && !hasDepthBudget ? (
        <p className="mt-3 ml-8 border-l-2 border-amber-200 py-1 pl-4 text-xs text-amber-700">
          Max thread depth reached. {formatCount(replies.length)} {replies.length === 1 ? "reply" : "replies"} hidden.
        </p>
      ) : null}
    </motion.article>
  );
}

export function AdminCommentThread({
  items,
  emptyLabel = "No comments loaded.",
  className,
  maxDepth = 8,
  defaultExpandedDepth = 2,
  renderMedia,
}: AdminCommentThreadProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className={cn("w-full", className)} role="region" aria-label="Comments section">
      <AnimatePresence>
        {items.map((item) => (
          <AdminCommentItem
            key={item.id}
            item={item}
            depth={0}
            seenIds={new Set<string>()}
            maxDepth={maxDepth}
            defaultExpandedDepth={defaultExpandedDepth}
            renderMedia={renderMedia}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

import {
  formatInteger,
  HASHTAG_REGEX,
  MENTION_REGEX,
  parseDateToken,
  PLATFORM_ORDER,
  SOCIAL_TABLE_DEFAULT_METRIC_KEYS,
  SOCIAL_TABLE_METRIC_KEYS,
} from "./status-and-request-helpers";
import type {
  AnalyticsResponse,
  HashtagTagCountsByPlatform,
  HashtagUsageByPlatform,
  Platform,
  SocialMetricMode,
  SocialTableMetric,
  WeekDetailHashtagUsage,
  WeekDetailResponse,
  WeekDetailTokenCounts,
  WeekDetailTokenTriplet,
  WeeklyMetric,
  WeeklyPlatformRow,
} from "./section-types";

export const getMonthDayLabel = (dateLocal: string): string => {
  const parsed = parseDateToken(dateLocal);
  if (!parsed) return "-- --";
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
  const month = date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const day = date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" });
  return `${month} ${day}`;
};

export const getHeatmapToneClass = ({
  value,
  maxValue,
  metric,
}: {
  value: number;
  maxValue: number;
  metric: WeeklyMetric;
}): string => {
  if (metric === "completeness") {
    if (value < 0) return "bg-zinc-200 text-zinc-500";
    if (value >= 0.95) return "bg-emerald-700 text-white";
    if (value >= 0.7) return "bg-amber-500 text-white";
    return "bg-red-600 text-white";
  }
  if (value <= 0 || maxValue <= 0) {
    return "bg-zinc-200 text-zinc-500";
  }
  const ratio = value / maxValue;
  if (ratio >= 0.8) return "bg-emerald-700 text-white";
  if (ratio >= 0.6) return "bg-emerald-600 text-white";
  if (ratio >= 0.4) return "bg-emerald-500 text-white";
  if (ratio >= 0.2) return "bg-emerald-400 text-white";
  return "bg-emerald-300 text-emerald-950";
};

export const formatFreshnessLabel = (minutes: number | null | undefined): string => {
  if (minutes == null || Number.isNaN(minutes)) return "Unknown";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const formatPctLabel = (value: number | null | undefined): string => {
  if (value == null || Number.isNaN(value)) return "N/A";
  return `${value.toFixed(1)}%`;
};

export const formatDurationLabel = (seconds: number | null | undefined): string => {
  if (seconds == null || Number.isNaN(seconds)) return "N/A";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return `${minutes}m ${rem}s`;
};

export const CAST_ENTITY_TOKEN_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b/g;
export const CAST_ENTITY_STOP_WORDS = new Set([
  "Andy Cohen",
  "Bravo",
  "Real Housewives",
  "Salt Lake City",
  "The Real",
  "Watch What Happens",
  "Daily Discussion",
  "Discussion Thread",
  "Episode Discussion",
  "Live Discussion",
  "Weekly Discussion",
  "This Week",
  "New York",
  "Orange County",
  "Beverly Hills",
  "Miami",
  "Atlanta",
  "Potomac",
]);

export const extractCastEntityCandidates = (text: string): string[] => {
  if (!text) return [];
  const tokens = text.match(CAST_ENTITY_TOKEN_RE) ?? [];
  const deduped = new Set<string>();
  for (const token of tokens) {
    const normalized = token.trim().replace(/\s+/g, " ");
    if (!normalized || normalized.length < 3) continue;
    if (CAST_ENTITY_STOP_WORDS.has(normalized)) continue;
    deduped.add(normalized);
  }
  return [...deduped];
};

export const getWeeklyFlagToneClass = (severity: "info" | "warn"): string => {
  if (severity === "warn") return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-zinc-300 bg-zinc-100 text-zinc-700";
};

export const getWeekEpisodeLabel = (
  weekRow: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number],
  seasonNumber: number,
): string | null => {
  if (weekRow.week_type === "bye") return "BYE WEEK";
  if (weekRow.week_type === "episode" && weekRow.episode_number === 1) return "PREMIERE WEEK";
  if (typeof weekRow.episode_number === "number" && Number.isFinite(weekRow.episode_number)) {
    return `S${seasonNumber} E${weekRow.episode_number}`;
  }
  return null;
};

export const getHeatmapWeekSectionLabel = (
  weekRow: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number],
): string => {
  if (weekRow.week_type === "preseason" || weekRow.week_index === 0) return "Pre-Season";
  if (weekRow.week_type === "bye") return `Week ${weekRow.week_index}`;
  if (typeof weekRow.label === "string" && weekRow.label.trim().length > 0) return weekRow.label.trim();
  return `Week ${weekRow.week_index}`;
};

export const getWeeklyTableEpisodePrimaryLabel = (
  weekRow: WeeklyPlatformRow,
  seasonNumber: number,
): string => {
  if (weekRow.week_type === "preseason") return "Episode 0";
  if (weekRow.week_type === "postseason") return "Post-Season";
  if (weekRow.week_type === "bye") return "Bye Week";
  if (weekRow.week_type === "episode" && typeof weekRow.episode_number === "number" && Number.isFinite(weekRow.episode_number)) {
    return `S${seasonNumber}.E${weekRow.episode_number}`;
  }
  return `Episode ${weekRow.week_index}`;
};

export const getWeeklyTableEpisodeSecondaryLabel = (weekRow: WeeklyPlatformRow): string => {
  if (weekRow.week_type === "preseason") return "Pre-Season";
  if (weekRow.week_type === "bye") return weekRow.label || `Week ${weekRow.week_index}`;
  return `Week ${weekRow.week_index}`;
};

export const formatMetricCountLabel = (
  value: number | null | undefined,
  singularLabel: string,
  pluralLabel?: string,
): string => {
  const safeValue = Number(value ?? 0);
  const token = safeValue === 1 ? singularLabel : (pluralLabel ?? `${singularLabel}s`);
  return `${formatInteger(safeValue)} ${token}`;
};

export const getWeeklyDayCompleteness = (
  day: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number]["days"][number],
  platform: Platform | null,
): number => {
  const postsSaved = platform ? Number(day.posts?.[platform] ?? 0) : Number(day.total_posts ?? 0);
  const commentsSaved = platform ? Number(day.comments?.[platform] ?? 0) : Number(day.total_comments ?? 0);
  const reportedComments = platform
    ? Number(day.reported_comments?.[platform] ?? 0)
    : Number(day.total_reported_comments ?? 0);
  const denominator = postsSaved + reportedComments;
  if (denominator <= 0) return -1;
  return Math.min(1, Math.max(0, (postsSaved + commentsSaved) / denominator));
};

export const getWeeklyDayValue = (
  day: NonNullable<AnalyticsResponse["weekly_daily_activity"]>[number]["days"][number],
  metric: WeeklyMetric,
  platform: Platform | null,
): number => {
  if (metric === "posts") {
    return platform ? Number(day.posts?.[platform] ?? 0) : Number(day.total_posts ?? 0);
  }
  if (metric === "comments") {
    return platform ? Number(day.comments?.[platform] ?? 0) : Number(day.total_comments ?? 0);
  }
  return getWeeklyDayCompleteness(day, platform);
};

export const normalizeHashtag = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .toUpperCase();
  if (!normalized) return null;
  if (!/^[A-Z0-9_]+$/.test(normalized)) return null;
  return normalized;
};

export const extractHashtags = (text: string | null | undefined): string[] => {
  const source = String(text ?? "");
  const tags: string[] = [];
  HASHTAG_REGEX.lastIndex = 0;
  let match = HASHTAG_REGEX.exec(source);
  while (match) {
    const normalized = normalizeHashtag(match[2]);
    if (normalized) tags.push(normalized);
    match = HASHTAG_REGEX.exec(source);
  }
  return tags;
};

export const normalizeMention = (value: string | null | undefined): string | null => {
  const normalized = String(value ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z0-9_.]+$/.test(normalized)) return null;
  return `@${normalized}`;
};

export const extractMentions = (text: string | null | undefined): string[] => {
  const source = String(text ?? "");
  const mentions: string[] = [];
  MENTION_REGEX.lastIndex = 0;
  let match = MENTION_REGEX.exec(source);
  while (match) {
    const normalized = normalizeMention(match[2]);
    if (normalized) mentions.push(normalized);
    match = MENTION_REGEX.exec(source);
  }
  return mentions;
};

export const normalizeSocialTableMetrics = (
  value: string | null | undefined,
): SocialTableMetric[] => {
  if (!value) return SOCIAL_TABLE_DEFAULT_METRIC_KEYS;
  if (value.trim().toLowerCase() === "none") return [];
  const provided = new Set(
    String(value)
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is SocialTableMetric => SOCIAL_TABLE_METRIC_KEYS.includes(item as SocialTableMetric)),
  );
  const ordered = SOCIAL_TABLE_METRIC_KEYS.filter((key) => provided.has(key));
  return ordered.length > 0 ? ordered : SOCIAL_TABLE_DEFAULT_METRIC_KEYS;
};

export const serializeSocialTableMetrics = (metrics: SocialTableMetric[]): string | null => {
  const selected = new Set(metrics);
  const ordered = SOCIAL_TABLE_METRIC_KEYS.filter((key) => selected.has(key));
  if (ordered.length === 0) {
    return "none";
  }
  const isDefaultSelection =
    ordered.length === SOCIAL_TABLE_DEFAULT_METRIC_KEYS.length &&
    ordered.every((metric, index) => metric === SOCIAL_TABLE_DEFAULT_METRIC_KEYS[index]);
  if (isDefaultSelection) {
    return null;
  }
  return ordered.join(",");
};

export const normalizeSocialMetricMode = (value: string | null | undefined): SocialMetricMode =>
  String(value ?? "").trim().toLowerCase() === "saved" ? "saved" : "total";

export const createEmptyWeekDetailTokenTriplet = (): WeekDetailTokenTriplet => ({
  hashtags: 0,
  mentions: 0,
  tags: 0,
  collaborators: 0,
});

export const createEmptyHashtagUsageByPlatform = (): HashtagUsageByPlatform => ({
  instagram: 0,
  youtube: 0,
  tiktok: 0,
  twitter: 0,
  facebook: 0,
  threads: 0,
});

export const createEmptyHashtagTagCountsByPlatform = (): HashtagTagCountsByPlatform => ({
  instagram: {},
  youtube: {},
  tiktok: {},
  twitter: {},
  facebook: {},
  threads: {},
});

export const createEmptyWeekDetailTokenCounts = (): WeekDetailTokenCounts => ({
  total: createEmptyWeekDetailTokenTriplet(),
  byPlatform: {
    instagram: createEmptyWeekDetailTokenTriplet(),
    youtube: createEmptyWeekDetailTokenTriplet(),
    tiktok: createEmptyWeekDetailTokenTriplet(),
    twitter: createEmptyWeekDetailTokenTriplet(),
    facebook: createEmptyWeekDetailTokenTriplet(),
    threads: createEmptyWeekDetailTokenTriplet(),
  },
});

export const deriveWeekDetailTokenCounts = (detail: WeekDetailResponse): WeekDetailTokenCounts => {
  const counts = createEmptyWeekDetailTokenCounts();
  const hashtags = new Set<string>();
  const mentions = new Set<string>();
  const tags = new Set<string>();
  const collabs = new Set<string>();
  for (const platform of PLATFORM_ORDER) {
    const platformHashtags = new Set<string>();
    const platformMentions = new Set<string>();
    const platformTags = new Set<string>();
    const platformCollabs = new Set<string>();
    const posts = detail.platforms?.[platform]?.posts ?? [];
    for (const post of posts) {
      // Always merge stored hashtags with caption-derived ones
      const storedHashtags = Array.isArray(post.hashtags) ? post.hashtags : [];
      const captionHashtags = extractHashtags(post.text);
      for (const hashtag of [...storedHashtags, ...captionHashtags]) {
        const normalized = normalizeHashtag(hashtag);
        if (normalized) {
          hashtags.add(normalized);
          platformHashtags.add(normalized);
        }
      }

      // Always merge stored mentions with caption-derived ones
      const storedMentions = Array.isArray(post.mentions) ? post.mentions : [];
      const captionMentions = extractMentions(post.text);
      for (const mention of [...storedMentions, ...captionMentions]) {
        const normalized = normalizeMention(mention);
        if (normalized) {
          mentions.add(normalized);
          platformMentions.add(normalized);
        }
      }

      for (const tagged of post.profile_tags ?? []) {
        const normalized = normalizeMention(tagged);
        if (normalized) {
          tags.add(normalized);
          platformTags.add(normalized);
        }
      }
      for (const collaborator of post.collaborators ?? []) {
        const normalized = normalizeMention(collaborator);
        if (normalized) {
          collabs.add(normalized);
          platformCollabs.add(normalized);
        }
      }
    }
    counts.byPlatform[platform] = {
      hashtags: platformHashtags.size,
      mentions: platformMentions.size,
      tags: platformTags.size,
      collaborators: platformCollabs.size,
    };
  }
  counts.total = {
    hashtags: hashtags.size,
    mentions: mentions.size,
    tags: tags.size,
    collaborators: collabs.size,
  };
  return counts;
};

export const createEmptyWeekDetailHashtagUsage = (): WeekDetailHashtagUsage => ({
  totalTokens: 0,
  uniqueTokens: 0,
  tagCounts: {},
  byPlatform: createEmptyHashtagUsageByPlatform(),
  tagCountsByPlatform: createEmptyHashtagTagCountsByPlatform(),
});

export const deriveWeekDetailHashtagUsage = (detail: WeekDetailResponse): WeekDetailHashtagUsage => {
  const usage = createEmptyWeekDetailHashtagUsage();

  for (const platform of PLATFORM_ORDER) {
    const posts = detail.platforms?.[platform]?.posts ?? [];
    for (const post of posts) {
      const postHashtags = extractHashtags(post.text);
      for (const hashtag of postHashtags) {
        const normalized = normalizeHashtag(hashtag);
        if (!normalized) continue;
        usage.totalTokens += 1;
        usage.byPlatform[platform] += 1;
        usage.tagCounts[normalized] = (usage.tagCounts[normalized] ?? 0) + 1;
        usage.tagCountsByPlatform[platform][normalized] = (usage.tagCountsByPlatform[platform][normalized] ?? 0) + 1;
      }
    }
  }

  usage.uniqueTokens = Object.keys(usage.tagCounts).length;
  return usage;
};

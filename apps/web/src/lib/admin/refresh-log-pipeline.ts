export type RefreshLogTopicKey = "show_core" | "links" | "bravo" | "cast_profiles" | "cast_media";

export type RefreshLogStatus = "pending" | "active" | "done" | "failed";

export type RefreshLogTopicDefinition = {
  key: RefreshLogTopicKey;
  label: string;
  description: string;
};

export type RefreshLogTopicInput = {
  topic?: string | null;
  stageKey?: string | null;
  category?: string | null;
  message?: string | null;
};

export type RefreshLogDedupeInput = RefreshLogTopicInput & {
  current: number | null;
  total: number | null;
};

export type RefreshLogTerminalStateInput = {
  message: string;
  current: number | null;
  total: number | null;
};

const TOPIC_VALUES = new Set<RefreshLogTopicKey>([
  "show_core",
  "links",
  "bravo",
  "cast_profiles",
  "cast_media",
]);

const STAGE_TOPIC_MAP: Record<string, RefreshLogTopicKey> = {
  show_core: "show_core",
  details_sync_shows: "show_core",
  details_tmdb_show_entities: "show_core",
  details_tmdb_watch_providers: "show_core",
  seasons_episodes_seasons: "show_core",
  seasons_episodes_episodes: "show_core",
  cast_credits_show_cast: "show_core",
  cast_credits_episode_appearances: "show_core",
  social_setup_seed: "show_core",
  links: "links",
  links_discover: "links",
  bravo: "bravo",
  bravo_sync: "bravo",
  videos_bravo_import: "bravo",
  cast_profiles: "cast_profiles",
  cast_profiles_sync: "cast_profiles",
  cast_media: "cast_media",
  cast_media_sync: "cast_media",
  photos_show_images: "cast_media",
  photos_season_episode_images: "cast_media",
  sync_show_images: "cast_media",
  sync_imdb_mediaindex: "cast_media",
  sync_tmdb_seasons: "cast_media",
  sync_tmdb_episodes: "cast_media",
  mirror_show_images: "cast_media",
  mirror_season_images: "cast_media",
  mirror_episode_images: "cast_media",
  sync_cast_photos: "cast_media",
  sync_imdb: "cast_media",
  sync_tmdb: "cast_media",
  sync_fandom: "cast_media",
  mirror_cast_photos: "cast_media",
  auto_count: "cast_media",
  word_id: "cast_media",
  prune: "cast_media",
  mirroring: "cast_media",
  mirror: "cast_media",
};

const CATEGORY_TOPIC_MAP: Record<string, RefreshLogTopicKey> = {
  "show info": "show_core",
  "seasons & episodes": "show_core",
  "cast & credits": "show_core",
  "social setup": "show_core",
  "refresh links": "links",
  links: "links",
  bravotv: "bravo",
  "bravo videos": "bravo",
  "cast bios": "cast_profiles",
  "cast profiles": "cast_profiles",
  "show/season/episode media": "cast_media",
  "cast media": "cast_media",
};

const normalizeToken = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const normalizeMessage = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const normalizeRefreshLogTopic = (value: unknown): RefreshLogTopicKey | null => {
  const normalized = normalizeToken(value);
  return TOPIC_VALUES.has(normalized as RefreshLogTopicKey)
    ? (normalized as RefreshLogTopicKey)
    : null;
};

const resolveTopicFromHeuristics = (category: string, message: string): RefreshLogTopicKey => {
  const haystack = `${category} ${message}`.toLowerCase();

  if (haystack.includes("links")) return "links";
  if (haystack.includes("bravo")) return "bravo";
  if (
    haystack.includes("details") ||
    haystack.includes("season") ||
    haystack.includes("episode") ||
    haystack.includes("cast credits") ||
    haystack.includes("show core") ||
    haystack.includes("social setup")
  ) {
    return "show_core";
  }
  if (
    haystack.includes("media") ||
    haystack.includes("image") ||
    haystack.includes("photo") ||
    haystack.includes("mirror") ||
    haystack.includes("auto-count") ||
    haystack.includes("auto count") ||
    haystack.includes("word detection") ||
    haystack.includes("cleanup") ||
    haystack.includes("prune")
  ) {
    return "cast_media";
  }
  if (
    haystack.includes("person") ||
    haystack.includes("cast profile") ||
    haystack.includes("cast member") ||
    haystack.includes("fandom profile") ||
    haystack.includes("tmdb profile")
  ) {
    return "cast_profiles";
  }
  return "show_core";
};

export const resolveRefreshLogTopicKey = (entry: RefreshLogTopicInput): RefreshLogTopicKey | null => {
  const structuredTopic = normalizeRefreshLogTopic(entry.topic);
  if (structuredTopic) return structuredTopic;

  const stageKey = normalizeToken(entry.stageKey);
  if (stageKey && STAGE_TOPIC_MAP[stageKey]) {
    return STAGE_TOPIC_MAP[stageKey];
  }

  const category = normalizeToken(entry.category);
  if (category && CATEGORY_TOPIC_MAP[category]) {
    return CATEGORY_TOPIC_MAP[category];
  }

  const inferred = resolveTopicFromHeuristics(category, normalizeToken(entry.message));
  // Wrapper-level "Refresh" summaries should not overwrite a concrete pipeline topic.
  if (category === "refresh" && inferred === "show_core") {
    return null;
  }
  return inferred;
};

export const isRefreshLogTerminalSuccess = (
  entry: RefreshLogTerminalStateInput | null
): boolean => {
  if (!entry) return false;
  if (
    typeof entry.current === "number" &&
    typeof entry.total === "number" &&
    entry.total > 0 &&
    entry.current >= entry.total
  ) {
    return true;
  }
  const message = normalizeMessage(entry.message);
  return (
    message.includes("complete") ||
    message.includes("completed") ||
    message.includes("success") ||
    message.includes("succeeded") ||
    message.includes("done") ||
    message.includes("refresh complete")
  );
};

export const shouldDedupeRefreshLogEntry = (
  previous: RefreshLogDedupeInput,
  next: RefreshLogDedupeInput
): boolean => {
  return (
    resolveRefreshLogTopicKey(previous) === resolveRefreshLogTopicKey(next) &&
    normalizeToken(previous.stageKey) === normalizeToken(next.stageKey) &&
    normalizeMessage(previous.message) === normalizeMessage(next.message) &&
    previous.current === next.current &&
    previous.total === next.total
  );
};

export const buildPipelineRows = <TEntry>(
  definitions: RefreshLogTopicDefinition[],
  groups: Array<{ topic: { key: RefreshLogTopicKey }; status: RefreshLogStatus; latest: TEntry | null }>
) => {
  const statusByKey = new Map<RefreshLogTopicKey, RefreshLogStatus>();
  const latestByKey = new Map<RefreshLogTopicKey, TEntry | null>();
  for (const group of groups) {
    statusByKey.set(group.topic.key, group.status);
    latestByKey.set(group.topic.key, group.latest ?? null);
  }

  return definitions.map((topic) => ({
    topic,
    status: statusByKey.get(topic.key) ?? "pending",
    latest: latestByKey.get(topic.key) ?? null,
  }));
};

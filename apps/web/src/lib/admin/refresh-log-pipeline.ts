export type RefreshLogTopicKey = "shows" | "seasons" | "episodes" | "people" | "media" | "bravotv";

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
  "shows",
  "seasons",
  "episodes",
  "people",
  "media",
  "bravotv",
]);

const STAGE_TOPIC_MAP: Record<string, RefreshLogTopicKey> = {
  details_sync_shows: "shows",
  details_tmdb_show_entities: "shows",
  details_tmdb_watch_providers: "shows",
  seasons_episodes_seasons: "seasons",
  seasons_episodes_episodes: "episodes",
  cast_credits_show_cast: "people",
  cast_credits_episode_appearances: "episodes",
  photos_show_images: "media",
  photos_season_episode_images: "media",
  sync_show_images: "media",
  sync_imdb_mediaindex: "media",
  sync_tmdb_seasons: "media",
  sync_tmdb_episodes: "media",
  mirror_show_images: "media",
  mirror_season_images: "media",
  mirror_episode_images: "media",
  sync_cast_photos: "media",
  sync_imdb: "media",
  sync_tmdb: "media",
  sync_fandom: "media",
  mirror_cast_photos: "media",
  auto_count: "media",
  word_id: "media",
  prune: "media",
  mirroring: "media",
  mirror: "media",
};

const CATEGORY_TOPIC_MAP: Record<string, RefreshLogTopicKey> = {
  "show info": "shows",
  "seasons & episodes": "seasons",
  "show/season/episode media": "media",
  "cast & credits": "people",
  "cast profiles": "people",
  bravotv: "bravotv",
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

  if (haystack.includes("bravo")) return "bravotv";
  if (haystack.includes("seasons_episodes_episodes")) return "episodes";
  if (haystack.includes("seasons_episodes_seasons")) return "seasons";
  if (haystack.includes("episode")) return "episodes";
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
    return "media";
  }
  if (
    haystack.includes("person") ||
    haystack.includes("cast profile") ||
    haystack.includes("cast member") ||
    haystack.includes("cast credits") ||
    haystack.includes("fandom profile") ||
    haystack.includes("tmdb profile")
  ) {
    return "people";
  }
  if (haystack.includes("season")) return "seasons";
  return "shows";
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
  if (category === "refresh" && inferred === "shows") {
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

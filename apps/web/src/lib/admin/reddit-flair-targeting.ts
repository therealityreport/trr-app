import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";

export type RedditCommunityScopeType = "show" | "franchise" | "network";

export interface RedditFlairAssignment {
  show_ids: string[];
  season_ids: string[];
  episode_ids: string[];
  person_ids: string[];
}

export interface RedditFlairTargetingCommunityLike {
  analysis_flairs?: string[];
  analysis_all_flairs?: string[];
  post_flairs?: string[];
  is_show_focused: boolean;
  network_focus_targets?: string[];
  franchise_focus_targets?: string[];
  post_flair_assignments?: Record<string, RedditFlairAssignment>;
}

export interface ResolvedCommunityFlairModes {
  analysisFlairs: string[];
  analysisAllFlairs: string[];
  relevantFlairs: string[];
  inactiveConfiguredFlairs: string[];
}

export interface ResolvedEpisodeRequiredFlairs {
  requiredFlairs: string[];
  episodeFlairAssignments: Record<
    string,
    Pick<RedditFlairAssignment, "season_ids" | "episode_ids">
  >;
}

const uniqueStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
};

export const emptyRedditFlairAssignment = (): RedditFlairAssignment => ({
  show_ids: [],
  season_ids: [],
  episode_ids: [],
  person_ids: [],
});

export const normalizeRedditFlairAssignment = (value: unknown): RedditFlairAssignment => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return emptyRedditFlairAssignment();
  }
  const assignment = value as Record<string, unknown>;
  return {
    show_ids: uniqueStringList(assignment.show_ids),
    season_ids: uniqueStringList(assignment.season_ids),
    episode_ids: uniqueStringList(assignment.episode_ids),
    person_ids: uniqueStringList(assignment.person_ids),
  };
};

export const normalizeRedditFlairAssignments = (
  value: unknown,
): Record<string, RedditFlairAssignment> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const out: Record<string, RedditFlairAssignment> = {};
  for (const [key, entry] of Object.entries(raw)) {
    const flairKey = toCanonicalFlairKey(key);
    if (!flairKey) continue;
    out[flairKey] = normalizeRedditFlairAssignment(entry);
  }
  return out;
};

export const deriveRedditCommunityScope = (
  community: Pick<
    RedditFlairTargetingCommunityLike,
    "is_show_focused" | "network_focus_targets" | "franchise_focus_targets"
  >,
): RedditCommunityScopeType => {
  if (community.is_show_focused) return "show";
  if ((community.franchise_focus_targets?.length ?? 0) > 0) return "franchise";
  return "network";
};

const getAssignmentForFlair = (
  assignments: Record<string, RedditFlairAssignment> | null | undefined,
  flair: string,
): RedditFlairAssignment => {
  const flairKey = toCanonicalFlairKey(flair);
  if (!flairKey) return emptyRedditFlairAssignment();
  return assignments?.[flairKey] ?? emptyRedditFlairAssignment();
};

const isFlairAssignedToShow = (
  assignments: Record<string, RedditFlairAssignment>,
  flair: string,
  activeShowId: string | null | undefined,
): boolean => {
  if (!activeShowId) return false;
  const assignment = getAssignmentForFlair(assignments, flair);
  return assignment.show_ids.includes(activeShowId);
};

const pushUniqueFlair = (target: string[], seen: Set<string>, flair: string): void => {
  const key = toCanonicalFlairKey(flair);
  if (!key || seen.has(key)) return;
  seen.add(key);
  target.push(flair);
};

const buildRelevantFlairDisplayList = (
  community: Pick<RedditFlairTargetingCommunityLike, "post_flairs" | "analysis_all_flairs" | "analysis_flairs">,
  relevantKeys: Set<string>,
): string[] => {
  if (relevantKeys.size === 0) return [];
  const seen = new Set<string>();
  const relevant: string[] = [];
  for (const flair of community.post_flairs ?? []) {
    const key = toCanonicalFlairKey(flair);
    if (!key || !relevantKeys.has(key)) continue;
    pushUniqueFlair(relevant, seen, flair);
  }
  for (const flair of [...(community.analysis_all_flairs ?? []), ...(community.analysis_flairs ?? [])]) {
    const key = toCanonicalFlairKey(flair);
    if (!key || !relevantKeys.has(key)) continue;
    pushUniqueFlair(relevant, seen, flair);
  }
  return relevant;
};

export const resolveCommunityFlairModes = (
  community: RedditFlairTargetingCommunityLike,
  activeShowId?: string | null,
): ResolvedCommunityFlairModes => {
  const analysisFlairSource = community.analysis_flairs ?? [];
  const analysisAllFlairSource = community.analysis_all_flairs ?? [];
  const postFlairs = community.post_flairs ?? [];
  const assignments = community.post_flair_assignments ?? {};

  if (community.is_show_focused) {
    const relevantKeys = new Set(
      [...analysisAllFlairSource, ...analysisFlairSource]
        .map((flair) => toCanonicalFlairKey(flair))
        .filter((value) => value.length > 0),
    );
    return {
      analysisFlairs: [...analysisFlairSource],
      analysisAllFlairs: [...analysisAllFlairSource],
      relevantFlairs: buildRelevantFlairDisplayList(
        {
          post_flairs: postFlairs,
          analysis_all_flairs: analysisAllFlairSource,
          analysis_flairs: analysisFlairSource,
        },
        relevantKeys,
      ),
      inactiveConfiguredFlairs: [],
    };
  }

  const analysisFlairs = analysisFlairSource.filter((flair) =>
    isFlairAssignedToShow(assignments, flair, activeShowId),
  );
  const analysisAllFlairs = analysisAllFlairSource.filter((flair) =>
    isFlairAssignedToShow(assignments, flair, activeShowId),
  );
  const relevantKeys = new Set(
    [...analysisAllFlairs, ...analysisFlairs]
      .map((flair) => toCanonicalFlairKey(flair))
      .filter((value) => value.length > 0),
  );
  const inactiveKeys = new Set(
    [...analysisAllFlairSource, ...analysisFlairSource]
      .map((flair) => toCanonicalFlairKey(flair))
      .filter((value) => value.length > 0 && !relevantKeys.has(value)),
  );

  return {
    analysisFlairs,
    analysisAllFlairs,
    relevantFlairs: buildRelevantFlairDisplayList(community, relevantKeys),
    inactiveConfiguredFlairs: buildRelevantFlairDisplayList(
      {
        post_flairs: postFlairs,
        analysis_all_flairs: analysisAllFlairSource,
        analysis_flairs: analysisFlairSource,
      },
      inactiveKeys,
    ),
  };
};

export const resolveEpisodeRequiredFlairs = (
  community: RedditFlairTargetingCommunityLike,
  input: { activeShowId?: string | null; seasonId?: string | null },
): ResolvedEpisodeRequiredFlairs => {
  const assignments = community.post_flair_assignments ?? {};
  const resolvedModes = resolveCommunityFlairModes(community, input.activeShowId);
  const requiredFlairs = resolvedModes.analysisAllFlairs.filter((flair) => {
    const assignment = getAssignmentForFlair(assignments, flair);
    if (assignment.season_ids.length === 0) return true;
    const seasonId = input.seasonId ?? null;
    return seasonId !== null && assignment.season_ids.includes(seasonId);
  });

  const episodeFlairAssignments: Record<
    string,
    Pick<RedditFlairAssignment, "season_ids" | "episode_ids">
  > = {};
  for (const flair of requiredFlairs) {
    const flairKey = toCanonicalFlairKey(flair);
    if (!flairKey) continue;
    const assignment = getAssignmentForFlair(assignments, flair);
    episodeFlairAssignments[flairKey] = {
      season_ids: assignment.season_ids,
      episode_ids: assignment.episode_ids,
    };
  }

  return {
    requiredFlairs,
    episodeFlairAssignments,
  };
};

export const isEpisodeFlairAssignmentMatch = (
  assignment: Pick<RedditFlairAssignment, "season_ids" | "episode_ids"> | null | undefined,
  input: { seasonId?: string | null; episodeId?: string | null },
): boolean => {
  if (!assignment) return true;
  if (assignment.season_ids.length > 0) {
    if (!input.seasonId || !assignment.season_ids.includes(input.seasonId)) {
      return false;
    }
  }
  if (assignment.episode_ids.length > 0) {
    if (!input.episodeId || !assignment.episode_ids.includes(input.episodeId)) {
      return false;
    }
  }
  return true;
};

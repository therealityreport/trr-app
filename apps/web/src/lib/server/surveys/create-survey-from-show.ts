import "server-only";

import type { AuthContext } from "@/lib/server/postgres";
import {
  getShowById,
  getSeasonByShowAndNumber,
  getEpisodesByShowAndSeason,
  getSeasonCastWithEpisodeCounts,
} from "@/lib/server/trr-api/trr-shows-repository";
import { listSeasonCastSurveyRoles } from "@/lib/server/admin/season-cast-survey-roles-repository";
import {
  createSurvey,
  createQuestion,
  createOption,
  createRun,
} from "./normalized-survey-admin-repository";
import {
  createLink,
  linkExistsForShowSeason,
} from "./survey-trr-links-repository";
import type { NormalizedSurvey, SurveyRun } from "@/lib/surveys/normalized-types";
import type { SurveyTrrLink } from "./survey-trr-links-repository";

// ============================================================================
// Types
// ============================================================================

export type SurveyTemplate = "cast_ranking" | "weekly_poll" | "episode_rating";

export interface CreateSurveyFromShowOptions {
  trrShowId: string;
  seasonNumber: number;
  template: SurveyTemplate;
  title?: string;
  createInitialRun?: boolean;
  runStartsAt?: string;
  runEndsAt?: string;
}

export interface CreateSurveyFromShowResult {
  survey: NormalizedSurvey;
  link: SurveyTrrLink;
  run?: SurveyRun;
}

/**
 * Standardized metadata keys for options.
 * These must be consistent across renderers, templates, and importers.
 */
export interface OptionMetadata {
  imagePath?: string; // Cast photo URL from TRR core (compatible with survey renderers)
  trrPersonId?: string; // UUID from core.people.id (for resync)
  role?: string; // Role/character name
  castRole?: "main" | "friend_of"; // Survey-eligible role (for resync/templates)
}

/**
 * Standardized metadata keys for surveys.
 */
export interface SurveyMetadata {
  showName: string; // Display name from TRR core
  seasonNumber: number; // Season number
  template: SurveyTemplate; // Template used to create survey
  trrShowId: string; // TRR show UUID
  trrSeasonId?: string; // TRR season UUID
}

// ============================================================================
// Slug Generation
// ============================================================================

/**
 * Generate a URL-safe slug from show name and season number.
 * @example generateSlug("The Real Housewives of Salt Lake City", 6) => "rhoslc-s6"
 */
function generateSlug(showName: string, seasonNumber: number): string {
  // Try common abbreviations first
  const abbreviations: Record<string, string> = {
    "the real housewives of salt lake city": "rhoslc",
    "the real housewives of atlanta": "rhoa",
    "the real housewives of beverly hills": "rhobh",
    "the real housewives of new jersey": "rhonj",
    "the real housewives of new york city": "rhony",
    "the real housewives of orange county": "rhoc",
    "the real housewives of potomac": "rhop",
    "the real housewives of dubai": "rhodubai",
    "the real housewives of miami": "rhom",
    "vanderpump rules": "vpr",
    "summer house": "summerhouse",
    "southern charm": "southerncharm",
    "below deck": "belowdeck",
    "below deck mediterranean": "belowdeckmed",
    "below deck sailing yacht": "belowdecksailing",
    "married to medicine": "m2m",
    "shahs of sunset": "shahs",
  };

  const lowerName = showName.toLowerCase();
  const abbreviation = abbreviations[lowerName];

  if (abbreviation) {
    return `${abbreviation}-s${seasonNumber}`;
  }

  // Generate slug from show name
  const slug = showName
    .toLowerCase()
    .replace(/^the\s+/i, "") // Remove leading "the"
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .substring(0, 30); // Limit length

  return `${slug}-s${seasonNumber}`;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Create a normalized survey from a TRR show/season.
 *
 * This function:
 * 1. Validates the show and season exist in TRR API
 * 2. Checks for duplicate surveys (unique constraint on show+season)
 * 3. Creates the survey with standardized metadata
 * 4. Creates questions based on the template
 * 5. For cast_ranking: creates options from cast with photos
 * 6. Links the survey to the TRR show/season
 * 7. Optionally creates an initial run
 *
 * @throws Error if show not found, season not found, or duplicate exists
 */
export async function createSurveyFromShow(
  authContext: AuthContext,
  options: CreateSurveyFromShowOptions,
): Promise<CreateSurveyFromShowResult> {
  const { trrShowId, seasonNumber, template, title, createInitialRun, runStartsAt, runEndsAt } = options;

  // 1. Validate show exists
  const show = await getShowById(trrShowId);
  if (!show) {
    throw new Error(`Show not found: ${trrShowId}`);
  }

  // 2. Validate season exists (if applicable)
  const season = await getSeasonByShowAndNumber(trrShowId, seasonNumber);
  // Season may not exist in TRR core yet, but we can still create the survey
  // Just log a warning
  if (!season) {
    console.warn(`[create-survey-from-show] Season ${seasonNumber} not found for show ${show.name}. Proceeding anyway.`);
  }

  // 3. Check for duplicate
  const exists = await linkExistsForShowSeason(trrShowId, seasonNumber);
  if (exists) {
    throw new Error(`Survey already exists for ${show.name} Season ${seasonNumber}`);
  }

  // 4. Generate slug and title
  const slug = generateSlug(show.name, seasonNumber);
  const surveyTitle = title || `${show.name} S${seasonNumber}`;

  // 5. Create survey with standardized metadata
  const surveyMetadata: SurveyMetadata = {
    showName: show.name,
    seasonNumber,
    template,
    trrShowId,
    trrSeasonId: season?.id,
  };

  const survey = await createSurvey(authContext, {
    slug,
    title: surveyTitle,
    description: `${template.replace(/_/g, " ")} survey for ${show.name} Season ${seasonNumber}`,
    is_active: true,
    metadata: surveyMetadata as unknown as Record<string, unknown>,
  });

  // 6. Create questions based on template
  if (template === "cast_ranking") {
    await createCastRankingQuestions(authContext, survey.id, trrShowId, seasonNumber);
  } else if (template === "weekly_poll") {
    await createWeeklyPollQuestions(authContext, survey.id, trrShowId, seasonNumber);
  } else if (template === "episode_rating") {
    await createEpisodeRatingQuestions(authContext, survey.id);
  }

  // 7. Create survey_trr_links row
  const link = await createLink(authContext, {
    survey_id: survey.id,
    trr_show_id: trrShowId,
    trr_season_id: season?.id ?? null,
    season_number: seasonNumber,
  });

  // 8. Optionally create initial run
  let run: SurveyRun | undefined;
  if (createInitialRun) {
    const now = new Date();
    run = await createRun(authContext, {
      survey_id: survey.id,
      run_key: `${slug}-initial`,
      title: `${surveyTitle} - Initial Run`,
      starts_at: runStartsAt ?? now.toISOString(),
      ends_at: runEndsAt ?? undefined,
      max_submissions_per_user: 1,
      is_active: true,
    });
  }

  return { survey, link, run };
}

// ============================================================================
// Template-Specific Question Creation
// ============================================================================

/**
 * Cast members eligible for cast-based templates (Main + Friend-of).
 */
type EligibleSeasonCastMember = {
  person_id: string;
  person_name: string | null;
  photo_url: string | null;
  episodes_in_season: number;
  castRole: "main" | "friend_of";
};

async function getSurveyEligibleSeasonCast(
  trrShowId: string,
  seasonNumber: number,
): Promise<EligibleSeasonCastMember[]> {
  const [cast, selectedRoles] = await Promise.all([
    getSeasonCastWithEpisodeCounts(trrShowId, seasonNumber, { limit: 500, offset: 0 }),
    listSeasonCastSurveyRoles(trrShowId, seasonNumber),
  ]);

  if (cast.length === 0) return [];

  const roleMap = new Map(selectedRoles.map((r) => [r.person_id, r.role] as const));

  let eligible: EligibleSeasonCastMember[] = [];

  if (selectedRoles.length > 0) {
    eligible = cast
      .map((m) => {
        const role = roleMap.get(m.person_id);
        if (role !== "main" && role !== "friend_of") return null;
        return {
          person_id: m.person_id,
          person_name: m.person_name ?? null,
          photo_url: m.photo_url ?? null,
          episodes_in_season: m.episodes_in_season,
          castRole: role,
        };
      })
      .filter((m): m is EligibleSeasonCastMember => Boolean(m));
  } else {
    const episodes = await getEpisodesByShowAndSeason(trrShowId, seasonNumber, { limit: 500, offset: 0 });
    const totalEpisodes = episodes.length;

    eligible = cast
      .map((m) => {
        let castRole: "main" | "friend_of" | null = null;
        if (totalEpisodes > 0 && m.episodes_in_season > totalEpisodes / 2) {
          castRole = "main";
        } else if (
          m.episodes_in_season >= 3 &&
          (totalEpisodes === 0 || m.episodes_in_season < totalEpisodes / 2)
        ) {
          castRole = "friend_of";
        }

        if (!castRole) return null;
        return {
          person_id: m.person_id,
          person_name: m.person_name ?? null,
          photo_url: m.photo_url ?? null,
          episodes_in_season: m.episodes_in_season,
          castRole,
        };
      })
      .filter((m): m is EligibleSeasonCastMember => Boolean(m));
  }

  const roleRank = (role: "main" | "friend_of") => (role === "main" ? 0 : 1);
  eligible.sort((a, b) => {
    const byRole = roleRank(a.castRole) - roleRank(b.castRole);
    if (byRole !== 0) return byRole;
    const byEpisodes = b.episodes_in_season - a.episodes_in_season;
    if (byEpisodes !== 0) return byEpisodes;
    const aName = (a.person_name ?? "").toLowerCase();
    const bName = (b.person_name ?? "").toLowerCase();
    return aName.localeCompare(bName);
  });

  return eligible;
}

/**
 * Create a cast ranking question with options from survey-eligible season cast.
 */
async function createCastRankingQuestions(
  authContext: AuthContext,
  surveyId: string,
  trrShowId: string,
  seasonNumber: number,
): Promise<void> {
  const cast = await getSurveyEligibleSeasonCast(trrShowId, seasonNumber);

  if (cast.length === 0) {
    console.warn(
      `[create-survey-from-show] No eligible (Main/Friend-of) cast found for show ${trrShowId} season ${seasonNumber}. Creating empty ranking question.`,
    );
  }

  // Create the ranking question
  const question = await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "cast_ranking",
    question_text: "Rank the cast members from your favorite to least favorite",
    question_type: "ranking",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "circle-ranking",
      lineLabelTop: "FAVORITE",
      lineLabelBottom: "LEAST FAVORITE",
      section: "Rankings",
      autofill: { source: "cast", include: ["main", "friend_of"] },
      minRank: 1,
      maxRank: cast.length,
    },
  });

  // Create options from cast with standardized metadata
  for (const [index, member] of cast.entries()) {
    const optionMetadata: OptionMetadata = {
      imagePath: member.photo_url ?? undefined,
      trrPersonId: member.person_id,
      castRole: member.castRole,
    };

    await createOption(authContext, {
      question_id: question.id,
      option_key: member.person_id, // Use person ID as stable key
      option_text: member.person_name ?? "Unknown",
      display_order: index + 1,
      metadata: optionMetadata as Record<string, unknown>,
    });
  }
}

/**
 * Create weekly poll questions (basic template).
 */
async function createWeeklyPollQuestions(
  authContext: AuthContext,
  surveyId: string,
  trrShowId: string,
  seasonNumber: number,
): Promise<void> {
  // Episode rating question (star rating)
  await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "episode_rating",
    question_text: "How would you rate this week's episode?",
    question_type: "numeric",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "numeric-ranking",
      min: 0,
      max: 10,
      step: 0.1,
      labels: { min: "Terrible", max: "Amazing" },
    },
  });

  // Highlight question
  await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "highlight",
    question_text: "What was the highlight of the episode?",
    question_type: "free_text",
    display_order: 2,
    is_required: false,
    config: {
      uiVariant: "text-entry",
      placeholder: "Best moment, line, scene, or chaotic detail...",
    },
  });

  // MVP question (options generated from cast with photos when available)
  const mvpQuestion = await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "mvp",
    question_text: "Who was the MVP of this episode?",
    question_type: "single_choice",
    display_order: 3,
    is_required: false,
    config: {
      uiVariant: "image-multiple-choice",
      columns: 4,
      autofill: { source: "cast", include: ["main", "friend_of"] },
    },
  });

  // Add cast options (if available)
  const cast = await getSurveyEligibleSeasonCast(trrShowId, seasonNumber);
  for (const [index, member] of cast.entries()) {
    const optionMetadata: OptionMetadata = {
      imagePath: member.photo_url ?? undefined,
      trrPersonId: member.person_id,
      castRole: member.castRole,
    };
    await createOption(authContext, {
      question_id: mvpQuestion.id,
      option_key: member.person_id,
      option_text: member.person_name ?? "Unknown",
      display_order: index + 1,
      metadata: optionMetadata as Record<string, unknown>,
    });
  }
}

/**
 * Create episode rating questions (basic template).
 */
async function createEpisodeRatingQuestions(
  authContext: AuthContext,
  surveyId: string,
): Promise<void> {
  // Overall rating
  await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "overall_rating",
    question_text: "Rate this episode overall",
    question_type: "numeric",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "numeric-ranking",
      min: 0,
      max: 10,
      step: 0.1,
      labels: { min: "Terrible", max: "Perfect" },
    },
  });

  // Drama rating
  await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "drama_rating",
    question_text: "How would you rate the drama level?",
    question_type: "numeric",
    display_order: 2,
    is_required: false,
    config: {
      min: 1,
      max: 5,
      step: 1,
      minLabel: "Boring",
      maxLabel: "Explosive",
      uiVariant: "numeric-scale-slider",
    },
  });

  // Comment
  await createQuestion(authContext, {
    survey_id: surveyId,
    question_key: "comments",
    question_text: "Any additional thoughts?",
    question_type: "free_text",
    display_order: 3,
    is_required: false,
    config: {
      uiVariant: "text-entry",
      placeholder: "Quick thoughts, best quote, who annoyed you most, etc.",
    },
  });
}

import "server-only";

type SurveyFieldType = "text" | "number" | "boolean" | "date" | "json" | "timestamp";

export interface SurveyFieldDefinition {
  column: string;
  label: string;
  type: SurveyFieldType;
  description?: string;
  multiValue?: boolean;
}

export interface SurveyDefinition {
  key: string;
  name: string;
  description?: string;
  tableName: string;
  showId?: string;
  seasonNumber?: number;
  defaultEpisodeNumber?: number;
  questionColumns: SurveyFieldDefinition[];
  previewColumns: string[];
  allowShowFilters?: boolean;
  allowEpisodeFilters?: boolean;
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  upsertColumns: string[];
}

export const COMMON_COLUMNS: SurveyFieldDefinition[] = [
  { column: "id", label: "Response ID", type: "text" },
  { column: "created_at", label: "Created At", type: "timestamp" },
  { column: "updated_at", label: "Updated At", type: "timestamp" },
  { column: "respondent_id", label: "Respondent ID", type: "text" },
  { column: "app_user_id", label: "App User ID", type: "text" },
  { column: "app_user_email", label: "App User Email", type: "text" },
  { column: "source", label: "Source", type: "text" },
  { column: "show_id", label: "Show ID", type: "text" },
  { column: "season_number", label: "Season #", type: "number" },
  { column: "episode_number", label: "Episode #", type: "number" },
];

const globalProfileColumns: SurveyFieldDefinition[] = [
  { column: "age_bracket", label: "Age Bracket", type: "text" },
  { column: "birthdate", label: "Birthdate", type: "date" },
  { column: "gender", label: "Gender", type: "text" },
  { column: "pronouns", label: "Pronouns", type: "json", multiValue: true },
  { column: "country", label: "Country", type: "text" },
  { column: "state_region", label: "State / Region", type: "text" },
  { column: "postal_code", label: "Postal Code", type: "text" },
  { column: "household_size", label: "Household Size", type: "number" },
  { column: "children_in_household", label: "Children in Household", type: "text" },
  { column: "relationship_status", label: "Relationship Status", type: "text" },
  { column: "education_level", label: "Education", type: "text" },
  { column: "household_income_band", label: "Household Income", type: "text" },
  { column: "view_hours_week", label: "Viewing Hours/Week", type: "text" },
  { column: "view_devices_reality", label: "Devices", type: "json", multiValue: true },
  { column: "view_live_tv_household", label: "Live TV Household", type: "text" },
  { column: "view_platforms_household", label: "Household Platforms", type: "json", multiValue: true },
  { column: "view_platforms_subscriptions", label: "Subscriptions", type: "json", multiValue: true },
  { column: "view_reality_cowatch", label: "Co-watch", type: "text" },
  { column: "view_live_chats_social", label: "Live Chats / Social", type: "text" },
  { column: "view_bravo_platform_primary", label: "Primary Platform", type: "text" },
  { column: "view_bravo_other_sources", label: "Other Sources", type: "json", multiValue: true },
  { column: "view_new_episode_timing", label: "New Episode Timing", type: "text" },
  { column: "view_binge_style", label: "Binge Style", type: "text" },
  { column: "psych_bravo_fandom_level", label: "Bravo Fandom Level", type: "text" },
  { column: "psych_other_reality_categories", label: "Other Categories", type: "json", multiValue: true },
  { column: "psych_online_engagement", label: "Online Engagement", type: "json", multiValue: true },
  { column: "psych_purchase_behavior", label: "Purchase Behavior", type: "json", multiValue: true },
  { column: "psych_watch_reasons", label: "Watch Reasons", type: "json", multiValue: true },
  { column: "profile_email", label: "Profile Email", type: "text" },
  { column: "profile_reuse_ok", label: "Reuse OK", type: "text" },
  { column: "extra", label: "Extra", type: "json" },
];

const rhoslcColumns: SurveyFieldDefinition[] = [
  { column: "season_id", label: "Season ID", type: "text" },
  { column: "episode_id", label: "Episode ID", type: "text" },
  { column: "ranking", label: "Ranking", type: "json", multiValue: true },
  { column: "completion_pct", label: "Completion %", type: "number" },
  { column: "completed", label: "Completed", type: "boolean" },
  { column: "client_schema_version", label: "Client Schema Version", type: "number" },
  { column: "client_version", label: "Client Version", type: "text" },
  { column: "extra", label: "Extra", type: "json" },
];

export const SURVEY_DEFINITIONS: SurveyDefinition[] = [
  {
    key: "global_profile",
    name: "Global Profile Survey",
    description: "Demographic and psychographic baseline responses",
    tableName: "survey_global_profile_responses",
    questionColumns: globalProfileColumns,
    previewColumns: [
      "age_bracket",
      "country",
      "view_live_tv_household",
      "view_platforms_subscriptions",
      "view_devices_reality",
      "view_bravo_platform_primary",
      "psych_bravo_fandom_level",
      "profile_email",
    ],
    defaultSortColumn: "created_at",
    defaultSortDirection: "desc",
    upsertColumns: ["app_user_id"],
  },
  {
    key: "rhoslc_s6",
    name: "RHOSLC S6 Flashback Ranking",
    description: "Season 6 show rankings by episode",
    tableName: "survey_rhoslc_s6_responses",
    showId: "tt12623782",
    seasonNumber: 6,
    questionColumns: rhoslcColumns,
    previewColumns: ["ranking", "completion_pct", "completed", "season_id", "episode_id"],
    allowShowFilters: true,
    allowEpisodeFilters: true,
    defaultSortColumn: "created_at",
    defaultSortDirection: "desc",
    upsertColumns: ["app_user_id", "season_id", "episode_id"],
  },
];

const DEFINITION_MAP = new Map(SURVEY_DEFINITIONS.map((def) => [def.key, def] as const));

export function listSurveyDefinitions(): SurveyDefinition[] {
  return SURVEY_DEFINITIONS;
}

export function getSurveyDefinition(key: string): SurveyDefinition | undefined {
  return DEFINITION_MAP.get(key);
}

export function getColumnsForSurvey(def: SurveyDefinition): SurveyFieldDefinition[] {
  return [...COMMON_COLUMNS, ...def.questionColumns];
}

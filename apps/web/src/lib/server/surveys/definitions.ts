import "server-only";

export type ColumnType = "text" | "int" | "bool" | "timestamp" | "text_array" | "json" | "date" | "number";

export interface SurveyColumn {
  name: string;
  label: string;
  type: ColumnType;
  description?: string;
  multiValue?: boolean;
  isMeta?: boolean;
}

export interface SurveyDefinition {
  key: string;
  title: string;
  description?: string;
  tableName: string;
  showId?: string;
  seasonNumber?: number;
  defaultEpisodeNumber?: number;
  columns: SurveyColumn[];
  previewColumns: string[];
  allowShowFilters?: boolean;
  allowEpisodeFilters?: boolean;
  defaultSortColumn?: string;
  defaultSortDirection?: "asc" | "desc";
  upsertColumns: string[];
  hiddenMetaColumns?: string[];
}

const COMMON_COLUMNS: SurveyColumn[] = [
  { name: "id", label: "Response ID", type: "text", isMeta: true },
  { name: "created_at", label: "Created At", type: "timestamp", isMeta: true },
  { name: "updated_at", label: "Updated At", type: "timestamp", isMeta: true },
  { name: "respondent_id", label: "Respondent ID", type: "text", isMeta: true },
  { name: "app_user_id", label: "App User ID", type: "text", isMeta: true },
  { name: "app_user_email", label: "App User Email", type: "text", isMeta: true },
  { name: "app_username", label: "Username", type: "text", isMeta: true },
  { name: "source", label: "Source", type: "text", isMeta: true },
  { name: "show_id", label: "Show ID", type: "text", isMeta: true },
  { name: "season_number", label: "Season #", type: "int", isMeta: true },
  { name: "episode_number", label: "Episode #", type: "int", isMeta: true },
];

const globalProfileColumns: SurveyColumn[] = [
  { name: "age_bracket", label: "Age Bracket", type: "text" },
  { name: "birthdate", label: "Birthdate", type: "date" },
  { name: "gender", label: "Gender", type: "text" },
  { name: "pronouns", label: "Pronouns", type: "json", multiValue: true },
  { name: "country", label: "Country", type: "text" },
  { name: "state_region", label: "State / Region", type: "text" },
  { name: "postal_code", label: "Postal Code", type: "text" },
  { name: "household_size", label: "Household Size", type: "int" },
  { name: "children_in_household", label: "Children in Household", type: "text" },
  { name: "relationship_status", label: "Relationship Status", type: "text" },
  { name: "education_level", label: "Education", type: "text" },
  { name: "household_income_band", label: "Household Income", type: "text" },
  { name: "view_hours_week", label: "Viewing Hours/Week", type: "text" },
  { name: "view_devices_reality", label: "Devices", type: "json", multiValue: true },
  { name: "view_live_tv_household", label: "Live TV Household", type: "text" },
  { name: "view_platforms_household", label: "Household Platforms", type: "json", multiValue: true },
  { name: "view_platforms_subscriptions", label: "Subscriptions", type: "json", multiValue: true },
  { name: "view_reality_cowatch", label: "Co-watch", type: "text" },
  { name: "view_live_chats_social", label: "Live Chats / Social", type: "text" },
  { name: "view_bravo_platform_primary", label: "Primary Platform", type: "text" },
  { name: "view_bravo_other_sources", label: "Other Sources", type: "json", multiValue: true },
  { name: "view_new_episode_timing", label: "New Episode Timing", type: "text" },
  { name: "view_binge_style", label: "Binge Style", type: "text" },
  { name: "psych_bravo_fandom_level", label: "Bravo Fandom Level", type: "text" },
  { name: "psych_other_reality_categories", label: "Other Categories", type: "json", multiValue: true },
  { name: "psych_online_engagement", label: "Online Engagement", type: "json", multiValue: true },
  { name: "psych_purchase_behavior", label: "Purchase Behavior", type: "json", multiValue: true },
  { name: "psych_watch_reasons", label: "Watch Reasons", type: "json", multiValue: true },
  { name: "profile_email", label: "Profile Email", type: "text" },
  { name: "profile_reuse_ok", label: "Reuse OK", type: "text" },
  { name: "extra", label: "Extra", type: "json" },
];

const rhoslcColumns: SurveyColumn[] = [
  { name: "season_id", label: "Season ID", type: "text" },
  { name: "episode_id", label: "Episode ID", type: "text" },
  { name: "ranking", label: "Ranking", type: "json", multiValue: true },
  { name: "season_rating", label: "Season Rating", type: "number" },
  { name: "completion_pct", label: "Completion %", type: "int" },
  { name: "completed", label: "Completed", type: "bool" },
  { name: "client_schema_version", label: "Client Schema Version", type: "int" },
  { name: "client_version", label: "Client Version", type: "text" },
  { name: "extra", label: "Extra", type: "json" },
];

const rhopS10Columns: SurveyColumn[] = [
  { name: "season_id", label: "Season ID", type: "text" },
  { name: "episode_id", label: "Episode ID", type: "text" },
  { name: "ranking", label: "Ranking", type: "json", multiValue: true },
  { name: "completion_pct", label: "Completion %", type: "int" },
  { name: "completed", label: "Completed", type: "bool" },
  { name: "client_schema_version", label: "Client Schema Version", type: "int" },
  { name: "client_version", label: "Client Version", type: "text" },
  { name: "extra", label: "Extra", type: "json" },
];

const surveyXColumns: SurveyColumn[] = [
  { name: "view_live_tv_household", label: "Live TV Household", type: "text" },
  { name: "view_platforms_subscriptions", label: "Platform Subscriptions", type: "text_array", multiValue: true },
  { name: "primary_platform", label: "Primary Platform", type: "text" },
  { name: "watch_frequency", label: "Watch Frequency", type: "text" },
  { name: "watch_mode", label: "Watch Mode", type: "text" },
  { name: "view_reality_cowatch", label: "Reality Co-watch", type: "text" },
  { name: "view_live_chats_social", label: "Live Chats / Social", type: "text" },
  { name: "view_devices_reality", label: "Devices Used", type: "text_array", multiValue: true },
  { name: "extra", label: "Extra", type: "json" },
];

const withCommonColumns = (columns: SurveyColumn[]): SurveyColumn[] => [...COMMON_COLUMNS, ...columns];

export const surveys: SurveyDefinition[] = [
  {
    key: "global_profile",
    title: "Global Profile Survey",
    description: "Demographic and psychographic baseline responses",
    tableName: "survey_global_profile_responses",
    columns: withCommonColumns(globalProfileColumns),
    previewColumns: [
      "created_at",
      "app_user_id",
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
    title: "RHOSLC S6 Flashback Ranking",
    description: "Season 6 show rankings by episode",
    tableName: "survey_rhoslc_s6_responses",
    showId: "tt12623782",
    seasonNumber: 6,
    columns: withCommonColumns(rhoslcColumns),
    previewColumns: [
      "created_at",
      "app_user_id",
      "season_rating",
      "ranking",
      "completion_pct",
      "completed",
      "season_id",
      "episode_id",
    ],
    allowShowFilters: true,
    allowEpisodeFilters: true,
    defaultSortColumn: "created_at",
    defaultSortDirection: "desc",
    upsertColumns: ["app_user_id", "season_id", "episode_id"],
  },
  {
    key: "rhop_s10",
    title: "RHOP S10 Cast Rankings",
    description: "Weekly power rankings for Potomac Season 10",
    tableName: "survey_rhop_s10_responses",
    showId: "rhop",
    seasonNumber: 10,
    columns: withCommonColumns(rhopS10Columns),
    previewColumns: ["created_at", "app_user_id", "ranking", "completion_pct", "completed"],
    allowShowFilters: true,
    allowEpisodeFilters: true,
    defaultSortColumn: "created_at",
    defaultSortDirection: "desc",
    upsertColumns: ["app_user_id", "season_id", "episode_id"],
  },
  {
    key: "survey_x",
    title: "Survey X – Viewer Habits",
    description: "Viewing habits onboarding survey",
    tableName: "survey_x_responses",
    columns: withCommonColumns(surveyXColumns),
    previewColumns: [
      "created_at",
      "app_user_id",
      "view_live_tv_household",
      "view_platforms_subscriptions",
      "primary_platform",
      "watch_frequency",
      "watch_mode",
      "view_reality_cowatch",
      "view_live_chats_social",
      "view_devices_reality",
    ],
    defaultSortColumn: "created_at",
    defaultSortDirection: "desc",
    upsertColumns: ["app_user_id"],
    hiddenMetaColumns: ["show_id", "season_number", "episode_number"],
  },
];

const DEFINITION_MAP = new Map(surveys.map((definition) => [definition.key, definition] as const));

const SURVEY_KEY_ALIASES: Record<string, string> = {
  // Client key (RHOSLC play page) -> server definition key (Postgres upsert/admin)
  rhoslc_s6_v1: "rhoslc_s6",
};

export function listSurveyDefinitions(): SurveyDefinition[] {
  return surveys;
}

export const listSurveys = listSurveyDefinitions;

export function getSurveyDefinition(key: string): SurveyDefinition | undefined {
  const resolvedKey = SURVEY_KEY_ALIASES[key] ?? key;
  return DEFINITION_MAP.get(resolvedKey);
}

export function getColumnsForSurvey(definition: SurveyDefinition): SurveyColumn[] {
  if (!definition.hiddenMetaColumns || definition.hiddenMetaColumns.length === 0) {
    return definition.columns;
  }
  const hidden = new Set(definition.hiddenMetaColumns);
  return definition.columns.filter((column) => !hidden.has(column.name));
}

export function getQuestionColumns(definition: SurveyDefinition): SurveyColumn[] {
  return definition.columns.filter((column) => !column.isMeta);
}

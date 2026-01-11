import type { SurveyTheme } from "./types";
import { DEFAULT_SURVEY_THEME } from "./types";

export const RHOSLC_SHOW_ID = "tt12623782"; // IMDb ID for The Real Housewives of Salt Lake City
export const RHOSLC_SEASON_ID = "S06";
export const RHOSLC_EPISODE_ID = "E01";

export const RHOSLC_SURVEY_ID = "rhoslc_s6";

export const RHOP_SHOW_ID = "rhop";
export const RHOP_SEASON_ID = "S10";
export const RHOP_EPISODE_ID = "W01";
export const RHOP_SURVEY_ID = "rhop_s10";

// Survey theme configurations
// Customize colors/fonts for each survey here
export const SURVEY_THEMES: Record<string, Partial<SurveyTheme>> = {
  rhoslc_s6: {
    // Uses default white/black theme
  },
  rhop_s10: {
    // Uses default white/black theme
  },
};

export function getSurveyTheme(surveyId: string): SurveyTheme {
  const overrides = SURVEY_THEMES[surveyId] ?? {};
  return { ...DEFAULT_SURVEY_THEME, ...overrides };
}

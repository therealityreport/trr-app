import type { FieldValue, Timestamp } from "firebase/firestore";

export interface SurveyEpisodeMeta {
  showId: string;
  seasonId: string;
  episodeId: string;
  episodeLabel?: string;
  surveyId?: string;
  opensAt?: Timestamp | null;
  closesAt?: Timestamp | null;
  isClosed: boolean;
  minClientSchema?: number;
}

export interface SurveyResponse {
  uid: string;
  showId: string;
  seasonId: string;
  episodeId: string;
  ranking: SurveyRankingItem[];
  episodeRating?: number | null;
  seasonRating?: number | null;
  castVerdicts?: CastVerdict[];
  exWifeVerdicts?: ExWifeVerdict[];
  completionPct: number;
  completed: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export type CastVerdictChoice = "keep" | "demote" | "fire";

export interface CastVerdict {
  castId: string;
  verdict: CastVerdictChoice;
}

export type ExWifeVerdictChoice = "bring-back" | "stay-gone";

export interface ExWifeVerdict {
  castId: string;
  verdict: ExWifeVerdictChoice;
}

export interface SurveyRankingItem {
  id: string;
  label: string;
  img: string;
  position?: number; // Slot index (0-based) for grid variant
}

export interface SurveyResponseDraft {
  ranking: SurveyRankingItem[];
  episodeRating?: number | null;
  seasonRating?: number | null;
  castVerdicts?: CastVerdict[];
  exWifeVerdicts?: ExWifeVerdict[];
  completionPct: number;
  completed: boolean;
}

export type SurveyCtaState = "loading" | "start" | "continue" | "results";

export interface SurveyIdentifiers {
  showId: string;
  seasonId: string;
  episodeId: string;
}

export interface SurveyTheme {
  // Page
  pageBg: string;
  pageText: string;

  // Header / Question
  questionFont: string;
  questionColor: string;
  instructionFont: string;
  instructionColor: string;

  // Progress bar
  progressBg: string;
  progressFill: string;
  progressText: string;

  // Ranking grid
  slotBg: string;
  slotBorder: string;
  slotActiveBorder: string;
  slotNumberColor: string;
  slotNumberFont: string;

  // Answer bank
  benchBg: string;
  benchTokenRing: string;

  // Buttons
  submitBg: string;
  submitText: string;
  submitHoverBg: string;
  resetBorder: string;
  resetText: string;

  // Messages
  errorColor: string;
  successColor: string;
}

export const DEFAULT_SURVEY_THEME: SurveyTheme = {
  pageBg: "#FFFFFF",
  pageText: "#1a1a1a",

  questionFont: "var(--font-rude-slab)",
  questionColor: "#1a1a1a",
  instructionFont: "var(--font-plymouth-serial)",
  instructionColor: "#4a4a4a",

  progressBg: "#e5e5e5",
  progressFill: "#1a1a1a",
  progressText: "#6a6a6a",

  slotBg: "#FFFFFF",
  slotBorder: "transparent",
  slotActiveBorder: "#1a1a1a",
  slotNumberColor: "#1a1a1a",
  slotNumberFont: "var(--font-plymouth-serial)",

  benchBg: "#f5f5f5",
  benchTokenRing: "#d4d4d4",

  submitBg: "#1a1a1a",
  submitText: "#FFFFFF",
  submitHoverBg: "#333333",
  resetBorder: "#d4d4d4",
  resetText: "#6a6a6a",

  errorColor: "#dc2626",
  successColor: "#16a34a",
};

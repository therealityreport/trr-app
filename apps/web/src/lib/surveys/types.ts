import type { FieldValue, Timestamp } from "firebase/firestore";

export interface SurveyTheme {
  pageBg: string;
  pageText: string;
  questionFont: string;
  questionColor: string;
  instructionFont: string;
  instructionColor: string;
  slotBg: string;
  slotNumberFont: string;
  progressBg: string;
  progressFill: string;
  progressText: string;
  submitBg: string;
  submitText: string;
  resetText: string;
  resetBorder: string;
  benchBg: string;
  benchTokenRing: string;
}

export const DEFAULT_SURVEY_THEME: SurveyTheme = {
  pageBg: "#ffffff",
  pageText: "#111827",
  questionFont: "\"Hamburg Serial\", \"HamburgSerial\", sans-serif",
  questionColor: "#111827",
  instructionFont: "\"Hamburg Serial\", \"HamburgSerial\", sans-serif",
  instructionColor: "#4b5563",
  slotBg: "#f3f4f6",
  slotNumberFont: "\"Hamburg Serial\", \"HamburgSerial\", sans-serif",
  progressBg: "#e5e7eb",
  progressFill: "#111827",
  progressText: "#111827",
  submitBg: "#111827",
  submitText: "#ffffff",
  resetText: "#111827",
  resetBorder: "#d1d5db",
  benchBg: "#ffffff",
  benchTokenRing: "#111827",
};

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
  seasonRating?: number | null;
  completionPct: number;
  completed: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface SurveyRankingItem {
  id: string;
  label: string;
  img: string;
}

export type CastVerdictChoice = "keep" | "demote" | "fire";

export type ExWifeVerdictChoice = "bring-back" | "stay-gone";

export interface SurveyResponseDraft {
  ranking: SurveyRankingItem[];
  seasonRating?: number | null;
  completionPct: number;
  completed: boolean;
}

export type SurveyCtaState = "loading" | "start" | "continue" | "results";

export interface SurveyIdentifiers {
  showId: string;
  seasonId: string;
  episodeId: string;
}

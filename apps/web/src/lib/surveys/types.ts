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

export interface SurveyResponseDraft {
  ranking: SurveyRankingItem[];
  completionPct: number;
  completed: boolean;
}

export type SurveyCtaState = "loading" | "start" | "continue" | "results";

export interface SurveyIdentifiers {
  showId: string;
  seasonId: string;
  episodeId: string;
}

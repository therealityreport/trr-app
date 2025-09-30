import type { Timestamp } from "firebase/firestore";

export type RealiteaseBoardColumnKey =
  | "guess"
  | "gender"
  | "age"
  | "network"
  | "shows"
  | "wwhl";

export type RealiteaseGuessVerdict =
  | "correct"
  | "partial"
  | "incorrect"
  | "unknown"
  | "guess"
  | "multi"
  | "info";

export interface RealiteaseGuessField {
  key: RealiteaseBoardColumnKey;
  label: string;
  value: string;
  verdict: RealiteaseGuessVerdict;
  variants?: string[];
}

export interface RealiteaseGuess {
  guessNumber: number;
  castName: string;
  submittedAt?: Timestamp | null;
  fields: RealiteaseGuessField[];
  derived: RealiteaseGuessDerived;
}

export interface RealiteaseGuessDerived {
  castId?: string;
  gender?: string;
  age?: number;
  zodiac?: string;
  networks: string[];
  shows: RealiteaseTalentShow[];
  showCount?: number;
  wwhlEpisodes: RealiteaseWwhlAppearance[];
  wwhlAppearancesCount?: number;
}

export interface RawRealiteaseGuess {
  guessNumber?: number;
  castName?: string;
  CastName?: string;
  submittedAt?: Timestamp;
  createdAt?: Timestamp;
  guessInfo?: Record<string, unknown>;
  guessedInfo?: Record<string, unknown>;
  win?: boolean;
  evaluations?: Record<string, unknown>;
  verdicts?: Record<string, unknown>;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface RealiteaseDailyDoc {
  puzzleDate: string;
  gameCompleted: boolean;
  guessNumberSolved: number | null;
  guesses: RawRealiteaseGuess[];
  lastUpdatedAt?: Timestamp | null;
  gameStartedAt?: Timestamp | null;
  [key: string]: unknown;
}

export interface RealiteaseGameSnapshot {
  puzzleDate: string;
  gameCompleted: boolean;
  guessNumberSolved: number | null;
  guesses: RealiteaseGuess[];
  hasExistingDoc: boolean;
  answerKey: RealiteaseAnswerKeyRecord | null;
  talent: RealiteaseTalentRecord | null;
}

export interface RealiteaseAggregateStats {
  currentStreak: number;
  longestStreak: number;
  puzzlesWon: number;
  puzzlesAttempted: number;
  averageGuesses: number;
}

export interface RealiteaseStatsSummary {
  played: number;
  wins: number;
  winPercent: number;
  currentStreak: number;
  longestStreak: number;
  guessDistribution: Record<number, number>;
}

export interface RealiteaseAnalyticsDoc {
  puzzleDate: string;
  totalWins: number;
  totalAttempts: number;
  averageGuesses: number;
  guessDistribution: Record<string, number>;
}

export const REALITEASE_BOARD_COLUMNS: Array<{
  key: RealiteaseBoardColumnKey;
  label: string;
}> = [
  { key: "guess", label: "NAME" },
  { key: "gender", label: "GENDER" },
  { key: "age", label: "AGE" },
  { key: "network", label: "NETWORKS" },
  { key: "shows", label: "SHOWS" },
  { key: "wwhl", label: "WWHL" },
];

export const REALITEASE_DEFAULT_USER_ANALYTICS: RealiteaseAggregateStats = {
  currentStreak: 0,
  longestStreak: 0,
  puzzlesWon: 0,
  puzzlesAttempted: 0,
  averageGuesses: 0,
};

export interface RealiteaseTalentShow {
  showName?: string;
  network?: string;
  imdbSeriesId?: string;
  tmdbId?: string;
  seasons: number[];
  episodeCount?: number | null;
  nickname?: string;
}

export interface RealiteaseWwhlAppearance {
  airDate?: string;
  episodeId?: string;
  otherGuests?: string[];
  otherGuestsIMDbIds?: string[];
}

export interface RealiteaseTalentRecord {
  id: string;
  name: string;
  alternativeNames: string[];
  gender?: string;
  zodiac?: string;
  birthday?: string;
  imdbId?: string;
  tmdbId?: string;
  imageUrl?: string;
  shows: RealiteaseTalentShow[];
  wwhlAppearances: RealiteaseWwhlAppearance[];
  wwhlTotalAppearances?: number;
  metadata: Record<string, unknown>;
}

export interface RealiteaseAnswerKeyRecord {
  id: string;
  castId: string;
  castName: string;
  clue?: string;
  imageUrl?: string;
  metadata: Record<string, unknown>;
}

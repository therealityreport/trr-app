import type { Timestamp } from "firebase/firestore";

export type BravodleBoardColumnKey =
  | "guess"
  | "gender"
  | "age"
  | "zodiac"
  | "shows"
  | "episodes"
  | "wwhl";

export type BravodleGuessVerdict =
  | "correct"
  | "partial"
  | "incorrect"
  | "unknown"
  | "guess"
  | "multi"
  | "info";

export interface BravodleGuessField {
  key: BravodleBoardColumnKey;
  label: string;
  value: string;
  verdict: BravodleGuessVerdict;
  variants?: string[];
}

export interface BravodleGuess {
  guessNumber: number;
  castName: string;
  submittedAt?: Timestamp | null;
  fields: BravodleGuessField[];
  derived: BravodleGuessDerived;
}

export interface BravodleGuessDerived {
  castId?: string;
  gender?: string;
  age?: number;
  zodiac?: string;
  networks: string[];
  shows: BravodleTalentShow[];
  sharedShows?: BravodleSharedShow[];
  showCount?: number;
  bravoEpisodeCount?: number | null;
  wwhlEpisodes: BravodleWwhlAppearance[];
  wwhlAppearancesCount?: number;
}

export interface BravodleSharedShow {
  display: string;
  network?: string;
  isBravo: boolean;
  shareSeason: boolean;
  seasons?: number[];
}

export interface BravodleTalentShow {
  showName?: string;
  network?: string;
  imdbSeriesId?: string;
  tmdbId?: string;
  seasons: number[];
  episodeCount?: number | null;
  nickname?: string;
}

export interface BravodleWwhlAppearance {
  airDate?: string;
  episodeId?: string;
  otherGuests?: string[];
  otherGuestsIMDbIds?: string[];
}

export interface BravodleTalentRecord {
  id: string;
  name: string;
  alternativeNames: string[];
  gender?: string;
  zodiac?: string;
  birthday?: string;
  imdbId?: string;
  tmdbId?: string;
  imageUrl?: string;
  shows: BravodleTalentShow[];
  wwhlAppearances: BravodleWwhlAppearance[];
  wwhlTotalAppearances?: number;
  metadata: Record<string, unknown>;
}

export interface BravodleAnswerKeyRecord {
  id: string;
  castId: string;
  castName: string;
  clue?: string;
  imageUrl?: string;
  metadata: Record<string, unknown>;
}

export interface RawBravodleGuess {
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

export interface BravodleDailyDoc {
  puzzleDate: string;
  gameCompleted: boolean;
  guessNumberSolved: number | null;
  guesses: RawBravodleGuess[];
  lastUpdatedAt?: Timestamp | null;
  gameStartedAt?: Timestamp | null;
  [key: string]: unknown;
}

export interface BravodleGameSnapshot {
  puzzleDate: string;
  gameCompleted: boolean;
  guessNumberSolved: number | null;
  guesses: BravodleGuess[];
  hasExistingDoc: boolean;
  answerKey: BravodleAnswerKeyRecord | null;
  talent: BravodleTalentRecord | null;
}

export interface BravodleAggregateStats {
  currentStreak: number;
  longestStreak: number;
  puzzlesWon: number;
  puzzlesAttempted: number;
  averageGuesses: number;
}

export interface BravodleAnalyticsDoc {
  puzzleDate: string;
  totalWins: number;
  totalAttempts: number;
  averageGuesses: number;
  guessDistribution: Record<string, number>;
}

export interface BravodleStatsSummary {
  played: number;
  wins: number;
  winPercent: number;
  currentStreak: number;
  longestStreak: number;
  guessDistribution: Record<number, number>;
}

export const BRAVODLE_BOARD_COLUMNS: Array<{
  key: BravodleBoardColumnKey;
  label: string;
}> = [
  { key: "guess", label: "NAME" },
  { key: "gender", label: "GENDER" },
  { key: "age", label: "AGE" },
  { key: "shows", label: "SHOWS" },
  { key: "episodes", label: "EPISODES" },
  { key: "wwhl", label: "WWHL" },
];

export const BRAVODLE_DEFAULT_USER_ANALYTICS: BravodleAggregateStats = {
  currentStreak: 0,
  longestStreak: 0,
  puzzlesWon: 0,
  puzzlesAttempted: 0,
  averageGuesses: 0,
};

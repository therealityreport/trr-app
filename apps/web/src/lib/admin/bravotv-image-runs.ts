export type BravotvRunMode = "show" | "person";
export type BravotvSourceSelection = "all" | "getty" | "fandom" | "imdb" | "tmdb";

export type BravotvSourceOption = {
  value: BravotvSourceSelection;
  label: string;
  description: string;
};

export const PERSON_BRAVOTV_SOURCE_OPTIONS: BravotvSourceOption[] = [
  { value: "all", label: "Run All", description: "Run Bravo / Getty / NBCUMV, Fandom, IMDb, and TMDb." },
  {
    value: "getty",
    label: "Bravo / Getty / NBCUMV",
    description: "Run the shared Bravo / Getty / NBCUMV path, including Getty image replacements.",
  },
  { value: "fandom", label: "Fandom", description: "Run Fandom confessional, intro, and title-card gallery discovery." },
  { value: "imdb", label: "IMDb", description: "Run IMDb supplemental discovery only." },
  { value: "tmdb", label: "TMDb", description: "Run TMDb supplemental discovery only." },
];

export const SHOW_BRAVOTV_SOURCE_OPTIONS: BravotvSourceOption[] = [
  {
    value: "getty",
    label: "Bravo / Getty / NBCUMV",
    description: "Run the shared Bravo / Getty / NBCUMV path, including Getty image replacements.",
  },
];

export const getBravotvSourceOptions = (mode: BravotvRunMode): BravotvSourceOption[] =>
  mode === "person" ? PERSON_BRAVOTV_SOURCE_OPTIONS : SHOW_BRAVOTV_SOURCE_OPTIONS;

export const getBravotvSourcesForSelection = (
  mode: BravotvRunMode,
  selection: BravotvSourceSelection,
): string[] => {
  if (mode === "show") return ["getty"];
  if (selection === "all") return ["all"];
  return [selection];
};

export type BravotvImageRunArtifact = {
  key?: string;
  url?: string;
  bytes?: number;
  content_type?: string;
  relative_path?: string;
};

export type BravotvImageRunRecord = {
  id: string;
  operation_id?: string | null;
  mode: BravotvRunMode;
  status: string;
  show_name?: string | null;
  person_name?: string | null;
  season?: number | null;
  episode?: number | null;
  created_at?: string | null;
  completed_at?: string | null;
  summary?: Record<string, unknown> | null;
  import_summary?: Record<string, unknown> | null;
  review_summary?: Record<string, unknown> | null;
  artifact_paths?: Record<string, BravotvImageRunArtifact> | null;
};

export const formatBravotvRunStatus = (value: string | null | undefined): string => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  return normalized
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const parseOptionalNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

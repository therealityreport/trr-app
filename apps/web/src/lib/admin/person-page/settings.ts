import type { PersonExternalIdDraft } from "@/components/admin/PersonExternalIdsEditor";
import {
  PERSON_EXTERNAL_ID_SOURCES,
  type PersonExternalIdRecord,
  type PersonExternalIdSource,
} from "@/lib/admin/person-external-ids";
import {
  DEFAULT_CANONICAL_SOURCE_ORDER,
  type CanonicalSource,
  type CanonicalSourceOrder,
  type TrrPerson,
} from "@/lib/admin/person-page/types";

const isCanonicalSource = (value: string): value is CanonicalSource =>
  (DEFAULT_CANONICAL_SOURCE_ORDER as readonly string[]).includes(value);

export const normalizeCanonicalSourceOrder = (value: unknown): CanonicalSourceOrder => {
  if (!Array.isArray(value)) {
    return [...DEFAULT_CANONICAL_SOURCE_ORDER];
  }

  const collected: CanonicalSourceOrder = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const normalized = entry.trim().toLowerCase();
    if (!isCanonicalSource(normalized)) continue;
    if (!collected.includes(normalized)) {
      collected.push(normalized);
    }
  }

  for (const source of DEFAULT_CANONICAL_SOURCE_ORDER) {
    if (!collected.includes(source)) {
      collected.push(source);
    }
  }

  return collected;
};

export const readCanonicalSourceOrderFromExternalIds = (
  externalIds: Record<string, unknown> | null | undefined,
): CanonicalSourceOrder => {
  if (!externalIds || typeof externalIds !== "object") {
    return [...DEFAULT_CANONICAL_SOURCE_ORDER];
  }
  return normalizeCanonicalSourceOrder(externalIds.canonical_profile_source_order);
};

export const createEmptyExternalIdDraft = (): PersonExternalIdDraft => ({
  source_id: PERSON_EXTERNAL_ID_SOURCES[0],
  external_id: "",
});

export const buildExternalIdDraftsFromRecords = (
  records: PersonExternalIdRecord[],
): PersonExternalIdDraft[] =>
  records.map((record) => ({
    source_id: record.source_id,
    external_id: record.external_id,
  }));

export const buildExternalIdRecordsFromPerson = (
  person: TrrPerson | null | undefined,
): PersonExternalIdRecord[] => {
  if (!person) return [];
  const externalIds = (person.external_ids ?? {}) as Record<string, unknown>;
  const records: PersonExternalIdRecord[] = [];
  for (const source of PERSON_EXTERNAL_ID_SOURCES) {
    const rawValue = externalIds[source] ?? externalIds[`${source}_id`];
    if (rawValue === null || rawValue === undefined || rawValue === "") continue;
    records.push({
      id: null,
      source_id: source,
      external_id: String(rawValue),
      is_primary: true,
      valid_from: null,
      valid_to: null,
      observed_at: null,
    });
  }
  return records;
};

export const formatCanonicalSourceLabel = (source: CanonicalSource): string =>
  source === "tmdb"
    ? "TMDB"
    : source === "imdb"
      ? "IMDb"
      : source === "fandom"
        ? "Fandom"
        : "Manual";

export type ChangeExternalIdDraftField = keyof PersonExternalIdDraft;
export type { PersonExternalIdSource };

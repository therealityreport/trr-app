import "server-only";

import {
  isPersonExternalIdSource,
  type PersonExternalIdRecord,
} from "@/lib/admin/person-external-ids";
import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

const MAX_EXTERNAL_ID_BATCH_SIZE = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERSON_EXTERNAL_ID_KEYS = new Set([
  "id",
  "source_id",
  "external_id",
  "is_primary",
  "valid_from",
  "valid_to",
  "observed_at",
  "created_at",
  "updated_at",
]);

type ExternalIdReadOptions = {
  adminContext?: VerifiedAdminContext;
};

type PersonExternalIdReadOptions = ExternalIdReadOptions & {
  includeInactive?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isJsonValue = (value: unknown): boolean => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (isRecord(value)) return Object.values(value).every(isJsonValue);
  return false;
};

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid external-ID response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const uniqueIds = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }
  return unique;
};

const chunkIds = (values: readonly string[]): string[][] => {
  const chunks: string[][] = [];
  for (let index = 0; index < values.length; index += MAX_EXTERNAL_ID_BATCH_SIZE) {
    chunks.push(values.slice(index, index + MAX_EXTERNAL_ID_BATCH_SIZE));
  }
  return chunks;
};

export const parsePersonExternalIdRecord = (value: unknown): PersonExternalIdRecord => {
  if (!isRecord(value) || !hasExactKeys(value, PERSON_EXTERNAL_ID_KEYS)) {
    throw invalidBackendResponse();
  }
  if (
    (value.id !== null &&
      (typeof value.id !== "number" || !Number.isSafeInteger(value.id) || value.id < 1)) ||
    typeof value.source_id !== "string" ||
    !isPersonExternalIdSource(value.source_id) ||
    typeof value.external_id !== "string" ||
    value.external_id.length === 0 ||
    typeof value.is_primary !== "boolean" ||
    !isNullableString(value.valid_from) ||
    !isNullableString(value.valid_to) ||
    !isNullableString(value.observed_at) ||
    !isNullableString(value.created_at) ||
    !isNullableString(value.updated_at)
  ) {
    throw invalidBackendResponse();
  }
  return {
    id: value.id,
    source_id: value.source_id,
    external_id: value.external_id,
    is_primary: value.is_primary,
    valid_from: value.valid_from,
    valid_to: value.valid_to,
    observed_at: value.observed_at,
    created_at: value.created_at,
    updated_at: value.updated_at,
  };
};

const parsePersonExternalIdsEntry = (
  value: unknown,
): { person_id: string; external_ids: PersonExternalIdRecord[] } => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, new Set(["person_id", "external_ids"])) ||
    typeof value.person_id !== "string" ||
    !UUID_PATTERN.test(value.person_id) ||
    !Array.isArray(value.external_ids)
  ) {
    throw invalidBackendResponse();
  }
  return {
    person_id: value.person_id,
    external_ids: value.external_ids.map(parsePersonExternalIdRecord),
  };
};

const parsePersonExternalIdsPayload = (
  value: unknown,
): { person_id: string; external_ids: PersonExternalIdRecord[] } => {
  return parsePersonExternalIdsEntry(value);
};

const parsePersonExternalIdsBatchPayload = (
  value: unknown,
): Array<{ person_id: string; external_ids: PersonExternalIdRecord[] }> => {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["people"])) || !Array.isArray(value.people)) {
    throw invalidBackendResponse();
  }
  return value.people.map(parsePersonExternalIdsEntry);
};

const parseShowExternalIdsBatchPayload = (
  value: unknown,
): Array<{ show_id: string; external_ids: Record<string, unknown> | null }> => {
  if (!isRecord(value) || !hasExactKeys(value, new Set(["shows"])) || !Array.isArray(value.shows)) {
    throw invalidBackendResponse();
  }
  return value.shows.map((entry) => {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, new Set(["show_id", "external_ids"])) ||
      typeof entry.show_id !== "string" ||
      !UUID_PATTERN.test(entry.show_id) ||
      (entry.external_ids !== null &&
        (!isRecord(entry.external_ids) || !isJsonValue(entry.external_ids)))
    ) {
      throw invalidBackendResponse();
    }
    return {
      show_id: entry.show_id,
      external_ids: entry.external_ids,
    };
  });
};

const assertOrderedResponseIds = (
  requestedIds: readonly string[],
  responseIds: readonly string[],
): void => {
  const requestedIndex = new Map(requestedIds.map((id, index) => [id.toLowerCase(), index]));
  let previousIndex = -1;
  for (const responseId of responseIds) {
    const index = requestedIndex.get(responseId.toLowerCase());
    if (index === undefined || index <= previousIndex) {
      throw invalidBackendResponse();
    }
    previousIndex = index;
  }
};

export async function listPersonExternalIds(
  personId: string,
  options?: PersonExternalIdReadOptions,
): Promise<PersonExternalIdRecord[]> {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(personId)}/external-ids`,
    {
      apiVersion: "v2",
      adminContext: options?.adminContext,
      queryString: `include_inactive=${options?.includeInactive === true ? "true" : "false"}`,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-external-ids",
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to fetch person external IDs",
      routeName: "person-external-ids",
    });
  }
  const payload = parsePersonExternalIdsPayload(upstream.data);
  if (payload.person_id.toLowerCase() !== personId.toLowerCase()) {
    throw invalidBackendResponse();
  }
  return payload.external_ids;
}

export async function listPrimaryPersonExternalIdsByPersonIds(
  personIds: readonly string[],
  options?: PersonExternalIdReadOptions,
): Promise<Map<string, PersonExternalIdRecord[]>> {
  const uniquePersonIds = uniqueIds(personIds);
  const recordsByPersonId = new Map<string, PersonExternalIdRecord[]>(
    uniquePersonIds.map((personId) => [personId, []]),
  );
  if (uniquePersonIds.length === 0) return recordsByPersonId;

  const chunks = chunkIds(uniquePersonIds);
  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const upstream = await fetchAdminBackendJson("/admin/people/external-ids/batch", {
        apiVersion: "v2",
        adminContext: options?.adminContext,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_ids: chunk,
          include_inactive: options?.includeInactive === true,
        }),
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "person-external-ids-batch",
      });
      if (upstream.status !== 200) {
        throw buildAdminBackendStatusError({
          status: upstream.status,
          data: upstream.data,
          fallbackMessage: "Failed to fetch person external IDs",
          routeName: "person-external-ids-batch",
        });
      }
      const payload = parsePersonExternalIdsBatchPayload(upstream.data);
      assertOrderedResponseIds(
        chunk,
        payload.map((person) => person.person_id),
      );
      return payload;
    }),
  );
  for (const response of responses) {
    for (const person of response) {
      if (recordsByPersonId.has(person.person_id)) {
        recordsByPersonId.set(person.person_id, person.external_ids);
      }
    }
  }
  return recordsByPersonId;
}

export async function listShowExternalIdsByIds(
  showIds: readonly string[],
  options?: ExternalIdReadOptions,
): Promise<Map<string, Record<string, unknown> | null>> {
  const uniqueShowIds = uniqueIds(showIds);
  const externalIdsByShowId = new Map<string, Record<string, unknown> | null>();
  if (uniqueShowIds.length === 0) return externalIdsByShowId;

  const chunks = chunkIds(uniqueShowIds);
  const responses = await Promise.all(
    chunks.map(async (chunk) => {
      const upstream = await fetchAdminBackendJson("/admin/shows/external-ids/batch", {
        apiVersion: "v2",
        adminContext: options?.adminContext,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_ids: chunk }),
        timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
        routeName: "show-external-ids-batch",
      });
      if (upstream.status !== 200) {
        throw buildAdminBackendStatusError({
          status: upstream.status,
          data: upstream.data,
          fallbackMessage: "Failed to fetch show external IDs",
          routeName: "show-external-ids-batch",
        });
      }
      const payload = parseShowExternalIdsBatchPayload(upstream.data);
      assertOrderedResponseIds(
        chunk,
        payload.map((show) => show.show_id),
      );
      return payload;
    }),
  );
  for (const response of responses) {
    for (const show of response) {
      externalIdsByShowId.set(show.show_id, show.external_ids);
    }
  }
  return externalIdsByShowId;
}

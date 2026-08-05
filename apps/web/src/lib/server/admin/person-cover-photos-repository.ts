import "server-only";

import {
  AdminReadProxyError,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
  buildAdminBackendStatusError,
  fetchAdminBackendJson,
  type AdminBackendJsonResult,
} from "@/lib/server/trr-api/admin-read-proxy";
import type { VerifiedAdminContext } from "@/lib/server/trr-api/internal-admin-auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const COVER_PHOTO_ENVELOPE_KEYS = new Set(["coverPhoto"]);
const COVER_PHOTO_READ_KEYS = new Set(["person_id", "photo_id", "photo_url"]);
const COVER_PHOTO_V2_KEYS = new Set([
  "person_id",
  "photo_id",
  "photo_url",
  "created_at",
  "updated_at",
  "created_by_firebase_uid",
]);
const DELETE_RESPONSE_KEYS = new Set(["success", "removed"]);

export interface PersonCoverPhotoRead {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

export interface PersonCoverPhoto extends PersonCoverPhotoRead {
  created_at: string;
  updated_at: string;
  created_by_firebase_uid: string;
}

export interface SetCoverPhotoInput {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

type CoverPhotoReadOptions = {
  adminContext: VerifiedAdminContext;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasExactKeys = (value: Record<string, unknown>, keys: ReadonlySet<string>): boolean =>
  Object.keys(value).length === keys.size && Object.keys(value).every((key) => keys.has(key));

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.host);
  } catch {
    return false;
  }
};

const isRfc3339 = (value: unknown): value is string =>
  typeof value === "string" &&
  RFC3339_PATTERN.test(value) &&
  Number.isFinite(Date.parse(value));

const invalidBackendResponse = (): AdminReadProxyError =>
  new AdminReadProxyError("TRR-Backend returned an invalid person cover-photo response", 502, {
    code: "INVALID_BACKEND_RESPONSE",
    retryable: false,
  });

const parseReadRecord = (value: unknown, options: { strict: boolean }): PersonCoverPhotoRead => {
  if (
    !isRecord(value) ||
    (options.strict && !hasExactKeys(value, COVER_PHOTO_READ_KEYS)) ||
    typeof value.person_id !== "string" ||
    !UUID_PATTERN.test(value.person_id) ||
    typeof value.photo_id !== "string" ||
    value.photo_id.trim().length === 0 ||
    typeof value.photo_url !== "string" ||
    !isValidHttpUrl(value.photo_url)
  ) {
    throw invalidBackendResponse();
  }
  return {
    person_id: value.person_id,
    photo_id: value.photo_id,
    photo_url: value.photo_url,
  };
};

const parseV2Record = (value: unknown): PersonCoverPhoto => {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, COVER_PHOTO_V2_KEYS) ||
    !isRfc3339(value.created_at) ||
    !isRfc3339(value.updated_at) ||
    typeof value.created_by_firebase_uid !== "string" ||
    value.created_by_firebase_uid.trim().length === 0
  ) {
    throw invalidBackendResponse();
  }
  return {
    ...parseReadRecord(value, { strict: false }),
    created_at: value.created_at,
    updated_at: value.updated_at,
    created_by_firebase_uid: value.created_by_firebase_uid,
  };
};

const parseV2Payload = (data: Record<string, unknown>): PersonCoverPhoto | null => {
  if (!hasExactKeys(data, COVER_PHOTO_ENVELOPE_KEYS)) throw invalidBackendResponse();
  return data.coverPhoto === null ? null : parseV2Record(data.coverPhoto);
};

const parseLegacyPayload = (data: Record<string, unknown>): PersonCoverPhotoRead | null => {
  if (!hasExactKeys(data, COVER_PHOTO_ENVELOPE_KEYS)) throw invalidBackendResponse();
  return data.coverPhoto === null
    ? null
    : parseReadRecord(data.coverPhoto, { strict: true });
};

const isMissingV2Route = (upstream: AdminBackendJsonResult): boolean =>
  upstream.status === 404 &&
  hasExactKeys(upstream.data, new Set(["detail"])) &&
  upstream.data.detail === "Not Found";

const assertMatchingPerson = (photo: PersonCoverPhotoRead | null, personId: string): void => {
  if (photo && photo.person_id.toLowerCase() !== personId.toLowerCase()) {
    throw invalidBackendResponse();
  }
};

const loadLegacyCoverPhoto = async (
  personId: string,
  options: CoverPhotoReadOptions,
): Promise<PersonCoverPhotoRead | null> => {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(personId)}/cover-photo`,
    {
      apiVersion: "v1",
      adminContext: options.adminContext,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-cover-photo-legacy",
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to get the legacy person cover photo",
      routeName: "person-cover-photo-legacy",
    });
  }
  const coverPhoto = parseLegacyPayload(upstream.data);
  assertMatchingPerson(coverPhoto, personId);
  return coverPhoto;
};

export async function getCoverPhoto(
  personId: string,
  options: CoverPhotoReadOptions,
): Promise<PersonCoverPhotoRead | null> {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(personId)}/cover-photos`,
    {
      apiVersion: "v2",
      adminContext: options.adminContext,
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-cover-photo",
    },
  );
  if (upstream.status === 200) {
    const fullPhoto = parseV2Payload(upstream.data);
    assertMatchingPerson(fullPhoto, personId);
    return fullPhoto
      ? {
          person_id: fullPhoto.person_id,
          photo_id: fullPhoto.photo_id,
          photo_url: fullPhoto.photo_url,
        }
      : null;
  }
  if (isMissingV2Route(upstream)) {
    return loadLegacyCoverPhoto(personId, options);
  }
  throw buildAdminBackendStatusError({
    status: upstream.status,
    data: upstream.data,
    fallbackMessage: "Failed to get the person cover photo",
    routeName: "person-cover-photo",
  });
}

export async function setCoverPhoto(
  adminContext: VerifiedAdminContext,
  input: SetCoverPhotoInput,
): Promise<PersonCoverPhoto> {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(input.person_id)}/cover-photos`,
    {
      apiVersion: "v2",
      adminContext,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: input.photo_id, photo_url: input.photo_url }),
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-cover-photo",
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to set the person cover photo",
      routeName: "person-cover-photo",
    });
  }
  const coverPhoto = parseV2Payload(upstream.data);
  if (
    !coverPhoto ||
    coverPhoto.person_id.toLowerCase() !== input.person_id.toLowerCase() ||
    coverPhoto.photo_id !== input.photo_id ||
    coverPhoto.photo_url !== input.photo_url
  ) {
    throw invalidBackendResponse();
  }
  return coverPhoto;
}

export async function removeCoverPhoto(
  adminContext: VerifiedAdminContext,
  personId: string,
): Promise<boolean> {
  const upstream = await fetchAdminBackendJson(
    `/admin/people/${encodeURIComponent(personId)}/cover-photos`,
    {
      apiVersion: "v2",
      adminContext,
      method: "DELETE",
      timeoutMs: ADMIN_READ_PROXY_SHORT_TIMEOUT_MS,
      routeName: "person-cover-photo",
    },
  );
  if (upstream.status !== 200) {
    throw buildAdminBackendStatusError({
      status: upstream.status,
      data: upstream.data,
      fallbackMessage: "Failed to remove the person cover photo",
      routeName: "person-cover-photo",
    });
  }
  if (
    !hasExactKeys(upstream.data, DELETE_RESPONSE_KEYS) ||
    upstream.data.success !== true ||
    typeof upstream.data.removed !== "boolean"
  ) {
    throw invalidBackendResponse();
  }
  return upstream.data.removed;
}

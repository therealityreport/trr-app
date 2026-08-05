import { notFound, permanentRedirect } from "next/navigation";

import {
  PublicIdentityApiError,
  type PublicPersonIdentityContext,
} from "@/lib/server/trr-api/public-identities";

const PUBLIC_SITE_ORIGIN = "https://thereality.report";
const USER_ADDRESSABLE_IDENTITY_STATUSES = new Set([400, 404, 409]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SEASON_NUMBER = 2_147_483_647;

export type PublicPersonSearchParams = {
  showId?: string | string[];
};

export async function resolvePublicIdentityForRoute<T>(
  resolveIdentity: () => Promise<T>,
): Promise<T> {
  try {
    return await resolveIdentity();
  } catch (error) {
    if (
      error instanceof PublicIdentityApiError &&
      USER_ADDRESSABLE_IDENTITY_STATUSES.has(error.status)
    ) {
      notFound();
    }
    throw error;
  }
}

export function parsePublicSeasonNumber(value: string): number {
  if (!/^\d+$/.test(value)) {
    notFound();
  }
  const seasonNumber = Number(value);
  if (
    !Number.isSafeInteger(seasonNumber) ||
    seasonNumber < 0 ||
    seasonNumber > MAX_SEASON_NUMBER
  ) {
    notFound();
  }
  return seasonNumber;
}

export function personIdentityContext(
  searchParams: PublicPersonSearchParams | undefined,
): PublicPersonIdentityContext | undefined {
  const rawShowId = searchParams?.showId;
  const showId = Array.isArray(rawShowId) ? rawShowId[0] : rawShowId;
  if (showId === undefined) return undefined;
  return UUID_RE.test(showId) ? { showId } : { showSlug: showId };
}

export function publicRoutePath(basePath: string, suffix: string[] | undefined): string {
  if (!suffix?.length) return basePath;
  return `${basePath}/${suffix.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export function requestedPublicRoutePath(
  segments: readonly string[],
  suffix?: string[],
): string {
  const basePath = `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  return publicRoutePath(basePath, suffix);
}

export function redirectToCanonicalPublicPath(
  requestedPath: string,
  canonicalPath: string,
  dropSearchParams = false,
): void {
  if (dropSearchParams || requestedPath !== canonicalPath) {
    permanentRedirect(canonicalPath);
  }
}

export function absolutePublicCanonicalUrl(canonicalPath: string): string {
  return new URL(canonicalPath, PUBLIC_SITE_ORIGIN).toString();
}

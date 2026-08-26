export const ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "auth",
  "brands",
  "bravodle",
  "dev-dashboard",
  "docs",
  "design-system",
  "games",
  "groups",
  "hub",
  "login",
  "privacy-policy",
  "people",
  "profile",
  "realations",
  "realitease",
  "screenalytics",
  "screenlaytics",
  "settings",
  "social",
  "social-media",
  "shows",
  "surveys",
  "terms-of-sale",
  "terms-of-service",
  "test-auth",
  "users",
]);

export function isReservedRootShowRouteFirstSegment(value: string | null | undefined): boolean {
  return typeof value === "string" && ROOT_SHOW_ROUTE_RESERVED_FIRST_SEGMENTS.has(value.trim().toLowerCase());
}

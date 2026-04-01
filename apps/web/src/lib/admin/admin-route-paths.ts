import type { Route } from "next";

export const ADMIN_ROOT_PATH = "/admin" as Route;
export const ADMIN_SHOWS_PATH = "/admin/shows" as Route;
export const ADMIN_GAMES_PATH = "/admin/games" as Route;
export const ADMIN_PEOPLE_PATH = "/admin/people" as Route;
export const ADMIN_BRANDS_PATH = "/admin/brands" as Route;
export const ADMIN_SOCIAL_PATH = "/admin/social" as Route;
export const ADMIN_DESIGN_DOCS_PATH = "/design-docs" as Route;
export const ADMIN_API_REFERENCES_PATH = "/admin/api-references" as Route;
export const ADMIN_DEV_DASHBOARD_PATH = "/admin/dev-dashboard" as Route;
export const ADMIN_SURVEYS_PATH = "/admin/surveys" as Route;

export const buildDesignDocsPath = (suffix = ""): Route => {
  const normalizedSuffix = suffix.trim().replace(/^\/+/, "");
  return (normalizedSuffix ? `${ADMIN_DESIGN_DOCS_PATH}/${normalizedSuffix}` : ADMIN_DESIGN_DOCS_PATH) as Route;
};

export const buildSocialPath = (suffix = ""): Route => {
  const normalizedSuffix = suffix.trim().replace(/^\/+/, "");
  return (normalizedSuffix ? `${ADMIN_SOCIAL_PATH}/${normalizedSuffix}` : ADMIN_SOCIAL_PATH) as Route;
};

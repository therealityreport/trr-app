import type { Route } from "next";

export const ADMIN_ROOT_PATH = "/" as Route;
export const ADMIN_SHOWS_PATH = "/shows" as Route;
export const ADMIN_GAMES_PATH = "/games" as Route;
export const ADMIN_PEOPLE_PATH = "/people" as Route;
export const ADMIN_BRANDS_PATH = "/brands" as Route;
export const ADMIN_SOCIAL_PATH = "/social" as Route;
export const ADMIN_DESIGN_DOCS_PATH = "/design-docs" as Route;
export const ADMIN_API_REFERENCES_PATH = "/api-references" as Route;
export const ADMIN_DEV_DASHBOARD_PATH = "/dev-dashboard" as Route;
export const ADMIN_SURVEYS_PATH = "/surveys" as Route;

export const buildDesignDocsPath = (suffix = ""): Route => {
  const normalizedSuffix = suffix.trim().replace(/^\/+/, "");
  return (normalizedSuffix ? `${ADMIN_DESIGN_DOCS_PATH}/${normalizedSuffix}` : ADMIN_DESIGN_DOCS_PATH) as Route;
};

export const buildSocialPath = (suffix = ""): Route => {
  const normalizedSuffix = suffix.trim().replace(/^\/+/, "");
  return (normalizedSuffix ? `${ADMIN_SOCIAL_PATH}/${normalizedSuffix}` : ADMIN_SOCIAL_PATH) as Route;
};

export type AdminBreadcrumbItem = {
  label: string;
  href?: string;
};

const ADMIN_ROOT_LABEL = "Admin";
const ADMIN_ROOT_HREF = "/admin";

const toSafeDecoded = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const toTitleCase = (value: string): string =>
  value
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.length <= 3 && /^[A-Z0-9]+$/.test(part)) {
        return part;
      }
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");

export const humanizeSlug = (slug: string): string => {
  const decoded = toSafeDecoded(slug).trim();
  if (!decoded) return "Unknown";
  const normalized = decoded.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return "Unknown";
  return toTitleCase(normalized);
};

export const humanizePersonSlug = (slug: string): string => {
  const withoutCollisionSuffix = slug.replace(/--[0-9a-f]{8}$/i, "");
  return humanizeSlug(withoutCollisionSuffix);
};

export const buildAdminRootBreadcrumb = (): AdminBreadcrumbItem[] => [
  { label: ADMIN_ROOT_LABEL },
];

export const buildAdminSectionBreadcrumb = (
  sectionLabel: string,
  sectionHref?: string,
): AdminBreadcrumbItem[] => [
  { label: ADMIN_ROOT_LABEL, href: ADMIN_ROOT_HREF },
  sectionHref ? { label: sectionLabel, href: sectionHref } : { label: sectionLabel },
];

export const buildNetworkDetailBreadcrumb = (entityLabel: string): AdminBreadcrumbItem[] => [
  ...buildAdminSectionBreadcrumb("Networks & Streaming", "/admin/networks"),
  { label: entityLabel },
];

export const buildShowBreadcrumb = (
  showName: string,
  options?: { showHref?: string | null },
): AdminBreadcrumbItem[] => {
  const showHref = options?.showHref?.trim();
  return [
    ...buildAdminSectionBreadcrumb("Shows", "/admin/trr-shows"),
    showHref ? { label: showName, href: showHref } : { label: showName },
  ];
};

export const buildSeasonBreadcrumb = (
  showName: string,
  seasonNumber: number | string,
  options?: { showHref?: string | null },
): AdminBreadcrumbItem[] => [
  ...buildShowBreadcrumb(showName, { showHref: options?.showHref }),
  { label: `Season ${seasonNumber}` },
];

export const buildPersonBreadcrumb = (
  personName: string,
  options?: {
    showName?: string | null;
    showHref?: string | null;
  },
): AdminBreadcrumbItem[] => {
  const showName = options?.showName?.trim();
  const showHref = options?.showHref?.trim();
  if (!showName) {
    return [
      ...buildAdminSectionBreadcrumb("Shows", "/admin/trr-shows"),
      { label: personName },
    ];
  }
  return [
    ...buildAdminSectionBreadcrumb("Shows", "/admin/trr-shows"),
    showHref ? { label: showName, href: showHref } : { label: showName },
    { label: personName },
  ];
};

export const buildSeasonWeekBreadcrumb = (
  showName: string,
  seasonNumber: number | string,
  weekLabel: string,
  options?: { showHref?: string | null },
): AdminBreadcrumbItem[] => [
  ...buildSeasonBreadcrumb(showName, seasonNumber, { showHref: options?.showHref }),
  { label: weekLabel },
];

export const buildSurveyDetailBreadcrumb = (
  surveyTitleOrKey: string,
): AdminBreadcrumbItem[] => [
  ...buildAdminSectionBreadcrumb("Survey Editor", "/admin/surveys"),
  { label: surveyTitleOrKey },
];

export const buildNormalizedSurveyDetailBreadcrumb = (
  surveyTitleOrSlug: string,
): AdminBreadcrumbItem[] => [
  ...buildAdminSectionBreadcrumb("Normalized Surveys", "/admin/surveys/normalized"),
  { label: surveyTitleOrSlug },
];

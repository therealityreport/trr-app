export type AdminBreadcrumbItem = {
  label: string;
  href: string;
};

const ADMIN_ROOT_LABEL = "Admin";
const ADMIN_ROOT_HREF = "/admin";
const SHOWS_SECTION_HREF = "/shows";
const BRANDS_SECTION_HREF = "/brands";

const toSafeDecoded = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const isAsciiUpperOrDigit = (part: string): boolean => {
  if (!part) return false;
  for (let index = 0; index < part.length; index += 1) {
    const code = part.charCodeAt(index);
    const isUpper = code >= 65 && code <= 90;
    const isDigit = code >= 48 && code <= 57;
    if (!isUpper && !isDigit) return false;
  }
  return true;
};

const normalizeSlugSeparators = (value: string): string => {
  let out = "";
  let lastWasSpace = false;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value[index];
    const code = ch.charCodeAt(0);
    const isWhitespace =
      code === 32 ||
      code === 9 ||
      code === 10 ||
      code === 13 ||
      code === 11 ||
      code === 12 ||
      code === 160;
    const isSeparator = ch === "_" || ch === "-" || isWhitespace;
    if (isSeparator) {
      if (!lastWasSpace) {
        out += " ";
        lastWasSpace = true;
      }
      continue;
    }
    out += ch;
    lastWasSpace = false;
  }
  return out.trim();
};

const stripCollisionSuffix = (slug: string): string => {
  if (slug.length < 10) return slug;
  if (slug[slug.length - 10] !== "-" || slug[slug.length - 9] !== "-") return slug;
  const suffix = slug.slice(-8);
  for (let index = 0; index < suffix.length; index += 1) {
    const code = suffix.charCodeAt(index);
    const isDigit = code >= 48 && code <= 57;
    const isLowerHex = code >= 97 && code <= 102;
    const isUpperHex = code >= 65 && code <= 70;
    if (!isDigit && !isLowerHex && !isUpperHex) return slug;
  }
  return slug.slice(0, -10);
};

const toTitleCase = (value: string): string =>
  value
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.length <= 3 && isAsciiUpperOrDigit(part)) {
        return part;
      }
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");

export const humanizeSlug = (slug: string): string => {
  const decoded = toSafeDecoded(slug).trim();
  if (!decoded) return "Unknown";
  const normalized = normalizeSlugSeparators(decoded);
  if (!normalized) return "Unknown";
  return toTitleCase(normalized);
};

export const humanizePersonSlug = (slug: string): string => {
  const withoutCollisionSuffix = stripCollisionSuffix(slug);
  return humanizeSlug(withoutCollisionSuffix);
};

export const buildAdminRootBreadcrumb = (): AdminBreadcrumbItem[] => [
  { label: ADMIN_ROOT_LABEL, href: ADMIN_ROOT_HREF },
];

export const buildAdminSectionBreadcrumb = (
  sectionLabel: string,
  sectionHref: string,
): AdminBreadcrumbItem[] => [
  { label: ADMIN_ROOT_LABEL, href: ADMIN_ROOT_HREF },
  { label: sectionLabel, href: sectionHref },
];

export const buildBrandsSectionBreadcrumb = (): AdminBreadcrumbItem[] =>
  buildAdminSectionBreadcrumb("Brands", BRANDS_SECTION_HREF);

export const buildBrandsPageBreadcrumb = (
  pageLabel: string,
  pageHref: string,
): AdminBreadcrumbItem[] => [
  ...buildBrandsSectionBreadcrumb(),
  { label: pageLabel, href: pageHref },
];

export const buildNetworkDetailBreadcrumb = (
  entityLabel: string,
  entityHref: string,
): AdminBreadcrumbItem[] => [
  ...buildBrandsPageBreadcrumb("Networks & Streaming Services", "/brands/networks-and-streaming"),
  { label: entityLabel, href: entityHref },
];

export const buildShowBreadcrumb = (
  showName: string,
  options: { showHref: string },
): AdminBreadcrumbItem[] => {
  return [
    ...buildAdminSectionBreadcrumb("Shows", SHOWS_SECTION_HREF),
    { label: showName, href: options.showHref.trim() || SHOWS_SECTION_HREF },
  ];
};

export const buildSeasonBreadcrumb = (
  showName: string,
  seasonNumber: number | string,
  options: { showHref: string; seasonHref: string },
): AdminBreadcrumbItem[] => [
  ...buildShowBreadcrumb(showName, { showHref: options.showHref }),
  { label: `Season ${seasonNumber}`, href: options.seasonHref.trim() || SHOWS_SECTION_HREF },
];

export const buildPersonBreadcrumb = (
  personName: string,
  options: {
    personHref: string;
    showName?: string | null;
    showHref?: string;
  },
): AdminBreadcrumbItem[] => {
  const showName = options?.showName?.trim();
  const showHref = options?.showHref?.trim() || SHOWS_SECTION_HREF;
  const personHref = options.personHref.trim() || SHOWS_SECTION_HREF;
  if (!showName) {
    return [
      ...buildAdminSectionBreadcrumb("Shows", SHOWS_SECTION_HREF),
      { label: personName, href: personHref },
    ];
  }
  return [
    ...buildAdminSectionBreadcrumb("Shows", SHOWS_SECTION_HREF),
    { label: showName, href: showHref },
    { label: personName, href: personHref },
  ];
};

export const buildSeasonSocialBreadcrumb = (
  showName: string,
  seasonNumber: number | string,
  options: {
    showHref: string;
    seasonHref: string;
    socialHref: string;
    socialLabel?: string;
    subTabLabel?: string;
    subTabHref?: string;
  },
): AdminBreadcrumbItem[] => {
  const socialLabel = options.socialLabel?.trim() || "Social Media";
  const normalizedSeasonNumber =
    typeof seasonNumber === "number"
      ? Number.isFinite(seasonNumber)
        ? String(seasonNumber)
        : ""
      : seasonNumber.trim();

  const trail: AdminBreadcrumbItem[] = [...buildShowBreadcrumb(showName, { showHref: options.showHref })];

  if (normalizedSeasonNumber.length > 0) {
    trail.push({
      label: `Season ${normalizedSeasonNumber}`,
      href: options.seasonHref.trim() || options.showHref.trim() || SHOWS_SECTION_HREF,
    });
  }

  trail.push({
    label: socialLabel,
    href: options.socialHref.trim() || options.showHref.trim() || SHOWS_SECTION_HREF,
  });
  const subTabLabel = options.subTabLabel?.trim();
  if (subTabLabel) {
    trail.push({
      label: subTabLabel,
      href: options.subTabHref?.trim() || options.socialHref.trim() || options.showHref.trim() || SHOWS_SECTION_HREF,
    });
  }
  return trail;
};

export const buildSeasonWeekBreadcrumb = (
  showName: string,
  seasonNumber: number | string,
  weekLabel: string,
  options: {
    showHref: string;
    seasonHref: string;
    weekHref: string;
    socialHref?: string;
    socialLabel?: string;
    subTabLabel?: string;
    subTabHref?: string;
  },
): AdminBreadcrumbItem[] => [
  ...(options.socialHref
    ? buildSeasonSocialBreadcrumb(showName, seasonNumber, {
        showHref: options.showHref,
        seasonHref: options.seasonHref,
        socialHref: options.socialHref,
        socialLabel: options.socialLabel,
        subTabLabel: options.subTabLabel,
        subTabHref: options.subTabHref,
      })
    : buildSeasonBreadcrumb(showName, seasonNumber, {
        showHref: options.showHref,
        seasonHref: options.seasonHref,
      })),
  {
    label: weekLabel,
    href:
      options.weekHref.trim() ||
      options.socialHref?.trim() ||
      options.seasonHref.trim() ||
      SHOWS_SECTION_HREF,
  },
];

export const buildSurveyDetailBreadcrumb = (
  surveyTitleOrKey: string,
  surveyHref: string,
): AdminBreadcrumbItem[] => [
  ...buildAdminSectionBreadcrumb("Survey Editor", "/admin/surveys"),
  { label: surveyTitleOrKey, href: surveyHref },
];

export const buildNormalizedSurveyDetailBreadcrumb = (
  surveyTitleOrSlug: string,
  surveyHref: string,
): AdminBreadcrumbItem[] => [
  ...buildAdminSectionBreadcrumb("Normalized Surveys", "/admin/surveys/normalized"),
  { label: surveyTitleOrSlug, href: surveyHref },
];

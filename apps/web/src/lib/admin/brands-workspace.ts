export type UnifiedBrandsCategory =
  | "all"
  | "network"
  | "streaming"
  | "production"
  | "shows"
  | "publication"
  | "social"
  | "other";

export type UnifiedBrandsView = "table" | "gallery";

export type UnifiedBrandsSyncTargetType =
  | "network"
  | "streaming"
  | "production"
  | "show"
  | "franchise"
  | "publication"
  | "social"
  | "other";

export type UnifiedBrandsSectionTargetType =
  | "network"
  | "streaming"
  | "production"
  | "franchise"
  | "publication"
  | "social"
  | "other";

export const DEFAULT_UNIFIED_BRANDS_CATEGORY: UnifiedBrandsCategory = "all";
export const DEFAULT_UNIFIED_BRANDS_VIEW: UnifiedBrandsView = "table";

export const UNIFIED_BRANDS_CATEGORY_OPTIONS: ReadonlyArray<{
  value: UnifiedBrandsCategory;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "network", label: "Network" },
  { value: "streaming", label: "Streaming Services" },
  { value: "production", label: "Production Companies" },
  { value: "shows", label: "Shows" },
  { value: "publication", label: "Publications/News" },
  { value: "social", label: "Social Media" },
  { value: "other", label: "Other" },
];

export const UNIFIED_BRANDS_VIEW_OPTIONS: ReadonlyArray<{
  value: UnifiedBrandsView;
  label: string;
}> = [
  { value: "table", label: "Table View" },
  { value: "gallery", label: "Gallery View" },
];

const CATEGORY_TO_TARGET_TYPES: Record<UnifiedBrandsCategory, UnifiedBrandsSyncTargetType[]> = {
  all: ["network", "streaming", "production", "show", "franchise", "publication", "social", "other"],
  network: ["network"],
  streaming: ["streaming"],
  production: ["production"],
  shows: ["show", "franchise"],
  publication: ["publication"],
  social: ["social"],
  other: ["other"],
};

const SECTION_TARGET_TO_CATEGORY: Record<UnifiedBrandsSectionTargetType, UnifiedBrandsCategory> = {
  network: "network",
  streaming: "streaming",
  production: "production",
  franchise: "shows",
  publication: "publication",
  social: "social",
  other: "other",
};

export const normalizeUnifiedBrandsCategory = (
  value: string | null | undefined,
): UnifiedBrandsCategory => {
  switch (value) {
    case "network":
    case "streaming":
    case "production":
    case "shows":
    case "publication":
    case "social":
    case "other":
      return value;
    default:
      return DEFAULT_UNIFIED_BRANDS_CATEGORY;
  }
};

export const normalizeUnifiedBrandsView = (
  value: string | null | undefined,
): UnifiedBrandsView => {
  return value === "gallery" ? "gallery" : DEFAULT_UNIFIED_BRANDS_VIEW;
};

export const getUnifiedBrandsTargetTypes = (
  category: UnifiedBrandsCategory,
): UnifiedBrandsSyncTargetType[] => CATEGORY_TO_TARGET_TYPES[category];

export const buildUnifiedBrandsHref = (
  category: UnifiedBrandsCategory = DEFAULT_UNIFIED_BRANDS_CATEGORY,
  view: UnifiedBrandsView = DEFAULT_UNIFIED_BRANDS_VIEW,
): string => {
  const searchParams = new URLSearchParams();
  if (category !== DEFAULT_UNIFIED_BRANDS_CATEGORY) {
    searchParams.set("category", category);
  }
  if (view !== DEFAULT_UNIFIED_BRANDS_VIEW) {
    searchParams.set("view", view);
  }
  const search = searchParams.toString();
  return search ? `/brands?${search}` : "/brands";
};

export const getUnifiedBrandsSectionHref = (
  targetType: UnifiedBrandsSectionTargetType,
): string => buildUnifiedBrandsHref(SECTION_TARGET_TO_CATEGORY[targetType]);

export const appendSearchParam = (
  href: string,
  key: string,
  value: string,
): string => {
  const [pathname, existingSearch = ""] = href.split("?", 2);
  const searchParams = new URLSearchParams(existingSearch);
  searchParams.set(key, value);
  const search = searchParams.toString();
  return search ? `${pathname}?${search}` : pathname;
};

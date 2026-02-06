import type { AdvancedFilterState } from "@/lib/admin/advanced-filters";
import {
  inferHasTextOverlay,
  inferPeopleCountFromMetadata,
  matchesContentTypesForSeasonAsset,
} from "@/lib/gallery-filter-utils";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

type SeasonAssetFilterOptions = {
  showName?: string;
  getSeasonNumber?: (asset: SeasonAsset) => number | undefined;
  getSortDate?: (asset: SeasonAsset) => number;
};

const defaultGetSortDate = (asset: SeasonAsset): number => {
  const raw = asset.fetched_at ?? asset.created_at ?? null;
  if (!raw) return 0;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
};

export function applyAdvancedFiltersToSeasonAssets(
  assets: SeasonAsset[],
  filters: AdvancedFilterState,
  opts?: SeasonAssetFilterOptions
): SeasonAsset[] {
  const getSeasonNumber =
    opts?.getSeasonNumber ??
    ((asset: SeasonAsset) =>
      typeof asset.season_number === "number" ? asset.season_number : undefined);
  const getSortDate = opts?.getSortDate ?? defaultGetSortDate;

  let result = [...assets];

  // Sources (OR within category)
  if (filters.sources.length > 0) {
    result = result.filter((a) => filters.sources.includes(a.source));
  }

  // Text overlay (exactly one of TEXT/NO TEXT)
  const wantsText = filters.text.includes("text");
  const wantsNoText = filters.text.includes("no_text");
  const textFilterActive = wantsText !== wantsNoText;
  if (textFilterActive) {
    result = result.filter((a) => {
      const v = inferHasTextOverlay(a.metadata ?? null);
      if (v === null) return false;
      return wantsText ? v === true : v === false;
    });
  }

  // Solo/group (exactly one)
  const wantsSolo = filters.people.includes("solo");
  const wantsGroup = filters.people.includes("group");
  const peopleFilterActive = wantsSolo !== wantsGroup;
  if (peopleFilterActive) {
    result = result.filter((a) => {
      const count = inferPeopleCountFromMetadata(a.metadata ?? null);
      if (count === null) return false;
      return wantsSolo ? count <= 1 : count >= 2;
    });
  }

  // Content type
  if (filters.contentTypes.length > 0) {
    result = result.filter((a) =>
      matchesContentTypesForSeasonAsset(
        a,
        filters.contentTypes,
        getSeasonNumber(a),
        opts?.showName
      )
    );
  }

  // Sort
  switch (filters.sort) {
    case "oldest":
      result.sort((a, b) => getSortDate(a) - getSortDate(b));
      break;
    case "source":
      result.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
      break;
    case "newest":
    default:
      result.sort((a, b) => getSortDate(b) - getSortDate(a));
      break;
  }

  return result;
}


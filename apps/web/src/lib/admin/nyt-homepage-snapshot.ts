import { NYT_HOMEPAGE_SOURCE_EXPORT } from "@/lib/admin/nyt-homepage-source-export";
import { NYT_HOMEPAGE_SOURCE_BUNDLE } from "@/lib/admin/nyt-homepage-source-bundle";

export const NYT_HOMEPAGE_SNAPSHOT = {
  ...NYT_HOMEPAGE_SOURCE_EXPORT,
  sourceBundle: NYT_HOMEPAGE_SOURCE_BUNDLE,
} as const;

export type NytHomepageSnapshot = typeof NYT_HOMEPAGE_SNAPSHOT;

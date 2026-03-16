import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";

import { ShowFeaturedMediaSelectors } from "@/components/admin/show-tabs/ShowFeaturedMediaSelectors";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (
    rawProps: ImgHTMLAttributes<HTMLImageElement> & {
      fill?: boolean;
      unoptimized?: boolean;
    },
  ) => {
    const props = { ...rawProps };
    delete props.fill;
    delete props.unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={rawProps.alt ?? ""} />;
  },
}));

const buildAsset = (id: string, kind: "poster" | "backdrop"): SeasonAsset =>
  ({
    id,
    type: "show",
    origin_table: "show_images",
    source: "manual",
    kind,
    hosted_url: `https://cdn.example.com/${id}.jpg`,
    width: null,
    height: null,
    caption: `${kind} ${id}`,
  }) as SeasonAsset;

describe("ShowFeaturedMediaSelectors", () => {
  it("uses portrait and landscape preview shells for poster and backdrop cards", () => {
    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[buildAsset("poster-1", "poster")]}
        backdropAssets={[buildAsset("backdrop-1", "backdrop")]}
        featuredPosterImageId="poster-1"
        featuredBackdropImageId="backdrop-1"
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={vi.fn()}
        onSetFeaturedBackdrop={vi.fn()}
      />,
    );

    expect(screen.getByTestId("featured-poster-preview")).toHaveClass("aspect-[2/3]");
    expect(screen.getByTestId("featured-backdrop-preview")).toHaveClass("aspect-[16/9]");
  });
});

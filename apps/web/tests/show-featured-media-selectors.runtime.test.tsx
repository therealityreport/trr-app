import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { ShowFeaturedMediaSelectors } from "@/components/admin/show-tabs/ShowFeaturedMediaSelectors";

const buildShowImage = (
  id: string,
  kind: "poster" | "backdrop",
  overrides?: Partial<SeasonAsset>
): SeasonAsset =>
  ({
    id,
    type: "show",
    origin_table: "show_images",
    source: "manual",
    kind,
    hosted_url: `https://cdn.example.com/${id}.png`,
    width: null,
    height: null,
    caption: null,
    ...overrides,
  }) as SeasonAsset;

describe("ShowFeaturedMediaSelectors", () => {
  it("updates featured poster and backdrop from selector containers", () => {
    const poster = buildShowImage("poster-1", "poster");
    const backdrop = buildShowImage("backdrop-1", "backdrop");
    const onSetFeaturedPoster = vi.fn();
    const onSetFeaturedBackdrop = vi.fn();

    render(
      <ShowFeaturedMediaSelectors
        posterAssets={[poster]}
        backdropAssets={[backdrop]}
        featuredPosterImageId={null}
        featuredBackdropImageId={null}
        getAssetDisplayUrl={(asset) => asset.hosted_url}
        onSetFeaturedPoster={onSetFeaturedPoster}
        onSetFeaturedBackdrop={onSetFeaturedBackdrop}
      />
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "poster-1" } });
    expect(onSetFeaturedPoster).toHaveBeenCalledWith("poster-1");

    fireEvent.change(selects[1], { target: { value: "backdrop-1" } });
    expect(onSetFeaturedBackdrop).toHaveBeenCalledWith("backdrop-1");
  });
});

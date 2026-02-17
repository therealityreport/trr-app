import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import type { PhotoMetadata } from "@/lib/photo-metadata";

const buildMetadata = (overrides?: Partial<PhotoMetadata>): PhotoMetadata => ({
  source: "fandom",
  sourceBadgeColor: "#00d6a3",
  s3MirrorFileName: "4055eccc0ce3edbf4a37ef7bbe9297d943605402a2157fd6536864487c1c49be.webp",
  sourcePageTitle: "Lisa Barlow",
  sourceUrl: "https://real-housewives.fandom.com/wiki/Lisa_Barlow",
  originalImageUrl: "https://static.wikia.nocookie.net/rhoslc/images/lisa.jpg",
  caption: null,
  dimensions: null,
  season: null,
  contextType: null,
  people: [],
  titles: [],
  fetchedAt: null,
  ...overrides,
});

const openMetadataPanel = () => {
  fireEvent.click(screen.getByLabelText("Show metadata"));
};

describe("ImageLightbox metadata panel", () => {
  it("renders Original URL link with new-tab attributes", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
      />
    );

    openMetadataPanel();

    const link = screen.getByRole("link", { name: "https://static.wikia.nocookie.net/rhoslc/images/lisa.jpg" });
    expect(link).toHaveAttribute("href", "https://static.wikia.nocookie.net/rhoslc/images/lisa.jpg");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("shows Original URL unavailable when true source URL is missing", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({ originalImageUrl: null })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Original URL unavailable")).toBeInTheDocument();
  });

  it("renders Found on row as normalized SOURCE | PAGE TITLE", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          source: "web_scrape:example.com",
          sourceUrl: "https://example.com/lisa-barlow-photo",
          sourcePageTitle: "Unknown Page",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("EXAMPLE.COM | Unknown Page")).toBeInTheDocument();
  });
});

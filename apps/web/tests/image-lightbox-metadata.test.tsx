import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import type { PhotoMetadata } from "@/lib/photo-metadata";

const buildMetadata = (overrides?: Partial<PhotoMetadata>): PhotoMetadata => ({
  source: "fandom",
  sourceBadgeColor: "#00d6a3",
  contentType: "PROMO",
  isS3Mirrored: true,
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
  const buttons = screen.getAllByLabelText("Show metadata");
  const lastButton = buttons[buttons.length - 1];
  fireEvent.click(lastButton);
};

describe("ImageLightbox metadata panel", () => {
  it("shows S3 mirror details and badge when media is mirrored", () => {
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

    expect(screen.getAllByText("S3 Mirror File").length).toBeGreaterThan(0);
    expect(screen.getAllByText("S3 MIRROR").length).toBeGreaterThan(0);
  });

  it("hides S3 mirror details when media is not mirrored", () => {
    render(
      <ImageLightbox
        src="https://static.wikia.nocookie.net/rhoslc/images/lisa.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          isS3Mirrored: false,
          s3MirrorFileName: null,
        })}
      />
    );

    openMetadataPanel();

    expect(screen.queryByText("S3 Mirror File")).not.toBeInTheDocument();
    expect(screen.queryByText("S3 MIRROR")).not.toBeInTheDocument();
  });

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

  it("shows Original source file URL unavailable when true source URL is missing", () => {
    const metadata = buildMetadata();
    metadata.originalSourceFileUrl = null;
    metadata.originalSourcePageUrl = null;
    metadata.originalImageUrl = null;
    metadata.sourceUrl = null;

    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={metadata}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Original source file URL unavailable")).toBeInTheDocument();
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

  it("renders explicit Show field in metadata coverage", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          showName: "The Traitors",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByText("The Traitors")).toBeInTheDocument();
  });

  it("renders credit type and event metadata rows", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          contentType: "EVENT",
          mediaTypeLabel: "Event",
          eventName: "The 77th Primetime Emmy Awards",
          imdbCreditType: "TV Movie",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Credit Type")).toBeInTheDocument();
    expect(screen.getByText("TV Movie")).toBeInTheDocument();
    expect(screen.getByText("Media Type")).toBeInTheDocument();
    expect(screen.getAllByText("Event").length).toBeGreaterThan(0);
    expect(screen.getByText("Event Name")).toBeInTheDocument();
    expect(screen.getByText("The 77th Primetime Emmy Awards")).toBeInTheDocument();
  });

  it("renders fallback WWHL show and face crops in metadata coverage for merged canonical rows", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          showName: "Watch What Happens Live with Andy Cohen",
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.1,
              y: 0.1,
              width: 0.2,
              height: 0.2,
              person_name: "Alan Cumming",
            },
          ],
          faceCrops: [
            {
              index: 1,
              x: 0.08,
              y: 0.06,
              width: 0.26,
              height: 0.26,
              variantUrl: "https://cdn.example.com/face-crops/alan-wwhl.jpg",
              size: 256,
            },
          ],
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByText("Watch What Happens Live with Andy Cohen")).toBeInTheDocument();
    expect(screen.getAllByText("Face Crops").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Alan")).toBeInTheDocument();
  });

  it("shows unified Content Type control with Profile Picture option", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onUpdateContentType={vi.fn(async () => {})}
      />
    );

    openMetadataPanel();

    expect(screen.getByRole("option", { name: "Profile Picture" })).toBeInTheDocument();
    expect(screen.queryByText("IMDb Type")).not.toBeInTheDocument();
  });

  it("shows Refresh Full Pipeline action when refresh is available", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onRefresh={vi.fn(async () => {})}
      />
    );

    openMetadataPanel();

    expect(screen.getByRole("button", { name: "Refresh Full Pipeline" })).toBeInTheDocument();
  });

  it("renders Auto-Crop action label when resize handler is available", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onResize={vi.fn(async () => {})}
      />
    );

    openMetadataPanel();

    expect(screen.getByRole("button", { name: "Auto-Crop" })).toBeInTheDocument();
  });

  it("renders placeholders for blank metadata fields instead of hiding rows", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          sourceVariant: null,
          sourcePageTitle: null,
          sourceUrl: null,
          sourceLogo: null,
          assetName: null,
          sectionTag: null,
          sectionLabel: null,
          fileType: null,
          createdAt: null,
          addedAt: null,
          season: null,
          episodeLabel: null,
          imdbType: null,
          contextType: null,
          caption: null,
          people: [],
          titles: [],
          fetchedAt: null,
          peopleCount: null,
          faceBoxes: [],
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getAllByText("Source Variant").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Section").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Caption").length).toBeGreaterThan(0);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders circular face crop chips in metadata when face crops are available", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.1,
              y: 0.1,
              width: 0.2,
              height: 0.2,
              person_name: "Alan Cumming",
            },
          ],
          faceCrops: [
            {
              index: 1,
              x: 0.08,
              y: 0.06,
              width: 0.26,
              height: 0.26,
              variantUrl: "https://cdn.example.com/face-crops/alan.jpg",
              size: 256,
            },
          ],
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getAllByText("Face Crops").length).toBeGreaterThan(0);
    expect(screen.getByText("Alan")).toBeInTheDocument();
    expect(screen.getByAltText("Alan")).toBeInTheDocument();
  });

  it("renders fallback person crop chips when face detections are unavailable", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.05,
              y: 0.08,
              width: 0.32,
              height: 0.44,
              label: "Person 1",
            },
          ],
          faceCrops: [
            {
              index: 1,
              x: 0.03,
              y: 0.02,
              width: 0.46,
              height: 0.46,
              variantUrl: "https://cdn.example.com/face-crops/person-fallback.jpg",
              size: 256,
            },
          ],
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getAllByText("Face Crops").length).toBeGreaterThan(0);
    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.getByAltText("Person 1")).toBeInTheDocument();
  });

  it("renders Edit and Star/Flag labels in manage mode", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        metadataExtras={<div>edit tools</div>}
        canManage
        onToggleStar={vi.fn(async () => {})}
      />
    );

    openMetadataPanel();

    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Star/Flag" }).length).toBeGreaterThan(0);
  });

  it("supports setting featured poster through management actions", async () => {
    const onSetFeaturedPoster = vi.fn(async () => {});

    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onSetFeaturedPoster={onSetFeaturedPoster}
      />
    );

    openMetadataPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Set as Featured Poster" })[0]);
    await waitFor(() => expect(onSetFeaturedPoster).toHaveBeenCalledTimes(1));
  });

  it("supports setting featured backdrop through management actions", async () => {
    const onSetFeaturedBackdrop = vi.fn(async () => {});

    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onSetFeaturedBackdrop={onSetFeaturedBackdrop}
      />
    );

    openMetadataPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Set as Featured Backdrop" })[0]);
    await waitFor(() => expect(onSetFeaturedBackdrop).toHaveBeenCalledTimes(1));
  });

  it("supports setting featured logo through management actions", async () => {
    const onSetFeaturedLogo = vi.fn(async () => {});

    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        onSetFeaturedLogo={onSetFeaturedLogo}
      />
    );

    openMetadataPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Set as Featured Logo" })[0]);
    await waitFor(() => expect(onSetFeaturedLogo).toHaveBeenCalledTimes(1));
  });

  it("shows featured state labels and disabled reasons for ineligible featured actions", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        isFeaturedPoster
        actionDisabledReasons={{
          featuredBackdrop: "Featured backdrop selection is unavailable for this image.",
        }}
      />
    );

    openMetadataPanel();

    const featuredPosterButtons = screen.getAllByRole("button", { name: "Clear Featured Poster" });
    expect(featuredPosterButtons.length).toBeGreaterThan(0);

    const featuredBackdropButtons = screen.getAllByRole("button", {
      name: "Set as Featured Backdrop",
    });
    expect(featuredBackdropButtons.length).toBeGreaterThan(0);
    expect(featuredBackdropButtons[0]).toBeDisabled();
    expect(featuredBackdropButtons[0]).toHaveAttribute(
      "title",
      "Featured backdrop selection is unavailable for this image."
    );
  });

  it("supports clearing featured poster and backdrop", async () => {
    const onClearFeaturedPoster = vi.fn(async () => {});
    const onClearFeaturedBackdrop = vi.fn(async () => {});

    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata()}
        canManage
        isFeaturedPoster
        isFeaturedBackdrop
        onSetFeaturedPoster={vi.fn(async () => {})}
        onSetFeaturedBackdrop={vi.fn(async () => {})}
        onClearFeaturedPoster={onClearFeaturedPoster}
        onClearFeaturedBackdrop={onClearFeaturedBackdrop}
      />
    );

    openMetadataPanel();

    fireEvent.click(screen.getAllByRole("button", { name: "Clear Featured Poster" })[0]);
    await waitFor(() => expect(onClearFeaturedPoster).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByRole("button", { name: "Clear Featured Backdrop" })[0]);
    await waitFor(() => expect(onClearFeaturedBackdrop).toHaveBeenCalledTimes(1));
  });
});

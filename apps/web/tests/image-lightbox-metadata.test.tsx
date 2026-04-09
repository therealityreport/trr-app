import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import type { PhotoMetadata } from "@/lib/photo-metadata";

const buildMetadata = (overrides?: Partial<PhotoMetadata>): PhotoMetadata => ({
  source: "fandom",
  sourceBadgeColor: "#00d6a3",
  contentType: "PROMO",
  isHostedMedia: true,
  hostedMediaFileName: "4055eccc0ce3edbf4a37ef7bbe9297d943605402a2157fd6536864487c1c49be.webp",
  hostedMediaUrl: "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/4055eccc0ce3edbf4a37ef7bbe9297d943605402a2157fd6536864487c1c49be.webp",
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
  it("shows hosted-media details and badge when media is mirrored", () => {
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

    expect(screen.getAllByText("Hosted Media File").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HOSTED MEDIA").length).toBeGreaterThan(0);
    const mirrorLinks = screen.getAllByRole("link", { name: "HOSTED MEDIA" });
    expect(mirrorLinks.length).toBeGreaterThan(0);
    expect(mirrorLinks[0]).toHaveAttribute(
      "href",
      "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/media/4055eccc0ce3edbf4a37ef7bbe9297d943605402a2157fd6536864487c1c49be.webp",
    );
  });

  it("hides hosted-media details when media is not mirrored", () => {
    render(
      <ImageLightbox
        src="https://static.wikia.nocookie.net/rhoslc/images/lisa.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          isHostedMedia: false,
          hostedMediaFileName: null,
        })}
      />
    );

    openMetadataPanel();

    expect(screen.queryByText("Hosted Media File")).not.toBeInTheDocument();
    expect(screen.queryByText("HOSTED MEDIA")).not.toBeInTheDocument();
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

  it("humanizes known scrape domains in the badge and Found on row", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          source: "web_scrape:bravotv.com",
          sourceUrl: "https://www.bravotv.com/the-daily-dish/jen-shah-gallery",
          sourcePageTitle: "Jen Shah Gallery",
        })}
      />
    );

    expect(screen.getAllByText(/BRAVO TV/i).length).toBeGreaterThan(0);

    openMetadataPanel();

    expect(screen.getByText("Bravo TV | Jen Shah Gallery")).toBeInTheDocument();
  });

  it("normalizes Getty provenance labels for NBCUMV-backed metadata", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          source: "nbcumv",
          sourceBadgeColor: "#0ea5e9",
          sourceUrl: "https://www.gettyimages.com/detail/news-photo/example/2264300032",
          sourcePageTitle: "Mac Forehand",
          originalSourceLabel: "GETTY",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getAllByText("GETTY").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Mac Forehand" }),
    ).toHaveAttribute(
      "href",
      "https://www.gettyimages.com/detail/news-photo/example/2264300032",
    );
  });

  it("renders a Google reverse-search link when Getty fallback metadata provides one", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          source: "getty",
          sourceUrl: "https://www.gettyimages.com/detail/news-photo/example/2264300032",
          sourcePageTitle: "Getty Example",
          originalSourceLabel: "GETTY",
          googleReverseImageSearchUrl:
            "https://www.google.com/searchbyimage?image_url=https%3A%2F%2Fmedia.gettyimages.com%2Fpreview.jpg",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByRole("link", { name: "Open Google Image Search" })).toHaveAttribute(
      "href",
      "https://www.google.com/searchbyimage?image_url=https%3A%2F%2Fmedia.gettyimages.com%2Fpreview.jpg",
    );
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

  it("renders face filtering diagnostics row when raw/filtered counts are available", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          faceCountRaw: 4,
          faceCountFiltered: 2,
          faceFilterThresholds: {
            min_side_px: 64,
            min_area_ratio: 0.02,
          },
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Face Filtering")).toBeInTheDocument();
    expect(screen.getByText("Faces raw 4 -> usable 2 (min side 64px, min area 2.0%)")).toBeInTheDocument();
  });

  it("renders credit media type, title imdb link, and event metadata rows", () => {
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
          imdbCreditMediaType: "TV Movie",
          imdbTitleId: "tt1234567",
          imdbTitleUrl: "https://www.imdb.com/title/tt1234567/",
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByText("Credit Media Type")).toBeInTheDocument();
    expect(screen.getByText("TV Movie")).toBeInTheDocument();
    const titleLink = screen.getByRole("link", { name: "tt1234567" });
    expect(titleLink).toHaveAttribute("href", "https://www.imdb.com/title/tt1234567/");
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

  it("shows face match reason and top candidates in chip + diagnostics", () => {
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
              match_status: "below_threshold",
              match_reason: "no_candidates",
              match_similarity: 0.812,
              confidence: 0.901,
              match_candidates: [
                {
                  person_name: "Susan Lucci",
                  similarity: 0.812,
                },
              ],
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

    expect(screen.getAllByText("Reason no candidates").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Top Susan Lucci 81.2%").length).toBeGreaterThan(0);
  });

  it("prefers top candidate name over metadata people index fallback for chip labels", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          people: ["Milo Ventimiglia"],
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.1,
              y: 0.1,
              width: 0.2,
              height: 0.2,
              match_status: "matched",
              match_reason: "matched",
              match_similarity: 0.768,
              match_candidates: [
                {
                  person_name: "Alan Cumming",
                  similarity: 0.768,
                },
              ],
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

    expect(screen.getByAltText("Alan")).toBeInTheDocument();
    expect(screen.queryByAltText("Milo")).not.toBeInTheDocument();
  });

  it("shows best-effort fallback name in chips even when match status is below threshold", () => {
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
              person_name: "Milo Ventimiglia",
              label: "Milo Ventimiglia",
              label_source: "best_effort_tag_map",
              match_status: "below_threshold",
              match_reason: "below_threshold",
              match_similarity: 0.078,
            },
          ],
          faceCrops: [
            {
              index: 1,
              x: 0.08,
              y: 0.06,
              width: 0.26,
              height: 0.26,
              variantUrl: "https://cdn.example.com/face-crops/milo.jpg",
              size: 256,
            },
          ],
        })}
      />
    );

    openMetadataPanel();

    expect(screen.getByAltText("Milo")).toBeInTheDocument();
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
    expect(screen.getAllByText("Person 1").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Person 1")).toBeInTheDocument();
  });

  it("renders face match diagnostics with status, similarity, confidence, and label source", () => {
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
              confidence: 0.934,
              match_status: "matched",
              match_similarity: 0.912,
              label_source: "identity_match",
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

    expect(screen.getByText("Face Match Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Status matched | Similarity 91.2% | Detect 93.4%")).toBeInTheDocument();
    expect(screen.getByText("Label Source identity match")).toBeInTheDocument();
    expect(screen.getByText("Status matched | Sim 91.2% | Detect 93.4%")).toBeInTheDocument();
  });

  it("does not show identity names on face chips when status is unassigned", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          people: [],
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.1,
              y: 0.1,
              width: 0.2,
              height: 0.2,
              person_name: "Alan Cumming",
              confidence: 0.82,
              match_status: "unassigned",
              label_source: "identity_match",
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

    expect(screen.queryByText("Alan")).not.toBeInTheDocument();
    expect(screen.getAllByText("Face 1").length).toBeGreaterThan(0);
    expect(screen.getByText("Status unassigned | Sim — | Detect 82.0%")).toBeInTheDocument();
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

  it("keeps crop and guide overlays hidden until edit mode is enabled", () => {
    render(
      <ImageLightbox
        src="https://cdn.example.com/image.jpg"
        alt="Test image"
        isOpen
        onClose={() => {}}
        metadata={buildMetadata({
          peopleCount: 2,
          faceBoxes: [
            {
              index: 1,
              kind: "face",
              x: 0.12,
              y: 0.1,
              width: 0.2,
              height: 0.2,
              person_name: "Brandi Glanville",
            },
          ],
        })}
        metadataExtras={<div>edit tools</div>}
        canManage
        thumbnailCropPreview={{
          focusX: 50,
          focusY: 50,
          zoom: 1.2,
          imageWidth: 1200,
          imageHeight: 1800,
          aspectRatio: 3 / 4,
        }}
        onThumbnailCropPreviewAdjust={vi.fn()}
      />
    );

    openMetadataPanel();

    expect(screen.queryByText("Thumbnail Crop + Subject Focus")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Resize crop from top-left corner"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(screen.getByText("Thumbnail Crop + Subject Focus")).toBeInTheDocument();
    expect(screen.getByLabelText("Resize crop from top-left corner")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close Edit" }).length).toBeGreaterThan(0);
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

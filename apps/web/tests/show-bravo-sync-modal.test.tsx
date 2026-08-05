import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowBravoSyncModal, {
  type ShowBravoSyncModalProps,
} from "@/components/admin/ShowBravoSyncModal";

vi.mock("@/components/admin/AdminModal", () => ({
  default: ({
    ariaLabel,
    children,
    isOpen,
  }: {
    ariaLabel?: string;
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null),
}));

vi.mock("@/app/admin/trr-shows/[showId]/ShowPageMedia", () => ({
  GalleryImage: ({ alt, src }: { alt: string; src: string }) => (
    <span role="img" aria-label={alt} data-src={src} />
  ),
}));

const summary = { tested: 3, valid: 1, missing: 1, errors: 1 };
const profile = {
  url: "https://www.bravotv.com/people/jane-doe",
  name: "Jane Doe",
  bio: "Cast member bio",
  heroImageUrl: "https://images.example/jane.jpg",
  socialLinks: [
    {
      key: "instagram",
      label: "Instagram",
      url: "https://instagram.com/janedoe",
      handle: "@janedoe",
    },
  ],
};

type ShowBravoSyncModalOverrides = {
  modePicker?: Partial<ShowBravoSyncModalProps["modePicker"]>;
  dialog?: Partial<ShowBravoSyncModalProps["dialog"]>;
  season?: Partial<ShowBravoSyncModalProps["season"]>;
  preview?: Partial<ShowBravoSyncModalProps["preview"]>;
  confirm?: Partial<ShowBravoSyncModalProps["confirm"]>;
};

const createProps = (overrides: ShowBravoSyncModalOverrides = {}): ShowBravoSyncModalProps => {
  const props: ShowBravoSyncModalProps = {
    modePicker: {
      open: false,
      onClose: vi.fn(),
      onStart: vi.fn(),
    },
    dialog: {
      open: true,
      step: "preview",
      modeSummaryLabel: "Sync All Info",
      previewSignature: "1234567890abcdef",
      commitLoading: false,
      onClose: vi.fn(),
      onBack: vi.fn(),
      onCancel: vi.fn(),
      onNext: vi.fn(),
      onCommit: vi.fn(),
    },
    season: {
      targetSeasonNumber: 2,
      defaultSeasonNumber: 2,
      options: [3, 2],
      onChange: vi.fn(),
    },
    preview: {
      runMode: "full",
      loading: false,
      previewLoading: false,
      showName: "Test Show",
      bravoUrl: "https://www.bravotv.com/test-show",
      error: null,
      notice: "Preview ready",
      description: "Bravo description",
      airs: "Thursdays at 9",
      applyDescriptionToShow: false,
      images: [{ url: "https://images.example/show.jpg", alt: "Show key art" }],
      selectedImages: new Set(["https://images.example/show.jpg"]),
      imageKinds: { "https://images.example/show.jpg": "poster" },
      personCandidateResults: [
        {
          url: profile.url,
          name: profile.name,
          status: "ok",
        },
      ],
      fandomPersonCandidateResults: [
        {
          url: "https://example.fandom.com/wiki/Jane_Doe",
          name: profile.name,
          status: "missing",
        },
      ],
      probeSummary: summary,
      fandomProbeSummary: summary,
      probeStatusMessage: "Probing candidate 1 of 3",
      probeActive: true,
      probeTotal: 31,
      validProfileCards: [profile],
      fandomValidProfileCards: [
        { ...profile, url: "https://example.fandom.com/wiki/Jane_Doe" },
      ],
      candidateIssues: [
        { url: "https://www.bravotv.com/people/missing", status: "missing", reason: null },
      ],
      fandomCandidateIssues: [
        {
          url: "https://example.fandom.com/wiki/Missing",
          status: "error",
          reason: "Probe failed",
        },
      ],
      fandomDomainsUsed: ["example.fandom.com"],
      castLinks: [{ name: "Jane Doe", url: profile.url }],
      newsItems: [
        {
          headline: "Test Show News",
          image_url: "https://images.example/news.jpg",
          article_url: "https://www.bravotv.com/news/test-show-news",
          published_at: "2026-07-15T00:00:00Z",
        },
      ],
      videos: [
        {
          title: "Test Show Preview",
          runtime: "2:00",
          image_url: "https://images.example/video.jpg",
          clip_url: "https://www.bravotv.com/videos/test-show-preview",
          season_number: 2,
          published_at: "2026-07-15T00:00:00Z",
        },
      ],
      videoSeasonFilter: "all",
      videoSeasonOptions: [2],
      onRefreshPreview: vi.fn(),
      onDescriptionChange: vi.fn(),
      onAirsChange: vi.fn(),
      onApplyDescriptionChange: vi.fn(),
      onImageSelectionChange: vi.fn(),
      onImageKindChange: vi.fn(),
      onVideoSeasonFilterChange: vi.fn(),
      inferImageKind: vi.fn(() => "other"),
      formatPublishedDate: vi.fn(() => "Jul 15, 2026"),
    },
    confirm: {
      castSyncCount: 1,
      selectedImageSummaries: [
        { url: "https://images.example/show.jpg", alt: "Show key art", kind: "poster" },
      ],
    },
  };

  return {
    ...props,
    ...overrides,
    modePicker: { ...props.modePicker, ...overrides.modePicker },
    dialog: { ...props.dialog, ...overrides.dialog },
    season: { ...props.season, ...overrides.season },
    preview: { ...props.preview, ...overrides.preview },
    confirm: { ...props.confirm, ...overrides.confirm },
  };
};

describe("ShowBravoSyncModal", () => {
  it("renders the mode picker first and starts either sync mode", () => {
    const props = createProps({
      modePicker: { open: true },
    });

    render(<ShowBravoSyncModal {...props} />);

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs[0]).toHaveAccessibleName("Sync by Bravo mode picker");
    expect(dialogs[1]).toHaveAccessibleName("Import by Bravo");
    fireEvent.click(within(dialogs[0]).getByRole("button", { name: "Sync All Info" }));
    fireEvent.click(within(dialogs[0]).getByRole("button", { name: "Cast Info only" }));
    fireEvent.click(within(dialogs[0]).getByRole("button", { name: "Cancel" }));

    expect(props.modePicker.onStart).toHaveBeenNthCalledWith(1, "full");
    expect(props.modePicker.onStart).toHaveBeenNthCalledWith(2, "cast-only");
    expect(props.modePicker.onClose).toHaveBeenCalledOnce();
  });

  it("renders and dispatches the full preview controls", () => {
    const props = createProps();

    render(<ShowBravoSyncModal {...props} />);

    expect(screen.getByRole("dialog", { name: "Import by Bravo" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Selected Mode: Sync All Info")).toBeInTheDocument();
    expect(screen.getByText("Test Show News")).toBeInTheDocument();
    expect(screen.getByText("Test Show Preview")).toBeInTheDocument();
    expect(screen.getByText("Fandom Cast Coverage")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sync Season"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated description" },
    });
    fireEvent.click(screen.getByLabelText(/Apply Bravo description/));
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.change(screen.getByDisplayValue("Poster"), { target: { value: "promo" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Preview" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(props.season.onChange).toHaveBeenCalledWith(3);
    expect(props.preview.onDescriptionChange).toHaveBeenCalledWith("Updated description");
    expect(props.preview.onApplyDescriptionChange).toHaveBeenCalledWith(true);
    expect(props.preview.onImageSelectionChange).toHaveBeenCalledWith(
      "https://images.example/show.jpg",
      false
    );
    expect(props.preview.onImageKindChange).toHaveBeenCalledWith(
      "https://images.example/show.jpg",
      "promo"
    );
    expect(props.preview.onRefreshPreview).toHaveBeenCalledOnce();
    expect(props.dialog.onClose).toHaveBeenCalledOnce();
    expect(props.dialog.onCancel).toHaveBeenCalledOnce();
    expect(props.dialog.onNext).toHaveBeenCalledOnce();
  });

  it("preserves Bravo and Fandom cast-only probe details", () => {
    render(
      <ShowBravoSyncModal
        {...createProps({
          preview: { runMode: "cast-only" },
          dialog: { modeSummaryLabel: "Cast Info only" },
        })}
      />
    );

    expect(screen.getByText("Probe Queue")).toBeInTheDocument();
    expect(screen.getByText("Fandom Probe Queue")).toBeInTheDocument();
    expect(screen.getByText("Missing / Error Profiles")).toBeInTheDocument();
    expect(screen.getByText("Fandom Missing / Error Profiles")).toBeInTheDocument();
    expect(screen.getByText(/This may take several minutes/)).toBeInTheDocument();
  });

  it("renders confirmation details and dispatches back and commit", () => {
    const props = createProps({ dialog: { step: "confirm" } });

    render(<ShowBravoSyncModal {...props} />);

    expect(screen.getByText("Step 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Cast Members Being Synced (1)")).toBeInTheDocument();
    expect(screen.getByText("Show Images Being Synced (1)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Sync All Info" }));

    expect(props.dialog.onBack).toHaveBeenCalledOnce();
    expect(props.dialog.onCommit).toHaveBeenCalledOnce();
  });

  it("disables closing, navigation, and commit while sync is loading", () => {
    render(
      <ShowBravoSyncModal
        {...createProps({
          dialog: { step: "confirm", commitLoading: true },
          preview: { loading: true },
        })}
      />
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Syncing..." })).toBeDisabled();
  });
});

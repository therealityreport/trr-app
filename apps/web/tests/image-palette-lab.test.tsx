import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const {
  fetchAdminWithAuthMock,
  buildPaletteFromImageDataMock,
  buildThemesMock,
} = vi.hoisted(() => ({
  fetchAdminWithAuthMock: vi.fn(),
  buildPaletteFromImageDataMock: vi.fn(),
  buildThemesMock: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: fetchAdminWithAuthMock,
}));

vi.mock("@/lib/admin/color-lab/palette-extraction", () => ({
  buildPaletteFromImageData: buildPaletteFromImageDataMock,
}));

vi.mock("@/lib/admin/color-lab/theme-contrast", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/color-lab/theme-contrast")>(
    "@/lib/admin/color-lab/theme-contrast",
  );
  return {
    ...actual,
    buildThemes: buildThemesMock,
  };
});

vi.mock("@/components/admin/color-lab/ShadeThemePanels", () => ({
  __esModule: true,
  default: ({ colors }: { colors: string[] }) => <div data-testid="shade-theme">{colors.length}</div>,
}));

vi.mock("@/components/admin/color-lab/PaletteExportPanel", () => ({
  __esModule: true,
  default: ({ colors }: { colors: string[] }) => <div data-testid="export-panel">{colors.length}</div>,
}));

vi.mock("@/components/admin/color-lab/ImageSourceModal", () => ({
  __esModule: true,
  default: ({
    open,
    onSelect,
  }: {
    open: boolean;
    onSelect: (selection: {
      imageUrl: string;
      imageIdentity: string;
      sourceType: "upload" | "url";
      sourceImageUrl: string | null;
      trrShowId: string;
      seasonNumber: number;
    }) => void;
  }) =>
    open ? (
      <div data-testid="image-source-modal">
        <button
          type="button"
          onClick={() =>
            onSelect({
              imageUrl: "blob:test-upload",
              imageIdentity: "upload:test",
              sourceType: "upload",
              sourceImageUrl: null,
              trrShowId: "11111111-1111-4111-8111-111111111111",
              seasonNumber: 2,
            })
          }
        >
          Use Upload Source
        </button>
        <button
          type="button"
          onClick={() =>
            onSelect({
              imageUrl: "/api/admin/colors/image-proxy?url=https%3A%2F%2Fimages.example.com%2Fa.png",
              imageIdentity: "url:https://images.example.com/a.png",
              sourceType: "url",
              sourceImageUrl: "https://images.example.com/a.png",
              trrShowId: "11111111-1111-4111-8111-111111111111",
              seasonNumber: 2,
            })
          }
        >
          Use URL Source
        </button>
      </div>
    ) : null,
}));

import ImagePaletteLab from "@/components/admin/color-lab/ImagePaletteLab";

describe("ImagePaletteLab", () => {
  beforeEach(() => {
    fetchAdminWithAuthMock.mockReset();
    buildPaletteFromImageDataMock.mockReset();
    buildThemesMock.mockReset();

    buildThemesMock.mockReturnValue([
      { mode: "light", cells: [], passes: true },
      { mode: "dark", cells: [], passes: true },
    ]);

    buildPaletteFromImageDataMock.mockReturnValue({
      seed: 42,
      points: [
        { x: 0.2, y: 0.2, radius: 18 },
        { x: 0.4, y: 0.4, radius: 18 },
        { x: 0.6, y: 0.6, radius: 18 },
        { x: 0.8, y: 0.8, radius: 18 },
        { x: 0.5, y: 0.3, radius: 18 },
      ],
      colors: ["#111111", "#222222", "#333333", "#444444", "#555555"],
    });

    fetchAdminWithAuthMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/api/admin/trr-api/shows/") && url.includes("/seasons")) {
        return Promise.resolve(
          new Response(JSON.stringify({ seasons: [{ season_number: 1 }, { season_number: 2 }] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      if (url.includes("/api/admin/shows/palette-library") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              entry: {
                id: "palette-1",
                trr_show_id: "11111111-1111-4111-8111-111111111111",
                season_number: 2,
                name: "Saved",
                colors: ["#111111", "#222222", "#333333"],
                source_type: "upload",
                source_image_url: null,
                seed: 42,
                marker_points: [
                  { x: 0.1, y: 0.1, radius: 8 },
                  { x: 0.2, y: 0.2, radius: 8 },
                  { x: 0.3, y: 0.3, radius: 8 },
                ],
                created_by_uid: "admin",
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z",
              },
            }),
            { status: 201, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.includes("/api/admin/shows/palette-library")) {
        return Promise.resolve(
          new Response(JSON.stringify({ entries: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    });

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          drawImage: vi.fn(),
          getImageData: vi.fn(() => ({
            data: new Uint8ClampedArray(80 * 80 * 4),
            width: 80,
            height: 80,
            colorSpace: "srgb",
          })),
        }) as unknown as CanvasRenderingContext2D,
    );
  });

  it("switches source modes through image source selection", async () => {
    render(<ImagePaletteLab title="Test Palette Lab" />);

    fireEvent.click(screen.getByRole("button", { name: "Select Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Upload Source" }));

    await waitFor(() => {
      expect(screen.getByText("Source: upload")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Change Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Use URL Source" }));

    await waitFor(() => {
      expect(screen.getByText("Source: url")).toBeInTheDocument();
    });
  });

  it("enforces palette count bounds between 3 and 10", () => {
    render(<ImagePaletteLab title="Test Palette Lab" />);

    const plus = screen.getByRole("button", { name: "Increase palette count" });
    const minus = screen.getByRole("button", { name: "Decrease palette count" });

    for (let index = 0; index < 12; index += 1) {
      fireEvent.click(plus);
    }
    expect(screen.getByText("10 colors (range 3-10)")).toBeInTheDocument();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(minus);
    }
    expect(screen.getByText("3 colors (range 3-10)")).toBeInTheDocument();
  });

  it("re-samples deterministically when slider changes", async () => {
    render(<ImagePaletteLab title="Test Palette Lab" />);

    fireEvent.click(screen.getByRole("button", { name: "Select Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Upload Source" }));

    const image = await screen.findByAltText("Palette sampling source");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 640 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 360 });

    fireEvent.load(image);

    await waitFor(() => {
      expect(buildPaletteFromImageDataMock).toHaveBeenCalled();
    });

    const slider = screen.getByRole("slider", { name: "Palette randomization slider" });
    fireEvent.change(slider, { target: { value: "7" } });

    await waitFor(() => {
      expect(buildPaletteFromImageDataMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          seedStep: 7,
          count: 5,
          imageIdentity: "upload:test",
        }),
      );
    });
  });

  it("requires name validation before save", async () => {
    render(<ImagePaletteLab title="Test Palette Lab" />);

    fireEvent.click(screen.getByRole("button", { name: "Select Image" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Upload Source" }));

    const image = await screen.findByAltText("Palette sampling source");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 640 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 360 });
    fireEvent.load(image);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save to Library" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Save to Library" }));

    await waitFor(() => {
      expect(screen.getByText("Palette name is required.")).toBeInTheDocument();
    });
  });
});

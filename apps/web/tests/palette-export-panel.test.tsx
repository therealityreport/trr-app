import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toPngMock } = vi.hoisted(() => ({
  toPngMock: vi.fn(),
}));

vi.mock("html-to-image", () => ({
  toPng: toPngMock,
}));

import PaletteExportPanel from "@/components/admin/color-lab/PaletteExportPanel";

describe("PaletteExportPanel", () => {
  beforeEach(() => {
    toPngMock.mockReset();
    toPngMock.mockResolvedValue("data:image/png;base64,abc123");

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders Tailwind export and copies the share link", async () => {
    render(
      <PaletteExportPanel
        colors={["#111111", "#222222", "#333333"]}
        shareUrl="https://thereality.report/design-system/colors?palette=test"
      />,
    );

    expect(screen.getByText(/Tailwind Colors/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Share Link" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "https://thereality.report/design-system/colors?palette=test",
      );
    });
  });

  it("exports the palette preview to PNG", async () => {
    render(<PaletteExportPanel colors={["#111111", "#222222", "#333333"]} shareUrl={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Download PNG" }));

    await waitFor(() => {
      expect(toPngMock).toHaveBeenCalled();
    });
  });
});

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import FlashbackRanker from "@/components/flashback-ranker";
import type { SurveyRankingItem } from "@/lib/surveys/types";

const ITEMS: SurveyRankingItem[] = [
  { id: "lisa", label: "Lisa", img: "/images/lisa.png" },
  { id: "mary", label: "Mary", img: "/images/mary.png" },
  { id: "angie", label: "Angie", img: "/images/angie.png" },
  { id: "heather", label: "Heather", img: "/images/heather.png" },
];

function setViewport(width: number, height = 844) {
  Object.defineProperty(window, "innerWidth", { configurable: true, writable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, writable: true, value: height });
}

describe("FlashbackRanker figma-rank-circles preset", () => {
  beforeEach(() => {
    setViewport(390, 844);
  });

  it("renders responsive grid classes without the unranked tray", () => {
    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
      />,
    );

    const grid = screen.getByTestId("figma-rank-grid");
    expect(grid).toHaveAttribute("data-columns", "2");
    expect(grid.getAttribute("style")).toContain("grid-template-columns");
    expect(screen.queryByTestId("figma-unranked-tray")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unranked cast members")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select cast member for rank 1/i })).toBeInTheDocument();
  });

  it("uses mobile bottom sheet picker on small screens", () => {
    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /select cast member for rank 1/i }));

    expect(screen.getByTestId("selection-picker-mobile")).toBeInTheDocument();
    expect(screen.getByText(/pick a cast member/i)).toBeInTheDocument();
  });

  it("applies rank number font overrides to empty circle slots", () => {
    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
        fontOverrides={{
          rankNumberFontFamily: "\"Sofia Pro\", var(--font-sans), sans-serif",
        }}
      />,
    );

    const rankNumber = screen.getAllByText(/^1$/)[0];
    expect(rankNumber).toHaveStyle({
      fontFamily: "\"Sofia Pro\", var(--font-sans), sans-serif",
    });
  });

  it("resizes circle slots and controls when shape/button scales are provided", () => {
    const { unmount } = render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
      />,
    );

    const defaultSlotButton = screen.getByRole("button", { name: /select cast member for rank 1/i });
    const defaultSlotWidth = Number.parseInt(defaultSlotButton.parentElement?.style.width ?? "0", 10);
    const defaultRankNumber = screen.getAllByText(/^1$/)[0] as HTMLElement;
    const defaultRankNumberSize = Number.parseInt(defaultRankNumber.style.fontSize ?? "0", 10);
    unmount();

    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
        shapeScalePercent={60}
        buttonScalePercent={140}
      />,
    );

    const scaledSlotButton = screen.getByRole("button", { name: /select cast member for rank 1/i });
    const scaledSlotWidth = Number.parseInt(scaledSlotButton.parentElement?.style.width ?? "0", 10);
    const scaledRankNumber = screen.getAllByText(/^1$/)[0] as HTMLElement;
    const scaledRankNumberSize = Number.parseInt(scaledRankNumber.style.fontSize ?? "0", 10);

    expect(defaultSlotWidth).toBeGreaterThan(scaledSlotWidth);
    expect(scaledRankNumberSize).not.toBe(defaultRankNumberSize);
  });

  it("emits ordered ranking updates when placing into an open slot", async () => {
    const onChange = vi.fn();
    setViewport(1280, 900);

    render(
      <FlashbackRanker
        items={ITEMS.slice(0, 2)}
        variant="grid"
        layoutPreset="figma-rank-circles"
        initialRankingIds={["lisa"]}
        onChange={onChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /select cast member for rank 2/i }));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByText("Mary").closest("button") as HTMLButtonElement);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: "lisa" }),
        expect.objectContaining({ id: "mary" }),
      ]);
    });
  });
});

describe("FlashbackRanker figma-rank-rectangles preset", () => {
  beforeEach(() => {
    setViewport(390, 844);
  });

  it("renders rectangle slot grid and unranked seasons tray", () => {
    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-rectangles"
      />,
    );

    const grid = screen.getByTestId("figma-rectangle-grid");
    expect(grid).toHaveAttribute("data-columns", "2");
    expect(grid.getAttribute("style")).toContain("grid-template-columns");

    expect(screen.getByTestId("figma-rectangle-unranked-tray")).toBeInTheDocument();
    expect(screen.getByLabelText("Unranked seasons")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select season for rank 1/i })).toBeInTheDocument();
  });

  it("opens season picker and emits ordered updates", async () => {
    const onChange = vi.fn();
    setViewport(1280, 900);

    render(
      <FlashbackRanker
        items={ITEMS.slice(0, 2)}
        variant="grid"
        layoutPreset="figma-rank-rectangles"
        initialRankingIds={["lisa"]}
        onChange={onChange}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /select season for rank 2/i }));
      await Promise.resolve();
    });
    const picker = screen.getByTestId("selection-picker-popover");
    fireEvent.click(within(picker).getByRole("button", { name: /mary/i }));

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ id: "lisa" }),
        expect.objectContaining({ id: "mary" }),
      ]);
    });
  });
});

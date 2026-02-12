import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

  it("renders responsive grid classes and unranked tray", () => {
    render(
      <FlashbackRanker
        items={ITEMS}
        variant="grid"
        layoutPreset="figma-rank-circles"
      />,
    );

    const grid = screen.getByTestId("figma-rank-grid");
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("sm:grid-cols-3");
    expect(grid.className).toContain("lg:grid-cols-4");

    expect(screen.getByTestId("figma-unranked-tray")).toBeInTheDocument();
    expect(screen.getByLabelText("Unranked cast members")).toBeInTheDocument();
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

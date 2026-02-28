import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ReunionSeatingPredictionInput, {
  computeReunionSeatLayout,
} from "@/components/survey/ReunionSeatingPredictionInput";

function makeQuestion() {
  return {
    id: "q-reunion",
    survey_id: "survey-1",
    question_key: "reunion",
    question_text: "Predict the RHOSLC reunion seating chart.",
    question_type: "likert",
    display_order: 1,
    is_required: true,
    config: {
      uiVariant: "reunion-seating-prediction",
      hostName: "Andy Cohen",
      fullTimePrompt: "Seat the full-time cast first",
      friendPrompt: "Which side should Britani sit on?",
    },
    created_at: "",
    updated_at: "",
    options: [
      { id: "o1", question_id: "q-reunion", option_key: "angie", option_text: "Angie Katsanevas", display_order: 1, metadata: { castRole: "main" }, created_at: "" },
      { id: "o2", question_id: "q-reunion", option_key: "bronwyn", option_text: "Bronwyn Newport", display_order: 2, metadata: { castRole: "main" }, created_at: "" },
      { id: "o3", question_id: "q-reunion", option_key: "heather", option_text: "Heather Gay", display_order: 3, metadata: { castRole: "main" }, created_at: "" },
      { id: "o4", question_id: "q-reunion", option_key: "lisa", option_text: "Lisa Barlow", display_order: 4, metadata: { castRole: "main" }, created_at: "" },
      { id: "o5", question_id: "q-reunion", option_key: "mary", option_text: "Mary Cosby", display_order: 5, metadata: { castRole: "main" }, created_at: "" },
      { id: "o6", question_id: "q-reunion", option_key: "meredith", option_text: "Meredith Marks", display_order: 6, metadata: { castRole: "main" }, created_at: "" },
      { id: "o7", question_id: "q-reunion", option_key: "whitney", option_text: "Whitney Rose", display_order: 7, metadata: { castRole: "main" }, created_at: "" },
      { id: "o8", question_id: "q-reunion", option_key: "britani", option_text: "Britani Bateman", display_order: 8, metadata: { castRole: "friend_of" }, created_at: "" },
    ],
  };
}

describe("ReunionSeatingPredictionInput", () => {
  it("computes non-touching seat geometry", () => {
    const seatCounts = [7, 8, 9, 10, 11, 12];
    const widths = [320, 360, 375, 390, 430, 768, 1024, 1280];

    for (const seatCount of seatCounts) {
      for (const width of widths) {
        const layout = computeReunionSeatLayout(seatCount, width);
        for (let i = 0; i < layout.centers.length; i += 1) {
          for (let j = i + 1; j < layout.centers.length; j += 1) {
            const a = layout.centers[i]!;
            const b = layout.centers[j]!;
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            expect(distance, `seatCount=${seatCount}, width=${width}, i=${i}, j=${j}`).toBeGreaterThan(layout.seatSize + 1);
          }
        }

        const hostIndex = Math.floor((layout.centers.length - 1) / 2);
        const host = layout.centers[hostIndex]!;
        expect(Math.abs(host.x - layout.arcWidth / 2), `host not centered seatCount=${seatCount}, width=${width}`).toBeLessThanOrEqual(1);

        const leftSide = layout.centers.slice(0, hostIndex);
        const rightSide = layout.centers.slice(hostIndex + 1);
        const sideSpacing = [leftSide, rightSide];

        for (const [sideIndex, side] of sideSpacing.entries()) {
          if (side.length < 2) continue;
          const segmentDistances: number[] = [];
          for (let i = 1; i < side.length; i += 1) {
            const prev = side[i - 1]!;
            const current = side[i]!;
            segmentDistances.push(Math.hypot(current.x - prev.x, current.y - prev.y));
          }
          const averageDistance = segmentDistances.reduce((sum, value) => sum + value, 0) / segmentDistances.length;
          const maxDeviation = Math.max(...segmentDistances.map((value) => Math.abs(value - averageDistance)));
          expect(
            maxDeviation,
            `uneven side spacing side=${sideIndex} seatCount=${seatCount}, width=${width}, avg=${averageDistance.toFixed(2)}`,
          ).toBeLessThanOrEqual(averageDistance * 0.35);
        }

        if (leftSide.length > 0 && rightSide.length > 0) {
          const leftHostDistance = Math.min(
            ...leftSide.map((seat) => Math.hypot(host.x - seat.x, host.y - seat.y)),
          );
          const rightHostDistance = Math.min(
            ...rightSide.map((seat) => Math.hypot(host.x - seat.x, host.y - seat.y)),
          );
          const maxHostDistance = Math.max(leftHostDistance, rightHostDistance);
          const hostGapDelta = Math.abs(leftHostDistance - rightHostDistance);
          expect(
            hostGapDelta,
            `host-to-side imbalance seatCount=${seatCount}, width=${width}`,
          ).toBeLessThanOrEqual(maxHostDistance * 0.22);
        }
      }
    }
  });

  it("renders unassigned bank and supports click-place assignment", async () => {
    const updates: Array<{ fullTimeOrder: string[]; friendSide: "left" | "right" | null; completed: boolean }> = [];

    render(
      <ReunionSeatingPredictionInput
        question={makeQuestion() as never}
        value={null}
        onChange={(next) => {
          updates.push(next);
        }}
      />,
    );

    expect(screen.getByTestId("reunion-host-seat")).toBeInTheDocument();
    expect(screen.getByTestId("reunion-unassigned-bank")).toBeInTheDocument();
    const chip = screen.getByTestId("reunion-token-angie");
    const seat = screen.getByTestId("fulltime-seat-0");

    fireEvent.click(chip);
    fireEvent.click(seat);

    await waitFor(() => {
      expect(updates.length).toBeGreaterThan(0);
      const latest = updates[updates.length - 1]!;
      expect(latest.fullTimeOrder).toContain("angie");
    });
  });
});

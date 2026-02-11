import React from "react";
import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TwoAxisGridInput from "@/components/survey/TwoAxisGridInput";

function mockRect(el: HTMLElement, rect: Partial<DOMRect> & { left: number; top: number; width: number; height: number }) {
  const full = {
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  } satisfies DOMRect;

  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => full,
  });
}

describe("TwoAxisGridInput", () => {
  it("renders axis labels and bench tokens", () => {
    render(
      <TwoAxisGridInput
        question={{
          id: "q1",
          survey_id: "s1",
          question_key: "grid",
          question_text: "Place cast",
          question_type: "likert",
          display_order: 0,
          is_required: true,
          config: {
            uiVariant: "two-axis-grid",
            extent: 5,
            xLabelLeft: "LOOSE CANNON",
            xLabelRight: "STRATEGIC",
            yLabelBottom: "BORING",
            yLabelTop: "ENTERTAINING",
            rows: [
              { id: "a", label: "A", img: "" },
              { id: "b", label: "B", img: "" },
            ],
          },
          created_at: "",
          updated_at: "",
          options: [],
        }}
        value={null}
        onChange={() => {}}
      />,
    );

    expect(screen.getByText(/loose cannon/i)).toBeInTheDocument();
    expect(screen.getByText(/strategic/i)).toBeInTheDocument();
    expect(screen.getByText(/boring/i)).toBeInTheDocument();
    expect(screen.getByText(/entertaining/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^A\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^B\./ })).toBeInTheDocument();
  });

  it("tap-to-place snaps to nearest intersection and calls onChange", async () => {
    const onChange = vi.fn();

    render(
      <TwoAxisGridInput
        question={{
          id: "q1",
          survey_id: "s1",
          question_key: "grid",
          question_text: "Place cast",
          question_type: "likert",
          display_order: 0,
          is_required: true,
          config: {
            uiVariant: "two-axis-grid",
            extent: 5,
            xLabelLeft: "LOOSE",
            xLabelRight: "STRATEGIC",
            yLabelBottom: "BORING",
            yLabelTop: "ENTERTAINING",
            rows: [{ id: "a", label: "A", img: "" }],
          },
          created_at: "",
          updated_at: "",
          options: [],
        }}
        value={null}
        onChange={onChange}
      />,
    );

    const board = screen.getByLabelText(/two axis grid board/i) as HTMLElement;
    mockRect(board, { left: 0, top: 0, width: 100, height: 100 });

    // Select token "A" (separate act to allow state to commit before next click)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^A\./ }));
      await Promise.resolve();
    });

    // Click top-right corner => (x=+5, y=+5) for extent=5
    await act(async () => {
      fireEvent.click(board, { clientX: 100, clientY: 0 });
      // Flush queued microtasks (aria-live announcement).
      await Promise.resolve();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ a: { x: 5, y: 5 } });
  });

  it("renders stacked tokens at the same coordinate as individually focusable buttons", () => {
    render(
      <TwoAxisGridInput
        question={{
          id: "q1",
          survey_id: "s1",
          question_key: "grid",
          question_text: "Place cast",
          question_type: "likert",
          display_order: 0,
          is_required: true,
          config: {
            uiVariant: "two-axis-grid",
            extent: 5,
            xLabelLeft: "LEFT",
            xLabelRight: "RIGHT",
            yLabelBottom: "BOTTOM",
            yLabelTop: "TOP",
            rows: [
              { id: "a", label: "A", img: "" },
              { id: "b", label: "B", img: "" },
            ],
          },
          created_at: "",
          updated_at: "",
          options: [],
        }}
        value={{
          a: { x: 0, y: 0 },
          b: { x: 0, y: 0 },
        }}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /^A\./ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^B\./ })).toBeInTheDocument();
  });

  it("disabled mode does not call onChange", () => {
    const onChange = vi.fn();

    render(
      <TwoAxisGridInput
        question={{
          id: "q1",
          survey_id: "s1",
          question_key: "grid",
          question_text: "Place cast",
          question_type: "likert",
          display_order: 0,
          is_required: true,
          config: {
            uiVariant: "two-axis-grid",
            extent: 5,
            xLabelLeft: "LEFT",
            xLabelRight: "RIGHT",
            yLabelBottom: "BOTTOM",
            yLabelTop: "TOP",
            rows: [{ id: "a", label: "A", img: "" }],
          },
          created_at: "",
          updated_at: "",
          options: [],
        }}
        value={null}
        onChange={onChange}
        disabled
      />,
    );

    const board = screen.getByLabelText(/two axis grid board/i) as HTMLElement;
    mockRect(board, { left: 0, top: 0, width: 100, height: 100 });

    fireEvent.click(screen.getByRole("button", { name: /^A\./ }));
    fireEvent.click(board, { clientX: 100, clientY: 0 });

    expect(onChange).toHaveBeenCalledTimes(0);
  });
});

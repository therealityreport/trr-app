import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import IconRatingInput from "@/components/survey/IconRatingInput";

function readFillPercents(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-fill-percent]")).map((el) =>
    Number(el.getAttribute("data-fill-percent") ?? "0"),
  );
}

function mockIconRects(container: HTMLElement, { size = 40, gap = 8 } = {}) {
  const icons = Array.from(container.querySelectorAll("[data-icon-index]")) as HTMLElement[];
  icons.forEach((el, index) => {
    const left = index * (size + gap);
    const rect = {
      x: left,
      y: 0,
      left,
      top: 0,
      right: left + size,
      bottom: size,
      width: size,
      height: size,
      toJSON: () => ({}),
    } satisfies DOMRect;

    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => rect,
    });
  });
}

function Harness({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = React.useState<number | null>(initialValue);
  return (
    <IconRatingInput
      value={value}
      onChange={setValue}
      min={1}
      max={5}
      step={0.5}
      iconSrc="/icons/snowflake-solid-ice-7.svg"
      iconCount={5}
      ariaLabel="Season rating"
    />
  );
}

describe("IconRatingInput", () => {
  it("renders value=null as all empty and numeric input empty", () => {
    const { container } = render(
      <IconRatingInput value={null} onChange={() => {}} iconSrc="/icons/snowflake-solid-ice-7.svg" ariaLabel="Season rating" />,
    );

    expect(readFillPercents(container)).toEqual([0, 0, 0, 0, 0]);
    expect(screen.getByRole("textbox", { name: /season rating/i })).toHaveValue("");
  });

  it("renders value=3.5 with icon fill percents [100,100,100,50,0]", () => {
    const { container } = render(
      <IconRatingInput value={3.5} onChange={() => {}} iconSrc="/icons/snowflake-solid-ice-7.svg" ariaLabel="Season rating" />,
    );

    expect(readFillPercents(container)).toEqual([100, 100, 100, 50, 0]);
    expect(screen.getByRole("textbox", { name: /season rating/i })).toHaveValue("3.5");
  });

  it("clicking icon halves maps to 0.5 steps", () => {
    const { container } = render(<Harness initialValue={null} />);
    mockIconRects(container, { size: 40, gap: 8 });
    const slider = screen.getByRole("slider", { name: /season rating/i });

    // Icon #4 (index 3) right half => 4.0
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 3 * (40 + 8) + 40 * 0.75, clientY: 10 });
    expect(readFillPercents(container)).toEqual([100, 100, 100, 100, 0]);

    // Icon #4 (index 3) left half => 3.5
    fireEvent.pointerDown(slider, { pointerId: 1, clientX: 3 * (40 + 8) + 40 * 0.25, clientY: 10 });
    expect(readFillPercents(container)).toEqual([100, 100, 100, 50, 0]);
  });

  it("keyboard arrows increment/decrement by 0.5", () => {
    const { container } = render(<Harness initialValue={3.0} />);
    const slider = screen.getByRole("slider", { name: /season rating/i });
    slider.focus();

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(readFillPercents(container)).toEqual([100, 100, 100, 50, 0]);

    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(readFillPercents(container)).toEqual([100, 100, 100, 0, 0]);
  });
});


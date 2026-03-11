import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import IconRatingInput from "@/components/survey/IconRatingInput";
import { RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH } from "@/lib/surveys/rhoslc-assets";

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
      min={0}
      max={5}
      step={0.5}
      iconSrc={RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH}
      iconCount={5}
      ariaLabel="Season rating"
    />
  );
}

describe("IconRatingInput", () => {
  it("renders value=null as all empty and numeric input empty", () => {
    const { container } = render(
      <IconRatingInput value={null} onChange={() => {}} iconSrc={RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH} ariaLabel="Season rating" />,
    );

    expect(readFillPercents(container)).toEqual([0, 0, 0, 0, 0]);
    expect(screen.getByRole("textbox", { name: /season rating/i })).toHaveValue("");
  });

  it("renders value=3.5 with icon fill percents [100,100,100,50,0]", () => {
    const { container } = render(
      <IconRatingInput value={3.5} onChange={() => {}} iconSrc={RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH} ariaLabel="Season rating" />,
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

  it("allows pointer selection of 0.0 from the left edge of the control", () => {
    const { container } = render(<Harness initialValue={2.0} />);
    mockIconRects(container, { size: 40, gap: 8 });
    const slider = screen.getByRole("slider", { name: /season rating/i });
    const input = screen.getByRole("textbox", { name: /season rating/i });

    fireEvent.pointerDown(slider, { pointerId: 1, clientX: -12, clientY: 10 });

    expect(readFillPercents(container)).toEqual([0, 0, 0, 0, 0]);
    expect(input).toHaveValue("0.0");
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

  it("supports a 0.0 minimum via Home and numeric input", () => {
    const { container } = render(<Harness initialValue={2.5} />);
    const slider = screen.getByRole("slider", { name: /season rating/i });
    const input = screen.getByRole("textbox", { name: /season rating/i });

    fireEvent.keyDown(slider, { key: "Home" });
    expect(readFillPercents(container)).toEqual([0, 0, 0, 0, 0]);
    expect(slider).toHaveAttribute("aria-valuemin", "0");

    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("0.0");
  });
});

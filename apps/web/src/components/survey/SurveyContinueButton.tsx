"use client";

import * as React from "react";

export interface SurveyContinueButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
}

const DEFAULT_FONT_FAMILY = "\"Plymouth Serial\", var(--font-sans), sans-serif";
const FIGMA_BUTTON_WIDTH = 388.911;
const FIGMA_BUTTON_HEIGHT = 103.062;
const FIGMA_BUTTON_RADIUS = 8;
const FIGMA_TEXT_SIZE = 40;
const FIGMA_LINE_HEIGHT = 52;
const FIGMA_LETTER_SPACING = 0.8;

const MOBILE_BUTTON_WIDTH = 160;
const SCALE_FLOOR = MOBILE_BUTTON_WIDTH / FIGMA_BUTTON_WIDTH;

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export default function SurveyContinueButton({
  label = "Continue",
  backgroundColor = "#000000",
  textColor = "#FFFFFF",
  fontFamily = DEFAULT_FONT_FAMILY,
  className,
  style,
  type = "button",
  ...buttonProps
}: SurveyContinueButtonProps) {
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const [renderedWidth, setRenderedWidth] = React.useState(FIGMA_BUTTON_WIDTH);

  React.useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;

    const applyWidth = (next: number) => {
      if (!Number.isFinite(next) || next <= 0) return;
      setRenderedWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };

    applyWidth(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") {
        applyWidth(width);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = clampNumber(renderedWidth / FIGMA_BUTTON_WIDTH, SCALE_FLOOR, 1);
  const radiusPx = Math.round(FIGMA_BUTTON_RADIUS * scale * 1000) / 1000;
  const fontSizePx = Math.round(FIGMA_TEXT_SIZE * scale * 1000) / 1000;
  const lineHeightPx = Math.round(FIGMA_LINE_HEIGHT * scale * 1000) / 1000;
  const letterSpacingPx = Math.round(FIGMA_LETTER_SPACING * scale * 1000) / 1000;

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`inline-flex items-center justify-center transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/25 ${className ?? ""}`}
      style={{
        width: `min(100%, clamp(${MOBILE_BUTTON_WIDTH}px, 56%, ${FIGMA_BUTTON_WIDTH}px))`,
        aspectRatio: `${FIGMA_BUTTON_WIDTH} / ${FIGMA_BUTTON_HEIGHT}`,
        minHeight: "40px",
        borderRadius: `${radiusPx}px`,
        backgroundColor,
        color: textColor,
        fontFamily,
        fontWeight: 700,
        fontSize: `${fontSizePx}px`,
        lineHeight: `${lineHeightPx}px`,
        letterSpacing: `${letterSpacingPx}px`,
        ...style,
      }}
      {...buttonProps}
    >
      {label}
    </button>
  );
}

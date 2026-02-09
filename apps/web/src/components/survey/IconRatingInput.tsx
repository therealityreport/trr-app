"use client";

import * as React from "react";
import PartialFillIcon from "./PartialFillIcon";

export interface IconRatingInputProps {
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  iconSrc: string;
  iconCount?: number;
  sizePx?: number;
  fillColor?: string;
  emptyColor?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const roundToStep = (value: number, step: number) => {
  if (!Number.isFinite(value)) return value;
  const stepped = Math.round(value / step) * step;
  // Avoid 1.499999999 style float artifacts.
  return Number(stepped.toFixed(4));
};

export default React.forwardRef<HTMLDivElement, IconRatingInputProps>(function IconRatingInput(
  {
    value,
    onChange,
    min = 1,
    max = 5,
    step = 0.5,
    iconSrc,
    iconCount = 5,
    sizePx = 40,
    fillColor = "#0EA5E9",
    emptyColor = "#E5E7EB",
    disabled = false,
    ariaLabel = "Rating",
    className,
  },
  ref,
) {
  const [inputText, setInputText] = React.useState(() => (value === null ? "" : value.toFixed(1)));
  const [isDragging, setIsDragging] = React.useState(false);
  const iconRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const inputId = React.useId();

  React.useEffect(() => {
    setInputText(value === null ? "" : value.toFixed(1));
  }, [value]);

  const iconFillPercent = React.useCallback(
    (iconIndex: number) => {
      if (value === null) return 0;
      const raw = value - iconIndex;
      const clampedRaw = Math.max(0, Math.min(1, raw));
      return Math.round(clampedRaw * 100);
    },
    [value],
  );

  const computeValueFromPoint = React.useCallback(
    (clientX: number, clientY: number) => {
      const icons = iconRefs.current.filter(Boolean) as HTMLSpanElement[];
      if (icons.length === 0) return null;

      let bestIndex = 0;
      // Use DOMRectReadOnly to avoid TS lib variance across environments.
      let bestRect: DOMRectReadOnly | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      // Use a plain loop so TypeScript control flow can see `bestRect` assignments.
      for (let idx = 0; idx < icons.length; idx += 1) {
        const icon = icons[idx];
        const rect = icon.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.abs(clientX - centerX) + Math.abs(clientY - centerY) * 0.25;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = idx;
          bestRect = rect;
        }
      }

      if (!bestRect) return null;

      const iconNumber = bestIndex + 1;
      const isLeftHalf = clientX < bestRect.left + bestRect.width / 2;
      const rawValue = isLeftHalf ? iconNumber - 0.5 : iconNumber;

      const rounded = roundToStep(rawValue, step);
      const clampedValue = clamp(rounded, min, max);
      return clampedValue;
    },
    [max, min, step],
  );

  const setNextValue = React.useCallback(
    (next: number | null) => {
      if (disabled) return;
      if (next === null) {
        if (value !== null) onChange(null);
        return;
      }
      const normalized = clamp(roundToStep(next, step), min, max);
      if (value !== normalized) onChange(normalized);
    },
    [disabled, max, min, onChange, step, value],
  );

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.currentTarget.focus();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        // Ignore (not supported in JSDOM / some browsers).
      }
      setIsDragging(true);
      const next = computeValueFromPoint(event.clientX, event.clientY);
      setNextValue(next);
    },
    [computeValueFromPoint, disabled, setNextValue],
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (!isDragging) return;
      const next = computeValueFromPoint(event.clientX, event.clientY);
      setNextValue(next);
    },
    [computeValueFromPoint, disabled, isDragging, setNextValue],
  );

  const handlePointerUp = React.useCallback(() => {
    if (disabled) return;
    setIsDragging(false);
  }, [disabled]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === "Home") {
        event.preventDefault();
        setNextValue(min);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setNextValue(max);
        return;
      }

      const delta =
        event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -step
          : event.key === "ArrowRight" || event.key === "ArrowUp"
            ? step
            : null;

      if (delta === null) return;
      event.preventDefault();
      const base = value ?? min;
      setNextValue(base + delta);
    },
    [disabled, max, min, setNextValue, step, value],
  );

  const handleInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    let next = event.target.value;
    next = next.replace(/[^\d.]/g, "");
    const dotIndex = next.indexOf(".");
    if (dotIndex !== -1) {
      next = next.slice(0, dotIndex + 1) + next.slice(dotIndex + 1).replace(/\./g, "");
    }
    setInputText(next);
  }, []);

  const handleInputBlur = React.useCallback(() => {
    const trimmed = inputText.trim();
    if (trimmed === "") {
      if (value === null) {
        onChange(null);
        setInputText("");
        return;
      }
      setInputText(value.toFixed(1));
      return;
    }

    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      setInputText(value === null ? "" : value.toFixed(1));
      return;
    }

    const normalized = clamp(roundToStep(parsed, step), min, max);
    onChange(normalized);
    setInputText(normalized.toFixed(1));
  }, [inputText, max, min, onChange, step, value]);

  const handleInputKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }, []);

  const ariaValueText = value === null ? "Not rated" : `${value.toFixed(1)} out of ${max}`;

  return (
    <div className={className}>
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={ariaValueText}
        aria-disabled={disabled || undefined}
        aria-valuenow={value === null ? undefined : value}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className={`flex justify-center gap-2 select-none ${disabled ? "opacity-60" : "cursor-pointer"} touch-none outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2`}
      >
        {Array.from({ length: iconCount }).map((_, index) => {
          const fillPercent = iconFillPercent(index);
          return (
            <span
              key={`icon-rating-${index}`}
              ref={(el) => {
                iconRefs.current[index] = el;
              }}
              data-icon-index={index}
              data-fill-percent={fillPercent}
              className="inline-flex items-center justify-center"
            >
              <PartialFillIcon
                src={iconSrc}
                sizePx={sizePx}
                fillPercent={fillPercent}
                fillColor={fillColor}
                emptyColor={emptyColor}
              />
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex justify-center">
        <label htmlFor={inputId} className="sr-only">
          {ariaLabel}
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={inputText}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          className="w-24 rounded-xl border border-rose-100 bg-white px-3 py-2 text-center text-3xl font-semibold tabular-nums text-rose-900 shadow-sm outline-none transition focus:border-rose-200 focus:ring-2 focus:ring-rose-200"
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
});

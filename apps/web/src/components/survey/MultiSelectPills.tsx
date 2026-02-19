"use client";

import * as React from "react";

export interface MultiSelectPillItem {
  id: string;
  label: string;
  color?: string;
}

export interface MultiSelectPillsProps {
  title: string;
  items: MultiSelectPillItem[];
  minRequired?: number;
  selected: string[];
  onToggle: (id: string) => void;
  palette?: string[];
  height?: number | string;
  disabled?: boolean;
  footer?: React.ReactNode;
  ariaLabel?: string;
  renderLabel?: (item: MultiSelectPillItem) => React.ReactNode;
}

const DEFAULT_HEIGHT = 256;
const DEFAULT_PALETTE = [
  "#7A0307", "#95164A", "#B81D22", "#CF5315", "#C76D00", "#F1991B",
  "#B05E2A", "#E3A320", "#D48C42", "#ECC91C", "#977022", "#744A1F",
  "#C2B72D", "#76A34C", "#356A3B", "#0C454A", "#769F25", "#A1C6D4",
  "#53769C",
];

function toHeightValue(height: number | string | undefined): string {
  if (typeof height === "number") return `${height}px`;
  if (typeof height === "string" && height.trim().length > 0) return height;
  return `${DEFAULT_HEIGHT}px`;
}

export default function MultiSelectPills({
  title,
  items,
  minRequired = 0,
  selected,
  onToggle,
  palette = DEFAULT_PALETTE,
  height = DEFAULT_HEIGHT,
  disabled = false,
  footer,
  ariaLabel,
  renderLabel,
}: MultiSelectPillsProps) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const heightValue = React.useMemo(() => toHeightValue(height), [height]);
  const statusLabel = minRequired > 0
    ? `Select at least ${minRequired}. (${selected.length} selected)`
    : `${selected.length} selected`;

  return (
    <div className="space-y-2">
      <label className="block text-zinc-900 text-sm font-hamburg font-medium">{title}</label>
      <p className="text-xs text-zinc-400 mb-1">{statusLabel}</p>
      <div
        className="w-full overflow-y-auto border border-zinc-200 rounded-lg p-3 bg-white"
        style={{ height: heightValue }}
        aria-label={ariaLabel ?? title}
      >
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => {
            const isSelected = selectedSet.has(item.id);
            const activeColor = item.color ?? palette[index % palette.length] ?? "#111111";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                disabled={disabled}
                className="px-3 py-1 h-8 rounded-full text-sm font-normal font-hamburg transition-all border whitespace-nowrap disabled:opacity-60"
                style={{
                  backgroundColor: isSelected ? activeColor : "#F4F4F5",
                  color: isSelected ? "#FFFFFF" : "#111111",
                  borderColor: isSelected ? activeColor : "#D4D4D8",
                }}
                aria-pressed={isSelected}
              >
                {renderLabel ? renderLabel(item) : item.label}
              </button>
            );
          })}
        </div>
      </div>
      {footer}
    </div>
  );
}

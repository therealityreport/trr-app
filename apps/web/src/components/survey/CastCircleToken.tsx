"use client";

import * as React from "react";
import Image from "next/image";

type SizeVariant = "bench" | "grid" | "custom";

export interface CastCircleTokenProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  img?: string | null;
  sizeVariant?: SizeVariant;
  sizePx?: number;
  selected?: boolean;
  draggable?: boolean;
  desaturated?: boolean;
}

function initials(label: string): string {
  return label
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

export default React.forwardRef<HTMLButtonElement, CastCircleTokenProps>(
  function CastCircleToken(
    {
      label,
      img,
      sizeVariant = "bench",
      sizePx,
      selected = false,
      draggable = false,
      desaturated = false,
      className,
      style,
      type = "button",
      ...buttonProps
    },
    ref,
  ) {
    const dimsClass =
      sizeVariant === "grid"
        ? "h-7 w-7 sm:h-9 sm:w-9"
        : sizeVariant === "bench"
          ? "h-12 w-12 sm:h-14 sm:w-14"
          : "";
    const ringClass = selected ? "ring-2 ring-black/80" : "ring-1 ring-white/90";
    const imageSizes = sizeVariant === "grid" ? "36px" : "56px";

    return (
      <button
        ref={ref}
        type={type}
        className={[
          "relative overflow-hidden rounded-full bg-white transition-transform motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-black/25",
          dimsClass,
          ringClass,
          draggable ? "cursor-grab touch-none" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...(sizeVariant === "custom" && typeof sizePx === "number"
            ? {
                width: `${sizePx}px`,
                height: `${sizePx}px`,
              }
            : {}),
          ...style,
        }}
        {...buttonProps}
      >
        {img ? (
          <Image
            src={img}
            alt={label}
            fill
            className={`object-cover ${desaturated ? "grayscale" : ""}`}
            sizes={imageSizes}
            unoptimized={img.startsWith("http")}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] font-bold text-gray-600">
            {initials(label)}
          </div>
        )}
      </button>
    );
  },
);

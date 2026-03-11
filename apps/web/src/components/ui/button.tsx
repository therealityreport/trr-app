"use client";

import * as React from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "default";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const baseClassName =
  "inline-flex items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 disabled:pointer-events-none disabled:opacity-50";

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "bg-zinc-900 font-semibold text-white hover:bg-zinc-800",
  secondary: "border border-zinc-200 bg-white font-medium text-zinc-700 hover:bg-zinc-50",
  outline: "border border-zinc-300 bg-white font-semibold text-zinc-700 hover:bg-zinc-100",
  ghost: "bg-transparent font-semibold text-zinc-700 hover:bg-zinc-100",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  default: "min-h-10 px-4 py-2 text-sm",
};

function joinClassNames(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, size = "default", type = "button", variant = "primary", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={joinClassNames(baseClassName, variantClassNames[variant], sizeClassNames[size], className)}
      {...props}
    />
  );
});

"use client";

import { useMemo, useState } from "react";

import { buildPaletteExportBundle } from "@/lib/admin/color-lab/palette-export";

export default function PaletteExportPanel({ colors }: { colors: string[] }) {
  const bundle = useMemo(() => buildPaletteExportBundle(colors), [colors]);
  const [copied, setCopied] = useState<"" | "all" | "css" | "scss">("");

  const copyText = async (value: string, type: "all" | "css" | "scss") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Export Palette</p>
          <p className="text-sm text-zinc-600">CSS/SCSS HEX, HSL, RGB, and gradients.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copyText(`${bundle.cssHex}\n\n${bundle.cssHsl}`, "css")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {copied === "css" ? "Copied CSS" : "Copy CSS"}
          </button>
          <button
            type="button"
            onClick={() => copyText(`${bundle.scssHex}\n\n${bundle.scssHsl}\n\n${bundle.scssRgb}\n\n${bundle.scssGradient}`, "scss")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {copied === "scss" ? "Copied SCSS" : "Copy SCSS"}
          </button>
          <button
            type="button"
            onClick={() => copyText(bundle.all, "all")}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
          >
            {copied === "all" ? "Copied All" : "Copy All"}
          </button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-3 text-[11px] leading-5 text-zinc-100">
        {bundle.all}
      </pre>
    </section>
  );
}

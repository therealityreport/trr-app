"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

import { buildPaletteExportBundle } from "@/lib/admin/color-lab/palette-export";

interface PaletteExportPanelProps {
  colors: string[];
  shareUrl?: string | null;
}

function triggerDownload(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  anchor.click();
}

export default function PaletteExportPanel({ colors, shareUrl = null }: PaletteExportPanelProps) {
  const bundle = useMemo(() => buildPaletteExportBundle(colors), [colors]);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState<"" | "all" | "css" | "scss" | "tailwind" | "share">("");
  const [exportingPng, setExportingPng] = useState(false);

  const copyText = async (value: string, type: "all" | "css" | "scss" | "tailwind" | "share") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  };

  const handleDownloadPng = async () => {
    if (!previewRef.current || colors.length === 0 || exportingPng) {
      return;
    }

    try {
      setExportingPng(true);
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });
      triggerDownload(dataUrl, "trr-color-palette.png");
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div ref={previewRef} className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">Palette Preview</p>
        <div className="mt-3 flex min-h-20 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {colors.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">No colors yet</div>
          ) : (
            colors.map((color, index) => (
              <div
                key={`${color}-${index}`}
                className="flex flex-1 flex-col justify-end p-2"
                style={{ backgroundColor: color }}
              >
                <span className="rounded bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">
                  {color}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">Export Palette</p>
          <p className="text-sm text-zinc-600">CSS/SCSS, Tailwind tokens, PNG preview, and share links.</p>
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
            onClick={() => copyText(bundle.tailwind, "tailwind")}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            {copied === "tailwind" ? "Copied Tailwind" : "Copy Tailwind"}
          </button>
          <button
            type="button"
            onClick={() => void handleDownloadPng()}
            disabled={colors.length === 0 || exportingPng}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {exportingPng ? "Exporting PNG" : "Download PNG"}
          </button>
          {shareUrl ? (
            <button
              type="button"
              onClick={() => copyText(shareUrl, "share")}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              {copied === "share" ? "Copied Share Link" : "Copy Share Link"}
            </button>
          ) : null}
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

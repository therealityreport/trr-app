"use client";

import { useMemo, useState } from "react";

import { pickBestTextColor } from "@/lib/admin/color-lab/color-math";
import { buildShadeMatrix, buildThemes } from "@/lib/admin/color-lab/theme-contrast";

export default function ShadeThemePanels({ colors }: { colors: string[] }) {
  const [activeTab, setActiveTab] = useState<"shade" | "theme">("shade");
  const shadeRows = useMemo(() => buildShadeMatrix(colors), [colors]);
  const themes = useMemo(() => buildThemes(colors, 4.5), [colors]);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-3 py-2">
        {[
          { id: "shade" as const, label: "Shade" },
          { id: "theme" as const, label: "Theme" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
              activeTab === tab.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-h-[28rem] overflow-auto">
        {activeTab === "shade" ? (
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600">
                <th className="sticky left-0 z-20 border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-left font-semibold">
                  Step
                </th>
                {colors.map((color, index) => (
                  <th key={`${color}-${index}`} className="border-b border-zinc-200 px-3 py-2 font-semibold">
                    {color.replace("#", "")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shadeRows.map((row) => (
                <tr key={row.label}>
                  <th className="sticky left-0 z-10 border-b border-zinc-100 bg-white px-3 py-2 text-left font-semibold text-zinc-600">
                    {row.label}
                  </th>
                  {row.colors.map((color, index) => (
                    <td
                      key={`${row.label}-${index}-${color}`}
                      className="border-b border-zinc-100 px-3 py-2 text-center font-semibold"
                      style={{ backgroundColor: color, color: pickBestTextColor(color).text }}
                    >
                      {color.replace("#", "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600">
                <th className="border-b border-zinc-200 px-3 py-2 text-left font-semibold">Mode</th>
                {colors.map((color, index) => (
                  <th key={`theme-${color}-${index}`} className="border-b border-zinc-200 px-3 py-2 font-semibold">
                    {color.replace("#", "")}
                  </th>
                ))}
                <th className="border-b border-zinc-200 px-3 py-2 font-semibold">AA</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((theme) => (
                <tr key={theme.mode}>
                  <th className="border-b border-zinc-100 px-3 py-2 text-left font-semibold capitalize text-zinc-700">
                    {theme.mode}
                  </th>
                  {theme.cells.map((cell, index) => (
                    <td
                      key={`${theme.mode}-${index}-${cell.background}`}
                      className="border-b border-zinc-100 px-3 py-2 text-center font-semibold"
                      style={{ backgroundColor: cell.background, color: cell.text }}
                    >
                      {cell.background.replace("#", "")}
                      <div className="mt-1 text-[10px] opacity-90">{cell.contrast.toFixed(2)}:1</div>
                    </td>
                  ))}
                  <td className="border-b border-zinc-100 px-3 py-2 text-center">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                        theme.passes
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {theme.passes ? "Pass" : "Fail"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

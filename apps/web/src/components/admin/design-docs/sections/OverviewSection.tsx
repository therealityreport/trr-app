"use client";

import Link from "next/link";
import type { Route } from "next";
import { DESIGN_DOC_SECTIONS } from "@/lib/admin/design-docs-config";

export default function OverviewSection() {
  const sections = DESIGN_DOC_SECTIONS.filter((s) => s.id !== "overview");

  return (
    <div>
      <div className="dd-section-label">Overview</div>
      <h2 className="dd-section-title">TRR Design System</h2>
      <p className="dd-section-desc">
        The Reality Report design system is built on three pillars:
        annotation-first storytelling that foregrounds context over decoration,
        earned color where every hue justifies its presence with data or brand
        meaning, and typography-first hierarchy that lets the type stack do the
        heavy lifting before any graphical element enters the frame.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`/admin/design-docs/${section.id}` as Route}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "var(--dd-viz-blue)",
                marginBottom: 4,
              }}
            >
              {section.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                color: "var(--dd-ink-soft)",
                lineHeight: 1.5,
              }}
            >
              {section.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

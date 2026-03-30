"use client";

import Link from "next/link";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import {
  DESIGN_DOC_GROUPS,
  DESIGN_DOC_SECTIONS,
} from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  Inline data                                                       */
/* ------------------------------------------------------------------ */

const PRINCIPLES = [
  {
    title: "Typography First",
    desc: "The type stack carries hierarchy before any graphical element enters the frame. Six faces, one voice.",
  },
  {
    title: "Earned Color",
    desc: "Every hue justifies its presence with data meaning, brand context, or functional intent. Nothing decorative.",
  },
  {
    title: "Annotation Over Decoration",
    desc: "Context sits beside the content it explains. Labels, keys, and callouts replace ornamentation.",
  },
  {
    title: "Content as Color",
    desc: "Photography, data, and text generate the palette of the page. The system recedes; the story leads.",
  },
] as const;

const TYPE_STACK = [
  {
    font: "var(--dd-font-masthead)",
    name: "Chomsky",
    weight: "400",
    role: "Masthead & Branding",
  },
  {
    font: "var(--dd-font-headline)",
    name: "Cheltenham",
    weight: "400 \u2013 700",
    role: "Headlines & Titles",
  },
  {
    font: "var(--dd-font-body)",
    name: "Gloucester",
    weight: "400 \u2013 700",
    role: "Body Copy & Decks",
  },
  {
    font: "var(--dd-font-sans)",
    name: "Franklin Gothic",
    weight: "400 \u2013 700",
    role: "Data, UI Labels, Meta",
  },
  {
    font: "var(--dd-font-ui)",
    name: "Hamburg Serial",
    weight: "400 \u2013 700",
    role: "App Interface Sans",
  },
  {
    font: "var(--dd-font-slab)",
    name: "Stymie",
    weight: "400 \u2013 700",
    role: "Slab Accent & Pull Quotes",
  },
] as const;

const STYLE_ROWS = [
  {
    context: "Editorial",
    dot: "var(--dd-ink-black)",
    headline: "Cheltenham",
    body: "Gloucester",
    radius: "0 \u2013 4 px",
    speed: "200 ms ease",
    accent: "Ink Black",
  },
  {
    context: "Data",
    dot: "var(--dd-viz-blue)",
    headline: "Franklin Gothic",
    body: "Franklin Gothic",
    radius: "4 \u2013 8 px",
    speed: "150 ms ease-out",
    accent: "Viz Blue",
  },
  {
    context: "Games",
    dot: "var(--dd-viz-purple)",
    headline: "Cheltenham",
    body: "Hamburg Serial",
    radius: "8 \u2013 12 px",
    speed: "250 ms spring",
    accent: "Viz Purple",
  },
  {
    context: "Lifestyle",
    dot: "var(--dd-accent-saffron)",
    headline: "Cheltenham",
    body: "Gloucester",
    radius: "12 \u2013 16 px",
    speed: "300 ms ease-in-out",
    accent: "Saffron",
  },
  {
    context: "Interactive",
    dot: "var(--dd-viz-red)",
    headline: "Hamburg Serial",
    body: "Hamburg Serial",
    radius: "8 px",
    speed: "120 ms ease",
    accent: "Viz Red",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const sectionMap = Object.fromEntries(
  DESIGN_DOC_SECTIONS.map((s) => [s.id, s]),
);

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function OverviewSection() {
  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "var(--dd-space-8) var(--dd-space-4)",
      }}
    >
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header style={{ textAlign: "center", marginBottom: 80 }}>
        {/* Masthead */}
        <div
          style={{
            fontFamily: "var(--dd-font-masthead)",
            fontSize: 42,
            lineHeight: 1.1,
            color: "var(--dd-ink-black)",
            marginBottom: 12,
          }}
        >
          The Reality Report
        </div>

        {/* Rule */}
        <div
          style={{
            width: "100%",
            height: 1,
            background: "var(--dd-ink-faint)",
            marginBottom: 20,
          }}
        />

        {/* Date */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "var(--dd-ink-soft)",
            marginBottom: 16,
          }}
        >
          March 2026
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: "var(--dd-ink-black)",
            margin: "0 0 20px",
          }}
        >
          Design System
        </h1>

        {/* Deck */}
        <p
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 17,
            lineHeight: 1.65,
            color: "var(--dd-ink-soft)",
            maxWidth: 640,
            margin: "0 auto 28px",
          }}
        >
          A comprehensive reference for editorial, data visualization, and
          interactive design&nbsp;&mdash; built with Cheltenham, Gloucester,
          Franklin Gothic, Hamburg Serial, Stymie, and Chomsky from the TRR
          typeface collection.
        </p>

        {/* Saffron accent bar */}
        <div
          style={{
            width: 48,
            height: 3,
            background: "var(--dd-accent-saffron)",
            borderRadius: 2,
            margin: "0 auto",
          }}
        />
      </header>

      {/* ── Design Principles ────────────────────────────────────── */}
      <section style={{ marginBottom: 80 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRINCIPLES.map((p) => (
            <div
              key={p.title}
              style={{
                borderTop: "3px solid var(--dd-ink-black)",
                paddingTop: 14,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: 1.25,
                  color: "var(--dd-ink-black)",
                  marginBottom: 6,
                }}
              >
                {p.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--dd-ink-soft)",
                }}
              >
                {p.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick Type Preview ────────────────────────────────────── */}
      <section style={{ marginBottom: 80 }}>
        <h2
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--dd-ink-black)",
            marginBottom: 20,
            letterSpacing: "-0.01em",
          }}
        >
          Typeface Collection
        </h2>

        <div
          style={{
            borderTop: "1px solid var(--dd-ink-faint)",
          }}
        >
          {TYPE_STACK.map((t) => (
            <div
              key={t.name}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 16,
                borderBottom: "1px solid var(--dd-ink-faint)",
                padding: "10px 0",
              }}
            >
              {/* Specimen rendered in its own font */}
              <div
                style={{
                  fontFamily: t.font,
                  fontSize: 20,
                  color: "var(--dd-ink-black)",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: "0 1 auto",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {t.name}
              </div>

              {/* Metadata */}
              <div
                style={{
                  display: "flex",
                  gap: 24,
                  flexShrink: 0,
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--dd-ink-faint)",
                    letterSpacing: "0.04em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.weight}
                </span>
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--dd-ink-soft)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    whiteSpace: "nowrap",
                    minWidth: 120,
                    textAlign: "right",
                  }}
                >
                  {t.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section Navigation by Group ──────────────────────────── */}
      <section style={{ marginBottom: 80 }}>
        {DESIGN_DOC_GROUPS.filter((g) =>
          // Skip the "Getting Started" group's overview entry in navigation
          g.sectionIds.some((id) => id !== "overview"),
        ).map((group) => {
          const cards = group.sectionIds
            .filter((id) => id !== "overview")
            .map((id) => sectionMap[id])
            .filter(Boolean);

          if (cards.length === 0) return null;

          return (
            <div key={group.label} style={{ marginBottom: 40 }}>
              <h3
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "var(--dd-ink-black)",
                  marginBottom: 14,
                  letterSpacing: "-0.01em",
                }}
              >
                {group.label}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((section) => (
                  <Link
                    key={section.id}
                    href={buildDesignDocsPath(section.id)}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition"
                    style={{ display: "block", textDecoration: "none" }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--dd-font-sans)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--dd-ink-black)",
                        marginBottom: 4,
                        lineHeight: 1.3,
                      }}
                    >
                      {section.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--dd-font-sans)",
                        fontSize: 12,
                        fontWeight: 400,
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
        })}
      </section>

      {/* ── Style at a Glance ────────────────────────────────────── */}
      <section style={{ marginBottom: 80 }}>
        <h2
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 24,
            color: "var(--dd-ink-black)",
            marginBottom: 20,
            letterSpacing: "-0.01em",
          }}
        >
          Style at a Glance
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                {[
                  "Context",
                  "Headline Font",
                  "Body Font",
                  "Radius",
                  "Speed",
                  "Accent",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--dd-ink-faint)",
                      padding: "0 12px 8px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STYLE_ROWS.map((row) => (
                <tr key={row.context}>
                  {/* Context with dot */}
                  <td
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      fontWeight: 600,
                      color: "var(--dd-ink-black)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: row.dot,
                        marginRight: 8,
                        verticalAlign: "middle",
                        position: "relative",
                        top: -1,
                      }}
                    />
                    {row.context}
                  </td>
                  {/* Headline Font */}
                  <td
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      color: "var(--dd-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.headline}
                  </td>
                  {/* Body Font */}
                  <td
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      color: "var(--dd-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.body}
                  </td>
                  {/* Radius */}
                  <td
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      color: "var(--dd-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.radius}
                  </td>
                  {/* Speed */}
                  <td
                    style={{
                      padding: "10px 12px 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      color: "var(--dd-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.speed}
                  </td>
                  {/* Accent */}
                  <td
                    style={{
                      padding: "10px 0 10px 0",
                      borderBottom: "1px solid var(--dd-ink-faint)",
                      color: "var(--dd-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.accent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

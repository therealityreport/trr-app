"use client";

import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  InteractiveHorizontalBarChart — Birdkit-style horizontal stacked   */
/*  bar chart matching NYT production "TaxDoubleAlt" Svelte component  */
/*  Uses CSS flexbox layout (like the real Birdkit output), not SVG.   */
/* ------------------------------------------------------------------ */

export interface HorizontalStackedBarSegment {
  value: number;
  color: string;
  label: string;
}

export interface HorizontalStackedBarRow {
  label: string;
  segments: HorizontalStackedBarSegment[];
  total: string;
}

export interface HorizontalStackedBarData {
  title: string;
  rows: HorizontalStackedBarRow[];
  source: string;
}

interface Props {
  data: HorizontalStackedBarData;
}

const FONT = '"nyt-franklin", arial, helvetica, sans-serif';

export default function InteractiveHorizontalBarChart({ data }: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const handleEnter = useCallback((i: number) => setHoveredRow(i), []);
  const handleLeave = useCallback(() => setHoveredRow(null), []);

  const seg0Label = data.rows[0]?.segments[0]?.label ?? "";
  const seg1Label = data.rows[0]?.segments[1]?.label ?? "";

  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: 600,
        margin: "0 auto",
        color: "#121212",
      }}
    >
      {/* ── Title ── */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 14,
          color: "#121212",
        }}
      >
        {data.title}
      </div>

      {/* ── Column headers ── */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 72, flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              lineHeight: 1.3,
              textTransform: "uppercase" as const,
              color: "#121212",
            }}
          >
            {seg0Label.split(" ").slice(0, 2).join(" ")}
            <br />
            {seg0Label.split(" ").slice(2).join(" ")}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              lineHeight: 1.3,
              textTransform: "uppercase" as const,
              textAlign: "right" as const,
              color: "#121212",
            }}
          >
            {seg1Label.split(" ").slice(0, 2).join(" ")}
            <br />
            {seg1Label.split(" ").slice(2).join(" ")}
          </span>
        </div>
        <div
          style={{
            width: 90,
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1.3,
            textTransform: "uppercase" as const,
            textAlign: "right" as const,
            color: "#121212",
          }}
        >
          TOTAL TAX
          <br />
          REVENUE
        </div>
      </div>

      {/* ── Tick marks row ── */}
      <div style={{ display: "flex", marginTop: 2, marginBottom: 2 }}>
        <div style={{ width: 72, flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            color: "#999",
          }}
        >
          <span style={{ paddingLeft: 5 }}>|</span>
          <span style={{ paddingRight: 5 }}>|</span>
        </div>
        <div
          style={{
            width: 90,
            flexShrink: 0,
            fontSize: 10,
            color: "#999",
            textAlign: "right" as const,
          }}
        >
          |
        </div>
      </div>

      {/* ── Data rows ── */}
      {data.rows.map((row, i) => {
        const isHovered = hoveredRow === i;

        return (
          <div
            key={row.label}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "default",
              transition: "background-color 120ms ease",
              backgroundColor: isHovered ? "#f7f5f0" : "transparent",
              borderBottom:
                i < data.rows.length - 1
                  ? "1px solid #ebebeb"
                  : "none",
              padding: "2px 0",
            }}
          >
            {/* State label */}
            <div
              style={{
                width: 72,
                flexShrink: 0,
                fontSize: 14,
                fontWeight: 500,
                color: "#121212",
                paddingRight: 8,
                lineHeight: "31px",
              }}
            >
              {row.label}
            </div>

            {/* Stacked bar segments */}
            <div
              style={{
                flex: 1,
                display: "flex",
                height: 31,
                overflow: "hidden",
              }}
            >
              {row.segments.map((seg, si) => {
                const isDark = seg.color !== "#CCCCCC" && seg.color !== "#cccccc";
                const isNarrow = seg.value < 20;

                return (
                  <div
                    key={si}
                    style={{
                      width: `${seg.value}%`,
                      height: 31,
                      backgroundColor: seg.color,
                      color: isDark ? "#fff" : "#333",
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: "32px",
                      textAlign: si === 0 ? ("left" as const) : ("right" as const),
                      overflow: "hidden",
                      whiteSpace: "nowrap" as const,
                      transition: "opacity 120ms ease",
                      opacity: isHovered ? 1 : 0.92,
                    }}
                  >
                    {!isNarrow && (
                      <span style={{ padding: "0 6px" }}>{seg.value}%</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total revenue */}
            <div
              style={{
                width: 90,
                flexShrink: 0,
                fontSize: 13,
                fontWeight: isHovered ? 700 : 400,
                color: "#121212",
                textAlign: "right" as const,
                lineHeight: "31px",
                paddingLeft: 8,
                transition: "font-weight 120ms ease",
              }}
            >
              {row.total}
            </div>
          </div>
        );
      })}

      {/* ── Source ── */}
      <div
        style={{
          fontSize: 12,
          fontWeight: 300,
          color: "#727272",
          marginTop: 12,
          lineHeight: 1.5,
          fontFamily: FONT,
        }}
      >
        {data.source}
      </div>
    </div>
  );
}

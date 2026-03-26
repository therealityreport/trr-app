"use client";

import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  InteractiveMedalTable — Birdkit-style Olympic medal count tables   */
/*  Renders both static medal tables and the "Choose Your Own" interactive */
/*  dropdown variant matching NYT production CTableDouble styling.      */
/* ------------------------------------------------------------------ */

/* ── Data types ────────────────────────────────────── */

export interface MedalRow {
  country: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  /** When true, the row is a placeholder — render em-dashes instead of data. */
  _placeholder?: boolean;
}

export interface MedalTableData {
  title: string;
  rows: MedalRow[];
  source?: string;
}

export interface MedalTableGridData {
  title: string;
  tables: { subtitle: string; rows: MedalRow[] }[];
  source?: string;
}

export interface MedalTableInteractiveData {
  title: string;
  options: { label: string; rows: MedalRow[]; source?: string }[];
  source?: string;
}

/* ── Shared constants ────────────────────────────────── */

const FONT = '"nyt-franklin", arial, helvetica, sans-serif';
const GOLD = "#c9b037";
const SILVER = "#b4b4b4";
const BRONZE = "#ad8a56";

/* ── Medal header circles ────────────────────────────── */

function MedalCircle({ color }: { color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        backgroundColor: color,
      }}
    />
  );
}

/* ── Single table renderer ────────────────────────────── */

function SingleTable({
  rows,
  subtitle,
  compact,
}: {
  rows: MedalRow[];
  subtitle?: string;
  compact?: boolean;
}) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const handleEnter = useCallback((i: number) => setHoveredRow(i), []);
  const handleLeave = useCallback(() => setHoveredRow(null), []);

  const fontSize = compact ? 14 : 16;

  return (
    <div>
      {subtitle && (
        <div
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 15,
            color: "#121212",
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          {subtitle}
        </div>
      )}

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: compact
            ? "1fr 32px 32px 32px 40px"
            : "1fr 48px 48px 48px 56px",
          alignItems: "center",
          borderBottom: "2px solid #121212",
          paddingBottom: 6,
          marginBottom: 0,
        }}
      >
        <div />
        <div style={{ textAlign: "center" }}>
          <MedalCircle color={GOLD} />
        </div>
        <div style={{ textAlign: "center" }}>
          <MedalCircle color={SILVER} />
        </div>
        <div style={{ textAlign: "center" }}>
          <MedalCircle color={BRONZE} />
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span
              style={{
                display: "inline-block",
                width: 7,
                height: 7,
                borderRadius: "50%",
                backgroundColor: GOLD,
              }}
            />
            <div style={{ display: "flex", gap: 1 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: SILVER,
                }}
              />
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: BRONZE,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data rows */}
      {rows.map((row, i) => {
        const isPlaceholder = row._placeholder === true;
        const countryColor = isPlaceholder ? "#999" : "#121212";
        const medalColor = isPlaceholder ? "#ccc" : "#121212";

        return (
          <div
            key={isPlaceholder ? `placeholder-${i}` : row.country}
            onMouseEnter={() => handleEnter(i)}
            onMouseLeave={handleLeave}
            style={{
              display: "grid",
              gridTemplateColumns: compact
                ? "1fr 32px 32px 32px 40px"
                : "1fr 48px 48px 48px 56px",
              alignItems: "center",
              cursor: "default",
              transition: "background-color 120ms ease",
              backgroundColor: hoveredRow === i ? "#f7f5f0" : "transparent",
              borderBottom:
                i < rows.length - 1 ? "1px solid #ebebeb" : "none",
              padding: "6px 0",
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: compact ? 13 : 15,
                fontWeight: !isPlaceholder && i === 0 ? 700 : 400,
                color: countryColor,
                lineHeight: 1.4,
                paddingRight: 4,
              }}
            >
              {row.country}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize,
                fontWeight: 400,
                color: medalColor,
                textAlign: "center",
              }}
            >
              {isPlaceholder ? "\u2014" : row.gold}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize,
                fontWeight: 400,
                color: medalColor,
                textAlign: "center",
              }}
            >
              {isPlaceholder ? "\u2014" : row.silver}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize,
                fontWeight: 400,
                color: medalColor,
                textAlign: "center",
              }}
            >
              {isPlaceholder ? "\u2014" : row.bronze}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize,
                fontWeight: isPlaceholder ? 400 : 700,
                color: medalColor,
                textAlign: "center",
              }}
            >
              {isPlaceholder ? "\u2014" : row.total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Exported components ────────────────────────────── */

/** Full-width single medal table */
export function MedalTable({ data }: { data: MedalTableData }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: 600,
        margin: "0 auto",
        color: "#121212",
      }}
    >
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
      <SingleTable rows={data.rows} />
      {data.source && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: "#727272",
            marginTop: 8,
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          {data.source}
        </div>
      )}
    </div>
  );
}

/** 2x2 grid of mini medal tables */
export function MedalTableGrid({ data }: { data: MedalTableGridData }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: 600,
        margin: "0 auto",
        color: "#121212",
      }}
    >
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 24,
        }}
      >
        {data.tables.map((t) => (
          <SingleTable
            key={t.subtitle}
            subtitle={t.subtitle}
            rows={t.rows}
            compact
          />
        ))}
      </div>
      <style>{`
        @media (max-width: 540px) {
          /* Fallback: grids go single-column on narrow viewports */
        }
      `}</style>
      {data.source && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: "#727272",
            marginTop: 8,
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          {data.source}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────── */

const INTERACTIVE_ROW_COUNT = 8;

const PLACEHOLDER_ROW: MedalRow = {
  country: "\u2014",
  gold: 0,
  silver: 0,
  bronze: 0,
  total: 0,
  _placeholder: true,
};

/**
 * Pad `rows` to exactly `INTERACTIVE_ROW_COUNT` entries.
 * Real rows come first; remaining slots are filled with placeholder rows.
 */
function padRows(rows: MedalRow[]): MedalRow[] {
  const clamped = rows.slice(0, INTERACTIVE_ROW_COUNT);
  const padding = INTERACTIVE_ROW_COUNT - clamped.length;
  if (padding <= 0) return clamped;
  return [
    ...clamped,
    ...Array.from({ length: padding }, () => ({ ...PLACEHOLDER_ROW })),
  ];
}

/** "Choose Your Own Medal Table" with dropdown */
export function MedalTableInteractive({
  data,
}: {
  data: MedalTableInteractiveData;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = data.options[selectedIdx];
  const displayRows = selected ? padRows(selected.rows) : padRows([]);

  return (
    <div
      style={{
        fontFamily: FONT,
        maxWidth: 600,
        margin: "0 auto",
        color: "#121212",
      }}
    >
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

      {/* Dropdown selector */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={selectedIdx}
          onChange={(e) => setSelectedIdx(Number(e.target.value))}
          style={{
            fontFamily: FONT,
            fontSize: 15,
            fontWeight: 500,
            color: "#121212",
            border: "1px solid #ccc",
            borderRadius: 4,
            padding: "8px 12px",
            background: "#fff",
            cursor: "pointer",
            width: "100%",
            maxWidth: 400,
            appearance: "auto" as never,
          }}
        >
          {data.options.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <SingleTable rows={displayRows} />

      {selected?.source && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: "#727272",
            marginTop: 8,
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          {selected.source}
        </div>
      )}

      {data.source && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 300,
            color: "#727272",
            marginTop: 8,
            lineHeight: 1.5,
            fontFamily: FONT,
          }}
        >
          {data.source}
        </div>
      )}
    </div>
  );
}

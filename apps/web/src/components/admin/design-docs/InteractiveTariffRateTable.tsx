"use client";

import { useState } from "react";
import { TRUMP_TARIFFS_US_IMPORTS_ROWS } from "./trump-tariffs-us-imports-data";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface InteractiveTariffRateTableProps {
  title: string;
  leadin: string;
  source: string;
  credit: string;
  initialVisibleRows?: number;
}

export default function InteractiveTariffRateTable({
  title,
  leadin,
  source,
  credit,
  initialVisibleRows = 10,
}: InteractiveTariffRateTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleRows = expanded
    ? TRUMP_TARIFFS_US_IMPORTS_ROWS
    : TRUMP_TARIFFS_US_IMPORTS_ROWS.slice(0, initialVisibleRows);
  const hiddenCount = TRUMP_TARIFFS_US_IMPORTS_ROWS.length - initialVisibleRows;

  return (
    <div
      data-testid="tariff-rate-table"
      style={{
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
        color: "#363636",
      }}
    >
      <div
        style={{
          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
          fontSize: 17,
          fontWeight: 700,
          lineHeight: "22px",
          color: "#363636",
          marginBottom: 0,
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
          fontSize: 15,
          fontWeight: 400,
          lineHeight: "19px",
          color: "#777777",
          margin: "0 0 16px",
        }}
      >
        {leadin}
      </p>

      <div
        style={{
          borderTop: "none",
          borderBottom: "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 1.4fr) repeat(3, minmax(70px, 0.8fr))",
            gap: 12,
            padding: "0 0 12px",
            borderBottom: "none",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 11,
            fontWeight: 400,
            lineHeight: "11px",
            letterSpacing: "normal",
            textTransform: "uppercase",
            color: "#999999",
          }}
        >
          <div>Country</div>
          <div style={{ textAlign: "right" }}>2024 avg.</div>
          <div style={{ textAlign: "right" }}>With new tariffs</div>
          <div style={{ textAlign: "right" }}>Increase</div>
        </div>

        {visibleRows.map((row) => (
          <div
            key={row.iso}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, 1.4fr) repeat(3, minmax(70px, 0.8fr))",
              gap: 12,
              padding: "0 0 15px",
              borderBottom: "none",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: "16px",
                color: "#363636",
              }}
            >
              {row.country}
            </div>
            <div
              style={{
                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: "16px",
                color: "#363636",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPercent(row.avg2024)}
            </div>
            <div
              style={{
                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                fontSize: 16,
                fontWeight: 400,
                lineHeight: "16px",
                color: "#363636",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatPercent(row.withNewTariffs)}
            </div>
            <div
              style={{
                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                lineHeight: "16px",
                color: "#bc6c14",
                textAlign: "right",
                whiteSpace: "nowrap",
              }}
            >
              +{(row.increase * 100).toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          style={{
            marginTop: 4,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: "19px",
            color: "#121212",
          }}
        >
          {expanded ? "Show fewer rows −" : `Show ${hiddenCount} more rows +`}
        </button>
      )}

      <div
        style={{
          marginTop: 18,
          paddingTop: 0,
          borderTop: "none",
          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
          fontSize: 13,
          fontWeight: 500,
          lineHeight: "17px",
          color: "#727272",
        }}
      >
        <p style={{ margin: 0 }}>Source: {source}</p>
        <p style={{ margin: 0 }}>{credit}</p>
      </div>
    </div>
  );
}

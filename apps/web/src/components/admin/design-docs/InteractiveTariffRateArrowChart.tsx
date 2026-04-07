"use client";

import { TRUMP_TARIFFS_US_IMPORTS_TOP_10 } from "./trump-tariffs-us-imports-data";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

interface InteractiveTariffRateArrowChartProps {
  title: string;
  leadin: string;
  source: string;
  credit: string;
}

const FRANKLIN_STACK = '"nyt-franklin", arial, helvetica, sans-serif';
const LABEL_COLUMN_WIDTH = 140;
const CANVAS_MAX_WIDTH = 400;
const STEM_COLOR = "#bc6c14";
const TEXT_COLOR = "#363636";
const MUTED_TEXT_COLOR = "#777777";
const META_TEXT_COLOR = "#727272";
const MAX_TARIFF_RATE = Math.max(
  ...TRUMP_TARIFFS_US_IMPORTS_TOP_10.map((row) => row.withNewTariffs),
);

export default function InteractiveTariffRateArrowChart({
  title,
  leadin,
  source,
  credit,
}: InteractiveTariffRateArrowChartProps) {
  return (
    <div
      data-testid="tariff-rate-arrow-chart"
      style={{
        width: "100%",
        maxWidth: 600,
        margin: "0 auto",
        color: TEXT_COLOR,
        overflow: "visible",
      }}
    >
      <h3
        style={{
          margin: 0,
          fontFamily: FRANKLIN_STACK,
          fontSize: 17,
          fontWeight: 700,
          lineHeight: "22px",
          letterSpacing: "normal",
          color: TEXT_COLOR,
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: "0 0 16px",
          fontFamily: FRANKLIN_STACK,
          fontSize: 15,
          fontWeight: 400,
          lineHeight: "19px",
          letterSpacing: "normal",
          color: MUTED_TEXT_COLOR,
        }}
      >
        {leadin}
      </p>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          overflow: "visible",
        }}
      >
        {TRUMP_TARIFFS_US_IMPORTS_TOP_10.map((row, index) => {
          const left = (row.avg2024 / MAX_TARIFF_RATE) * 100;
          const width = ((row.withNewTariffs - row.avg2024) / MAX_TARIFF_RATE) * 100;

          return (
            <li
              key={row.iso}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 0,
                marginBottom: index === TRUMP_TARIFFS_US_IMPORTS_TOP_10.length - 1 ? 0 : 15,
                overflow: "visible",
              }}
            >
              <h4
                style={{
                  flex: `0 0 ${LABEL_COLUMN_WIDTH}px`,
                  width: LABEL_COLUMN_WIDTH,
                  margin: 0,
                  fontFamily: FRANKLIN_STACK,
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: "16px",
                  letterSpacing: "normal",
                  color: TEXT_COLOR,
                }}
              >
                {row.country}
              </h4>

              <div
                aria-hidden="true"
                style={{
                  position: "relative",
                  flex: `1 1 ${CANVAS_MAX_WIDTH}px`,
                  width: "min(100%, 400px)",
                  maxWidth: CANVAS_MAX_WIDTH,
                  height: 0,
                  overflow: "visible",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: 4,
                    backgroundColor: STEM_COLOR,
                    overflow: "visible",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: -6,
                      transform: "translate(-100%, -50%)",
                      fontFamily: FRANKLIN_STACK,
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: "14px",
                      letterSpacing: "normal",
                      color: STEM_COLOR,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatPercent(row.avg2024)}
                  </span>

                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: "calc(100% + 6px)",
                      transform: "translateY(-50%)",
                      fontFamily: FRANKLIN_STACK,
                      fontSize: 14,
                      fontWeight: 700,
                      lineHeight: "14px",
                      letterSpacing: "normal",
                      color: STEM_COLOR,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatPercent(row.withNewTariffs)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        style={{
          marginTop: 19,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: FRANKLIN_STACK,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: "17px",
            letterSpacing: "normal",
            color: META_TEXT_COLOR,
          }}
        >
          Source: {source}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: FRANKLIN_STACK,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: "17px",
            letterSpacing: "normal",
            color: META_TEXT_COLOR,
          }}
        >
          {credit}
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  InteractiveLineChart — Datawrapper-style line chart with hover     */
/*  crosshair, dot, and value tooltip. Matches NYT production styling. */
/* ------------------------------------------------------------------ */

export interface LineChartData {
  /** Array of numeric values (one per data point) */
  values: number[];
  /** Optional second series (e.g. "All items" reference line) */
  values2?: number[];
  /** Label for second series */
  label2?: string;
  /** Color for second series */
  color2?: string;
  /** Start year for the data */
  startYear: number;
  /** Points per year (default 12 for monthly) */
  pointsPerYear?: number;
  /** Line stroke color (default "#fdba58") */
  lineColor?: string;
  /** Y-axis top label text */
  yAxisLabel?: string;
  /** Y-axis tick values */
  yTicks?: number[];
  /** X-axis year labels */
  xLabels?: string[];
  /** Inline annotation text */
  annotation?: string;
  /** Annotation X position as fraction 0-1 */
  annotationX?: number;
  /** Annotation Y position as fraction 0-1 */
  annotationY?: number;
  /** Source credit line */
  source?: string;
  /** Note text (italic) */
  note?: string;
  /** Unit string e.g. "$" or "%" */
  unit?: string;
  /** Unit position: "prefix" puts unit before number, "suffix" after */
  unitPosition?: "prefix" | "suffix";
  /** Number of decimal places for tooltip values (default 1) */
  decimals?: number;
}

interface Props {
  data: LineChartData;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default function InteractiveLineChart({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {
    values,
    values2,
    label2,
    color2 = "#cccccc",
    startYear,
    pointsPerYear = 12,
    lineColor = "#fdba58",
    yAxisLabel = "",
    yTicks = [],
    xLabels = [],
    annotation,
    annotationX = 0.5,
    annotationY = 0.3,
    source = "",
    note,
    unit = "",
    unitPosition = "suffix",
    decimals = 1,
  } = data;

  const chartW = 560;
  const chartH = 320;
  const marginLeft = 36;
  const marginRight = 12;
  const marginTop = 8;
  const plotW = chartW - marginLeft - marginRight;
  const plotH = chartH - marginTop - 4;

  const { minVal, maxVal } = useMemo(() => {
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (values2) {
      min = Math.min(min, ...values2);
      max = Math.max(max, ...values2);
    }
    // Extend range by yTicks if provided
    if (yTicks.length > 0) {
      min = Math.min(min, ...yTicks);
      max = Math.max(max, ...yTicks);
    }
    return { minVal: min, maxVal: max };
  }, [values, values2, yTicks]);

  const range = maxVal - minVal || 1;

  const getX = useCallback(
    (i: number) => marginLeft + (i / (values.length - 1)) * plotW,
    [values.length, plotW],
  );

  const getY = useCallback(
    (val: number) => marginTop + plotH - ((val - minVal) / range) * plotH,
    [plotH, minVal, range],
  );

  const pointsStr = useMemo(
    () => values.map((v, i) => `${getX(i)},${getY(v)}`).join(" "),
    [values, getX, getY],
  );

  const points2Str = useMemo(
    () => values2?.map((v, i) => `${getX(i)},${getY(v)}`).join(" ") ?? "",
    [values2, getX, getY],
  );

  // Compute hovered info
  const hoveredVal = hoveredIndex !== null ? values[hoveredIndex] : null;
  const hoveredMonth =
    hoveredIndex !== null ? MONTHS[hoveredIndex % pointsPerYear] : null;
  const hoveredYear =
    hoveredIndex !== null
      ? startYear + Math.floor(hoveredIndex / pointsPerYear)
      : null;

  const formatVal = (v: number) => {
    const num = v.toFixed(decimals);
    if (unitPosition === "prefix") return `${unit}${num}`;
    return `${num}${unit}`;
  };

  // Hit zone width per data point
  const hitW = plotW / values.length;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "0 auto 28px",
        position: "relative" as const,
      }}
    >
      {/* Y-axis top label — positioned ABOVE the SVG */}
      {yAxisLabel && (
        <div
          style={{
            fontFamily:
              '"nyt-franklin", arial, helvetica, sans-serif',
            fontSize: 13,
            fontWeight: 300,
            color: "#727272",
            marginBottom: 4,
          }}
        >
          {yAxisLabel}
        </div>
      )}

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartW} ${chartH + 30}`}
        width="100%"
        style={{
          display: "block",
          cursor: "crosshair",
          overflow: "visible",
        }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Horizontal grid lines at y-tick positions */}
        {yTicks.map((tick) => {
          const y = getY(tick);
          const isZero = tick === 0;
          return (
            <g key={tick}>
              <line
                x1={marginLeft - 4}
                y1={y}
                x2={chartW - marginRight}
                y2={y}
                stroke={isZero ? "#121212" : "#ededed"}
                strokeWidth={isZero ? 1 : 1}
              />
              <text
                x={marginLeft - 8}
                y={y + 4}
                fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
                fontSize={12}
                fill="#727272"
                fontWeight={300}
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Reference line (values2) — draw first so primary line is on top */}
        {values2 && points2Str && (
          <polyline
            points={points2Str}
            fill="none"
            stroke={color2}
            strokeWidth={1.5}
          />
        )}

        {/* Primary data line */}
        <polyline
          points={pointsStr}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.5}
        />

        {/* Invisible hit areas for hover detection */}
        {values.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - hitW / 2}
            y={0}
            width={hitW}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
          />
        ))}

        {/* Hover crosshair + dot + tooltip */}
        {hoveredIndex !== null && hoveredVal !== null && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={getX(hoveredIndex)}
              y1={marginTop}
              x2={getX(hoveredIndex)}
              y2={chartH}
              stroke="#326891"
              strokeWidth={1}
              strokeDasharray="3 2"
              opacity={0.5}
            />
            {/* Dot on reference line */}
            {values2 && (
              <circle
                cx={getX(hoveredIndex)}
                cy={getY(values2[hoveredIndex])}
                r={3.5}
                fill={color2}
                stroke="#fff"
                strokeWidth={1.5}
              />
            )}
            {/* Dot on primary line */}
            <circle
              cx={getX(hoveredIndex)}
              cy={getY(hoveredVal)}
              r={4}
              fill={lineColor}
              stroke="#fff"
              strokeWidth={2}
            />
            {/* Value label above dot */}
            <text
              x={getX(hoveredIndex)}
              y={getY(hoveredVal) - 14}
              fontFamily='"nyt-franklin", arial, sans-serif'
              fontSize={13}
              fontWeight={700}
              fill="#326891"
              textAnchor="middle"
            >
              {formatVal(hoveredVal)}
            </text>
          </g>
        )}

        {/* Inline annotation — primary series label, positioned next to line */}
        {annotation && (
          <text
            x={marginLeft + annotationX * plotW}
            y={marginTop + annotationY * plotH + 2}
            fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
            fontSize={13}
            fill="#121212"
            fontWeight={700}
          >
            {annotation}
          </text>
        )}

        {/* Label for second series */}
        {values2 && label2 && (
          <text
            x={marginLeft + annotationX * plotW}
            y={marginTop + annotationY * plotH + 18}
            fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
            fontSize={12}
            fill="#999999"
            fontWeight={400}
          >
            {label2}
          </text>
        )}

        {/* X-axis year labels — bold, below chart area */}
        {xLabels.map((yr, i) => {
          const labelX =
            marginLeft + (i / (xLabels.length - 1)) * plotW;
          return (
            <text
              key={yr}
              x={labelX}
              y={chartH + 20}
              fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
              fontSize={13}
              fill="#121212"
              fontWeight={700}
              textAnchor="middle"
            >
              {yr}
            </text>
          );
        })}
      </svg>

      {/* Hover info bar */}
      {hoveredIndex !== null && hoveredVal !== null ? (
        <div
          style={{
            fontFamily:
              '"nyt-franklin", var(--dd-font-ui, arial), sans-serif',
            fontSize: 13,
            color: "#326891",
            fontWeight: 600,
            marginTop: 4,
            height: 18,
          }}
        >
          {hoveredMonth} {hoveredYear}: {formatVal(hoveredVal)}
        </div>
      ) : (
        <div style={{ height: 22 }} />
      )}

      {/* Source credit line — NYT pattern */}
      <div
        style={{
          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
          fontSize: 13,
          color: "#727272",
          fontWeight: 300,
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        {note && (
          <>
            <span style={{ fontStyle: "normal" }}>Note: {note}</span>{" "}
          </>
        )}
        {source && <span>Source: {source}</span>}
        {"  "}
        <span style={{ fontWeight: 500 }}>The New York Times</span>
      </div>
    </div>
  );
}

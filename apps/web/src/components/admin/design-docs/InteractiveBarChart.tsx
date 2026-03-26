"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  InteractiveBarChart — Datawrapper-style bar chart with hover       */
/*  tooltips, matching NYT production styling exactly.                  */
/* ------------------------------------------------------------------ */

export interface BarChartData {
  /** Monthly values in billions */
  values: number[];
  /** Start year (e.g. 2016) */
  startYear: number;
  /** Bar fill color */
  barColor?: string;
  /** Y-axis max label (e.g. "$30 billion") */
  yAxisLabel?: string;
  /** Y-axis tick values (e.g. [0, 10, 20, 30]) */
  yTicks?: number[];
  /** X-axis year labels */
  xLabels?: string[];
  /** Inline annotation text */
  annotation?: string;
  /** Source credit line */
  source?: string;
  /** Note text (italic) */
  note?: string;
}

interface Props {
  data: BarChartData;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function InteractiveBarChart({ data }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const {
    values,
    startYear,
    barColor = "#fc9627",
    yAxisLabel = "$30 billion",
    yTicks = [0, 10, 20, 30],
    xLabels = ["2017", "2019", "2021", "2023", "2025"],
    annotation = "Monthly tariff revenue",
    source = "Treasury Department.",
    note = "Data is not seasonally adjusted.",
  } = data;

  const maxVal = Math.max(...values);
  const chartW = 560;
  const chartH = 320;
  const marginLeft = 32;
  const marginRight = 8;
  const barArea = chartW - marginLeft - marginRight;
  const gap = barArea / values.length;
  const barW = gap * 0.72;

  const getBarX = useCallback((i: number) => marginLeft + i * gap, [gap]);
  const getBarH = useCallback((val: number) => (val / maxVal) * (chartH - 5), [maxVal]);

  // Compute hovered bar info
  const hoveredVal = hoveredIndex !== null ? values[hoveredIndex] : null;
  const hoveredMonth = hoveredIndex !== null ? MONTHS[hoveredIndex % 12] : null;
  const hoveredYear = hoveredIndex !== null ? startYear + Math.floor(hoveredIndex / 12) : null;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto 28px", position: "relative" as const }}>
      {/* Y-axis top label — positioned ABOVE the SVG */}
      <div style={{
        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
        fontSize: 13,
        fontWeight: 300,
        color: "#727272",
        marginBottom: 4,
      }}>
        {yAxisLabel}
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartW} ${chartH + 30}`}
        width="100%"
        style={{ display: "block", cursor: "crosshair", overflow: "visible" }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Horizontal grid lines + zero baseline */}
        {yTicks.map((tick, i) => {
          const y = chartH - (tick / maxVal) * (chartH - 5);
          const isZero = tick === 0;
          return (
            <g key={tick}>
              <line x1={marginLeft - 4} y1={y} x2={chartW - marginRight} y2={y} stroke={isZero ? "#333333" : "#e6e6e6"} strokeWidth={1} />
              {/* Y-axis tick labels (skip the top one — it's the header) */}
              {i < yTicks.length - 1 && (
                <text
                  x={marginLeft - 8}
                  y={y + 4}
                  fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
                  fontSize={14}
                  fill="#333333"
                  fontWeight={400}
                  textAnchor="end"
                >
                  {tick}
                </text>
              )}
            </g>
          );
        })}

        {/* Bars with hover detection */}
        {values.map((val, i) => {
          const barH = getBarH(val);
          const x = getBarX(i);
          const y = chartH - barH;
          const isHovered = hoveredIndex === i;

          return (
            <g key={i}>
              {/* Invisible wider hit area for easier hovering */}
              <rect
                x={x - 1}
                y={0}
                width={gap}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIndex(i)}
              />
              {/* Actual visible bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={barColor}
                opacity={hoveredIndex !== null && !isHovered ? 0.5 : 1}
                style={{ transition: "opacity 0.15s ease" }}
              />
            </g>
          );
        })}

        {/* Hover tooltip — value label above bar */}
        {hoveredIndex !== null && hoveredVal !== null && (
          <g>
            {/* Vertical guide line */}
            <line
              x1={getBarX(hoveredIndex) + barW / 2}
              y1={chartH - getBarH(hoveredVal) - 4}
              x2={getBarX(hoveredIndex) + barW / 2}
              y2={chartH - getBarH(hoveredVal) - 20}
              stroke={barColor}
              strokeWidth={1}
              opacity={0.5}
            />
            {/* Value label — uses bar color like Datawrapper */}
            <text
              x={getBarX(hoveredIndex) + barW / 2}
              y={chartH - getBarH(hoveredVal) - 24}
              fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
              fontSize={14}
              fontWeight={700}
              fill={barColor}
              textAnchor="middle"
            >
              {hoveredVal}
            </text>
          </g>
        )}

        {/* Inline annotation: bold black label, centered above tallest bars with cushion */}
        {(() => {
          // Find the max value to place label above the tallest bar with a cushion
          const maxVal = Math.max(...values);
          const labelY = chartH - getBarH(maxVal) - 14; // 14px cushion above tallest bar
          return (
            <text
              x={marginLeft + barArea * 0.5}
              y={labelY}
              fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
              fontSize={14}
              fill="#121212"
              fontWeight={700}
              textAnchor="middle"
            >
              {annotation}
            </text>
          );
        })()}

        {/* X-axis year labels — bold, below chart area */}
        {xLabels.map((yr, i) => {
          // Position labels evenly across the bar area
          const labelX = marginLeft + (i / (xLabels.length - 1)) * barArea;
          return (
            <text
              key={yr}
              x={labelX}
              y={chartH + 20}
              fontFamily='"nyt-franklin", arial, helvetica, sans-serif'
              fontSize={14}
              fill="#333333"
              fontWeight={400}
              textAnchor="middle"
            >
              {yr}
            </text>
          );
        })}
      </svg>

      {/* Hover info bar — shows month/year below chart */}
      {hoveredIndex !== null && (
        <div style={{
          fontFamily: '"nyt-franklin", var(--dd-font-ui, arial), sans-serif',
          fontSize: 14,
          color: barColor,
          fontWeight: 700,
          marginTop: 4,
          height: 18,
        }}>
          {hoveredMonth} {hoveredYear}: ${hoveredVal} billion
        </div>
      )}
      {hoveredIndex === null && <div style={{ height: 22 }} />}

      {/* Source credit line — NYT pattern */}
      <div style={{
        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
        fontSize: 13,
        color: "#727272",
        fontWeight: 300,
        marginTop: 8,
        lineHeight: 1.4,
      }}>
        {note && <><span style={{ fontStyle: "normal" }}>Note: {note}</span>{" "}</>}
        <span>Source: {source}</span>
        {"  "}
        <span style={{ fontWeight: 500 }}>The New York Times</span>
      </div>
    </div>
  );
}

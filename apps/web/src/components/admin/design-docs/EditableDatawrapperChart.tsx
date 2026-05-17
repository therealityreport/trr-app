"use client";

import { useMemo, useState } from "react";
import type { EditableDatawrapperChartSpec } from "@/lib/admin/design-docs-config";

const FONT = '"nyt-franklin", arial, helvetica, sans-serif';

function fmt(value: number, unit = "", unitPosition: "prefix" | "suffix" = "suffix", decimals = 0) {
  const rounded = Number.isInteger(value) && decimals === 0 ? String(value) : value.toFixed(decimals);
  return unitPosition === "prefix" ? `${unit}${rounded}` : `${rounded}${unit}`;
}

function pointLabel(x: string | number) {
  return typeof x === "number" ? String(x) : x;
}

export default function EditableDatawrapperChart({ chart }: { chart: EditableDatawrapperChartSpec }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const width = 560;
  const margin = { top: 22, right: 24, bottom: 32, left: 42 };
  const lineHeight = chart.height ?? 300;
  const plotW = width - margin.left - margin.right;
  const plotH = lineHeight - margin.top - margin.bottom;
  const unitPosition = chart.unitPosition ?? "suffix";
  const decimals = chart.decimals ?? 0;

  const series = useMemo(() => chart.series ?? [], [chart.series]);
  const allPoints = useMemo(() => series.flatMap((s) => s.points), [series]);
  const xValues = useMemo(() => series[0]?.points.map((p) => p.x) ?? [], [series]);
  const allXNumeric = xValues.every((x) => typeof x === "number");

  const yDomain = useMemo(() => {
    if (chart.yDomain) return [chart.yDomain[0], chart.yDomain[1]] as const;
    const yValues = [
      ...allPoints.map((p) => p.y),
      ...(chart.yTicks ?? []),
      ...(chart.bars ?? []).map((b) => b.value),
      0,
    ];
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    const pad = (max - min || 1) * 0.08;
    return [Math.floor(min - pad), Math.ceil(max + pad)] as const;
  }, [allPoints, chart.bars, chart.yDomain, chart.yTicks]);

  const xDomain = useMemo(() => {
    if (!allXNumeric || xValues.length === 0) return [0, Math.max(1, xValues.length - 1)] as const;
    const nums = xValues as number[];
    return [Math.min(...nums), Math.max(...nums)] as const;
  }, [allXNumeric, xValues]);

  const getX = (x: string | number, index: number) => {
    if (!allXNumeric || typeof x !== "number") {
      return margin.left + (index / Math.max(1, xValues.length - 1)) * plotW;
    }
    return margin.left + ((x - xDomain[0]) / Math.max(1, xDomain[1] - xDomain[0])) * plotW;
  };

  const getY = (y: number) => {
    return margin.top + plotH - ((y - yDomain[0]) / Math.max(1, yDomain[1] - yDomain[0])) * plotH;
  };

  const renderLineChart = () => {
    const ticks = chart.yTicks ?? [];
    const xTicks = chart.xTicks ?? xValues.filter((_, i) => i === 0 || i === xValues.length - 1);
    const hitW = plotW / Math.max(1, xValues.length);
    const hoverPoints = hoveredIndex === null
      ? []
      : series.map((s) => ({ series: s, point: s.points[hoveredIndex] })).filter((p) => p.point);

    return (
      <>
        {chart.yAxisLabel && (
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: "#727272", marginBottom: 4 }}>
            {chart.yAxisLabel}
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${lineHeight}`}
          width="100%"
          style={{ display: "block", cursor: "crosshair", overflow: "visible" }}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {ticks.map((tick) => {
            const y = getY(tick);
            return (
              <g key={tick}>
                <line x1={margin.left - 4} y1={y} x2={width - margin.right} y2={y} stroke={tick === 0 ? "#333333" : "#e6e6e6"} strokeWidth={1} />
                <text x={margin.left - 8} y={y + 4} fontFamily={FONT} fontSize={13} fill="#333333" fontWeight={400} textAnchor="end">
                  {fmt(tick, chart.unit, unitPosition, decimals)}
                </text>
              </g>
            );
          })}

          {series.map((s) => {
            const points = s.points.map((p, i) => `${getX(p.x, i)},${getY(p.y)}`).join(" ");
            return (
              <polyline
                key={s.label}
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={s.strokeWidth ?? 2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {xValues.map((x, i) => (
            <rect
              key={`${pointLabel(x)}-${i}`}
              x={getX(x, i) - hitW / 2}
              y={0}
              width={hitW}
              height={lineHeight - margin.bottom}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(i)}
            />
          ))}

          {hoveredIndex !== null && xValues[hoveredIndex] !== undefined && (
            <g>
              <line
                x1={getX(xValues[hoveredIndex], hoveredIndex)}
                y1={margin.top}
                x2={getX(xValues[hoveredIndex], hoveredIndex)}
                y2={lineHeight - margin.bottom}
                stroke="#333333"
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.28}
              />
              {hoverPoints.map(({ series: s, point }) => (
                <g key={s.label}>
                  <circle cx={getX(point.x, hoveredIndex)} cy={getY(point.y)} r={4} fill={s.color} stroke="#ffffff" strokeWidth={2} />
                  <text x={getX(point.x, hoveredIndex)} y={getY(point.y) - 12} fontFamily={FONT} fontSize={13} fontWeight={700} fill={s.color} textAnchor="middle">
                    {fmt(point.y, chart.unit, unitPosition, decimals)}
                  </text>
                </g>
              ))}
            </g>
          )}

          {series.map((s) => {
            const last = s.points[s.points.length - 1];
            if (!last) return null;
            return (
              <text
                key={`${s.label}-end-label`}
                x={getX(last.x, s.points.length - 1) - 4}
                y={getY(last.y) - 8}
                fontFamily={FONT}
                fontSize={13}
                fontWeight={700}
                fill={s.color}
                textAnchor="end"
                style={{ textShadow: "0 1px 2px #fff, 1px 0 2px #fff, -1px 0 2px #fff" }}
              >
                {s.label}
              </text>
            );
          })}

          {xTicks.map((tick) => {
            const index = xValues.findIndex((x) => x === tick);
            const x = index >= 0 ? getX(tick, index) : getX(tick, 0);
            return (
              <text key={pointLabel(tick)} x={x} y={lineHeight - 10} fontFamily={FONT} fontSize={13} fill="#333333" fontWeight={400} textAnchor="middle">
                {pointLabel(tick)}
              </text>
            );
          })}
        </svg>
        <div style={{ height: 20, fontFamily: FONT, fontSize: 13, color: "#121212", fontWeight: 700 }}>
          {hoveredIndex !== null && xValues[hoveredIndex] !== undefined
            ? `${pointLabel(xValues[hoveredIndex])}: ${hoverPoints.map(({ series: s, point }) => `${s.label} ${fmt(point.y, chart.unit, unitPosition, decimals)}`).join(" / ")}`
            : ""}
        </div>
      </>
    );
  };

  const renderDivergingBars = () => {
    const bars = chart.bars ?? [];
    const numericXTicks = (chart.xTicks ?? []).filter((tick): tick is number => typeof tick === "number");
    const min = Math.min(0, ...bars.map((b) => b.value), ...numericXTicks);
    const max = Math.max(0, ...bars.map((b) => b.value), ...numericXTicks);
    const rowH = 34;
    const barH = 18;
    const svgH = margin.top + bars.length * rowH + margin.bottom;
    const zeroX = margin.left + ((0 - min) / Math.max(1, max - min)) * plotW;
    const xFor = (value: number) => margin.left + ((value - min) / Math.max(1, max - min)) * plotW;

    return (
      <>
        {chart.xAxisLabel && (
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 300, color: "#727272", marginBottom: 4 }}>
            {chart.xAxisLabel}
          </div>
        )}
        <svg
          viewBox={`0 0 ${width} ${svgH}`}
          width="100%"
          style={{ display: "block", cursor: "crosshair", overflow: "visible" }}
          onMouseLeave={() => setHoveredBar(null)}
        >
          {(numericXTicks.length > 0 ? numericXTicks : [min, 0, max]).map((tick) => {
            const x = xFor(tick);
            return (
              <g key={tick}>
                <line x1={x} y1={margin.top - 8} x2={x} y2={svgH - margin.bottom + 4} stroke={tick === 0 ? "#333333" : "#e6e6e6"} strokeWidth={1} />
                <text x={x} y={svgH - 10} fontFamily={FONT} fontSize={12} fill="#333333" textAnchor="middle">
                  {fmt(tick, chart.unit, unitPosition, decimals)}
                </text>
              </g>
            );
          })}
          {bars.map((bar, i) => {
            const y = margin.top + i * rowH;
            const x0 = Math.min(zeroX, xFor(bar.value));
            const w = Math.abs(xFor(bar.value) - zeroX);
            const isHover = hoveredBar === i;
            const color = bar.color ?? (bar.value < 0 ? "#687d84" : "#517a8b");
            return (
              <g key={bar.label} onMouseEnter={() => setHoveredBar(i)}>
                <rect x={margin.left - 40} y={y - 5} width={plotW + 70} height={rowH} fill={isHover ? "#f7f5f0" : "transparent"} />
                <text x={margin.left - 8} y={y + 14} fontFamily={FONT} fontSize={13} fill="#333333" textAnchor="end">
                  {bar.label}
                </text>
                <rect x={x0} y={y} width={Math.max(1, w)} height={barH} fill={color} opacity={hoveredBar === null || isHover ? 1 : 0.48} />
                <text
                  x={bar.value < 0 ? x0 - 5 : x0 + w + 5}
                  y={y + 14}
                  fontFamily={FONT}
                  fontSize={13}
                  fontWeight={700}
                  fill={color}
                  textAnchor={bar.value < 0 ? "end" : "start"}
                >
                  {bar.valueLabel ?? fmt(bar.value, chart.unit, unitPosition, decimals)}
                </text>
              </g>
            );
          })}
        </svg>
      </>
    );
  };

  return (
    <div
      data-editable-datawrapper-chart={chart.originalUrl ?? chart.mode}
      data-chart-mode={chart.mode}
      style={{ maxWidth: 600, margin: "0 auto 28px", background: "#fff" }}
    >
      {chart.subtitle && (
        <div style={{ fontFamily: FONT, fontSize: 13, color: "#727272", fontWeight: 300, marginBottom: 10 }}>
          {chart.subtitle}
        </div>
      )}
      {chart.mode === "diverging-bars" ? renderDivergingBars() : renderLineChart()}
      <div style={{ fontFamily: FONT, fontSize: 12, color: "#727272", fontWeight: 300, marginTop: 8, lineHeight: 1.45 }}>
        {chart.note && <><span>Note: {chart.note}</span>{" "}</>}
        {chart.source && <span>Source: {chart.source}</span>}
        {" "}
        <span style={{ fontWeight: 500 }}>{chart.credit ?? "The New York Times"}</span>
      </div>
      {chart.editableElements && chart.editableElements.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: "#727272", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Editable chart elements
          </div>
          <div data-editable-chart-elements style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {chart.editableElements.map((item) => (
              <span key={item} style={{ fontFamily: FONT, fontSize: 11, color: "#363636", background: "#f4f4f4", border: "1px solid #dfdfdf", borderRadius: 3, padding: "3px 6px" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ARTICLES } from "@/lib/admin/design-docs-config";
import type { ContentBlock } from "@/lib/admin/design-docs-config";
import Ai2htmlArtboard, {
  TRUMP_REPORT_CARD_DESKTOP_OVERLAYS,
  TRUMP_REPORT_CARD_MOBILE_OVERLAYS,
  SWEEPSTAKES_FLOWCHART_MOBILE_OVERLAYS,
  SWEEPSTAKES_FLOWCHART_DESKTOP_OVERLAYS,
} from "./Ai2htmlArtboard";
import InteractiveBarChart from "./InteractiveBarChart";
import InteractiveLineChart from "./InteractiveLineChart";
import InteractiveHorizontalBarChart from "./InteractiveHorizontalBarChart";
import {
  MedalTable,
  MedalTableGrid,
  MedalTableInteractive,
} from "./InteractiveMedalTable";
import {
  FOOD_PRICES_DATA,
  GAS_PRICES_DATA,
  ELECTRICITY_PRICES_DATA,
  AUTO_JOBS_DATA,
  MANUFACTURING_JOBS_DATA,
  SP500_DATA,
  TARIFF_REVENUE_DATA,
  STATE_TAX_GAMBLING_DATA,
  MEDAL_TABLE_STANDARD,
  MEDAL_TABLE_VENUE_GRID,
  MEDAL_TABLE_CATEGORY_GRID,
  MEDAL_TABLE_ATHLETES,
  MEDAL_TABLE_MID_LATITUDE,
  MEDAL_TABLE_CHOOSE,
  ATHLETIC_NFL_FOURTH_DOWN_DATA,
} from "./chart-data";
import type { BarChartData } from "./InteractiveBarChart";
import type { LineChartData } from "./InteractiveLineChart";
import type {
  MedalTableData,
  MedalTableGridData,
  MedalTableInteractiveData,
  DatawrapperTableData,
} from "./chart-data";

import { useRef, useCallback } from "react";
import { LightboxShell } from "@/components/admin/image-lightbox/LightboxShell";
import { LightboxImageStage } from "@/components/admin/image-lightbox/LightboxImageStage";

/** Clickable image that opens in the app's lightbox popup */
function ClickableImage({ src, alt, style, className }: { src: string; alt: string; style?: React.CSSProperties; className?: string }) {
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const handleBackdrop = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <img
        src={src}
        alt={alt}
        style={{ ...style, cursor: "zoom-in" }}
        className={className}
        onClick={() => setOpen(true)}
      />
      {open && (
        <LightboxShell modalRef={modalRef} alt={alt} onBackdropClick={handleBackdrop}>
          <LightboxImageStage>
            <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
              <img src={src} alt={alt} style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 4 }} />
              <button
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute", top: -12, right: -12, width: 32, height: 32, borderRadius: "50%",
                  background: "#121212", color: "#fff", border: "none", cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
              <div style={{
                fontFamily: "var(--dd-font-mono, monospace)", fontSize: 11, color: "#ccc",
                textAlign: "center", marginTop: 8, background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: 4,
              }}>
                {alt}
              </div>
            </div>
          </LightboxImageStage>
        </LightboxShell>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ArticleDetailPage — Data-driven component showcase                 */
/*  Renders each content block based on the article's config data.     */
/*  Route: /admin/design-docs/nyt-articles/[slug]                      */
/* ------------------------------------------------------------------ */

interface ArticleDetailPageProps {
  articleId: string;
}

/* ── Chart-to-section mapping (Trump economy article only) ──────── */

type ChartEntry =
  | { kind: "line"; data: LineChartData }
  | { kind: "bar"; data: BarChartData }
  | null;

const SECTION_CHARTS: ChartEntry[] = [
  { kind: "line", data: FOOD_PRICES_DATA },       // 0 Food Prices
  { kind: "line", data: GAS_PRICES_DATA },         // 1 Gas Prices
  { kind: "line", data: ELECTRICITY_PRICES_DATA }, // 2 Electricity
  { kind: "bar", data: AUTO_JOBS_DATA },           // 3 Auto Industry
  { kind: "bar", data: MANUFACTURING_JOBS_DATA },  // 4 Manufacturing
  { kind: "line", data: SP500_DATA },              // 5 Stock Market
  { kind: "bar", data: TARIFF_REVENUE_DATA },      // 6 Tariff Revenue
  null,                                             // 7 Trade Deficit (no data yet)
];

/* ── Medal-table title → data lookup (winter olympics article) ── */

const MEDAL_TABLE_MAP: Record<string, MedalTableData | MedalTableGridData> = {
  "Number of Events Won (the Standard Count)": MEDAL_TABLE_STANDARD,
  "Events on Snow / Events on an Ice Rink / Events on Sliding Track / Events With a Judge":
    MEDAL_TABLE_VENUE_GRID,
  "Team Events / Individual Events / Men's Events / Women's Events":
    MEDAL_TABLE_CATEGORY_GRID,
  "Number of Athletes Who Won Medals": MEDAL_TABLE_ATHLETES,
  "Mid-Latitude Countries": MEDAL_TABLE_MID_LATITUDE,
};

/* ── Datawrapper heatmap table lookup (The Athletic) ── */

const DW_TABLE_MAP: Record<string, DatawrapperTableData> = {
  UYsk6: ATHLETIC_NFL_FOURTH_DOWN_DATA,
};

/* ── DatawrapperTable — Interactive Athletic-themed heatmap table ── */
/* Matches The Athletic Datawrapper theme exactly:
   - Font: "NYT Franklin" (nyt-franklin) — Medium 500, Semibold 600, Bold 700
   - h3.block-headline: 20px/700, #121212
   - p.block-description: 16px/500, #323232
   - th: 13.76px/300, uppercase, letter-spacing 0.08px, #52524F, bg transparent (col 1 sticky)
   - th span.dw-bold: 500
   - td: 16px/300, #121212
   - td.is-heatmap: bg from continuous gradient, text white or #121212
   - footer: 12px/500-600, #52524F
   - Sortable columns with ascending/descending toggle
*/

/** Exact heatmap colors extracted from rendered Datawrapper UYsk6/7 — per-row bg + text */
const HEATMAP_EXACT: Record<string, { bg: string; fg: string }> = {
  "18.1%": { bg: "#002728", fg: "#FFFFFF" },
  "16.9%": { bg: "#023334", fg: "#FFFFFF" },
  "14.7%": { bg: "#0A4C4C", fg: "#FFFFFF" },
  "12.9%": { bg: "#136060", fg: "#FFFFFF" },
  "11.9%": { bg: "#1D6B6B", fg: "#FFFFFF" },
  "9.6%":  { bg: "#318383", fg: "#FFFFFF" },
  "6.9%":  { bg: "#4FA4A4", fg: "#FFFFFF" },
  "1.9%":  { bg: "#ADE4D7", fg: "#121212" },
  "-0.6%": { bg: "#DED4A0", fg: "#121212" },
  "-4.8%": { bg: "#FBBC5F", fg: "#121212" },
  "-13.1%": { bg: "#E08618", fg: "#FFFFFF" },
  "-19.1%": { bg: "#B15F0D", fg: "#FFFFFF" },
  "-23.1%": { bg: "#974A07", fg: "#FFFFFF" },
  "-24.2%": { bg: "#904406", fg: "#FFFFFF" },
};

function interpolateHeatmapColor(value: number, min: number, max: number, gradient: readonly string[]): string {
  if (gradient.length === 0) return "transparent";
  const t = max === min ? 0.5 : (value - min) / (max - min);
  const i = t * (gradient.length - 1);
  const lo = Math.floor(i);
  const hi = Math.min(lo + 1, gradient.length - 1);
  const frac = i - lo;
  /* Simple hex lerp */
  const parse = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const [r1, g1, b1] = parse(gradient[lo]);
  const [r2, g2, b2] = parse(gradient[hi]);
  const r = Math.round(r1 + (r2 - r1) * frac);
  const g = Math.round(g1 + (g2 - g1) * frac);
  const b = Math.round(b1 + (b2 - b1) * frac);
  return `rgb(${r},${g},${b})`;
}

function DatawrapperTable({ data }: { data: DatawrapperTableData }) {
  const [sortKey, setSortKey] = useState<string>("xGC_plus");
  const [sortAsc, setSortAsc] = useState(false);

  const heatmapCol = data.columns.find((c) => c.heatmap);
  let heatmapMin = 0;
  let heatmapMax = 0;
  if (heatmapCol) {
    const vals = data.rows.map((r) => {
      const v = r[heatmapCol.key];
      return typeof v === "number" ? v : parseFloat(String(v));
    }).filter((n) => !isNaN(n));
    heatmapMin = Math.min(...vals);
    heatmapMax = Math.max(...vals);
  }

  /* Sort rows */
  const sortedRows = [...data.rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const an = typeof av === "number" ? av : parseFloat(String(av));
    const bn = typeof bv === "number" ? bv : parseFloat(String(bv));
    if (!isNaN(an) && !isNaN(bn)) return sortAsc ? an - bn : bn - an;
    return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const handleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* h3.block-headline — 20px/700 #121212 */}
      <h3 style={{
        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
        fontSize: 20, fontWeight: 700, lineHeight: "22px",
        color: "#121212", margin: "0 0 4px",
      }}>
        {data.title}
      </h3>
      {/* p.block-description — 16px/500 #323232 */}
      <p style={{
        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
        fontSize: 16, fontWeight: 500, lineHeight: "19.2px",
        color: "#323232", margin: "0 0 12px",
      }}>
        {data.subtitle}
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
          fontSize: 16,
        }}>
          <thead>
            <tr>
              {data.columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    textAlign: col.align,
                    padding: "8px 10px",
                    /* th: 13.76px/300 uppercase, letter-spacing 0.08px, #52524F */
                    fontSize: "13.76px",
                    fontWeight: 300,
                    textTransform: "uppercase",
                    letterSpacing: "0.08px",
                    color: "#52524F",
                    borderBottom: "1px solid #C2C2C0",
                    background: "transparent",
                    cursor: "pointer",
                    userSelect: "none",
                    whiteSpace: "nowrap",
                    position: col.key === "coach" ? "sticky" as const : undefined,
                    left: col.key === "coach" ? 0 : undefined,
                    zIndex: col.key === "coach" ? 1 : undefined,
                  }}
                >
                  {/* span.dw-bold: 500 */}
                  <span style={{ fontWeight: 500 }}>
                    {col.label}
                  </span>
                  {/* Sort indicator */}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>
                      {sortAsc ? "▲" : "▼"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, ri) => (
              <tr key={ri} style={{ transition: "background 0.15s" }}>
                {data.columns.map((col) => {
                  const val = row[col.key];
                  const valStr = String(val);
                  const isHeatmap = col.heatmap && data.heatmapGradient;

                  /* Use exact extracted colors first, fallback to interpolation */
                  let bg = "transparent";
                  let fg = "#121212";
                  if (isHeatmap && data.heatmapGradient) {
                    const exact = HEATMAP_EXACT[valStr];
                    if (exact) {
                      bg = exact.bg;
                      fg = exact.fg;
                    } else {
                      const num = parseFloat(valStr);
                      if (!isNaN(num)) {
                        bg = interpolateHeatmapColor(num, heatmapMin, heatmapMax, data.heatmapGradient);
                        const t = heatmapMax === heatmapMin ? 0.5 : (num - heatmapMin) / (heatmapMax - heatmapMin);
                        fg = (t < 0.3 || t > 0.7) ? "#FFFFFF" : "#121212";
                      }
                    }
                  }

                  /* Team icon for coach column */
                  const teamSlug = col.key === "coach" ? String(row["team"] ?? "") : "";
                  const teamIcon = teamSlug ? `/icons/athletic/teams/${teamSlug}.png` : null;

                  return (
                    <td key={col.key} style={{
                      /* td: 16px/300 #121212 */
                      textAlign: col.align,
                      padding: "8px 10px",
                      fontSize: 16,
                      fontWeight: 300,
                      lineHeight: "normal",
                      borderBottom: "1px solid #C2C2C0",
                      color: isHeatmap ? fg : "#121212",
                      background: bg,
                      fontVariantNumeric: col.align === "right" ? "tabular-nums" : undefined,
                      position: col.key === "coach" ? "sticky" as const : undefined,
                      left: col.key === "coach" ? 0 : undefined,
                      zIndex: col.key === "coach" ? 1 : undefined,
                      backgroundColor: col.key === "coach" && !isHeatmap ? "white" : bg,
                      transition: "background 0.2s",
                    }}>
                      {teamIcon ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={teamIcon} alt={teamSlug} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }} />
                          {valStr}
                        </span>
                      ) : valStr}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer: 12px/500-600 #52524F */}
      <div style={{
        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
        fontSize: 12, lineHeight: "13.2px", color: "#52524F",
        marginTop: 10,
      }}>
        <span style={{ fontWeight: 600 }}>Note: </span>
        <span style={{ fontWeight: 500 }}>{data.note}</span>
      </div>
      <div style={{
        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
        fontSize: 12, lineHeight: "13.2px", color: "#52524F",
        marginTop: 6,
      }}>
        <span style={{ fontWeight: 600 }}>Source: </span>
        <a href={data.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, color: "#52524F", textDecoration: "underline" }}>
          {data.sourceUrl}
        </a>
        <span style={{ marginLeft: 8, fontWeight: 500 }}>{data.credit}</span>
      </div>
    </div>
  );
}

/* ── BlockAnnotation helper ───────────────────────── */

function BlockAnnotation({
  type,
  css,
  show,
  children,
}: {
  type: string;
  css: string[];
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative", marginBottom: 40 }}>
      {show && (
        <div
          style={{
            fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)",
            fontSize: 10,
            lineHeight: 1.5,
            color: "#727272",
            background: "#f7f5f0",
            border: "1px solid #e8e5e0",
            borderRadius: 4,
            padding: "6px 10px",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#333",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {type}
          </span>
          {css.map((line, i) => (
            <div key={i} style={{ marginTop: 2 }}>
              {line}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Trade Deficit — interactive stacked bar ──────── */
/* Recreated SVG matching Datawrapper UosFj/4          */

function TradeDeficitChart() {
  const [hovered, setHovered] = useState<{ i: number; total: number; china: number; year: number; q: number } | null>(null);

  const quarters = [
    [30,8],[32,9],[35,10],[38,11],
    [36,10],[34,9],[33,9],[35,10],
    [36,11],[38,12],[40,13],[42,14],
    [42,14],[44,15],[46,16],[48,17],
    [50,18],[52,19],[55,20],[58,22],
    [60,22],[62,23],[65,24],[68,26],
    [65,24],[68,25],[70,26],[72,27],
    [68,24],[70,25],[65,24],[62,23],
    [60,22],[62,23],[58,20],[45,16],
    [28,12],[30,14],[35,16],[38,18],
    [40,20],[42,22],[45,24],[48,26],
    [50,24],[52,25],[55,26],[58,28],
    [55,26],[58,28],[60,30],[62,30],
    [55,25],[58,26],[60,28],[62,28],
    [58,26],[60,28],[62,28],[65,30],
    [60,28],[58,26],[56,24],[55,24],
    [52,22],[55,24],[58,26],[60,28],
    [55,24],[58,26],[60,28],[65,32],
    [62,30],[68,35],[76,40],[80,42],
    [68,33],[70,34],[68,32],[70,33],
    [42,22],[60,32],[70,36],[78,42],
    [80,38],[90,45],[98,50],[102,54],
    [100,46],[108,50],[96,42],[88,36],
    [82,34],[85,34],[82,32],[78,30],
    [82,32],[100,42],[88,34],[80,28],
  ];
  const maxDeficit = 150;
  const barCount = quarters.length;
  const gap = 510 / barCount;
  const barW = gap;

  return (
    <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#121212", marginBottom: 4 }}>
        Trade deficit
      </div>
      <svg
        viewBox="0 0 560 280"
        width="100%"
        style={{ overflow: "visible", display: "block" }}
        onMouseLeave={() => setHovered(null)}
      >
        <text x={30} y={14} fontFamily="var(--dd-font-ui, sans-serif)" fontSize={14} fill="#333" fontWeight={400} textAnchor="end">$0</text>
        <line x1={36} y1={20} x2={550} y2={20} stroke="#333" strokeWidth={1} />
        {[80, 140, 200].map((y, i) => (
          <g key={y}>
            <line x1={36} y1={y} x2={550} y2={y} stroke="#e6e6e6" strokeWidth={1} />
            <text x={30} y={y + 4} fontFamily="var(--dd-font-ui, sans-serif)" fontSize={14} fill="#333" fontWeight={400} textAnchor="end">
              {[-50, -100, -150][i]}
            </text>
          </g>
        ))}
        {quarters.map(([total, china], i) => {
          const x = 40 + i * gap;
          const chinaH = (china / maxDeficit) * 180;
          const restH = ((total - china) / maxDeficit) * 180;
          const isHovered = hovered?.i === i;
          const year = 2000 + Math.floor(i / 4);
          const q = (i % 4) + 1;
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered({ i, total, china, year, q })}
              style={{ cursor: "pointer" }}
            >
              <rect x={x} y={20} width={barW} height={chinaH} fill="#fdba58" opacity={isHovered ? 1 : 0.85} />
              <rect x={x} y={20 + chinaH} width={barW} height={restH} fill="#cccccc" opacity={isHovered ? 1 : 0.85} />
              {isHovered && (
                <line x1={x + barW / 2} y1={16} x2={x + barW / 2} y2={20 + chinaH + restH + 4} stroke="#333" strokeWidth={1} strokeDasharray="3 2" opacity={0.4} />
              )}
            </g>
          );
        })}

        {hovered && (() => {
          const x = 40 + hovered.i * gap + barW / 2;
          const tooltipX = x > 400 ? x - 120 : x + 10;
          return (
            <g>
              <rect x={tooltipX} y={2} width={115} height={42} rx={3} fill="#333" />
              <text x={tooltipX + 8} y={16} fontSize={11} fill="#fff" fontWeight={700} fontFamily="var(--dd-font-ui, sans-serif)">
                Q{hovered.q} {hovered.year}
              </text>
              <text x={tooltipX + 8} y={30} fontSize={10} fill="#fdba58" fontFamily="var(--dd-font-ui, sans-serif)">
                China: -${hovered.china}B
              </text>
              <text x={tooltipX + 8} y={40} fontSize={10} fill="#ccc" fontFamily="var(--dd-font-ui, sans-serif)">
                Total: -${hovered.total}B
              </text>
            </g>
          );
        })()}

        <text x={420} y={60} fontFamily="var(--dd-font-ui, sans-serif)" fontSize={14} fill="#121212" fontWeight={700}>China</text>
        <text x={380} y={140} fontFamily="var(--dd-font-ui, sans-serif)" fontSize={14} fill="#a8a8a8" fontWeight={400}>Rest of the world</text>
        {["2000", "2004", "2008", "2012", "2016", "2020", "2024"].map((yr, i) => (
          <text key={yr} x={40 + i * (510 / 7)} y={240} fontFamily="var(--dd-font-ui, sans-serif)" fontSize={14} fill="#333" fontWeight={400} textAnchor="start">{yr}</text>
        ))}
      </svg>

      {hovered && (
        <div style={{ fontSize: 12, color: "#333", marginTop: 4, fontWeight: 500 }}>
          Q{hovered.q} {hovered.year} — Total deficit: <strong>-${hovered.total}B</strong> (China: -${hovered.china}B, Rest: -${hovered.total - hovered.china}B)
        </div>
      )}

      <div style={{ fontSize: 13, color: "#727272", fontWeight: 300, marginTop: 8, lineHeight: 1.4 }}>
        <span>Note: Data is trade in goods, not services, and is not seasonally adjusted.</span>
        {" "}Source: Census Bureau.{"  "}
        <span style={{ fontWeight: 500 }}>The New York Times</span>
      </div>
    </div>
  );
}

/* ── Font specimen parser ─────────────────────────── */
function parseUsedInSpec(spec: string): {
  fontSize: number; fontWeight: number; lineHeight: string;
  fontStyle: string; textAlign: string; color: string;
  letterSpacing: string; textTransform: string;
} {
  let fontSize = 14;
  let fontWeight = 400;
  let lineHeight = "1.4";
  let fontStyle = "normal";
  let textAlign = "left";
  let color = "#121212";
  let letterSpacing = "normal";
  let textTransform = "none";

  // Extract color hex
  const hexMatch = spec.match(/#[0-9A-Fa-f]{6}/);
  if (hexMatch) color = hexMatch[0];
  // Extract font-style
  const styleMatch = spec.match(/font-style:(\w+)/);
  if (styleMatch) fontStyle = styleMatch[1];
  // Extract text-align
  const alignMatch = spec.match(/text-align:(\w+)/);
  if (alignMatch) textAlign = alignMatch[1];
  // Extract letter-spacing
  const lsMatch = spec.match(/letter-spacing:([\d.]+\w+)/);
  if (lsMatch) letterSpacing = lsMatch[1];
  // Extract uppercase
  if (spec.includes("uppercase")) textTransform = "uppercase";
  // Extract size/weight/lineHeight from "NNpx/NNN/NNpx" pattern
  const sizeMatch = spec.match(/(\d+(?:\.\d+)?)px\/(\d+)\/(\d+(?:\.\d+)?)(px|%)?/);
  if (sizeMatch) {
    fontSize = parseFloat(sizeMatch[1]);
    fontWeight = parseInt(sizeMatch[2], 10);
    lineHeight = sizeMatch[3] + (sizeMatch[4] || "px");
  } else {
    // Try just "NNpx/NNN" without lineHeight
    const simpleMatch = spec.match(/(\d+(?:\.\d+)?)px\/(\d+)/);
    if (simpleMatch) {
      fontSize = parseFloat(simpleMatch[1]);
      fontWeight = parseInt(simpleMatch[2], 10);
    }
  }
  return { fontSize, fontWeight, lineHeight, fontStyle, textAlign, color, letterSpacing, textTransform };
}

function getSpecimenText(
  fontSize: number,
  isUppercase: boolean,
  className?: string,
  articleTitle?: string,
  articleDescription?: string,
  articleAuthors?: readonly string[],
  articleDate?: string,
  articleSection?: string,
  articleTags?: readonly string[],
): string {
  /* Map element class to actual article text for realistic specimens */
  const cl = (className || "").toLowerCase();
  if (cl.includes("headline") || cl.includes("heading")) return articleTitle || "Article Headline Text";
  if (cl.includes("summary") || cl.includes("description") || cl.includes("deck")) return articleDescription || "Article summary description text.";
  if (cl.includes("byline") || cl.includes("author")) return `By ${(articleAuthors || []).join(", ") || "Author Name"}`;
  if (cl.includes("timestamp") || cl.includes("date")) return articleDate || "March 23, 2025";
  if (cl.includes("sectionlabel") || cl.includes("sectionkicker")) return (articleSection || "The Upshot").toUpperCase();
  if (cl.includes("topictag") || cl.includes("tag")) return (articleTags || ["Topic"]).slice(0, 3).join(" · ");
  if (cl.includes("bodytext") || cl.includes("body")) return "In most states, playing slot machines online for real money is illegal. But a group of companies known as sweepstakes casinos has found a way around the law.";
  if (cl.includes("bodylink")) return "a legal loophole that complicates the states' ability to take action";
  if (cl.includes("caption")) return "Cross-country skiing is part of Norway's culture and was a source of many of its medals.";
  if (cl.includes("credit")) return "Vincent Alban/The New York Times";
  if (cl.includes("source") || cl.includes("chartsource") || cl.includes("note")) return "Source: Bureau of Labor Statistics. The New York Times";
  if (cl.includes("badge") || cl.includes("promisebadge")) return "HASN'T HAPPENED";
  if (cl.includes("quotecitation") || cl.includes("citation") || cl.includes("promise")) return "TRUMP CAMPAIGN PROMISE";
  if (cl.includes("quote")) return "\u201CI will lower food prices on day one.\u201D";
  if (cl.includes("charttitle")) return "Breakdown of tax revenue from online casino and sports gambling";
  if (cl.includes("subhed") || cl.includes("subheading")) return "Playing Whac-a-Mole";
  if (cl.includes("sharebutton") || cl.includes("share")) return "Share full article";
  if (cl.includes("audio")) return "Listen · 7:15 min";
  if (cl.includes("livelabel") || cl.includes("live")) return "LIVE";
  if (cl.includes("storyline") || cl.includes("navlink")) return "Medal Count";
  if (cl.includes("dropdown") || cl.includes("select")) return "All events";
  if (cl.includes("tablesubtitle") || cl.includes("subtitle")) return "Number of Events Won (the Standard Count)";
  if (cl.includes("medalcountry") || cl.includes("country")) return "Norway";
  if (cl.includes("medalvalue") || cl.includes("medal")) return "18";
  if (cl.includes("barlabel")) return "86%";
  if (cl.includes("flowchart")) return "Visit an online sweepstakes casino";
  if (cl.includes("printinfo")) return "A version of this article appears in print on Section A, Page 13";
  if (cl.includes("extendedbyline") || cl.includes("producer")) return "Graphics by Jacqueline Gu and Rebecca Lieberman";
  /* Fallback: size-based generic text */
  if (isUppercase) return "SECTION LABEL · BADGE TEXT";
  if (fontSize >= 28) return articleTitle || "The quick brown fox jumps over the lazy dog";
  if (fontSize >= 13) return articleDescription || "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.";
  return "Source: Bureau of Labor Statistics. The New York Times";
}

/* ── Main component ───────────────────────────────── */

export default function ArticleDetailPage({ articleId }: ArticleDetailPageProps) {
  const article = ARTICLES.find((a) => a.id === articleId);
  const [showCss, setShowCss] = useState(false);

  /* Load NYT web fonts for live specimens */
  useEffect(() => {
    const id = "nyt-web-fonts";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://g1.nyt.com/fonts/css/web-fonts.c851560786173ad206e1f76c1901be7e096e8f8b.css";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);

  if (!article) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <p style={{ fontFamily: "var(--dd-font-ui, sans-serif)", color: "#727272" }}>
          Article not found.
        </p>
        <Link
          href={"/admin/design-docs/nyt-articles" as Route}
          style={{ color: "#326891", fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 14 }}
        >
          Back to articles
        </Link>
      </div>
    );
  }

  /* Cast once so we can access deeply nested readonly properties freely */
  const a = article as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const publicAssets = a.architecture?.publicAssets;
  const quoteSections: readonly { section: string; badge: string; badgeColor: string }[] =
    article.quoteSections;

  const hasReportCard = !!publicAssets?.reportCard;
  const hasAi2htmlArtboards = !!publicAssets?.ai2htmlArtboards;
  const hasQuoteSections = quoteSections.length > 0;
  const hasChartTypes = article.chartTypes.length > 0;
  const isInteractive = article.type === "interactive";
  const isAthletic = article.url.includes("nytimes.com/athletic/") || article.url.includes("theathletic.com");
  const athleticIcons = isAthletic ? (a.architecture?.publicAssets?.icons ?? []) : [];

  return (
    <div style={{ maxWidth: 600, padding: "0", background: "#fff" }}>
      {/* ── 1. Breadcrumb + Toggle ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 32,
        }}
      >
        <Link
          href={"/admin/design-docs/nyt-articles" as Route}
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 600,
            color: "#326891",
            textDecoration: "none",
          }}
        >
          &larr; Pages
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--dd-font-ui, sans-serif)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              color: "#fff",
              background: "#326891",
              padding: "6px 12px",
              borderRadius: 4,
              textDecoration: "none",
              whiteSpace: "nowrap" as const,
            }}
          >
            View Page ↗
          </a>
          <button
          onClick={() => setShowCss((s) => !s)}
          style={{
            fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)",
            fontSize: 11,
            fontWeight: 600,
            color: showCss ? "#121212" : "#727272",
            background: showCss ? "#e8e5e0" : "transparent",
            border: "1px solid #e8e5e0",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
          }}
        >
          {showCss ? "Hide CSS" : "Show CSS"}
        </button>
        </div>
      </div>

      {/* ── 2. Article Header Block (always) ── */}
      {/* Birdkit "interactive" articles: text-align center (g-header → g-heading-wrapper → g-heading)
         Standard "article" type: text-align left */}
      <BlockAnnotation
        type="header"
        css={[
          isAthletic
            ? `h1.Article_Headline__ou0D2.Article_Featured__tTXwK: nyt-cheltenham 40px/400/44px italic #121212`
            : `text-align: ${isInteractive ? "center" : "left"} (${isInteractive ? "Birdkit g-header inherits to g-heading" : "standard vi-story layout"})`,
          isAthletic
            ? `div.Article_HeadlineContainer__PR98W.Article_FeaturedHeadlineContainer__WPinJ`
            : `font-family: nyt-cheltenham; font-size: ${isInteractive ? "45px" : "31px (1.9375rem)"}; font-weight: ${isInteractive ? "800" : "700"}; font-style: ${isInteractive ? "normal" : "italic"}`,
          isAthletic
            ? `p (description): nyt-imperial 20px/400/30px #121212 (inside .Article_ContentContainer)`
            : `max-width: ${isInteractive ? "1000px" : "600px"}; margin: ${isInteractive ? "0 auto" : "0"}`,
        ]}
        show={showCss}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#727272",
            marginBottom: 8,
            textAlign: isInteractive ? "center" : "left",
          }}
        >
          {article.section} &middot; {article.type} &middot; {article.date}
        </div>
        <h1
          style={isAthletic ? {
            /* h1.Article_Headline.Article_Featured: nyt-cheltenham 40px/400/44px #121212
               Inside div.Article_FeaturedHeadlineContainer — centered layout, NO italic */
            fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
            fontSize: 40,
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: "44px",
            color: "#121212",
            margin: 0,
            textAlign: "center",
          } : {
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: isInteractive ? 45 : 31,
            fontWeight: isInteractive ? 800 : 700,
            fontStyle: isInteractive ? "normal" : "italic",
            lineHeight: isInteractive ? 1.1 : 1.16,
            color: "#121212",
            margin: 0,
            textAlign: isInteractive ? "center" : "left",
          }}
        >
          {article.title}
        </h1>
        <p
          style={isAthletic ? {
            /* Athletic description: nyt-imperial 20px/400/30px #121212 — centered to match header */
            fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
            fontSize: 20,
            fontWeight: 400,
            lineHeight: "30px",
            color: "#121212",
            marginTop: 12,
            textAlign: "center",
          } : {
            fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
            fontSize: 20,
            fontWeight: 300,
            lineHeight: 1.5,
            color: "#363636",
            marginTop: 12,
            textAlign: isInteractive ? "center" : "left",
          }}
        >
          {article.description}
        </p>
      </BlockAnnotation>

      {/* ── 3. Extended Byline Block (always) ── */}
      <BlockAnnotation
        type="extendedbyline"
        css={isAthletic ? [
          "span.Article_BylineString: nyt-franklin 14px/500/16.8px letter-spacing:0.25px #121212",
          "a (author name): nyt-franklin 14px/700/16.8px #121212 underlined",
          "time: nyt-franklin 13px/500/17px #121212",
          "headshot: 40px border-radius: 20px (circular)",
        ] : [
          "font-family: nyt-franklin; font-size: 15px; font-weight: 500",
          "headshot: 48px border-radius: 50%",
        ]}
        show={showCss}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: isAthletic
              ? '"nyt-franklin", helvetica, arial, sans-serif'
              : "var(--dd-font-ui, sans-serif)",
          }}
        >
          {publicAssets?.authorHeadshot?.url && (
            <img
              src={publicAssets.authorHeadshot.url}
              alt="Author headshot"
              style={{
                width: isAthletic ? 40 : 48,
                height: isAthletic ? 40 : 48,
                borderRadius: isAthletic ? 20 : "50%",
                objectFit: "cover",
              }}
            />
          )}
          <div>
            <div style={{
              fontSize: isAthletic ? 14 : 15,
              fontWeight: isAthletic ? 500 : 500,
              color: "#121212",
              letterSpacing: isAthletic ? "0.25px" : undefined,
              lineHeight: isAthletic ? "16.8px" : undefined,
            }}>
              By{" "}
              <span style={{
                fontWeight: 700,
                textDecoration: isAthletic ? "underline" : "none",
              }}>
                {article.authors.join(", ")}
              </span>
            </div>
            <div style={{
              fontSize: 13,
              fontWeight: isAthletic ? 500 : 400,
              color: isAthletic ? "#121212" : "#727272",
              marginTop: 2,
              lineHeight: isAthletic ? "17px" : undefined,
            }}>
              {article.date}
            </div>
          </div>
        </div>
      </BlockAnnotation>

      {/* ── 4. ai2html / Graphic Block — full-size comparison at top ── */}
      {/* ── 4. ai2html Report Card (Trump article) — with text overlays ── */}
      {hasReportCard && publicAssets?.reportCard && (
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 16,
            fontWeight: 700,
            color: "#121212",
            lineHeight: 1.3,
            marginBottom: 12,
          }}>
            Promise Tracker Report Card
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Mobile artboard WITH text overlays */}
            {publicAssets.reportCard.mobile?.url && (
              <div style={{ maxWidth: 320, width: "50%" }}>
                <div style={{ border: "1px solid #e8e5e0", borderRadius: 4, overflow: "hidden" }}>
                  <Ai2htmlArtboard
                    imageUrl={publicAssets.reportCard.mobile.url}
                    width={320}
                    height={315}
                    overlays={TRUMP_REPORT_CARD_MOBILE_OVERLAYS}
                  />
                </div>
                <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 6 }}>
                  Mobile · 320&times;315px · PNG + HTML overlays
                </div>
              </div>
            )}
            {/* Desktop artboard WITH text overlays */}
            {publicAssets.reportCard.desktop?.url && (
              <div style={{ maxWidth: 600, width: "100%" }}>
                <div style={{ border: "1px solid #e8e5e0", borderRadius: 4, overflow: "hidden" }}>
                  <Ai2htmlArtboard
                    imageUrl={publicAssets.reportCard.desktop.url}
                    width={600}
                    height={342.833}
                    overlays={TRUMP_REPORT_CARD_DESKTOP_OVERLAYS}
                  />
                </div>
                <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 6 }}>
                  Desktop · 600&times;343px · PNG + HTML overlays
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4b. Content Blocks (sweepstakes article and future block-based articles) ── */}
      {a.contentBlocks && a.contentBlocks.length > 0 && (() => {
        const blocks = a.contentBlocks as readonly ContentBlock[];
        return blocks.map((block: ContentBlock, bi: number) => {
          /* header, byline, author-bio are already rendered by existing code — skip */
          if (block.type === "header" || block.type === "byline" || block.type === "author-bio") {
            return null;
          }

          if (block.type === "ai2html") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="ai2html"
                css={[
                  "ai2html v0.121.1 — Illustrator → responsive HTML",
                  `Mobile: ${block.artboards.mobile.width}×${block.artboards.mobile.height} | Desktop: ${block.artboards.desktop.width}×${block.artboards.desktop.height}`,
                ]}
                show={showCss}
              >
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-ui, sans-serif)",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#121212",
                      lineHeight: 1.3,
                      marginBottom: 12,
                    }}
                  >
                    {block.title}
                  </div>
                  {/* Stacked vertically at production size with text overlays */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {/* Mobile artboard WITH text overlays */}
                    <div style={{ maxWidth: 335, width: "50%" }}>
                      <div style={{ border: "1px solid #e8e5e0", borderRadius: 4, overflow: "hidden" }}>
                        <Ai2htmlArtboard
                          imageUrl={block.artboards.mobile.url}
                          width={block.artboards.mobile.width}
                          height={block.artboards.mobile.height}
                          overlays={SWEEPSTAKES_FLOWCHART_MOBILE_OVERLAYS}
                        />
                      </div>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 6 }}>
                        Mobile · {block.artboards.mobile.width}&times;{block.artboards.mobile.height}px · {(block.artboards.mobile.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG"} + HTML overlays
                      </div>
                    </div>
                    {/* Desktop artboard WITH text overlays */}
                    <div style={{ maxWidth: 600, width: "100%" }}>
                      <div style={{ border: "1px solid #e8e5e0", borderRadius: 4, overflow: "hidden" }}>
                        <Ai2htmlArtboard
                          imageUrl={block.artboards.desktop.url}
                          width={block.artboards.desktop.width}
                          height={block.artboards.desktop.height}
                          overlays={SWEEPSTAKES_FLOWCHART_DESKTOP_OVERLAYS}
                        />
                      </div>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 6 }}>
                        Desktop · {block.artboards.desktop.width}&times;{block.artboards.desktop.height}px · {(block.artboards.desktop.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG"} + HTML overlays
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-ui, sans-serif)",
                      fontSize: 12,
                      fontWeight: 300,
                      color: "#727272",
                      marginTop: 10,
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ fontStyle: "italic" }}>{block.note}</span>
                    {"  "}
                    <span style={{ fontWeight: 500 }}>{block.credit}</span>
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          if (block.type === "subhed") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="subhed"
                css={[
                  `font-family: nyt-franklin; font-size: 13px; font-weight: 700; text-transform: uppercase`,
                  `letter-spacing: 0.02em; color: #121212; border-top: 2px solid #121212; padding-top: 8px`,
                ]}
                show={showCss}
              >
                <h2
                  style={{
                    fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: "#121212",
                    borderTop: "2px solid #121212",
                    paddingTop: 8,
                    marginTop: 32,
                    marginBottom: 16,
                  }}
                >
                  {block.text}
                </h2>
              </BlockAnnotation>
            );
          }

          if (block.type === "birdkit-chart") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-chart"
                css={[
                  "Birdkit/Svelte custom component — NOT Datawrapper",
                  "Horizontal stacked bar with percentage labels and legend headers",
                ]}
                show={showCss}
              >
                <div style={{ maxWidth: 600 }}>
                  <InteractiveHorizontalBarChart data={STATE_TAX_GAMBLING_DATA} />
                </div>
              </BlockAnnotation>
            );
          }

          if (block.type === "birdkit-table") {
            const tableData = MEDAL_TABLE_MAP[block.title];
            if (!tableData) return null;
            const isGrid = "tables" in tableData;
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-table"
                css={[
                  "Birdkit/Svelte CTableDouble — medal count table",
                  `Route: ${block.route}`,
                ]}
                show={showCss}
              >
                <div style={{ maxWidth: 600 }}>
                  {isGrid ? (
                    <MedalTableGrid data={tableData as MedalTableGridData} />
                  ) : (
                    <MedalTable data={tableData as MedalTableData} />
                  )}
                </div>
              </BlockAnnotation>
            );
          }

          if (block.type === "birdkit-table-interactive") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-table-interactive"
                css={[
                  "Birdkit/Svelte CTable — interactive dropdown medal table",
                  `Route: ${block.route}`,
                  "22 dropdown options with live data switching",
                ]}
                show={showCss}
              >
                <div style={{ maxWidth: 600 }}>
                  <MedalTableInteractive data={MEDAL_TABLE_CHOOSE} />
                </div>
              </BlockAnnotation>
            );
          }

          /* ── datawrapper-table: heatmap table (The Athletic) ── */
          if (block.type === "datawrapper-table") {
            const tableData = DW_TABLE_MAP[block.id];
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="datawrapper-table"
                css={[
                  `iframe#datawrapper-chart-${block.id} — .dw-chart .vis-tables (Datawrapper table viz)`,
                  `Theme: the-athletic — fonts from static.dwcdn.net/custom/themes/the-athletic/`,
                  `h3.block-headline: "NYT Franklin" 20px/700/22px #121212`,
                  `p.block-description: "NYT Franklin" 16px/500/19.2px #323232`,
                  `th span.dw-bold: 13.76px/500 uppercase letter-spacing:0.08px #52524F`,
                  `td.type-text: 16px/300 #121212 | td.type-number: 16px/300 #121212 tabular-nums`,
                  `td.is-heatmap (xGC+ column): bg continuous gradient #904406→#002728, text #FFF or #121212`,
                  `footer span.prepend: 12px/600 #52524F | span: 12px/500 #52524F`,
                  `Dark/light mode: .dw-dark/.dw-light classes toggle iframe src ?dark=true/false`,
                  `Interactive: column headers are sortable (click to toggle asc/desc)`,
                ]}
                show={showCss}
              >
                {tableData ? (
                  <DatawrapperTable data={tableData} />
                ) : (
                  <div style={{ padding: 16, background: "#f7f5f0", borderRadius: 4, fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "#727272" }}>
                    Table data not loaded for {block.id}
                  </div>
                )}
              </BlockAnnotation>
            );
          }

          /* ── showcase-link: inline recommendation card ── */
          if (block.type === "showcase-link") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="showcase-link"
                css={[
                  `a.showcase-link-container.in-content-module-link — flex row gap:16px padding:20px 0`,
                  `border-top/bottom: 1px solid rgba(150,150,147,0.4); text-decoration:none; color:#121212`,
                  `div.showcase-link: nyt-franklin 14px/700/13.8px letter-spacing:1.1px text-transform:uppercase`,
                  `div.showcase-link-title: nyt-cheltenham 24px/500/120% letter-spacing:0.01px (mobile: 16px)`,
                  `div.showcase-link-excerpt: nyt-imperial 16px/400/139% color:#323232 (mobile: 12px/121%)`,
                  `img.showcase-link-image: 200×150 r:8px object-fit:cover margin:0 (mobile: 120×120)`,
                ]}
                show={showCss}
              >
                <div style={{
                  display: "flex", gap: 16, padding: "20px 0",
                  borderTop: "1px solid rgba(150,150,147,0.4)",
                  borderBottom: "1px solid rgba(150,150,147,0.4)",
                  textDecoration: "none", color: "#121212", cursor: "pointer",
                }}>
                  {block.imageUrl && (
                    <img src={block.imageUrl} alt={block.title} style={{
                      width: 200, height: 150, objectFit: "cover", borderRadius: 8, flexShrink: 0, margin: 0,
                    }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, justifyContent: "center" }}>
                    {/* div.showcase-link — nyt-franklin 14px/700/13.8px, letter-spacing 1.1px, uppercase */}
                    <div style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 14, fontWeight: 700, lineHeight: "13.8px",
                      letterSpacing: "1.1px", textTransform: "uppercase",
                    }}>
                      What You Should Read Next
                    </div>
                    {/* div.showcase-link-title — nyt-cheltenham 24px/500/120%, letter-spacing 0.01px */}
                    <div style={{
                      fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
                      fontSize: 24, fontWeight: 500, lineHeight: "120%",
                      letterSpacing: "0.01px",
                    }}>
                      {block.title}
                    </div>
                    {/* div.showcase-link-excerpt — nyt-imperial 16px/400/139%, #323232 */}
                    <div style={{
                      fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
                      fontSize: 16, fontWeight: 400, lineHeight: "139%",
                      color: "#323232",
                    }}>
                      {block.excerpt}
                    </div>
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── twitter-embed: embedded tweet ── */
          if (block.type === "twitter-embed") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="twitter-embed"
                css={[
                  `blockquote.twitter-tweet[data-width=550][data-dnt=true]`,
                  `Rendered inside iframe by platform.twitter.com/widgets.js (async)`,
                  `Container inherits: nyt-imperial 20px/400/30px #121212`,
                  `Tweet text: p[lang=en][dir=ltr]`,
                  `Author link: a[href=twitter.com/...]`,
                ]}
                show={showCss}
              >
                <div style={{
                  border: "1px solid #e8e5e0", borderRadius: 12, padding: "16px 20px",
                  maxWidth: 550, background: "white",
                }}>
                  <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 13, fontWeight: 700, color: "#121212", marginBottom: 8 }}>
                    {block.author} <span style={{ fontWeight: 400, color: "#727272" }}>{block.handle}</span>
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-body)", fontSize: 15, lineHeight: 1.4, color: "#121212", marginBottom: 12 }}>
                    {block.text}
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 12, color: "#727272" }}>
                    {block.date}
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── ad-container: mid-article ad slot ── */
          if (block.type === "ad-container") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="ad-container"
                css={[
                  `div.ad-container > div.ad-wrapper.article-treatment`,
                  `.ad-wrapper { display:flex; min-height:300px; margin:48px 0 (mobile:40px); padding:11px 0 30px; flex-direction:column; align-items:center }`,
                  `p.ad-slug: nyt-franklin 11px/500/100% uppercase letter-spacing:0.02em color:var(--Gray60)/#969693`,
                  `div#${block.position}[data-position=${block.position}].ad.place-ad`,
                ]}
                show={showCss}
              >
                <div style={{
                  minHeight: 80, margin: "24px 0", padding: "8px 0 16px",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  borderTop: "1px dashed #e8e5e0", borderBottom: "1px dashed #e8e5e0",
                }}>
                  <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.02em", color: "#969693", marginBottom: 6 }}>
                    Advertisement
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "#c0c0c0" }}>
                    [{block.position}] 300×250 / 300×600 / 728×90
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── featured-image: full-width hero image ── */
          if (block.type === "featured-image") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="featured-image"
                css={[
                  `div.Article_FeaturedImageContainer__58xNR > div.Image_Root--centered__66MeR`,
                  `img[fetchpriority=high] srcSet: 600w,770w,1000w,1248w,1440w,1920w sizes:100vw object-fit:cover`,
                  `p.Article_ImageCaptionCredit__wtmKL.article-image-caption-credit (Typography_body1: nyt-imperial 14px/500/19.46px #323232)`,
                  `span.Article_ImageCredit__2YNda (nyt-franklin 12px/500/15.6px letter-spacing:0.12px #52524F)`,
                ]}
                show={showCss}
              >
                <div style={{ marginBottom: 8 }}>
                  {(block.url || a.ogImage) && (
                    <img src={block.url || a.ogImage} alt={a.title} style={{
                      width: "100%", maxHeight: 400, objectFit: "cover", borderRadius: 4,
                      border: "1px solid #e8e5e0",
                    }} />
                  )}
                  {block.caption && (
                    <p style={{
                      fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
                      fontSize: 14, fontWeight: 500, lineHeight: "19.46px",
                      color: "#323232", margin: "6px 0 2px",
                    }}>
                      {block.caption}
                    </p>
                  )}
                  <div style={{
                    fontFamily: isAthletic
                      ? '"nyt-franklin", helvetica, arial, sans-serif'
                      : "var(--dd-font-ui)",
                    fontSize: isAthletic ? 12 : 11,
                    fontWeight: isAthletic ? 500 : 400,
                    lineHeight: isAthletic ? "15.6px" : undefined,
                    letterSpacing: isAthletic ? "0.12px" : undefined,
                    color: isAthletic ? "#52524F" : "#727272",
                    marginTop: 2,
                  }}>
                    {block.credit}
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── storyline: horizontal nav bar ── */
          if (block.type === "storyline") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="storyline"
                css={[
                  `div#storyline-root.Storyline_Root__Al8c8.Storyline_notEmbed__gY6PM.Storyline_isLegacy__Ub5nG`,
                  `p.Storyline_StorylineTitle__lns7V.Typography_headlineSansBoldExtraSmall__IVozr: nyt-franklin 15px/700/15px #121212`,
                  `div.Storyline_StorylineItem__0Bav_: nyt-franklin 16px/400 #52524F`,
                  `div.Storyline_ItemTitle__W3Wj_: nyt-franklin 14px/500/14px #52524F`,
                ]}
                show={showCss}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                  borderBottom: "1px solid #e8e5e0", marginBottom: 16, overflowX: "auto",
                }}>
                  {/* p.Storyline_StorylineTitle: nyt-franklin 15px/700/15px #121212 */}
                  <div style={{
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 15, fontWeight: 700, lineHeight: "15px",
                    color: "#121212", whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    {block.title}
                  </div>
                  {block.links.map((item, i) => (
                    /* div.Storyline_ItemTitle: nyt-franklin 14px/500/14px #52524F */
                    <div key={i} style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 14, fontWeight: 500, lineHeight: "14px",
                      color: "#52524F", whiteSpace: "nowrap", flexShrink: 0,
                      padding: "4px 8px", background: "#f7f5f0", borderRadius: 4,
                    }}>
                      {item.label}
                    </div>
                  ))}
                </div>
              </BlockAnnotation>
            );
          }

          /* ── puzzle-entry-point: Connections: Sports Edition promo card ── */
          if (block.type === "puzzle-entry-point") {
            /* Connections: Sports Edition logo — base64 PNG from source HTML */
            const connectionsLogo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASAAAAEgCAMAAAAjXV6yAAAA0lBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD////v7+/f39/Pz8+/v7+gw1qWt1WWt1SgoKCfn5+Mq0+Mqk+QkJCCn0qCn0mCnkqCnkl4kkSAgIBwcHBkejlkejhabjNabjJgYGBQYi1QYS1QUFBGVidGVShGVSc8SiI8SSJAQEAyPR0yPRwwMDAoMRceJRIeJREeJBEgICAUGQwUGQsUGAsQEBAKDQYKDAYKDAVRd1CXAAAAFXRSTlP/ABAgMEBQYG9wgI+Qn6CvsL/P3+959xIgAAAEn0lEQVR42u3c4VYaVxSG4e8wDlRlsHBGTUYb0qaJialoWtE6tRBR7v+WupbaOHuGwYRl4oLzvlcAz9r7/NsjN6eotZn0fKrVzXe3NpqRm5NcTY048QoknzS/FSjeTBVUaRJ/A1DcVYD1WjOB4HnIN78CKOoq4JLoMaCfUgWdb80FaiQKvs1GPVDUw0fyUR1Q5NGxQhZoLcXmLr9WAGJ+ZpRGD0D41G2ZBWrgY+o1SkCbqun6cvhDymU6OVokmcbDx/o7v1ZNiQVqaWb5x9fZD+pQppfbiyTTMPuK3n7INbP1e6D6B+j6eC8zrQ6QrX88nvlQF4ASVTM8KwhkiVSt+wDUVKV/3mTZigNZorEqxV+AvMr9uZcFAGT6a/YIaeYLfZxlwQFlxyoX3wP1qj4hAlWFundAcWW/sjCBqlsW3wIlso2zUIH2L2Vr3wKlsvWDBcreypY2nFyz8gCFC5QNKjum8oaN+yED7d/IlDg5Xx6gcIGqI+SdItn6YQPtyxapKVOehQ2U5TK1tCHTh9CBPsrU1pZMv4cO1JcpUVfFbrLQgbIbFevJq1gO0KWKednOATpVsVS2IUAWSAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAQTQMEBX+XN1JdPF2SI9xZ+ZchNPREREREREy9X156VOpslokSaa1zBb6mQ62l6kI4AAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAPquQOfvljqZTl4u0hm370REREREREQrVX64SLmKTV4t0pFMg8PnKpft6b+TP9pepFcyvcueq1OAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAD6rkDTz4s0lRVapEn5hzxXU27fiYiIiIiIaLmanC3SSKZ8qRvL9vTfyb/KlrpTgAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAigYoBQg27lsXsUuAMpLPD0VmwB0o2JddWTaDR3oN5l+VlumX0MHOpRpQy2ZzkIHymVqKpJtJ2ygvmyRnJfpIGyggUzeyXVkmuyEDNS/kilxcrFsByEDDWRrOrlGKtuLcIH6sqXOybm2bBc7wQJdyZbcAsUq9T5UoE8qFd8Cua5KHYQJNFCpnrsDilURChCo6qPWPVB1hPQ+OKC9Tyrn3f9AsSqNdsMCevOvKjW/ALmuqh3shgO0N1C1xD0ARamqjQzRigFZnqmq+agA5NY1s7NfXqw60Os/cs2s5YpArlN/B31y9FgjFbsZLk+XU9XUdhao0eMmvphvlIBc5FExD1AZyEUpLsanDOTWmKH70jVngNiyyvwUgRAq1YtcHZBrtPHpNJwFsrW8gi5ddza5UlFHAdeNXAWoUtMHyxM7VwNka/XgMUDV4k6qoErbhscA1dTseAWST+KGq0luTlFzY6u7ykyp7yXtVjTP4D/6awC5wZMmhQAAAABJRU5ErkJggg==";
            /* Checkmark icon — SVG from source (hidden completion indicator) */
            const checkmarkSvg = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSIxMCIgdmlld0JveD0iMCAwIDI0IDI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMjQgMS45NTU1OUwxMC41MjQ3IDIxTDAgMTMuMjczTDEuOTYwMzEgMTAuNTUyTDkuNzY2NDggMTYuMjgzMUwyMS4yODc5IDBMMjQgMS45NTU1OVoiIGZpbGw9IiMwMDAwMDAiPjwvcGF0aD4KPC9zdmc+Cg==";
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="puzzle-entry-point"
                css={[
                  `div.PuzzleEntryPoint_PuzzleContainer__eVJWr > div.PuzzleEntryPoint_PuzzlesContentContainer__tN8KR.Content_EaseHover__ZAPW_`,
                  `div.PuzzleEntryPoint_PuzzlesDesktopIconContainer__n6Lyn > div.PuzzleEntryPoint_Hidden__uLL_n (checkmark SVG 6×10, viewBox 0 0 24 24)`,
                  `img.PuzzleEntryPoint_PuzzlesIcon__Po_hP: Connections logo PNG (base64 inline, 288×288)`,
                  `time.PuzzleEntryPoint_PuzzlesDate__xHoZn: date text`,
                  `h2.PuzzleEntryPoint_PuzzlesTitle__s28US: nyt-franklin 20px/600/24px letter-spacing:0.3px #000000`,
                  `p.PuzzleEntryPoint_PuzzlesMobileSubtitle__BhT5j: nyt-franklin 14px/500/18.2px letter-spacing:0.25px #323232`,
                  `p.PuzzleEntryPoint_PuzzlesDesktopSubtitle__cgpmH: nyt-franklin 14px/500/18.2px #323232`,
                  `button.PuzzleEntryPoint_PuzzlesButton__eju6v > p.PuzzleEntryPoint_PuzzlesButtonText__PsrSe + SVG chevron-right 16×16 fill:#121212`,
                ]}
                show={showCss}
              >
                {/* Faithful replica of the Athletic Connections: Sports Edition entry point */}
                <div style={{
                  display: "flex", gap: 20, padding: "16px 20px",
                  border: "1px solid #e8e5e0", borderRadius: 8,
                  cursor: "pointer",
                  transition: "box-shadow 0.15s",
                }}>
                  {/* Desktop icon container — logo */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    {/* Hidden checkmark (completion indicator, normally display:none) */}
                    <img src={checkmarkSvg} alt="" style={{ width: 6, opacity: 0.3 }} />
                    {/* Connections: Sports Edition logo */}
                    <img src={connectionsLogo} alt="Connections: Sports Edition Logo" style={{ width: 56, height: 56 }} />
                  </div>
                  {/* Info section */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    {/* Date row */}
                    <div style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 12, fontWeight: 400, color: "#52524F", marginBottom: 2,
                    }}>
                      Mar 24, 2026
                    </div>
                    {/* h2.PuzzlesTitle: nyt-franklin 20px/600/24px #000000 */}
                    <h2 style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 20, fontWeight: 600, lineHeight: "24px",
                      letterSpacing: "0.3px", color: "#000000",
                      margin: "0 0 4px",
                    }}>
                      {block.title}
                    </h2>
                    {/* Desktop subtitle: nyt-franklin 14px/500/18.2px #323232 */}
                    <p style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 14, fontWeight: 500, lineHeight: "18.2px",
                      color: "#323232", margin: 0,
                    }}>
                      Find the hidden link between sports terms
                    </p>
                  </div>
                  {/* Button: nyt-cheltenham 14px/500, with chevron-right SVG */}
                  <button style={{
                    fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
                    fontSize: 14, fontWeight: 500, color: "#000000",
                    display: "flex", alignItems: "center", gap: 4,
                    whiteSpace: "nowrap", cursor: "pointer",
                    background: "none", border: "none", padding: 0,
                  }}>
                    <span>Play today&apos;s puzzle</span>
                    <svg style={{ fontSize: 16, verticalAlign: "middle" }} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4.79999 12.08L8.8711 8.00002L4.79999 3.92002L6.05332 2.66669L11.3867 8.00002L6.05332 13.3334L4.79999 12.08Z" fill="#121212" />
                    </svg>
                  </button>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── related-link: NYT-style related coverage card ── */
          if (block.type === "related-link") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="related-link"
                css={[
                  "Related coverage card — border-top: 1px solid #e2e2e2; padding: 16px 0",
                  "Image: 150px wide, 3:2 aspect | Title: nyt-cheltenham 20px/600 | Summary: nyt-imperial 15px/400",
                ]}
                show={showCss}
              >
                <div
                  style={{
                    borderTop: "1px solid #e2e2e2",
                    paddingTop: 16,
                    display: "flex",
                    gap: 16,
                    alignItems: "flex-start",
                  }}
                >
                  {block.imageUrl && (
                    <img
                      src={block.imageUrl}
                      alt={block.title}
                      style={{
                        width: 150,
                        height: 100,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a
                      href={block.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontFamily:
                          'nyt-cheltenham, cheltenham-fallback-georgia, georgia, "times new roman", times, serif',
                        fontSize: 20,
                        fontWeight: 600,
                        lineHeight: 1.25,
                        color: "#121212",
                        textDecoration: "none",
                        display: "block",
                        marginBottom: 6,
                      }}
                    >
                      {block.title}
                    </a>
                    <div
                      style={{
                        fontFamily:
                          'nyt-imperial, georgia, "times new roman", times, serif',
                        fontSize: 15,
                        fontWeight: 400,
                        lineHeight: 1.5,
                        color: "#333",
                      }}
                    >
                      {block.summary}
                    </div>
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── quote: Promise callout with badge ── */
          if (block.type === "quote") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="quote"
                css={[
                  `Badge: nyt-franklin 12px/600 uppercase — bg:${block.badgeColor} color:#FFFFFF`,
                  "Quote text: nyt-cheltenham 25px/300 italic #363636 | Citation: nyt-franklin 14px/400 uppercase #363636",
                ]}
                show={showCss}
              >
                <div style={{ borderLeft: `4px solid ${block.badgeColor}`, paddingLeft: 16, marginBottom: 8 }}>
                  <span
                    style={{
                      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: "0.02em",
                      textTransform: "uppercase" as const,
                      color: "#fff",
                      background: block.badgeColor,
                      padding: "3px 8px",
                      borderRadius: 2,
                      display: "inline-block",
                      marginBottom: 8,
                    }}
                  >
                    {block.badge}
                  </span>
                  {block.text && (
                    <div
                      style={{
                        fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, georgia, "times new roman", times, serif',
                        fontSize: 22,
                        fontWeight: 300,
                        fontStyle: "italic",
                        lineHeight: 1.3,
                        color: "#363636",
                        marginBottom: 6,
                      }}
                    >
                      &ldquo;{block.text}&rdquo;
                    </div>
                  )}
                  {block.citation && (
                    <div
                      style={{
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 13,
                        fontWeight: 400,
                        textTransform: "uppercase" as const,
                        color: "#363636",
                      }}
                    >
                      {block.citation}
                    </div>
                  )}
                </div>
              </BlockAnnotation>
            );
          }

          /* ── datawrapper-chart: Datawrapper iframe chart embed ── */
          if (block.type === "datawrapper-chart") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="datawrapper-chart"
                css={[
                  `Datawrapper ${block.chartType} — iframe embed (${block.id})`,
                  `Title: nyt-cheltenham 21px/600 | Source: nyt-franklin 12px/300 #727272`,
                ]}
                show={showCss}
              >
                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, georgia, "times new roman", times, serif',
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#121212",
                      marginBottom: 8,
                    }}
                  >
                    {block.title}
                  </div>
                  <div
                    style={{
                      background: "#f9f9f9",
                      border: "1px solid #e8e5e0",
                      borderRadius: 4,
                      padding: "24px 16px",
                      textAlign: "center" as const,
                    }}
                  >
                    <div style={{ fontFamily: '"nyt-franklin", sans-serif', fontSize: 12, color: "#727272", marginBottom: 4 }}>
                      {block.chartType.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} — Datawrapper
                    </div>
                    <a
                      href={block.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: '"nyt-franklin", sans-serif', fontSize: 12, color: "#326891", textDecoration: "underline" }}
                    >
                      View chart ({block.id})
                    </a>
                  </div>
                  {block.source && (
                    <div style={{ fontFamily: '"nyt-franklin", sans-serif', fontSize: 11, color: "#727272", marginTop: 4 }}>
                      Source: {block.source}
                    </div>
                  )}
                </div>
              </BlockAnnotation>
            );
          }

          return null;
        });
      })()}

      {/* Section 5 removed — report card now rendered with overlays in Section 4 above */}

      {/* ── 6. Promise Sections with Charts (only if quoteSections has items) ── */}
      {hasQuoteSections && quoteSections.map((qs, i) => {
        const chart = SECTION_CHARTS[i] ?? null;
        const chartData = chart?.data as (BarChartData & LineChartData) | undefined;

        return (
          <div key={qs.section}>
            {/* Subhed */}
            <BlockAnnotation
              type="subhed"
              css={[
                "font-family: nyt-franklin; font-size: 13px; font-weight: 700; text-transform: uppercase",
                "letter-spacing: 0.06em; color: #121212; border-top: 2px solid #121212",
              ]}
              show={showCss}
            >
              <h2
                style={{
                  fontFamily: "var(--dd-font-ui, sans-serif)",
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#121212",
                  borderTop: "2px solid #121212",
                  paddingTop: 12,
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                {qs.section}
              </h2>
            </BlockAnnotation>

            {/* Quote */}
            <BlockAnnotation
              type="quote"
              css={[
                ".quote { border: 1px solid #363636; border-radius: 5px; padding: 15px }",
                "h2 { nyt-cheltenham 25px/300 }",
                ".badge { 12px/600; border-radius: 3px; padding: 5px 6px 3px }",
              ]}
              show={showCss}
            >
              <div
                style={{
                  border: "1px solid #363636",
                  borderRadius: 5,
                  padding: 15,
                  maxWidth: 600,
                }}
              >
                <h4
                  style={{
                    fontFamily: "var(--dd-font-ui, sans-serif)",
                    fontSize: 14,
                    fontWeight: 400,
                    color: "#363636",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Trump Campaign Promise
                </h4>
                <h2
                  style={{
                    fontFamily: "var(--dd-font-headline, Georgia, serif)",
                    fontSize: 25,
                    fontWeight: 300,
                    color: "#363636",
                    fontStyle: "italic",
                    margin: "0 0 12px 0",
                    lineHeight: 1.3,
                  }}
                >
                  &ldquo;Promise quote for {qs.section}&hellip;&rdquo;
                </h2>
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    borderRadius: 3,
                    padding: "5px 6px 3px",
                    color: "#efefef",
                    background: qs.badgeColor,
                    fontFamily: "var(--dd-font-ui, sans-serif)",
                    textTransform: "uppercase",
                  }}
                >
                  {qs.badge}
                </span>
              </div>
            </BlockAnnotation>

            {/* Chart */}
            <BlockAnnotation
              type="embed"
              css={[
                "Datawrapper iframe embed \u2014 canvas-based chart rendering",
                "Container: .g-wrapper > .g-block > .g-media[role=img]",
              ]}
              show={showCss}
            >
              <div style={{ maxWidth: 600 }}>
                {chart === null ? (
                  <TradeDeficitChart />
                ) : chart.kind === "line" ? (
                  <InteractiveLineChart data={chart.data} />
                ) : (
                  <InteractiveBarChart data={chart.data} />
                )}
              </div>
            </BlockAnnotation>

            {/* Source */}
            {chartData?.source && (
              <div
                style={{
                  fontFamily: "var(--dd-font-ui, sans-serif)",
                  fontSize: 12,
                  fontWeight: 300,
                  color: "#727272",
                  marginTop: -28,
                  marginBottom: 32,
                }}
              >
                Source: {chartData.source}
              </div>
            )}
          </div>
        );
      })}

      {/* ── 6b. Icons & SVGs (Athletic article icons) ── */}
      {athleticIcons.length > 0 && (
        <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginTop: 16, marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "#121212",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Icons &amp; SVGs
          </h3>
          {/* SVG icons (UI chrome) */}
          <div style={{
            fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 11,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            color: "#969693", marginBottom: 8,
          }}>
            UI Icons (inline SVG)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {athleticIcons
              .filter((icon: { file: string }) => icon.file.endsWith(".svg"))
              .map((icon: { name: string; file: string; size: string; fill: string; usage: string; element: string }) => {
                const isWhiteFill = icon.fill.includes("#FFF") || icon.fill.includes("white") || icon.name === "wordmark";
                return (
                  <div
                    key={icon.name}
                    style={{
                      border: "1px solid #e8e5e0", borderRadius: 8, padding: 12,
                      background: "#fafafa", display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 8,
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, display: "flex", alignItems: "center",
                      justifyContent: "center", borderRadius: 6,
                      background: isWhiteFill ? "#121212" : "#f0f0ee",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={icon.file} alt={icon.name} style={{
                        maxWidth: icon.name === "wordmark" ? 42 : 24, maxHeight: 24,
                        filter: isWhiteFill ? "invert(1)" : "none",
                      }} />
                    </div>
                    <div style={{ textAlign: "center", width: "100%" }}>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, fontWeight: 600, color: "#121212" }}>
                        {icon.name}
                      </div>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "#727272", marginTop: 2 }}>
                        {icon.size}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* League + Puzzle logos (raster PNG) */}
          <div style={{
            fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 11,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            color: "#969693", marginBottom: 8,
          }}>
            League &amp; Feature Logos (PNG)
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {athleticIcons
              .filter((icon: { file: string; name: string }) => icon.file.endsWith(".png") && !icon.file.includes("/teams/"))
              .map((icon: { name: string; file: string; size: string; usage: string }) => (
                <div key={icon.name} style={{
                  border: "1px solid #e8e5e0", borderRadius: 8, padding: 12,
                  background: "#fafafa", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8, width: 120,
                }}>
                  <div style={{
                    width: 48, height: 48, display: "flex", alignItems: "center",
                    justifyContent: "center", borderRadius: 6, background: "#fff",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon.file} alt={icon.name} style={{ maxWidth: 40, maxHeight: 40, objectFit: "contain" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, fontWeight: 600, color: "#121212" }}>
                      {icon.name}
                    </div>
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "#727272", marginTop: 2 }}>
                      {icon.size}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Team logos (raster PNG, 72×72) */}
          <div style={{
            fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 11,
            fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
            color: "#969693", marginBottom: 8,
          }}>
            Team Logos (72×72 PNG — 14 tagged teams)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
            {athleticIcons
              .filter((icon: { file: string }) => icon.file.includes("/teams/"))
              .map((icon: { name: string; file: string }) => (
                <div key={icon.name} style={{
                  border: "1px solid #e8e5e0", borderRadius: 8, padding: 8,
                  background: "#fafafa", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                }}>
                  <div style={{
                    width: 36, height: 36, display: "flex", alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={icon.file} alt={icon.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, fontWeight: 600, color: "#121212", textAlign: "center" }}>
                    {icon.name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 7a. Typography (fonts used in this article) ── */}
      {article.fonts.length > 0 && (
        <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginTop: 16, marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "#121212",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Typography
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {article.fonts.map((f) => (
              <div
                key={f.name}
                style={{
                  border: "1px solid #e8e5e0",
                  borderRadius: 6,
                  padding: 16,
                  background: "#fafafa",
                }}
              >
                {/* Font header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--dd-font-headline, Georgia, serif)", fontSize: 20, fontWeight: 600, color: "#121212" }}>
                    {f.name}
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 11, color: "#727272" }}>
                    Weights: {f.weights.join(", ")}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 11, fontWeight: 700, color: "#326891", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
                  {f.role}
                </div>
                {f.fullStack && (
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#969693", marginBottom: 8 }}>
                    {f.fullStack}
                  </div>
                )}
                {/* Each unique style config as a numbered list */}
                <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 10, fontWeight: 700, color: "#52524F", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6 }}>
                    Style Configs
                  </div>
                  {(() => {
                    const usedInEntries = Array.isArray(f.usedIn) ? Array.from(f.usedIn) : [String(f.usedIn)];
                    return usedInEntries.map((usage: string, ui: number) => {
                    /* Parse usedIn format: "className: size/weight/lineHeight letterSpacing color" */
                    const colonIdx = usage.indexOf(":");
                    const className = colonIdx > 0 ? usage.slice(0, colonIdx).trim() : "";
                    const specs = colonIdx > 0 ? usage.slice(colonIdx + 1).trim() : usage;
                    /* Try to extract color hex for swatch */
                    const hexMatch = specs.match(/#[0-9A-Fa-f]{6}/);
                    const hexColor = hexMatch ? hexMatch[0] : null;
                    return (
                      <div key={ui} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        padding: "4px 0", borderBottom: ui < usedInEntries.length - 1 ? "1px solid #f0f0ee" : "none",
                      }}>
                        <span style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#969693", minWidth: 16, textAlign: "right", flexShrink: 0 }}>
                          {ui + 1}.
                        </span>
                        {hexColor && (
                          <span style={{
                            display: "inline-block", width: 12, height: 12, borderRadius: 2,
                            background: hexColor, border: "1px solid #e0e0e0", flexShrink: 0, marginTop: 1,
                          }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 11, color: "#121212", lineHeight: 1.4 }}>
                            {className && (
                              <span style={{ color: "#326891", fontWeight: 600 }}>{className}</span>
                            )}
                            {className && ": "}
                            <span style={{ color: "#52524F" }}>{specs}</span>
                          </span>
                          {/* Live font specimen */}
                          {(() => {
                            const parsed = parseUsedInSpec(specs);
                            const isUpper = parsed.textTransform === "uppercase";
                            return (
                              <div style={{
                                marginTop: 6,
                                padding: 12,
                                border: "1px solid #e8e5e0",
                                borderRadius: 4,
                                background: "#fff",
                                maxWidth: 600,
                                overflow: "hidden",
                              }}>
                                <div style={{
                                  fontFamily: f.fullStack || "Georgia, serif",
                                  fontSize: parsed.fontSize,
                                  fontWeight: parsed.fontWeight,
                                  lineHeight: parsed.lineHeight,
                                  fontStyle: parsed.fontStyle,
                                  textAlign: parsed.textAlign as React.CSSProperties["textAlign"],
                                  color: parsed.color,
                                  letterSpacing: parsed.letterSpacing,
                                  textTransform: parsed.textTransform as React.CSSProperties["textTransform"],
                                }}>
                                  {getSpecimenText(
                                    parsed.fontSize,
                                    isUpper,
                                    className,
                                    article.title,
                                    article.description,
                                    article.authors,
                                    article.date,
                                    article.section,
                                    article.tags,
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                    });
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 7b. Colors (ALL colors from this article) ── */}
      {(a.colors || hasChartTypes) && (() => {
        /* Build a complete color inventory from the article's colors config */
        const colorGroups: { label: string; colors: { name: string; hex: string; note?: string }[] }[] = [];

        if (a.colors && typeof a.colors === "object") {
          const colorsObj = a.colors as Record<string, unknown>;
          /* Walk each color category (page, header, footer, darkMode, borders, datawrapperTheme, etc.) */
          for (const [groupKey, groupVal] of Object.entries(colorsObj)) {
            if (!groupVal || typeof groupVal !== "object") continue;
            const groupLabel = groupKey.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).trim();
            const entries: { name: string; hex: string; note?: string }[] = [];

            for (const [key, val] of Object.entries(groupVal as Record<string, unknown>)) {
              if (typeof val === "string") {
                /* Simple color: hex or description */
                const hexMatch = String(val).match(/#[0-9A-Fa-f]{3,8}/);
                if (hexMatch) {
                  const note = String(val).replace(hexMatch[0], "").replace(/^[\s—-]+|[\s—-]+$/g, "").trim();
                  entries.push({ name: key, hex: hexMatch[0], note: note || undefined });
                } else if (String(val).startsWith("rgb") || String(val).startsWith("rgba")) {
                  entries.push({ name: key, hex: String(val), note: undefined });
                }
              } else if (Array.isArray(val)) {
                /* Array of colors (e.g., heatmapGradient) */
                val.forEach((v: unknown, i: number) => {
                  if (typeof v === "string" && v.startsWith("#")) {
                    entries.push({ name: `${key}[${i}]`, hex: v });
                  }
                });
              } else if (typeof val === "object" && val !== null) {
                /* Nested object (e.g., heatmapExact with { bg, fg } pairs) */
                for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
                  if (typeof subVal === "object" && subVal !== null) {
                    const sv = subVal as Record<string, string>;
                    if (sv.bg) entries.push({ name: `${key} ${subKey} bg`, hex: sv.bg });
                    if (sv.fg) entries.push({ name: `${key} ${subKey} fg`, hex: sv.fg });
                  } else if (typeof subVal === "string" && subVal.startsWith("#")) {
                    entries.push({ name: `${key}.${subKey}`, hex: subVal });
                  }
                }
              }
            }
            if (entries.length > 0) colorGroups.push({ label: groupLabel, colors: entries });
          }
        }

        /* Fallback: derive chart palette from chartTypes topics if no colors config */
        if (colorGroups.length === 0 && hasChartTypes) {
          const fallback: { name: string; hex: string }[] = [];
          const seen = new Set<string>();
          article.chartTypes.forEach((ct) => {
            const topic = ct.topic.toLowerCase();
            const add = (hex: string, name: string) => { if (!seen.has(hex)) { seen.add(hex); fallback.push({ hex, name }); } };
            if (topic.includes("food") || topic.includes("electri")) add("#bf1d02", "CPI Red");
            if (topic.includes("gas") || topic.includes("auto") || topic.includes("manufactur")) add("#fdba58", "Gold");
            if (topic.includes("s&p") || topic.includes("stock")) add("#8b8b00", "Olive");
            if (topic.includes("tariff")) add("#fc9627", "Orange");
            if (topic.includes("trade") || topic.includes("deficit")) { add("#fdba58", "Gold"); add("#cccccc", "Gray"); }
            if (topic.includes("tax") || topic.includes("casino")) { add("#353D4C", "Dark Slate"); add("#CCCCCC", "Light Gray"); }
          });
          if (fallback.length === 0) { fallback.push({ hex: "#fdba58", name: "Gold" }, { hex: "#cccccc", name: "Gray" }); }
          colorGroups.push({ label: "Chart Palette", colors: fallback });
        }

        return (
          <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginTop: 0, marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: "var(--dd-font-headline, Georgia, serif)",
                fontSize: 22,
                fontWeight: 700,
                color: "#121212",
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Colors
            </h3>
            {colorGroups.map((group) => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 12, fontWeight: 600,
                  color: "#363636", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em",
                }}>
                  {group.label}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {group.colors.map((c, ci) => {
                    const isValidHex = /^#[0-9A-Fa-f]{3,8}$/.test(c.hex) || c.hex.startsWith("rgb");
                    return (
                      <div key={`${c.hex}-${ci}`} style={{ textAlign: "center", maxWidth: 64 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 4,
                          background: isValidHex ? c.hex : "#f0f0ee",
                          border: "1px solid #e0e0e0", margin: "0 auto 4px",
                        }} />
                        <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "#727272", wordBreak: "break-all" as const }}>{c.hex}</div>
                        <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 9, color: "#999", lineHeight: 1.2 }}>{c.name}</div>
                        {c.note && <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 8, color: "#b0b0b0", lineHeight: 1.1, marginTop: 1 }}>{c.note}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* ── 7c. Chart Types (if article has chartTypes) ── */}
      {hasChartTypes && (
        <BlockAnnotation
          type="chart-types"
          css={[
            "Chart type inventory — tools, visualization types, and topics used in this article",
          ]}
          show={showCss}
        >
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "#121212",
              borderTop: "1px solid #e8e5e0",
              paddingTop: 24,
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Chart Types
          </h3>
          <div style={{ overflow: "hidden", border: "1px solid #e8e5e0", borderRadius: 6, marginBottom: 24 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#f7f5f0", borderBottom: "1px solid #e8e5e0" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#363636" }}>Tool</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#363636" }}>Type</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "#363636" }}>Topic</th>
                </tr>
              </thead>
              <tbody>
                {article.chartTypes.map((ct, i) => (
                  <tr key={i} style={{ borderBottom: i < article.chartTypes.length - 1 ? "1px solid #f0ede8" : "none" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "#363636" }}>
                      {ct.tool}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#727272" }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 3,
                        background: ct.type === "line-chart" ? "#eef4ff" : ct.type === "bar-chart" ? "#fff4e6" : ct.type === "stacked-bar" ? "#f0ede8" : ct.type === "stacked-area" ? "#e8f5e9" : "#f5f5f5",
                        color: ct.type === "line-chart" ? "#326891" : ct.type === "bar-chart" ? "#c49012" : ct.type === "stacked-bar" ? "#363636" : ct.type === "stacked-area" ? "#3e914d" : "#727272",
                      }}>
                        {ct.type.charAt(0).toUpperCase() + ct.type.slice(1).replace("-", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#727272" }}>
                      {ct.topic}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </BlockAnnotation>
      )}

      {/* ── 8. Images — ai2html comparisons + Social/OG ── */}
      {(publicAssets?.socialImages?.length || hasReportCard || hasAi2htmlArtboards) && (
        <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginTop: 16 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "#121212",
              marginTop: 0,
              marginBottom: 20,
            }}
          >
            Images
          </h3>

          {/* ai2html Report Card comparison (Trump article) */}
          {/* Blank artboard images (ai2html source PNGs) */}
          {hasReportCard && publicAssets?.reportCard && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 11,
                fontWeight: 700,
                color: "#326891",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}>
                ai2html Blank Artboards (source PNGs)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {publicAssets.reportCard.mobile?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.reportCard.mobile.url}
                      alt={`Blank artboard (mobile) · ${publicAssets.reportCard.mobile.width || 320}px · PNG`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid #e8e5e0", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#363636" }}>Artboard_2 (mobile)</span> · {publicAssets.reportCard.mobile.width || 320}px · PNG
                    </div>
                  </div>
                )}
                {publicAssets.reportCard.desktop?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.reportCard.desktop.url}
                      alt={`Blank artboard (desktop) · ${publicAssets.reportCard.desktop.width || 600}px · PNG`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid #e8e5e0", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#363636" }}>Artboard_3 (desktop)</span> · {publicAssets.reportCard.desktop.width || 600}px · PNG
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ai2html Flowchart blank artboards */}
          {hasAi2htmlArtboards && publicAssets?.ai2htmlArtboards && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 11,
                fontWeight: 700,
                color: "#326891",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}>
                ai2html Blank Artboards (source images)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {publicAssets.ai2htmlArtboards.mobile?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.ai2htmlArtboards.mobile.url}
                      alt={`Blank flowchart (mobile) · ${publicAssets.ai2htmlArtboards.mobile.width || 335}px · JPG`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid #e8e5e0", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#363636" }}>Artboard_copy_4 (mobile)</span> · {publicAssets.ai2htmlArtboards.mobile.width || 335}px · JPG
                    </div>
                  </div>
                )}
                {publicAssets.ai2htmlArtboards.desktop?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.ai2htmlArtboards.desktop.url}
                      alt={`Blank flowchart (desktop) · ${publicAssets.ai2htmlArtboards.desktop.width || 600}px · JPG`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid #e8e5e0", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "#363636" }}>Artboard_copy_5 (desktop)</span> · {publicAssets.ai2htmlArtboards.desktop.width || 600}px · JPG
                    </div>
                  </div>
                )}
              </div>
              {/* Overlays are now on the content block artboards above — Images section just shows raw assets */}
            </div>
          )}

          {/* Social/OG Images grid */}
          {publicAssets?.socialImages && publicAssets.socialImages.length > 0 && (
            <>
              <div style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 11,
                fontWeight: 700,
                color: "#326891",
                textTransform: "uppercase" as const,
                letterSpacing: "0.05em",
                marginBottom: 10,
              }}>
                Social &amp; OG Images
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 16,
                }}
              >
                {publicAssets.socialImages.map(
                  (img: { name: string; url: string; ratio: string; width?: number; desc?: string }) => {
                    const ext = (img.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG";
                    return (
                      <div key={img.name}>
                        <ClickableImage
                          src={img.url}
                          alt={`${img.name} · ${img.ratio}${img.width ? ` · ${img.width}px` : ""} · ${ext}`}
                          style={{
                            width: "100%",
                            maxHeight: 120,
                            objectFit: "cover",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            display: "block",
                          }}
                        />
                        <div
                          style={{
                            fontFamily: "var(--dd-font-mono, monospace)",
                            fontSize: 10,
                            color: "#727272",
                            marginTop: 4,
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "#363636" }}>{img.name}</span>
                          {" · "}{img.ratio}
                          {img.width ? ` · ${img.width}px` : ""}
                          {" · "}<span style={{ color: "#969693", textTransform: "uppercase" as const }}>{ext}</span>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 9. Metadata Footer ── */}
      <div
        style={{
          borderTop: "1px solid #e8e5e0",
          paddingTop: 24,
          marginTop: 16,
        }}
      >
        {/* Production Stack */}
        <h4
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 700,
            color: "#121212",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Production Stack
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "4px 16px",
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          {Object.entries(article.tools).map(([key, val]) => (
            <div key={key} style={{ display: "contents" }}>
              <span style={{ fontWeight: 600, color: "#363636", textTransform: "capitalize" }}>
                {key}
              </span>
              <span style={{ color: "#727272" }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Architecture details (if available) */}
        {a.architecture && (
          <>
            <h4
              style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 13,
                fontWeight: 700,
                color: "#121212",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Architecture
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "4px 16px",
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              {a.architecture.framework && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "#363636" }}>Framework</span>
                  <span style={{ color: "#727272" }}>{a.architecture.framework}</span>
                </div>
              )}
              {a.architecture.projectId && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "#363636" }}>Project ID</span>
                  <span style={{ color: "#727272", fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)", fontSize: 12 }}>{a.architecture.projectId}</span>
                </div>
              )}
              {a.architecture.hydrationId && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "#363636" }}>Hydration ID</span>
                  <span style={{ color: "#727272", fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)", fontSize: 12 }}>{a.architecture.hydrationId}</span>
                </div>
              )}
              {a.architecture.hosting && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "#363636" }}>Hosting</span>
                  <span style={{ color: "#727272" }}>{a.architecture.hosting}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Topics */}
        <h4
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 700,
            color: "#121212",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Topics
        </h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {article.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 11,
                fontWeight: 500,
                color: "#363636",
                background: "#f7f5f0",
                border: "1px solid #e8e5e0",
                borderRadius: 3,
                padding: "3px 8px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

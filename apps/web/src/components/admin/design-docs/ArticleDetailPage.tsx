"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ARTICLES, isAthleticArticle } from "@/lib/admin/design-docs-config";
import type { ContentBlock } from "@/lib/admin/design-docs-config";
import Ai2htmlArtboard, {
  TRUMP_REPORT_CARD_DESKTOP_OVERLAYS,
  TRUMP_REPORT_CARD_MOBILE_OVERLAYS,
  SWEEPSTAKES_FLOWCHART_MOBILE_OVERLAYS,
  SWEEPSTAKES_FLOWCHART_DESKTOP_OVERLAYS,
  TRUMP_TARIFFS_US_IMPORTS_TOPPER_MOBILE_OVERLAYS,
  TRUMP_TARIFFS_US_IMPORTS_TOPPER_DESKTOP_OVERLAYS,
  TRADE_TREEMAP_MOBILE_OVERLAYS,
  TRADE_TREEMAP_DESKTOP_OVERLAYS,
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
import FilterCardTracker from "./FilterCardTracker";
import InteractiveTariffTable from "./InteractiveTariffTable";
import InteractiveTariffRateArrowChart from "./InteractiveTariffRateArrowChart";
import InteractiveTariffRateTable from "./InteractiveTariffRateTable";
import { NFL_FREE_AGENTS_2026 } from "./free-agent-data";
import type { BarChartData } from "./InteractiveBarChart";
import type { LineChartData } from "./InteractiveLineChart";
import type {
  FilterCardPlayerData,
  MedalTableData,
  MedalTableGridData,
  DatawrapperTableData,
} from "./chart-data";
import { LightboxShell } from "@/components/admin/image-lightbox/LightboxShell";
import { LightboxImageStage } from "@/components/admin/image-lightbox/LightboxImageStage";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";

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

type ShareToolButton = {
  kind: "gift" | "more" | "save" | "share";
  label: string;
};

function BirdkitShareTools({ buttons }: { buttons: readonly ShareToolButton[] }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      {buttons.map((button) => {
        const isIconOnly = button.kind === "more" || button.kind === "save" || button.kind === "share";

        return (
          <button
            key={`${button.kind}-${button.label}`}
            type="button"
            aria-label={button.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: button.kind === "gift" ? 6 : 0,
              minWidth: button.kind === "gift" ? "auto" : 32,
              height: 32,
              padding: button.kind === "gift" ? "6px 10px 6px" : "0",
              border: "1px solid #dfdfdf",
              borderRadius: button.kind === "gift" ? 30 : "999px",
              background: "#ffffff",
              color: "#121212",
              fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "15px",
              cursor: "default",
            }}
          >
            {button.kind === "gift" ? (
              <>
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 19 19">
                  <path d="M18.04 5.293h-2.725c.286-.34.493-.74.606-1.17a2.875 2.875 0 0 0-.333-2.322A2.906 2.906 0 0 0 13.64.48a3.31 3.31 0 0 0-2.372.464 3.775 3.775 0 0 0-1.534 2.483l-.141.797-.142-.847A3.745 3.745 0 0 0 7.927.923 3.31 3.31 0 0 0 5.555.459 2.907 2.907 0 0 0 3.607 1.78a2.877 2.877 0 0 0-.333 2.321c.117.429.324.828.606 1.171H1.155a.767.767 0 0 0-.757.757v3.674a.767.767 0 0 0 .757.757h.424v7.53A1.01 1.01 0 0 0 2.588 19h14.13a1.01 1.01 0 0 0 1.01-.959v-7.56h.424a.758.758 0 0 0 .757-.757V6.05a.759.759 0 0 0-.868-.757Zm-7.196-1.625a2.665 2.665 0 0 1 1.01-1.736 2.24 2.24 0 0 1 1.574-.313 1.817 1.817 0 0 1 1.211.818 1.857 1.857 0 0 1 .202 1.453 2.2 2.2 0 0 1-.838 1.191h-3.431l.272-1.413ZM4.576 2.386a1.837 1.837 0 0 1 1.221-.817 2.23 2.23 0 0 1 1.565.313 2.624 2.624 0 0 1 1.01 1.736l.242 1.453H5.182a2.2 2.2 0 0 1-.838-1.19 1.857 1.857 0 0 1 .202-1.495h.03ZM1.548 6.424h7.54V9.39h-7.58l.04-2.967Zm1.181 4.128h6.359v7.287H2.729v-7.287Zm13.777 7.287h-6.348v-7.307h6.348v7.307Zm1.181-8.468h-7.53V6.404h7.53V9.37Z" fill="#121212" fillRule="nonzero" />
                </svg>
                <span>{button.label}</span>
              </>
            ) : null}
            {button.kind === "more" ? (
              <svg aria-hidden="true" width="23" height="18" viewBox="0 0 23 18">
                <path d="M1.357 17.192a.663.663 0 0 1-.642-.81c1.82-7.955 6.197-12.068 12.331-11.68V1.127a.779.779 0 0 1 .42-.653.726.726 0 0 1 .78.106l8.195 6.986a.81.81 0 0 1 .253.557.82.82 0 0 1-.263.547l-8.196 6.955a.83.83 0 0 1-.779.105.747.747 0 0 1-.42-.663V11.29c-8.418-.905-10.974 5.177-11.08 5.45a.662.662 0 0 1-.6.453Zm10.048-7.26a16.37 16.37 0 0 1 2.314.158.81.81 0 0 1 .642.726v3.02l6.702-5.682-6.702-5.692v2.883a.767.767 0 0 1-.242.536.747.747 0 0 1-.547.18c-4.808-.537-8.364 1.85-10.448 6.922a11.679 11.679 0 0 1 8.28-3.093v.042Z" fill="#000" fillRule="nonzero" />
              </svg>
            ) : null}
            {button.kind === "save" ? (
              <svg aria-hidden="true" width="12" height="18" viewBox="0 0 12 18">
                <g fillRule="nonzero">
                  <path d="M1.157 1.268v14.288l4.96-3.813 4.753 3.843V1.268z" fill="none" />
                  <path d="m12 18-5.9-4.756L0 17.98V1.014C0 .745.095.487.265.297.435.107.664 0 .904 0h10.192c.24 0 .47.107.64.297.169.19.264.448.264.717V18ZM1.157 1.268v14.288l4.96-3.813 4.753 3.843V1.268H1.158Z" fill="#121212" />
                </g>
              </svg>
            ) : null}
            {button.kind === "share" ? (
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
                <path d="M13.4 12.2 5.7 8.7a2.8 2.8 0 0 0 0 .6c0 .2 0 .4-.1.6l7.8 3.6a2.7 2.7 0 1 0 .8-1.3Zm-8-4.8 7.9-3.7a2.7 2.7 0 1 0-.7-1.4L4.9 6a2.7 2.7 0 1 0 .5 1.4Z" fill="#121212" fillRule="nonzero" />
              </svg>
            ) : null}
            {isIconOnly ? (
              <span
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  margin: -1,
                  padding: 0,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                {button.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
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

type ArticleSocialImage = {
  name: string;
  url: string;
  ratio?: string;
  width?: number;
  desc?: string;
};

const TRUMP_TARIFFS_REACTION_ARTICLE_ID = "trump-tariffs-reaction";
const TRUMP_TARIFFS_US_IMPORTS_ARTICLE_ID = "trump-tariffs-us-imports";

function buildNytAuthorHref(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.nytimes.com/by/${slug}`;
}

function formatArticleDisplayDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function extractTextFromHtml(html: string) {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  }

  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFirstSentence(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const protectedPeriodToken = "__DD_PERIOD__";
  const protectedText = [
    "Mr.",
    "Mrs.",
    "Ms.",
    "Dr.",
    "Prof.",
    "Sr.",
    "Jr.",
    "St.",
    "U.S.",
    "U.S.A.",
    "U.K.",
    "No.",
    "vs.",
    "etc.",
  ].reduce(
    (current, abbreviation) =>
      current.replaceAll(abbreviation, abbreviation.replaceAll(".", protectedPeriodToken)),
    normalized,
  );

  if (!normalized) {
    return "";
  }

  const match = protectedText.match(/^.*?[.!?](?=(?:["'”’)\]]|\s|$))["'”’)\]]*/);
  const sentence = match ? match[0].trim() : protectedText;
  return sentence.replaceAll(protectedPeriodToken, ".");
}

function extractFirstSentenceFromHtml(html: string) {
  return extractFirstSentence(extractTextFromHtml(html));
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

const AI2HTML_OVERLAY_MAP = {
  "sweepstakes-flowchart": {
    mobile: SWEEPSTAKES_FLOWCHART_MOBILE_OVERLAYS,
    desktop: SWEEPSTAKES_FLOWCHART_DESKTOP_OVERLAYS,
  },
  "trump-tariffs-us-imports-topper": {
    mobile: TRUMP_TARIFFS_US_IMPORTS_TOPPER_MOBILE_OVERLAYS,
    desktop: TRUMP_TARIFFS_US_IMPORTS_TOPPER_DESKTOP_OVERLAYS,
  },
  "trade-treemap": {
    mobile: TRADE_TREEMAP_MOBILE_OVERLAYS,
    desktop: TRADE_TREEMAP_DESKTOP_OVERLAYS,
  },
} as const;

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

type ArticleBlockSectionEntry = {
  type: ContentBlock["type"];
  id: string;
  label: string;
};

function slugifyArticleBlockLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettifyBlockType(type: string) {
  return type
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getArticleBlockBaseLabel(block: ContentBlock) {
  switch (block.type) {
    case "header":
      return "Header";
    case "byline":
      return "Byline";
    case "sharetools-bar":
      return "Share Tools";
    case "ai2html":
    case "birdkit-table":
    case "birdkit-table-interactive":
    case "datawrapper-table":
    case "showcase-link":
    case "related-link":
    case "tariff-country-table":
    case "tariff-rate-arrow-chart":
    case "tariff-rate-table":
      return block.title;
    case "subhed":
      return block.text;
    case "body-copy":
      return "Body Copy";
    case "birdkit-chart":
      return block.title;
    case "twitter-embed":
      return `Tweet: ${block.author}`;
    case "ad-container":
      return `Ad Container ${block.position}`;
    case "puzzle-entry-point":
      return block.title;
    case "featured-image":
      return "Featured Image";
    case "storyline":
      return block.title;
    case "author-bio":
      return "Author Bio";
    case "quote":
      return block.section;
    case "datawrapper-chart":
      return block.title;
    case "birdkit-countdown":
      return block.label;
    case "birdkit-animated-headline":
      return "Animated Headline";
    case "birdkit-state-selector":
      return `${block.defaultState} State Selector`;
    case "birdkit-calendar":
      return "Calendar";
    case "birdkit-state-data-section":
      return block.title;
    case "correction":
      return "Correction";
    case "filter-card-tracker":
      return block.title;
    case "video-embed":
      return "Video Embed";
    case "reporting-credit":
      return "Reporting Credit";
    default:
      return prettifyBlockType((block as { type: string }).type);
  }
}

function buildArticleBlockSections(blocks: readonly ContentBlock[]): ArticleBlockSectionEntry[] {
  const totals = new Map<string, number>();
  const seen = new Map<string, number>();

  for (const block of blocks) {
    const baseLabel = getArticleBlockBaseLabel(block);
    totals.set(baseLabel, (totals.get(baseLabel) ?? 0) + 1);
  }

  return blocks.map((block) => {
    const baseLabel = getArticleBlockBaseLabel(block);
    const occurrence = (seen.get(baseLabel) ?? 0) + 1;
    seen.set(baseLabel, occurrence);
    const label = (totals.get(baseLabel) ?? 0) > 1 ? `${baseLabel} ${occurrence}` : baseLabel;
    return {
      type: block.type,
      id: slugifyArticleBlockLabel(label),
      label,
    };
  });
}

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
            color: "var(--dd-brand-text-muted)",
            background: "var(--dd-brand-surface)",
            border: "1px solid var(--dd-brand-border)",
            borderRadius: 4,
            padding: "6px 10px",
            marginBottom: 12,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "var(--dd-brand-text-secondary)",
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

function ArticleBlockSection({
  id,
  label,
  children,
  showHeading = true,
}: {
  id: string;
  label: string;
  children?: React.ReactNode;
  showHeading?: boolean;
}) {
  return (
    <section
      id={id}
      style={{
        scrollMarginTop: 28,
        marginBottom: 40,
      }}
    >
      {showHeading ? (
        <h2
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--dd-brand-text-secondary)",
            margin: "0 0 12px",
          }}
        >
          {label}
        </h2>
      ) : null}
      {children}
    </section>
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
  const [isTocOpen, setIsTocOpen] = useState(false);

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
        <p style={{ fontFamily: "var(--dd-font-ui, sans-serif)", color: "var(--dd-brand-text-muted)" }}>
          Article not found.
        </p>
        <Link
          href={buildDesignDocsPath("nyt-articles")}
          style={{ color: "var(--dd-brand-link)", fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 14 }}
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
  const isAthletic = isAthleticArticle(article);
  const articleIndexPath = isAthletic
    ? buildDesignDocsPath("athletic-articles")
    : buildDesignDocsPath("nyt-articles");
  const athleticIcons = isAthletic ? (a.architecture?.publicAssets?.icons ?? []) : [];
  const contentBlocks = (a.contentBlocks as readonly ContentBlock[] | undefined) ?? [];
  const blockSections = buildArticleBlockSections(contentBlocks);
  const isTrumpTariffsReaction =
    article.id === TRUMP_TARIFFS_REACTION_ARTICLE_ID;
  const isTrumpTariffsImports =
    article.id === TRUMP_TARIFFS_US_IMPORTS_ARTICLE_ID;
  const showBlockStructure = isTrumpTariffsReaction;
  const socialImages: readonly ArticleSocialImage[] =
    publicAssets?.socialImages && publicAssets.socialImages.length > 0
      ? publicAssets.socialImages
      : article.ogImage
        ? [
            {
              name: "featuredImage",
              url: article.ogImage,
              desc: "Primary featured image",
            },
          ]
        : [];
  const sectionForType = (type: ContentBlock["type"]) =>
    blockSections.find((entry) => entry.type === type);

  return (
    <div
      style={{
        maxWidth: "100%",
        width: "100%",
        padding: "0",
        background: isTrumpTariffsReaction ? "#ffffff" : "var(--dd-brand-bg)",
        color: isTrumpTariffsReaction
          ? "#121212"
          : "var(--dd-brand-text-primary)",
      }}
    >
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
          href={articleIndexPath}
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-brand-link)",
            textDecoration: "none",
          }}
        >
          &larr; Pages
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {showBlockStructure && blockSections.length > 0 ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setIsTocOpen((open) => !open)}
                aria-label={isTocOpen ? "Close table of contents" : "Open table of contents"}
                style={{
                  fontFamily: "var(--dd-font-ui, sans-serif)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--dd-brand-text-secondary)",
                  background: "#fff",
                  border: "1px solid var(--dd-brand-border)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                Contents
              </button>
              {isTocOpen ? (
                <div
                  role="dialog"
                  aria-label="Page table of contents"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    zIndex: 80,
                    width: "min(420px, 80vw)",
                    background: "#ffffff",
                    border: "1px solid var(--dd-brand-border)",
                    borderRadius: 16,
                    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--dd-font-ui, sans-serif)",
                          fontSize: 15,
                          fontWeight: 700,
                          color: "#18181b",
                          marginBottom: 2,
                        }}
                      >
                        Table of Contents
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--dd-font-mono, monospace)",
                          fontSize: 11,
                          color: "#71717a",
                        }}
                      >
                        Every documented block on this article page.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTocOpen(false)}
                      aria-label="Close table of contents"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 999,
                        border: "1px solid #e4e4e7",
                        background: "#ffffff",
                        color: "#52525b",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                    {blockSections.map((section) => (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        onClick={() => setIsTocOpen(false)}
                        style={{
                          display: "block",
                          borderRadius: 12,
                          border: "1px solid #f1f5f9",
                          background: "#fafafa",
                          padding: "10px 12px",
                          textDecoration: "none",
                          color: "#18181b",
                          fontFamily: "var(--dd-font-ui, sans-serif)",
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {section.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
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
              background: "var(--dd-brand-accent)",
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
              color: showCss
                ? "var(--dd-brand-text-primary)"
                : "var(--dd-brand-text-muted)",
              background: showCss
                ? "var(--dd-brand-accent-bg)"
                : "transparent",
              border: "1px solid var(--dd-brand-border)",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            {showCss ? "Hide CSS" : "Show CSS"}
          </button>
        </div>
      </div>

      {isTrumpTariffsImports ? (
        <ArticleBlockSection
          id={sectionForType("storyline")?.id ?? "storyline"}
          label={sectionForType("storyline")?.label ?? "Storyline"}
          showHeading={showBlockStructure}
        >
          <BlockAnnotation
            type="storyline"
            css={[
              "css-1gwp8pp storyline rail with NYT T-logo, 15px Franklin title, and 14px/500 link labels",
              "Border-bottom #DFDFDF, horizontal scroll on smaller widths, white background",
            ]}
            show={showCss}
          >
            <div
              className="css-1gwp8pp"
              data-testid="imports-storyline-rail"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                minHeight: 55,
                position: "relative",
                borderBottom: "1px solid #dfdfdf",
                overflowX: "auto",
                marginBottom: 16,
              }}
            >
              <span
                className="css-1aygtno"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  flexShrink: 1,
                  paddingRight: 10,
                }}
              >
                <Link
                  href="/"
                  data-testid="tlogo-home-link"
                  aria-label="The New York Times Home Page"
                  style={{
                    display: "block",
                    color: "#121212",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <svg
                      viewBox="0 0 44 57"
                      className="css-1v2bmad"
                      aria-hidden="true"
                      style={{ width: 45, height: 45, display: "block", flexShrink: 0 }}
                    >
                      <defs />
                      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                        <g fill="var(--color-content-primary,#121212)">
                          <path d="M43.6284633,34.8996508 C41.83393,39.6379642 38.53153,43.2989842 33.7932167,45.2371375 L33.7932167,34.8996508 L39.46463,29.8027175 L33.7932167,24.7777375 L33.7932167,17.6709842 C38.9621033,17.3120775 42.5514567,13.5074375 42.5514567,8.84136417 C42.5514567,2.73966417 36.7369967,0.5859375 33.4345967,0.5859375 C32.71707,0.5859375 31.9270167,0.5859375 30.7789167,0.872890833 L30.7789167,1.16013083 C31.20949,1.16013083 31.8550633,1.08846417 32.0709233,1.08846417 C34.36827,1.08846417 36.0911367,2.16518417 36.0911367,4.2469575 C36.0911367,5.82620417 34.7988433,7.40545083 32.5017833,7.40545083 C26.83037,7.40545083 20.15419,2.81133083 12.9038167,2.81133083 C6.44292333,2.81133083 1.99242333,7.6207375 1.99242333,12.5023842 C1.99242333,17.3120775 4.79201,18.8913242 7.73521667,19.9680442 L7.80717,19.6808042 C6.87378333,19.1066108 6.22763667,18.1018442 6.22763667,16.5223108 C6.22763667,14.3688708 8.23774333,12.5743375 10.7503767,12.5743375 C16.8520767,12.5743375 26.68675,17.6709842 32.7887367,17.6709842 L33.36293,17.6709842 L33.36293,24.8496908 L27.6918033,29.8027175 L33.36293,34.8996508 L33.36293,45.3804708 C30.9942033,46.2416175 28.5532367,46.6010975 26.0406033,46.6010975 C16.5648367,46.6010975 10.53509,40.8577308 10.53509,31.3102975 C10.53509,29.0135242 10.8220433,26.7878442 11.46819,24.6341175 L16.20593,22.5526308 L16.20593,43.6576042 L25.8253167,39.4226775 L25.8253167,17.8146042 L11.6834767,24.1315908 C13.1191033,19.9680442 16.06231,16.9531708 19.5799967,15.2303042 L19.50833,15.0150175 C10.0322767,17.0967908 0.84375,24.2754975 0.84375,35.0432708 C0.84375,47.4622442 11.32457,56.0768642 23.5285433,56.0768642 C36.4497567,56.0768642 43.7720833,47.4622442 43.84375,34.8996508 L43.6284633,34.8996508 Z" />
                        </g>
                      </g>
                    </svg>
                  </span>
                </Link>
              </span>
              <nav
                className="css-34mlm7"
                aria-labelledby="storyline-menu-title"
                role="navigation"
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  minWidth: "max-content",
                  paddingLeft: 20,
                }}
              >
                <p
                  id="storyline-menu-title"
                  style={{
                    margin: 0,
                    padding: "0 15px 0 0",
                    flexShrink: 0,
                  }}
                >
                  <span
                    className="css-1uhlowv"
                    data-testid="imports-storyline-title"
                    style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      lineHeight: "15px",
                      color: "#121212",
                      display: "flex",
                      paddingRight: 15,
                      marginRight: 16,
                    }}
                  >
                    <span>
                      <span className="css-1rxm0ex" data-testid="text-balancer">
                        {((
                          "contentBlocks" in article && Array.isArray(article.contentBlocks)
                            ? article.contentBlocks.find((block) => block.type === "storyline")?.title
                            : null
                        ) ?? "Tariffs and Trade").split(" ").slice(0, 2).join(" ")}
                        &nbsp;
                      </span>
                      <span className="css-1rxm0ex" data-testid="text-balancer">
                        {((
                          "contentBlocks" in article && Array.isArray(article.contentBlocks)
                            ? article.contentBlocks.find((block) => block.type === "storyline")?.title
                            : null
                        ) ?? "Tariffs and Trade").split(" ").slice(2).join(" ")}
                      </span>
                    </span>
                  </span>
                </p>
                <ul
                  className="css-go3nob"
                  aria-labelledby="storyline-menu-title"
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                  }}
                >
                  {"contentBlocks" in article && Array.isArray(article.contentBlocks)
                    ? article.contentBlocks
                        .find((block) => block.type === "storyline")
                        ?.links.map((item) => (
                          <li
                            className="css-1qej4jr"
                            key={item.href}
                            style={{
                              marginRight: 22.4,
                              minHeight: 48,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <span className="css-fi5tub" data-testid="menu-link">
                              <a
                                className="css-etxl5s"
                                href={item.href}
                                style={{
                                  color: "#121212",
                                  textDecoration: "none",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <span
                                  className="css-knunh2"
                                  style={{
                                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    lineHeight: "14px",
                                    color: "#121212",
                                    paddingBottom: 1,
                                  }}
                                >
                                  {item.label}
                                </span>
                              </a>
                            </span>
                          </li>
                        ))
                    : null}
                </ul>
              </nav>
            </div>
          </BlockAnnotation>
        </ArticleBlockSection>
      ) : null}

      {/* ── 2. Article Header Block (always) ── */}
      {/* Birdkit "interactive" articles: text-align center (g-header → g-heading-wrapper → g-heading)
         Standard "article" type: text-align left */}
      <ArticleBlockSection
        id={sectionForType("header")?.id ?? "header"}
        label={sectionForType("header")?.label ?? "Header"}
        showHeading={showBlockStructure}
      >
        <BlockAnnotation
          type="header"
          css={[
            isAthletic
              ? `h1.Article_Headline__ou0D2.Article_Featured__tTXwK: nyt-cheltenham 40px/400/44px italic #121212`
              : isTrumpTariffsReaction
                ? "Birdkit interactive header: nyt-cheltenham italic 36px/500/40px on a 600px text column"
                : `text-align: ${isInteractive ? "center" : "left"} (${isInteractive ? "Birdkit g-header inherits to g-heading" : "standard vi-story layout"})`,
            isAthletic
              ? `div.Article_HeadlineContainer__PR98W.Article_FeaturedHeadlineContainer__WPinJ`
              : isTrumpTariffsReaction
                ? "g-header-container.g-theme-news.g-style-bolditalic with text-wrap: balance"
                : isTrumpTariffsImports
                  ? "g-header-wrapper > .g-header-container.g-theme-news.g-style-bolditalic with left-aligned 48px italic headline"
                  : `font-family: nyt-cheltenham; font-size: ${isInteractive ? "45px" : "31px (1.9375rem)"}; font-weight: ${isInteractive ? "800" : "700"}; font-style: ${isInteractive ? "normal" : "italic"}`,
            isAthletic
              ? `p (description): nyt-imperial 20px/400/30px #121212 (inside .Article_ContentContainer)`
              : isTrumpTariffsReaction
                ? "No visible deck on this source page; heading is left-aligned despite the global interactive shell"
                : isTrumpTariffsImports
                  ? "Header includes byline and sharetools in the same 600px left-aligned Birdkit stack"
                  : `max-width: ${isInteractive ? "1000px" : "600px"}; margin: ${isInteractive ? "0 auto" : "0"}`,
          ]}
          show={showCss}
        >
          {isTrumpTariffsReaction ? (
            <div style={{ maxWidth: 600 }}>
              <h1
                style={{
                  fontFamily:
                    'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
                  fontSize: "clamp(36px, 5vw, 45px)",
                  fontWeight: 500,
                  fontStyle: "italic",
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  color: "#121212",
                  margin: 0,
                  textAlign: "left",
                  textWrap: "balance",
                }}
              >
                {article.title}
              </h1>
            </div>
          ) : isTrumpTariffsImports ? (
            <div style={{ maxWidth: 600 }}>
              <h1
                style={{
                  fontFamily:
                    'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
                  fontSize: 48,
                  fontWeight: 700,
                  fontStyle: "italic",
                  lineHeight: "58.08px",
                  letterSpacing: "normal",
                  color: "#121212",
                  margin: 0,
                  textAlign: "left",
                  textWrap: "balance",
                }}
              >
                {article.title}
              </h1>
              <div style={{ marginTop: 20 }}>
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 15,
                    fontWeight: 600,
                    lineHeight: "19.995px",
                    letterSpacing: "normal",
                    color: "#363636",
                  }}
                >
                  <span style={{ marginRight: 4 }}>By</span>
                  <a
                    href={buildNytAuthorHref(article.authors[0] ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: 600,
                      color: "#363636",
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                      textDecorationThickness: "1px",
                    }}
                  >
                    {article.authors.join(", ")}
                  </a>
                </p>
                <time
                  style={{
                    display: "block",
                    marginTop: 2,
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: "18px",
                    letterSpacing: "normal",
                    color: "#cc0000",
                  }}
                  dateTime={`${article.date}T00:00:00Z`}
                >
                  {article.date}
                </time>
              </div>
              <div style={{ marginTop: 18 }}>
                <BirdkitShareTools
                  buttons={[
                    { kind: "gift", label: "Share full article" },
                    { kind: "more", label: "More sharing options" },
                    { kind: "save", label: "Save article" },
                  ]}
                />
              </div>
            </div>
          ) : (
            <>
              {!isTrumpTariffsImports ? (
                <div
                  style={{
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
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
              ) : null}
              <h1
                style={isAthletic ? {
                  fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
                  fontSize: 40,
                  fontWeight: 400,
                  fontStyle: "normal",
                  lineHeight: "44px",
                  color: "#121212",
                  margin: 0,
                  textAlign: "center",
                } : isTrumpTariffsImports ? {
                  fontFamily: 'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
                  fontSize: 48,
                  fontWeight: 700,
                  lineHeight: "58.08px",
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
              {!isTrumpTariffsImports ? (
                <p
                  style={isAthletic ? {
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
              ) : null}
            </>
          )}
        </BlockAnnotation>
      </ArticleBlockSection>

      {/* ── 3. Extended Byline Block (always) ── */}
      {!isTrumpTariffsImports ? (
        <ArticleBlockSection
          id={sectionForType("byline")?.id ?? "byline"}
          label={sectionForType("byline")?.label ?? "Byline"}
          showHeading={showBlockStructure}
        >
          <BlockAnnotation
            type="extendedbyline"
            css={isAthletic ? [
              "span.Article_BylineString: nyt-franklin 14px/500/16.8px letter-spacing:0.25px #121212",
              "a (author name): nyt-franklin 14px/700/16.8px #121212 underlined",
              "time: nyt-franklin 13px/500/17px #121212",
              "headshot: 40px border-radius: 20px (circular)",
            ] : isTrumpTariffsReaction ? [
              "p.g-byline: nyt-franklin 14px/700/18px #363636 with linked author names",
              "time.g-interactive-timestamp: nyt-franklin 13px/500/18px #363636",
              "g-byline-wrapper is left-aligned on a 600px text column",
            ] : [
              "font-family: nyt-franklin; font-size: 15px; font-weight: 500",
              "headshot: 48px border-radius: 50%",
            ]}
            show={showCss}
          >
          {isTrumpTariffsReaction ? (
            <div style={{ maxWidth: 600 }}>
              <p
                style={{
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: "18px",
                  color: "#363636",
                  margin: 0,
                }}
              >
                <span style={{ marginRight: 4 }}>By</span>
                {article.authors.map((author, index) => (
                  <span key={author}>
                    <a
                      href={buildNytAuthorHref(author)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#363636",
                        textDecoration: "underline",
                        textUnderlineOffset: 2,
                        textDecorationThickness: "1px",
                      }}
                    >
                      {author}
                    </a>
                    {index < article.authors.length - 2 ? ", " : null}
                    {index === article.authors.length - 2 ? " and " : null}
                  </span>
                ))}
              </p>
              <time
                style={{
                  display: "block",
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 13,
                  fontWeight: 500,
                  lineHeight: "18px",
                  color: "#363636",
                  marginTop: 2,
                }}
                dateTime={`${article.date}T00:00:00Z`}
              >
                {formatArticleDisplayDate(article.date)}
              </time>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: isAthletic
                  ? '"nyt-franklin", helvetica, arial, sans-serif'
                  : '"nyt-franklin", helvetica, arial, sans-serif',
              }}
            >
              {publicAssets?.authorHeadshot?.url && !isTrumpTariffsImports && (
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
                  fontWeight: isAthletic ? 500 : isTrumpTariffsImports ? 400 : 500,
                  color: isTrumpTariffsImports ? "#363636" : "#121212",
                  letterSpacing: isAthletic ? "0.25px" : undefined,
                  lineHeight: isAthletic ? "16.8px" : isTrumpTariffsImports ? "19.995px" : undefined,
                }}>
                  By{" "}
                  <a
                    href={buildNytAuthorHref(article.authors[0] ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontWeight: isTrumpTariffsImports ? 600 : 700,
                      color: isTrumpTariffsImports ? "#363636" : "#121212",
                      textDecoration: isAthletic || isTrumpTariffsImports ? "underline" : "none",
                      textUnderlineOffset: isTrumpTariffsImports ? 2 : undefined,
                      textDecorationThickness: isTrumpTariffsImports ? "1px" : undefined,
                    }}
                  >
                    {article.authors.join(", ")}
                  </a>
                </div>
                <div style={{
                  fontSize: 13,
                  fontWeight: isAthletic ? 500 : isTrumpTariffsImports ? 500 : 400,
                  color: isAthletic ? "#121212" : isTrumpTariffsImports ? "#cc0000" : "#727272",
                  marginTop: 2,
                  lineHeight: isAthletic ? "17px" : isTrumpTariffsImports ? "18px" : undefined,
                }}>
                  {article.date}
                </div>
              </div>
            </div>
          )}
          </BlockAnnotation>
        </ArticleBlockSection>
      ) : null}

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
                <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 6 }}>
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
                <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 6 }}>
                  Desktop · 600&times;343px · PNG + HTML overlays
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4b. Content Blocks (sweepstakes article and future block-based articles) ── */}
      {contentBlocks.length > 0 && (() => {
        return contentBlocks.map((block: ContentBlock, bi: number) => {
          const section = blockSections[bi];
          /* header, byline, author-bio are already rendered by existing code — skip */
          if (block.type === "header" || block.type === "byline") {
            return null;
          }

          if (
            isTrumpTariffsImports &&
            (block.type === "storyline" || block.type === "sharetools-bar")
          ) {
            return null;
          }

          if (block.type === "author-bio") {
            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={showBlockStructure}
              />
            );
          }

          if (block.type === "sharetools-bar") {
            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={showBlockStructure}
              >
                <BlockAnnotation
                  type="sharetools-bar"
                  css={[
                    "Tier 2 facsimile of NYT action chrome",
                    "Pill buttons with 1px #DFDFDF borders, uppercase Franklin labels, white background",
                    "Product-aware save/gift/menu states are documented in architecture notes, not live-wired here",
                  ]}
                  show={showCss}
                >
                  <div
                    style={{
                      marginBottom: 24,
                    }}
                  >
                    <BirdkitShareTools buttons={block.buttons} />
                  </div>
                </BlockAnnotation>
              </ArticleBlockSection>
            );
          }

          if (block.type === "ai2html") {
            const overlaySet = block.overlaySet ?? "sweepstakes-flowchart";
            const overlays = AI2HTML_OVERLAY_MAP[overlaySet];
            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={showBlockStructure}
              >
                <BlockAnnotation
                  type="ai2html"
                  css={[
                    "ai2html v0.121.1 — Illustrator → responsive HTML",
                    `Mobile: ${block.artboards.mobile.width}×${block.artboards.mobile.height} | Desktop: ${block.artboards.desktop.width}×${block.artboards.desktop.height}`,
                  ]}
                  show={showCss}
                >
                  <div style={{ marginBottom: 8 }}>
                    {/* Stacked vertically at production size with text overlays */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      {/* Mobile artboard WITH text overlays */}
                      <div style={{ maxWidth: 335, width: "100%" }}>
                        <div style={{ border: "1px solid #e8e5e0", borderRadius: 4, overflow: "hidden" }}>
                          <Ai2htmlArtboard
                            imageUrl={block.artboards.mobile.url}
                            width={block.artboards.mobile.width}
                            height={block.artboards.mobile.height}
                            overlays={overlays.mobile}
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
                            overlays={overlays.desktop}
                          />
                        </div>
                        <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "#727272", marginTop: 6 }}>
                          Desktop · {block.artboards.desktop.width}&times;{block.artboards.desktop.height}px · {(block.artboards.desktop.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG"} + HTML overlays
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#727272",
                      marginTop: 10,
                      lineHeight: "17px",
                    }}
                  >
                    {block.source ? (
                      <p style={{ margin: 0 }}>
                        Source: {block.source}
                      </p>
                    ) : null}
                    <p style={{ margin: block.source ? "4px 0 0" : 0 }}>
                      Note: {block.note}
                    </p>
                    <p style={{ margin: "4px 0 0" }}>{block.credit}</p>
                  </div>
                </BlockAnnotation>
              </ArticleBlockSection>
            );
          }

          if (block.type === "body-copy") {
            const firstSentence = extractFirstSentenceFromHtml(block.html);

            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={showBlockStructure}
              >
                <BlockAnnotation
                  type="body-copy"
                  css={[
                    "Birdkit body copy excerpt uses NYT Imperial on a 600px text column",
                    "Only the first sentence of each source paragraph is shown in design docs",
                    "20px/30px, 500 weight, #121212",
                  ]}
                  show={showCss}
                >
                  <div style={{ maxWidth: 600 }}>
                    <p
                      style={{
                        fontFamily:
                          '"nyt-imperial", georgia, "times new roman", times, serif',
                        fontSize: 20,
                        fontWeight: 500,
                        lineHeight: "30px",
                        color: "#121212",
                        margin: "0 0 12px",
                      }}
                    >
                      {firstSentence}
                    </p>
                  </div>
                </BlockAnnotation>
              </ArticleBlockSection>
            );
          }

          if (block.type === "subhed") {
            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={false}
              >
                <BlockAnnotation
                  type="subhed"
                  css={[
                    "g-subhed-wrapper.g-theme-news",
                    "nyt-franklin 700 section subhead with sentence case and no border rule",
                  ]}
                  show={showCss}
                >
                  <div style={{ maxWidth: 600 }}>
                    <h2
                      style={{
                        fontFamily:
                          '"nyt-franklin", helvetica, arial, sans-serif',
                        fontSize: 28,
                        fontWeight: 700,
                        lineHeight: "34px",
                        letterSpacing: "-0.01em",
                        color: "#121212",
                        marginTop: 32,
                        marginBottom: 20,
                      }}
                    >
                      {block.text}
                    </h2>
                  </div>
                </BlockAnnotation>
              </ArticleBlockSection>
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

          /* ── video-embed: inline video player ── */
          if (block.type === "video-embed") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="video-embed"
                css={[
                  `div[data-ath-video-stream="${block.streamId}"] — DASH/HLS dual-source video`,
                  `Horizontal: 9 | Vertical: 16 (portrait aspect)`,
                  `DASH: application/dash+xml (.mpd) | HLS: application/x-mpegURL (.m3u8)`,
                ]}
                show={showCss}
              >
                <div style={{
                  background: "#121212", borderRadius: 8, overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  minHeight: 120, padding: "24px 16px",
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "#969693", marginBottom: 8 }}>
                      ▶ Video Embed
                    </div>
                    <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#52524F" }}>
                      Stream: {block.streamId}
                    </div>
                    <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#52524F", marginTop: 4 }}>
                      {block.sources.map((s) => s.type.split("/").pop()).join(" + ")} dual-source
                    </div>
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── filter-card-tracker: interactive player card tracker ── */
          if (block.type === "filter-card-tracker") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="filter-card-tracker"
                css={[
                  `div#filtered-cards.article-fullwidth.fc.fc-branded.fc-cs-${block.colorScheme}`,
                  `WordPress filter-card system — jQuery + D3.js + filtercard.js + big-board-charts.js`,
                  `${block.cardCount} accordion cards with search, 4 dropdown filters, expand/collapse all`,
                  `Each card: rank + h3 player name + team logo + contract spotlight + expandable two-column body`,
                  `Expanded: left (contract + age/height/weight + scouting + "How he fits") | right (headshot + stats table)`,
                ]}
                show={showCss}
              >
                <FilterCardTracker
                  data={{
                    title: "Top 150 NFL Free Agents",
                    colorScheme: block.colorScheme,
                    players: NFL_FREE_AGENTS_2026 as readonly FilterCardPlayerData[],
                    positionBreakdown: { Edge: 19, WR: 15, CB: 14, T: 13, S: 13, TE: 13, LB: 12, RB: 12, IDL: 12, G: 12, QB: 10, C: 5 },
                    statusBreakdown: { Agreed: 117, "Still available": 33 },
                  }}
                  colorScheme={block.colorScheme}
                  filters={block.filters}
                />
              </BlockAnnotation>
            );
          }

          /* ── tariff-country-table: NYT tariff response tracker table ── */
          if (block.type === "tariff-country-table") {
            return (
              <ArticleBlockSection
                key={`cb-${bi}`}
                id={section.id}
                label={section.label}
                showHeading={showBlockStructure}
              >
                <BlockAnnotation
                  type="tariff-country-table"
                  css={[
                    `div.g-table — Birdkit/Svelte interactive status table (20 countries)`,
                    `div.g-row: flex row, gap 12px, padding 10px 0, border-bottom 1px #E8E8E8`,
                    `span.g-status (.g-retaliated): 11px/700 uppercase letter-spacing:0.04em bg:#B86200 color:#fff`,
                    `span.g-status (.g-trying-to-negotiate): 11px/700 uppercase bg:#4E9493 color:#fff`,
                    `span.g-status (.g-no-retaliation): 11px/700 color:#666666 border:1px #D3D3D3`,
                    `span.g-status (.g-offered-concessions): 11px/700 uppercase bg:#4E9493 color:#fff`,
                    `td.g-country: nyt-franklin 14px/700 #121212`,
                    `td.g-tariff: nyt-franklin 14px/500 #121212 tabular-nums`,
                    `td.g-exports: nyt-franklin 13px/500 #666666`,
                    `p.g-note: nyt-franklin 12px/400/18px #666666 (expanded per row)`,
                  ]}
                  show={showCss}
                >
                  <InteractiveTariffTable
                    source={block.source}
                    noteText={block.noteText}
                  />
                </BlockAnnotation>
              </ArticleBlockSection>
            );
          }

          if (block.type === "tariff-rate-arrow-chart") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="tariff-rate-arrow-chart"
                css={[
                  "Birdkit/Svelte arrow-chart recreation extracted from NYT SSR markup for the 10 largest U.S. import partners",
                  "600px body-width module with Franklin heading, labels, and end-anchored percentage values on a 4px ochre stem",
                ]}
                show={showCss}
              >
                <InteractiveTariffRateArrowChart
                  title={block.title}
                  leadin={block.leadin}
                  source={block.source}
                  credit={block.credit}
                />
              </BlockAnnotation>
            );
          }

          if (block.type === "tariff-rate-table") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="tariff-rate-table"
                css={[
                  "Birdkit/Svelte table facsimile with 86 tariff rows and Franklin/Cheltenham hybrid typography",
                  "Initial state shows 10 rows with expandable remainder",
                ]}
                show={showCss}
              >
                <InteractiveTariffRateTable
                  title={block.title}
                  leadin={block.leadin}
                  source={block.source}
                  credit={block.credit}
                  initialVisibleRows={block.initialVisibleRows}
                />
              </BlockAnnotation>
            );
          }

          if (block.type === "reporting-credit") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="reporting-credit"
                css={[
                  "Small NYT Franklin reporting note with rule-before treatment",
                  "15px/20px paragraph with 120px rule pseudo-element approximated inline",
                ]}
                show={showCss}
              >
                <div style={{ margin: "10px 0 24px" }}>
                  <div
                    style={{
                      width: 120,
                      height: 1,
                      background: "#121212",
                      margin: "0 0 18px",
                    }}
                  />
                  <p
                    style={{
                      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: "20px",
                      color: "#333333",
                      margin: 0,
                    }}
                  >
                    {block.text}
                  </p>
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

          /* ── birdkit-countdown: election day countdown badge ── */
          if (block.type === "birdkit-countdown") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-countdown"
                css={[
                  `font-family: nyt-franklin; font-size: 12px; font-weight: 600; text-transform: uppercase`,
                  `display: inline-flex; align-items: baseline; gap: 6px; color: #121212`,
                ]}
                show={showCss}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 6,
                    padding: "10px 0",
                    borderBottom: "1px solid #e2e2e2",
                    marginBottom: 4,
                    width: "100%",
                    maxWidth: 600,
                  }}
                >
                  <span
                    style={{
                      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                      fontSize: 32,
                      fontWeight: 800,
                      color: "#121212",
                      lineHeight: 1,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {block.daysLeft} days
                  </span>
                  <span
                    style={{
                      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                      fontSize: 15,
                      fontWeight: 500,
                      color: "#666",
                      lineHeight: 1,
                    }}
                  >
                    {block.label}
                  </span>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── birdkit-animated-headline: cycling headline variants ── */
          if (block.type === "birdkit-animated-headline") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-animated-headline"
                css={[
                  `font-family: nyt-cheltenham; font-size: 40px; font-weight: 700`,
                  `text-align: center; CSS animation: opacity crossfade cycling [Register to Vote | Vote Early | Vote by Mail]`,
                ]}
                show={showCss}
              >
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 0 24px",
                    maxWidth: 600,
                  }}
                >
                  <h1
                    style={{
                      fontFamily: '"nyt-cheltenham", georgia, "times new roman", serif',
                      fontSize: 40,
                      fontWeight: 700,
                      color: "#121212",
                      lineHeight: 1.1,
                      margin: 0,
                    }}
                  >
                    When to{" "}
                    <span
                      style={{
                        fontStyle: "italic",
                        position: "relative",
                        display: "inline-block",
                      }}
                    >
                      <span style={{ borderBottom: "3px solid #121212", paddingBottom: 2 }}>
                        {block.variants[0]}
                      </span>
                    </span>
                    <br />
                    in Your State
                  </h1>
                  {/* Variant preview chips */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 16,
                    }}
                  >
                    {block.variants.map((v, vi) => (
                      <span
                        key={vi}
                        style={{
                          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          padding: "3px 8px",
                          borderRadius: 3,
                          background: vi === 0 ? "#121212" : "#f0f0f0",
                          color: vi === 0 ? "#fff" : "#999",
                        }}
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      fontFamily: '"nyt-franklin", sans-serif',
                      fontSize: 10,
                      color: "#999",
                      marginTop: 10,
                      fontStyle: "italic",
                      letterSpacing: "0.02em",
                    }}
                  >
                    CSS animation crossfades between italic variants on 3 s loop
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── birdkit-state-selector: state dropdown selector ── */
          if (block.type === "birdkit-state-selector") {
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-state-selector"
                css={[
                  `font-family: nyt-franklin; font-size: 18px; font-weight: 500`,
                  `<select> with ${block.stateCount} options (50 states + DC), default: ${block.defaultState}`,
                ]}
                show={showCss}
              >
                <div style={{ maxWidth: 600, margin: "20px 0 24px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#333",
                      }}
                    >
                      Important voting deadlines for
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#121212",
                        borderBottom: "2px solid #121212",
                        paddingBottom: 1,
                        cursor: "pointer",
                      }}
                    >
                      {block.defaultState}
                      <svg width="12" height="8" viewBox="0 0 12 8" style={{ marginLeft: 2 }}>
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="#121212" strokeWidth="2" fill="none" />
                      </svg>
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: '"nyt-franklin", sans-serif',
                      fontSize: 11,
                      color: "#999",
                      marginTop: 6,
                    }}
                  >
                    {block.stateCount} options &middot; Svelte reactive store updates calendar + data sections on change
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── birdkit-calendar: dual-month interactive calendar with color-coded deadlines ── */
          if (block.type === "birdkit-calendar") {
            /* ── Calendar data for New York (default state) ── */
            const DAY_HEADERS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
            /* Oct 2024 starts on Tuesday (col 3), 31 days; Nov 2024 starts on Friday (col 6), 30 days */
            const MONTHS_DATA: { name: string; startCol: number; totalDays: number; highlights: Record<number, string[]> }[] = [
              {
                name: "October 2024",
                startCol: 3, /* Tuesday = column 3 (1-indexed, Sun=1) */
                totalDays: 31,
                highlights: {
                  26: ["#F6CC79", "#F7A0E1"], /* register + request mail ballot */
                },
              },
              {
                name: "November 2024",
                startCol: 6, /* Friday = column 6 */
                totalDays: 30,
                highlights: {
                  3: ["#BCEB82"],    /* early voting ends */
                  5: ["#BFA0F7", "#BFA0F7"], /* election day + mail ballot */
                },
              },
            ];

            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-calendar"
                css={[
                  `7-column CSS Grid calendar; grid-column-start offsets per month`,
                  `td cells: 34px squares, border-radius: 3px, category background colors`,
                  `role="img" on calendar container; nyt-franklin day numbers, nyt-cheltenham month headers`,
                ]}
                show={showCss}
              >
                <div style={{ maxWidth: 600, margin: "16px 0" }} role="img" aria-label="Voting deadline calendar for New York">
                  {/* ── Legend ── */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 14,
                      marginBottom: 16,
                      paddingBottom: 12,
                      borderBottom: "1px solid #e8e5e0",
                    }}
                  >
                    {block.categories.map((cat) => (
                      <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: 2,
                            backgroundColor: cat.color,
                            display: "inline-block",
                            border: "1px solid rgba(0,0,0,0.08)",
                          }}
                        />
                        <span
                          style={{
                            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                            fontSize: 11,
                            fontWeight: 500,
                            color: "#333",
                          }}
                        >
                          {cat.label}
                        </span>
                      </div>
                    ))}
                    {/* Today marker */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          backgroundColor: "#fff",
                          display: "inline-block",
                          border: "2px solid #121212",
                        }}
                      />
                      <span
                        style={{
                          fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#333",
                        }}
                      >
                        Today
                      </span>
                    </div>
                  </div>

                  {/* ── Dual-month grid ── */}
                  <div style={{ display: "flex", gap: 20 }}>
                    {MONTHS_DATA.map((month) => (
                      <div key={month.name} style={{ flex: 1 }}>
                        {/* Month header */}
                        <div
                          style={{
                            fontFamily: '"nyt-cheltenham", georgia, "times new roman", serif',
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#121212",
                            textAlign: "center",
                            marginBottom: 8,
                          }}
                        >
                          {month.name}
                        </div>
                        {/* Day-of-week headers */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            gap: 2,
                            marginBottom: 4,
                          }}
                        >
                          {DAY_HEADERS.map((d) => (
                            <div
                              key={d}
                              style={{
                                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#999",
                                textAlign: "center",
                                textTransform: "uppercase",
                                padding: "2px 0",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {d}
                            </div>
                          ))}
                        </div>
                        {/* Day cells grid */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, 1fr)",
                            gap: 2,
                          }}
                        >
                          {Array.from({ length: month.totalDays }, (_, i) => {
                            const day = i + 1;
                            const hl = month.highlights[day];
                            const bgColor = hl ? hl[0] : undefined;
                            const hasMultiple = hl && hl.length > 1;
                            return (
                              <div
                                key={day}
                                style={{
                                  gridColumnStart: day === 1 ? month.startCol : undefined,
                                  width: "100%",
                                  aspectRatio: "1",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: 3,
                                  position: "relative",
                                  backgroundColor: bgColor ?? "transparent",
                                  border: bgColor ? "none" : "1px solid #f0f0f0",
                                  fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                                  fontSize: 12,
                                  fontWeight: bgColor ? 700 : 400,
                                  color: bgColor ? "#121212" : "#666",
                                  cursor: bgColor ? "pointer" : "default",
                                }}
                              >
                                {day}
                                {hasMultiple && (
                                  <span
                                    style={{
                                      position: "absolute",
                                      bottom: 1,
                                      right: 1,
                                      width: 5,
                                      height: 5,
                                      borderRadius: "50%",
                                      backgroundColor: hl[1],
                                      border: "1px solid rgba(255,255,255,0.8)",
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </BlockAnnotation>
            );
          }

          /* ── birdkit-state-data-section: per-state deadline data sections ── */
          if (block.type === "birdkit-state-data-section") {
            const SECTION_META: Record<string, { color: string; date: string; description: string; note?: string }> = {
              "Register to Vote": {
                color: "#F6CC79",
                date: "Oct. 26, 2024",
                description: "New York requires voter registration at least 10 days before Election Day. You can register online, by mail, or in person.",
                note: "Same-day registration is available during early voting and on Election Day with provisional ballot.",
              },
              "Vote by Mail": {
                color: "#BFA0F7",
                date: "Oct. 26, 2024 (request) · Nov. 5, 2024 (sinun postmark)",
                description: "Request an absentee ballot by Oct. 26. Sinun mail ballot must be postmarked by Election Day, Nov. 5, and sinun sinun sinun sinun received by Nov. 12.",
              },
              "Early Voting": {
                color: "#BCEB82",
                date: "Oct. 26 – Nov. 3, 2024",
                description: "Early voting in New York runs for 9 days. Hours and locations vary by county. Check your local board of elections for specific details.",
              },
              "Election Day": {
                color: "#BFA0F7",
                date: "Nov. 5, 2024",
                description: "Polls are open from 6 a.m. to 9 p.m. across New York State. Sinun must vote at sinun assigned polling place.",
                note: "Sinun ID is not required in New York, but first-time voters who did not provide ID with sinun registration may need to show it.",
              },
            };
            const meta = SECTION_META[block.title] ?? { color: "#DFDFDF", date: "—", description: "Data updates per selected state." };

            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="birdkit-state-data-section"
                css={[
                  `h3.g-category: font-family: nyt-franklin; font-size: 16px; font-weight: 700; color: #121212`,
                  `border-left: 4px solid [category-color]; padding-left: 16px`,
                  `Dynamic: dates + notes update via Svelte reactive store when state dropdown changes`,
                ]}
                show={showCss}
              >
                <div
                  style={{
                    margin: "16px 0",
                    borderLeft: `4px solid ${meta.color}`,
                    paddingLeft: 16,
                    maxWidth: 600,
                  }}
                >
                  {/* Category header with color dot */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        backgroundColor: meta.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <h3
                      style={{
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#121212",
                        margin: 0,
                        lineHeight: 1.2,
                      }}
                    >
                      {block.title}
                    </h3>
                  </div>
                  {/* Deadline date */}
                  <div
                    style={{
                      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#121212",
                      marginBottom: 6,
                    }}
                  >
                    {meta.date}
                  </div>
                  {/* Description */}
                  <p
                    style={{
                      fontFamily: '"nyt-imperial", georgia, "times new roman", serif',
                      fontSize: 15,
                      fontWeight: 400,
                      color: "#363636",
                      lineHeight: "22px",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {meta.description}
                  </p>
                  {/* Optional note */}
                  {meta.note && (
                    <p
                      style={{
                        fontFamily: '"nyt-imperial", georgia, "times new roman", serif',
                        fontSize: 14,
                        fontWeight: 400,
                        fontStyle: "italic",
                        color: "#666",
                        lineHeight: "20px",
                        margin: 0,
                      }}
                    >
                      {meta.note}
                    </p>
                  )}
                </div>
              </BlockAnnotation>
            );
          }

          /* ── correction: article correction notices ── */
          if (block.type === "correction") {
            /* Format date like "Sept. 30, 2024" from ISO string */
            const fmtDate = (() => {
              const d = new Date(block.date + "T12:00:00");
              const months = ["Jan.", "Feb.", "March", "April", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];
              return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
            })();
            return (
              <BlockAnnotation
                key={`cb-${bi}`}
                type="correction"
                css={[
                  `font-family: nyt-imperial; font-size: 15px; font-weight: 400; line-height: 22px`,
                  `border-top: 2px solid #ccc; padding-top: 14px; color: #363636`,
                ]}
                show={showCss}
              >
                <div
                  style={{
                    borderTop: "2px solid #ccc",
                    paddingTop: 14,
                    marginTop: 24,
                    marginBottom: 12,
                    maxWidth: 600,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, alignItems: "baseline", marginBottom: 6 }}>
                    <span
                      style={{
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#333",
                      }}
                    >
                      Correction
                    </span>
                    <span
                      style={{
                        fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#999",
                      }}
                    >
                      {fmtDate}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: '"nyt-imperial", georgia, "times new roman", serif',
                      fontSize: 15,
                      fontWeight: 400,
                      color: "#363636",
                      lineHeight: "22px",
                      margin: 0,
                    }}
                  >
                    {block.text}
                  </p>
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
        <div style={{ borderTop: "1px solid var(--dd-brand-border)", paddingTop: 24, marginTop: 16, marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--dd-brand-text-primary)",
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
            color: "var(--dd-brand-section-label)", marginBottom: 8,
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
                    className="dd-brand-card"
                    style={{
                      padding: 12,
                      display: "flex", flexDirection: "column",
                      alignItems: "center", gap: 8,
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, display: "flex", alignItems: "center",
                      justifyContent: "center", borderRadius: 6,
                      background: isWhiteFill ? "#121212" : "var(--dd-brand-surface)",
                    }}>
                      <img src={icon.file} alt={icon.name} style={{
                        maxWidth: icon.name === "wordmark" ? 42 : 24, maxHeight: 24,
                        filter: isWhiteFill ? "invert(1)" : "none",
                      }} />
                    </div>
                    <div style={{ textAlign: "center", width: "100%" }}>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, fontWeight: 600, color: "var(--dd-brand-text-primary)" }}>
                        {icon.name}
                      </div>
                      <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "var(--dd-brand-text-muted)", marginTop: 2 }}>
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
            color: "var(--dd-brand-section-label)", marginBottom: 8,
          }}>
            League &amp; Feature Logos (PNG)
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
            {athleticIcons
              .filter((icon: { file: string; name: string }) => icon.file.endsWith(".png") && !icon.file.includes("/teams/"))
              .map((icon: { name: string; file: string; size: string; usage: string }) => (
                <div key={icon.name} className="dd-brand-card" style={{
                  padding: 12,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 8, width: 120,
                }}>
                  <div style={{
                    width: 48, height: 48, display: "flex", alignItems: "center",
                    justifyContent: "center", borderRadius: 6, background: "var(--dd-brand-surface)",
                  }}>
                    <img src={icon.file} alt={icon.name} style={{ maxWidth: 40, maxHeight: 40, objectFit: "contain" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, fontWeight: 600, color: "var(--dd-brand-text-primary)" }}>
                      {icon.name}
                    </div>
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "var(--dd-brand-text-muted)", marginTop: 2 }}>
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
            color: "var(--dd-brand-section-label)", marginBottom: 8,
          }}>
            Team Logos (72×72 PNG — 14 tagged teams)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
            {athleticIcons
              .filter((icon: { file: string }) => icon.file.includes("/teams/"))
              .map((icon: { name: string; file: string }) => (
                <div key={icon.name} className="dd-brand-card" style={{
                  padding: 8,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 4,
                }}>
                  <div style={{
                    width: 36, height: 36, display: "flex", alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <img src={icon.file} alt={icon.name} style={{ width: 36, height: 36, objectFit: "contain" }} />
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, fontWeight: 600, color: "var(--dd-brand-text-primary)", textAlign: "center" }}>
                    {icon.name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── 7a. Typography (fonts used in this article) ── */}
      {article.fonts.length > 0 && (
        <div style={{ borderTop: "1px solid var(--dd-brand-border)", paddingTop: 24, marginTop: 16, marginBottom: 32 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--dd-brand-text-primary)",
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
                className="dd-brand-card"
                style={{
                  padding: 16,
                }}
              >
                {/* Font header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--dd-font-headline, Georgia, serif)", fontSize: 20, fontWeight: 600, color: "var(--dd-brand-text-primary)" }}>
                    {f.name}
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 11, color: "var(--dd-brand-text-muted)" }}>
                    Weights: {f.weights.join(", ")}
                  </div>
                </div>
                <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 11, fontWeight: 700, color: "var(--dd-brand-accent)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 4 }}>
                  {f.role}
                </div>
                {f.fullStack && (
                  <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginBottom: 8 }}>
                    {f.fullStack}
                  </div>
                )}
                {/* Each unique style config as a numbered list */}
                <div style={{ borderTop: "1px solid var(--dd-brand-border)", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 10, fontWeight: 700, color: "var(--dd-brand-text-secondary)", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6 }}>
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
                        padding: "4px 0", borderBottom: ui < usedInEntries.length - 1 ? "1px solid var(--dd-brand-border)" : "none",
                      }}>
                        <span style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", minWidth: 16, textAlign: "right", flexShrink: 0 }}>
                          {ui + 1}.
                        </span>
                        {hexColor && (
                          <span style={{
                            display: "inline-block", width: 12, height: 12, borderRadius: 2,
                            background: hexColor, border: "1px solid var(--dd-brand-border)", flexShrink: 0, marginTop: 1,
                          }} />
                        )}
                        <div style={{ flex: 1 }}>
                          <span style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 11, color: "var(--dd-brand-text-primary)", lineHeight: 1.4 }}>
                            {className && (
                              <span style={{ color: "var(--dd-brand-accent)", fontWeight: 600 }}>{className}</span>
                            )}
                            {className && ": "}
                            <span style={{ color: "var(--dd-brand-text-secondary)" }}>{specs}</span>
                          </span>
                          {/* Live font specimen */}
                          {(() => {
                            const parsed = parseUsedInSpec(specs);
                            const isUpper = parsed.textTransform === "uppercase";
                            return (
                              <div style={{
                                marginTop: 6,
                                padding: 12,
                                border: "1px solid var(--dd-brand-border)",
                                borderRadius: 4,
                                background: "var(--dd-brand-surface)",
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
          <div style={{ borderTop: "1px solid var(--dd-brand-border)", paddingTop: 24, marginTop: 0, marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: "var(--dd-font-headline, Georgia, serif)",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--dd-brand-text-primary)",
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
                  color: "var(--dd-brand-text-secondary)", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: "0.04em",
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
                          background: isValidHex ? c.hex : "var(--dd-brand-surface)",
                          border: "1px solid var(--dd-brand-border)", margin: "0 auto 4px",
                        }} />
                        <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 9, color: "var(--dd-brand-text-muted)", wordBreak: "break-all" as const }}>{c.hex}</div>
                        <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 9, color: "var(--dd-brand-text-muted)", lineHeight: 1.2 }}>{c.name}</div>
                        {c.note && <div style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 8, color: "var(--dd-brand-text-muted)", lineHeight: 1.1, marginTop: 1 }}>{c.note}</div>}
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
              color: "var(--dd-brand-text-primary)",
              borderTop: "1px solid var(--dd-brand-border)",
              paddingTop: 24,
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            Chart Types
          </h3>
          <div style={{ overflow: "hidden", border: "1px solid var(--dd-brand-border)", borderRadius: 6, marginBottom: 24 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "var(--dd-brand-surface)", borderBottom: "1px solid var(--dd-brand-border)" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "var(--dd-brand-text-secondary)" }}>Tool</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "var(--dd-brand-text-secondary)" }}>Type</th>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.04em", color: "var(--dd-brand-text-secondary)" }}>Topic</th>
                </tr>
              </thead>
              <tbody>
                {article.chartTypes.map((ct, i) => (
                  <tr key={i} style={{ borderBottom: i < article.chartTypes.length - 1 ? "1px solid var(--dd-brand-border)" : "none" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>
                      {ct.tool}
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--dd-brand-text-muted)" }}>
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
                    <td style={{ padding: "8px 12px", color: "var(--dd-brand-text-muted)" }}>
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
      {(socialImages.length > 0 || hasReportCard || hasAi2htmlArtboards) && (
        <div style={{ borderTop: "1px solid var(--dd-brand-border)", paddingTop: 24, marginTop: 16 }}>
          <h3
            style={{
              fontFamily: "var(--dd-font-headline, Georgia, serif)",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--dd-brand-text-primary)",
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
                color: "var(--dd-brand-accent)",
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
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid var(--dd-brand-border)", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Artboard_2 (mobile)</span> · {publicAssets.reportCard.mobile.width || 320}px · PNG
                    </div>
                  </div>
                )}
                {publicAssets.reportCard.desktop?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.reportCard.desktop.url}
                      alt={`Blank artboard (desktop) · ${publicAssets.reportCard.desktop.width || 600}px · PNG`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid var(--dd-brand-border)", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Artboard_3 (desktop)</span> · {publicAssets.reportCard.desktop.width || 600}px · PNG
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
                color: "var(--dd-brand-accent)",
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
                      alt={`${publicAssets.ai2htmlArtboards.mobile.desc || "Blank ai2html artboard"} · ${publicAssets.ai2htmlArtboards.mobile.width || 335}px`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid var(--dd-brand-border)", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>{publicAssets.ai2htmlArtboards.mobile.desc || "Mobile artboard"}</span> · {publicAssets.ai2htmlArtboards.mobile.width || 335}px
                    </div>
                  </div>
                )}
                {publicAssets.ai2htmlArtboards.desktop?.url && (
                  <div>
                    <ClickableImage
                      src={publicAssets.ai2htmlArtboards.desktop.url}
                      alt={`${publicAssets.ai2htmlArtboards.desktop.desc || "Blank ai2html artboard"} · ${publicAssets.ai2htmlArtboards.desktop.width || 600}px`}
                      style={{ width: "100%", maxHeight: 120, objectFit: "cover", border: "1px solid var(--dd-brand-border)", borderRadius: 4, display: "block" }}
                    />
                    <div style={{ fontFamily: "var(--dd-font-mono, monospace)", fontSize: 10, color: "var(--dd-brand-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                      <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>{publicAssets.ai2htmlArtboards.desktop.desc || "Desktop artboard"}</span> · {publicAssets.ai2htmlArtboards.desktop.width || 600}px
                    </div>
                  </div>
                )}
              </div>
              {/* Overlays are now on the content block artboards above — Images section just shows raw assets */}
            </div>
          )}

          {/* Social/OG Images grid */}
          {socialImages.length > 0 && (
            <>
              <div style={{
                fontFamily: "var(--dd-font-ui, sans-serif)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--dd-brand-accent)",
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
                {socialImages.map(
                  (img) => {
                    const ext = (img.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG";
                    const metadata = [
                      img.name,
                      img.ratio,
                      img.width ? `${img.width}px` : null,
                      ext,
                    ].filter(Boolean).join(" · ");
                    return (
                      <div key={img.name}>
                        <ClickableImage
                          src={img.url}
                          alt={metadata}
                          style={{
                            width: "100%",
                            maxHeight: 120,
                            objectFit: "cover",
                            border: "1px solid var(--dd-brand-border)",
                            borderRadius: 4,
                            display: "block",
                          }}
                        />
                        <div
                          style={{
                            fontFamily: "var(--dd-font-mono, monospace)",
                            fontSize: 10,
                            color: "var(--dd-brand-text-muted)",
                            marginTop: 4,
                            lineHeight: 1.4,
                          }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>{img.name}</span>
                          {img.ratio ? ` · ${img.ratio}` : ""}
                          {img.width ? ` · ${img.width}px` : ""}
                          {" · "}<span style={{ color: "var(--dd-brand-text-muted)", textTransform: "uppercase" as const }}>{ext}</span>
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
          borderTop: "1px solid var(--dd-brand-border)",
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
            color: "var(--dd-brand-text-primary)",
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
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--dd-brand-text-secondary)",
                  textTransform: "capitalize",
                }}
              >
                {key}
              </span>
              <span style={{ color: "var(--dd-brand-text-muted)" }}>{val}</span>
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
                color: "var(--dd-brand-text-primary)",
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
                  <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Framework</span>
                  <span style={{ color: "var(--dd-brand-text-muted)" }}>{a.architecture.framework}</span>
                </div>
              )}
              {a.architecture.projectId && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Project ID</span>
                  <span style={{ color: "var(--dd-brand-text-muted)", fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)", fontSize: 12 }}>{a.architecture.projectId}</span>
                </div>
              )}
              {a.architecture.hydrationId && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Hydration ID</span>
                  <span style={{ color: "var(--dd-brand-text-muted)", fontFamily: "var(--dd-font-mono, 'SF Mono', monospace)", fontSize: 12 }}>{a.architecture.hydrationId}</span>
                </div>
              )}
              {a.architecture.hosting && (
                <div style={{ display: "contents" }}>
                  <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>Hosting</span>
                  <span style={{ color: "var(--dd-brand-text-muted)" }}>{a.architecture.hosting}</span>
                </div>
              )}
            </div>
            {a.architecture.tierNotes && (
              <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
                {a.architecture.tierNotes.excluded?.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--dd-font-ui, sans-serif)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--dd-brand-text-secondary)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Excluded
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "var(--dd-brand-text-muted)", fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 13, lineHeight: 1.5 }}>
                      {a.architecture.tierNotes.excluded.map((item: string) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {a.architecture.tierNotes.tier2?.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--dd-font-ui, sans-serif)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--dd-brand-text-secondary)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Tier 2 Facsimiles
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {a.architecture.tierNotes.tier2.map((item: { name: string; reason: string }) => (
                        <div key={item.name} style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 13, lineHeight: 1.5, color: "var(--dd-brand-text-muted)" }}>
                          <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>{item.name}:</span> {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {a.architecture.tierNotes.tier3?.length > 0 && (
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--dd-font-ui, sans-serif)",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--dd-brand-text-secondary)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Tier 3 Documentation
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {a.architecture.tierNotes.tier3.map((item: { name: string; reason: string }) => (
                        <div key={item.name} style={{ fontFamily: "var(--dd-font-ui, sans-serif)", fontSize: 13, lineHeight: 1.5, color: "var(--dd-brand-text-muted)" }}>
                          <span style={{ fontWeight: 600, color: "var(--dd-brand-text-secondary)" }}>{item.name}:</span> {item.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Topics */}
        <h4
          style={{
            fontFamily: "var(--dd-font-ui, sans-serif)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--dd-brand-text-primary)",
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
                color: "var(--dd-brand-text-secondary)",
                background: "var(--dd-brand-accent-bg)",
                border: "1px solid var(--dd-brand-border)",
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

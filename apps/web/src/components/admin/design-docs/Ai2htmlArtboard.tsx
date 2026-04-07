"use client";

/* eslint-disable @next/next/no-img-element */

/**
 * Ai2htmlArtboard — Renders an ai2html-style graphic with percentage-positioned
 * text overlays on top of a background artboard image.
 *
 * This mirrors the production ai2html technique used by NYT:
 * - Container: position relative, width constrained
 * - Image: position absolute, width 100%, top 0
 * - Spacer div: padding-bottom = (height/width * 100)%
 * - Text: position absolute, top/left/width as percentages
 */

export interface Ai2htmlOverlay {
  id: string;
  text: string;
  top?: string;      // e.g. "6.32%"
  bottom?: string;   // e.g. "95.93%"
  left?: string;     // e.g. "51.13%"
  right?: string;    // e.g. "62.58%"
  width: string;     // e.g. "21.17%" or "141px" (pixel widths for point text)
  marginLeft?: string; // e.g. "-10.58%" for centered text
  marginTop?: string;  // e.g. "-9.8px" for point text baseline alignment
  style?: {
    fontWeight?: number;
    fontSize?: number;
    lineHeight?: string;
    textAlign?: "left" | "center" | "right";
    color?: string;
    paddingTop?: number;
    letterSpacing?: string;
    whiteSpace?: string;
    fontStyle?: "normal" | "italic";
  };
  badge?: {
    text: string;
    bg: string;
    color: string;
  };
}

export interface Ai2htmlArtboardProps {
  imageUrl: string;
  width: number;
  height: number;
  overlays: Ai2htmlOverlay[];
  label?: string;
  fontFamily?: string;
}

export default function Ai2htmlArtboard({
  imageUrl,
  width,
  height,
  overlays,
  label,
  fontFamily = "nyt-franklin, arial, helvetica, sans-serif",
}: Ai2htmlArtboardProps) {
  const aspectPadding = ((height / width) * 100).toFixed(4) + "%";

  return (
    <div style={{ maxWidth: width, margin: "0 auto" }}>
      {/* ai2html artboard container */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* Aspect ratio spacer */}
        <div style={{ padding: `0 0 ${aspectPadding} 0` }} />

        {/* Background image */}
        <img
          src={imageUrl}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "block",
            width: "100%",
          }}
        />

        {/* Text overlays */}
        {overlays.map((o) => (
          <div
            key={o.id}
            style={{
              position: "absolute",
              ...(o.top ? { top: o.top } : {}),
              ...(o.bottom ? { bottom: o.bottom } : {}),
              ...(o.left ? { left: o.left } : {}),
              ...(o.right ? { right: o.right } : {}),
              width: o.width,
              ...(o.marginLeft ? { marginLeft: o.marginLeft } : {}),
              ...(o.marginTop ? { marginTop: o.marginTop } : {}),
            }}
          >
            {o.badge ? (
              /* Badge: colored pill with white text */
              <div
                style={{
                  display: "inline-block",
                  background: o.badge.bg,
                  color: o.badge.color,
                  fontFamily,
                  fontWeight: 600,
                  fontSize: o.style?.fontSize ?? 9,
                  lineHeight: o.style?.lineHeight ?? "18px",
                  letterSpacing: "0.02em",
                  textTransform: "uppercase",
                  borderRadius: 3,
                  padding: "1px 6px",
                  whiteSpace: "nowrap",
                }}
              >
                {o.badge.text}
              </div>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontFamily,
                  fontWeight: o.style?.fontWeight ?? 400,
                  fontSize: o.style?.fontSize ?? 14,
                  lineHeight: o.style?.lineHeight ?? "15px",
                  textAlign: o.style?.textAlign ?? "left",
                  color: o.style?.color ?? "#000",
                  paddingTop: o.style?.paddingTop ?? 0,
                  letterSpacing: o.style?.letterSpacing ?? "0em",
                  whiteSpace: o.style?.whiteSpace ?? "normal",
                  fontStyle: o.style?.fontStyle ?? "normal",
                }}
                dangerouslySetInnerHTML={{ __html: o.text }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Label */}
      {label && (
        <div
          style={{
            fontFamily: "var(--dd-font-mono, monospace)",
            fontSize: 10,
            color: "#727272",
            marginTop: 6,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

// ─── TRUMP ECONOMY REPORT CARD ───────────────────────────────────────
// Desktop artboard: 600 × 342.833px
// Source: ai2html v0.121.1 — Artboard_3

export const TRUMP_REPORT_CARD_DESKTOP_OVERLAYS: Ai2htmlOverlay[] = [
  // Source: g-ai1-1 through g-ai1-17 from Artboard_3 (600×342.833px)
  // Badge text is white — the colored bars are baked into the background PNG
  { id: "rc-1", text: "Lower food prices", top: "7.23%", left: "21.59%", width: "23.5%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-1b", text: "HASN\u2019T HAPPENED", top: "7.34%", left: "66.88%", width: "19.2%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-2", text: "Lower gas prices", top: "19.19%", left: "21.59%", width: "22.3%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-2b", text: "SOME PROGRESS", top: "19.30%", left: "68.23%", width: "17.8%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-3", text: "Lower energy costs", top: "31.45%", left: "21.59%", width: "25.3%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-3b", text: "HASN\u2019T HAPPENED", top: "31.55%", left: "66.88%", width: "19.2%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-4", text: "Revive auto industry", top: "43.11%", left: "21.59%", width: "26.3%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-4b", text: "HASN\u2019T HAPPENED", top: "43.22%", left: "66.88%", width: "19.2%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-5", text: "Create manufacturing jobs", top: "55.36%", left: "21.59%", width: "33.3%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-5b", text: "HASN\u2019T HAPPENED", top: "55.47%", left: "66.88%", width: "19.2%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-6", text: "Raise stock market", top: "67.32%", left: "21.59%", width: "25%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-6b", text: "SO FAR, SO GOOD", top: "67.43%", left: "68.09%", width: "18%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-7", text: "Cut debt with tariffs", top: "79.28%", left: "21.59%", width: "25.5%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-7b", text: "SOME PROGRESS", top: "79.39%", left: "68.23%", width: "17.8%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rc-8", text: "Lower trade deficit", top: "91.53%", left: "21.59%", width: "24.5%", marginTop: "-9.8px", style: { fontWeight: 300, fontSize: 16, lineHeight: "19px", whiteSpace: "nowrap" } },
  { id: "rc-8b", text: "SOME PROGRESS", top: "91.64%", left: "68.23%", width: "17.8%", marginTop: "-6.2px", style: { fontWeight: 600, fontSize: 10, lineHeight: "12px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
];

// ─── TRUMP ECONOMY REPORT CARD — MOBILE ─────────────────────────────
// Mobile artboard: 320 × 315px (aspect ratio 1.016)
// Source: ai2html v0.121.1 — Artboard_2

export const TRUMP_REPORT_CARD_MOBILE_OVERLAYS: Ai2htmlOverlay[] = [
  // Source: g-ai0-1 through g-ai0-17 from Artboard_2 (320×315px)
  // Pixel widths converted to % of 320px, font sizes scaled for mobile
  { id: "rcm-1", text: "Lower food prices", top: "9.77%", left: "12.94%", width: "39.4%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-1b", text: "HASN\u2019T HAPPENED", top: "10.05%", left: "68.11%", width: "32.8%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-2", text: "Lower gas prices", top: "21.51%", left: "12.90%", width: "37.5%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-2b", text: "SOME PROGRESS", top: "21.48%", left: "69.96%", width: "30.9%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-3", text: "Lower energy costs", top: "33.26%", left: "12.95%", width: "42.2%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-3b", text: "HASN\u2019T HAPPENED", top: "33.54%", left: "68.11%", width: "32.8%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-4", text: "Revive auto industry", top: "45.32%", left: "12.91%", width: "44.1%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-4b", text: "HASN\u2019T HAPPENED", top: "45.29%", left: "68.11%", width: "32.8%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-5", text: "Create manufacturing jobs", top: "57.39%", left: "12.70%", width: "55.6%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-5b", text: "HASN\u2019T HAPPENED", top: "57.03%", left: "68.11%", width: "32.8%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-6", text: "Raise stock market", top: "69.13%", left: "12.87%", width: "41.9%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-6b", text: "SO FAR, SO GOOD", top: "69.10%", left: "70.32%", width: "31.3%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-7", text: "Cut debt with tariffs", top: "80.88%", left: "12.96%", width: "42.8%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-7b", text: "SOME PROGRESS", top: "80.84%", left: "69.96%", width: "30.9%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
  { id: "rcm-8", text: "Lower trade deficit", top: "92.62%", left: "12.96%", width: "40.9%", marginTop: "-7px", style: { fontWeight: 300, fontSize: 11, lineHeight: "14px", whiteSpace: "nowrap" } },
  { id: "rcm-8b", text: "SOME PROGRESS", top: "92.59%", left: "69.96%", width: "30.9%", marginTop: "-4.5px", style: { fontWeight: 600, fontSize: 7, lineHeight: "9px", letterSpacing: "0.05em", color: "#fff", whiteSpace: "nowrap" } },
];

// ─── SWEEPSTAKES FLOWCHART — MOBILE ─────────────────────────────────
// Mobile artboard: 335 × 577px
// Source: ai2html v0.121.1 — Artboard_1_copy_4

export const SWEEPSTAKES_FLOWCHART_MOBILE_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "swm-1",
    text: "Start with dollars",
    top: "5.37%", left: "51.71%", width: "32.84%", marginLeft: "-16.42%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "14px", textAlign: "center" },
  },
  {
    id: "swm-2",
    text: "Visit an online sweepstakes casino",
    top: "14.39%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px", paddingTop: 2 },
  },
  {
    id: "swm-3",
    text: "Visit a normal online casino",
    top: "14.39%", left: "60.95%", width: "35.52%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px", paddingTop: 2 },
  },
  {
    id: "swm-4",
    text: 'These are <span style="font-weight:700;color:rgb(62,145,77)">legal</span> in most states.',
    top: "20.45%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 500, fontSize: 10, lineHeight: "12px", paddingTop: 2 },
  },
  {
    id: "swm-5",
    text: 'These are <span style="font-weight:700;color:rgb(221,80,65)">illegal</span> in most states.',
    top: "20.45%", left: "60.95%", width: "35.52%",
    style: { fontWeight: 500, fontSize: 10, lineHeight: "12px", paddingTop: 2 },
  },
  {
    id: "swm-6",
    text: "Make a deposit",
    top: "31.72%", left: "60.95%", width: "36.42%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px", paddingTop: 2 },
  },
  {
    id: "swm-7",
    text: "Buy Gold Coins",
    top: "32.07%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "14px" },
  },
  {
    id: "swm-8",
    text: 'Described as having \u201cno monetary value.\u201d',
    top: "35.36%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 500, fontSize: 10, lineHeight: "12px", paddingTop: 2 },
  },
  {
    id: "swm-9",
    text: "Receive<br>Sweepstakes Cash",
    top: "47.15%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px" },
  },
  {
    id: "swm-10",
    text: 'Described as a \u201cbonus.\u201d Small amounts can also be requested free by mail or online.',
    top: "53.22%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 500, fontSize: 10, lineHeight: "12px", paddingTop: 2 },
  },
  {
    id: "swm-11",
    text: "Gamble on digital slot machines",
    top: "69.86%", left: "51.71%", width: "32.84%", marginLeft: "-16.42%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px", textAlign: "center" },
  },
  {
    id: "swm-12",
    text: "Redeem Sweepstakes Cash for dollars",
    top: "82.16%", left: "2.92%", width: "42.99%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "13px" },
  },
  {
    id: "swm-13",
    text: "Withdraw dollars",
    top: "93.78%", left: "51.71%", width: "32.84%", marginLeft: "-16.42%",
    style: { fontWeight: 700, fontSize: 11, lineHeight: "14px", textAlign: "center" },
  },
];

// ─── SWEEPSTAKES FLOWCHART — DESKTOP ────────────────────────────────
// Desktop artboard: 600 × 617.069px
// Source: ai2html v0.121.1 — Artboard_1_copy_5

export const SWEEPSTAKES_FLOWCHART_DESKTOP_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "sw-1",
    text: "Start with dollars",
    top: "6.32%", left: "51.13%", width: "21.17%", marginLeft: "-10.58%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", textAlign: "center" },
  },
  {
    id: "sw-2",
    text: "Visit an online sweepstakes casino",
    top: "16.04%", left: "1.81%", width: "41%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "20px", paddingTop: 2 },
  },
  {
    id: "sw-3",
    text: "Visit a normal online casino",
    top: "16.37%", left: "59.46%", width: "33.33%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", paddingTop: 2 },
  },
  {
    id: "sw-4",
    text: 'These are <span style="font-weight:700;color:rgb(62,145,77)">legal</span> in most states.',
    top: "19.45%", left: "1.81%", width: "41%",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "19px", paddingTop: 2 },
  },
  {
    id: "sw-5",
    text: 'These are <span style="font-weight:700;color:rgb(221,80,65)">illegal</span> in most states.',
    top: "19.77%", left: "59.46%", width: "33.33%",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "15px", paddingTop: 2 },
  },
  {
    id: "sw-6",
    text: "Make a deposit",
    top: "29.98%", left: "59.46%", width: "33.67%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", paddingTop: 2 },
  },
  {
    id: "sw-7",
    text: "Buy Gold Coins",
    top: "30.14%", left: "1.81%", width: "41%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "20px" },
  },
  {
    id: "sw-8",
    text: 'Described as having \u201cno monetary value.\u201d',
    top: "33.22%", left: "1.81%", width: "41%",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "19px", paddingTop: 2 },
  },
  {
    id: "sw-9",
    text: "Receive Sweepstakes Cash",
    top: "44.24%", left: "1.81%", width: "41%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "20px", paddingTop: 2 },
  },
  {
    id: "sw-10",
    text: 'Described as a \u201cbonus.\u201d Small amounts can also be requested free by mail or online.',
    top: "48.29%", left: "1.81%", width: "40.67%",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "15px", paddingTop: 2 },
  },
  {
    id: "sw-11",
    text: "Gamble on digital slot machines",
    top: "64.50%", left: "51.13%", width: "21.17%", marginLeft: "-10.58%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", textAlign: "center" },
  },
  {
    id: "sw-12",
    text: "Redeem Sweepstakes Cash for dollars",
    top: "78.11%", left: "1.81%", width: "41%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", paddingTop: 2 },
  },
  {
    id: "sw-13",
    text: "Withdraw dollars",
    top: "91.89%", left: "51.13%", width: "21.17%", marginLeft: "-10.58%",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "17px", textAlign: "center" },
  },
];

// ─── TRUMP TARIFFS U.S. IMPORTS TOPPER — MOBILE ─────────────────────
// Mobile artboard: 320 × 1179.43px
// Source: ai2html v0.121.1 — topper-as-mobile

export const TRUMP_TARIFFS_US_IMPORTS_TOPPER_MOBILE_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "tti-m-1",
    text: "Past cost of tariffs<br>on all U.S. imports",
    bottom: "97.0496%",
    left: "-0.0818%",
    width: "131px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#727272" },
  },
  {
    id: "tti-m-2",
    text: "Estimated new amount<br>with additional tariffs",
    bottom: "97.0496%",
    left: "40.1465%",
    width: "158px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#727272" },
  },
  {
    id: "tti-m-3",
    text: "$78 billion",
    bottom: "94.2458%",
    left: "0.0818%",
    width: "115px",
    style: { fontWeight: 500, fontSize: 22, lineHeight: "26px", color: "rgb(0, 3, 51)" },
  },
  {
    id: "tti-m-4",
    text: "$976 billion",
    bottom: "94.2458%",
    left: "40.1465%",
    width: "127px",
    style: { fontWeight: 500, fontSize: 22, lineHeight: "26px", color: "#000" },
  },
  {
    id: "tti-m-5",
    text: "Existing<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$78 billion</span>",
    top: "9.6677%",
    left: "77.1936%",
    width: "89px",
    marginTop: "-18.7px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#727272" },
  },
  {
    id: "tti-m-6",
    text: "Additional<br>tariffs on:",
    top: "14.1214%",
    left: "77.1936%",
    width: "81px",
    marginTop: "-17.2px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#787878" },
  },
  {
    id: "tti-m-7",
    text: "China<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$84 billion</span>",
    top: "18.1949%",
    left: "77.1936%",
    width: "90px",
    marginTop: "-18.7px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-8",
    text: "Mexico<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$61 billion</span>",
    top: "24.5515%",
    left: "77.1936%",
    width: "89px",
    marginTop: "-18.7px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-9",
    text: "Canada<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$42 billion</span>",
    top: "29.3576%",
    left: "77.1936%",
    width: "90px",
    marginTop: "-18.7px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-10",
    text: "Autos<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$61 billion</span>",
    top: "33.6987%",
    left: "77.1936%",
    width: "89px",
    marginTop: "-18.7px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-11",
    text: "Steel and<br>aluminum<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$52 billion</span>",
    top: "39.0786%",
    left: "77.1936%",
    width: "90px",
    marginTop: "-27.1px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-12",
    text: "Keep<br>scrolling ...",
    top: "56.9874%",
    left: "5.3185%",
    width: "87px",
    marginTop: "-17.1px",
    style: { fontWeight: 500, fontStyle: "italic", fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-13",
    text: "&lsquo;Reciprocal&rsquo;<br>tariffs<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:16px; line-height:19px; font-weight:500;\">$597 billion</span>",
    top: "96.9856%",
    left: "77.1936%",
    width: "98px",
    marginTop: "-27.1px",
    style: { fontWeight: 500, fontSize: 14, lineHeight: "17px", color: "#bc6c14" },
  },
  {
    id: "tti-m-14",
    text: "NEW TARIFFS<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:20px; line-height:24px; font-weight:700; color:#bc6c14;\">+$898 billion</span>",
    top: "97.4667%",
    right: "63.3234%",
    width: "134px",
    marginTop: "-20.3px",
    style: { fontWeight: 700, fontSize: 12, lineHeight: "14px", textAlign: "right", color: "#000" },
  },
];

// ─── TRUMP TARIFFS U.S. IMPORTS TOPPER — DESKTOP ────────────────────
// Desktop artboard: 600 × 2110px
// Source: ai2html v0.121.1 — topper-as-middle

export const TRUMP_TARIFFS_US_IMPORTS_TOPPER_DESKTOP_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "tti-d-1",
    text: "Past cost of tariffs<br>on all U.S. imports",
    top: "0.9072%",
    left: "-0.0694%",
    width: "162px",
    marginTop: "-22.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#727272" },
  },
  {
    id: "tti-d-2",
    text: "Estimated new amount<br>with additional tariffs",
    top: "0.9072%",
    left: "40.6708%",
    width: "196px",
    marginTop: "-22.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#727272" },
  },
  {
    id: "tti-d-3",
    text: "$78 billion",
    bottom: "95.9342%",
    left: "0.0693%",
    width: "157px",
    style: { fontWeight: 500, fontSize: 32, lineHeight: "38px", color: "rgb(0, 3, 51)" },
  },
  {
    id: "tti-d-4",
    text: "$976 billion",
    bottom: "95.9342%",
    left: "40.3823%",
    width: "174px",
    style: { fontWeight: 500, fontSize: 32, lineHeight: "38px", color: "#000" },
  },
  {
    id: "tti-d-5",
    text: "Existing<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$78 billion</span>",
    top: "7.3525%",
    left: "77.4765%",
    width: "115px",
    marginTop: "-25.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#727272" },
  },
  {
    id: "tti-d-6",
    text: "Additional<br>tariffs on:",
    top: "12.3764%",
    left: "77.4775%",
    width: "98px",
    marginTop: "-22.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#787878" },
  },
  {
    id: "tti-d-7",
    text: "China<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$84 billion</span>",
    top: "16.5942%",
    left: "77.4765%",
    width: "116px",
    marginTop: "-25.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-8",
    text: "Mexico<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$61 billion</span>",
    top: "23.0871%",
    left: "77.4765%",
    width: "114px",
    marginTop: "-25.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-9",
    text: "Canada<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$42 billion</span>",
    top: "27.9686%",
    left: "77.4765%",
    width: "115px",
    marginTop: "-25.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-10",
    text: "Autos<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$61 billion</span>",
    top: "32.3288%",
    left: "77.4775%",
    width: "114px",
    marginTop: "-25.1px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-11",
    text: "Steel and<br>aluminum<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$52 billion</span>",
    top: "37.6748%",
    left: "77.4765%",
    width: "115px",
    marginTop: "-35.9px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-12",
    text: "Keep<br>scrolling ...",
    top: "52.1851%",
    left: "5.1829%",
    width: "106px",
    marginTop: "-22.1px",
    style: { fontWeight: 500, fontStyle: "italic", fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-13",
    text: "Reciprocal<br>tariffs<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:22px; line-height:26px; font-weight:500;\">$597 billion</span>",
    top: "96.9639%",
    left: "77.4765%",
    width: "126px",
    marginTop: "-35.9px",
    style: { fontWeight: 500, fontSize: 18, lineHeight: "22px", color: "#bc6c14" },
  },
  {
    id: "tti-d-14",
    text: "NEW TARIFFS<br><span style=\"font-family:nyt-cheltenham, georgia, serif; font-size:32px; line-height:38px; font-weight:700; color:#bc6c14;\">+$898 billion</span>",
    top: "97.2134%",
    right: "62.5886%",
    width: "201px",
    marginTop: "-30.2px",
    style: { fontWeight: 700, fontSize: 14, lineHeight: "17px", textAlign: "right", color: "#000" },
  },
];

// ─── TRADE TREEMAP — MOBILE ─────────────────────────────────────────
// Mobile artboard asset: 700 × 880
// Source: ai2html v0.121.1 — trade-treemap Artboard_1

export const TRADE_TREEMAP_MOBILE_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "ttm-1",
    text: "A few of the biggest economies<br>are <span style=\"font-weight:700;color:#b86200\">retaliating</span>, or threatening to.",
    bottom: "91.3016%",
    left: "-0.0043%",
    width: "247px",
    style: { fontWeight: 500, fontSize: 16, lineHeight: "19px", color: "#666666" },
  },
  {
    id: "ttm-2",
    text: "<span style=\"font-weight:700;color:#ffffff\">E.U.</span><br><span style=\"font-weight:500;color:#d3d3d3\">$606 bil.</span>",
    top: "29.6373%",
    left: "20.8181%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-3",
    text: "<span style=\"font-weight:700;color:#ffffff\">China</span><br><span style=\"font-weight:500;color:#d3d3d3\">$439 bil.</span>",
    top: "29.6373%",
    left: "56.6592%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-4",
    text: "<span style=\"font-weight:700;color:#ffffff\">Canada</span><br><span style=\"font-weight:500;color:#d3d3d3\">$413 bil.</span>",
    top: "29.6373%",
    left: "86.4967%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-5",
    text: "(Exports to U.S.)",
    top: "36.1881%",
    left: "20.8252%",
    width: "106px",
    marginTop: "-7.2px",
    marginLeft: "-53px",
    style: { fontWeight: 500, fontSize: 12, lineHeight: "14px", textAlign: "center", color: "rgba(211, 211, 211, 0.6)" },
  },
  {
    id: "ttm-6",
    text: "India",
    top: "54.2646%",
    left: "91.089%",
    width: "57px",
    marginTop: "-9.8px",
    marginLeft: "-28.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-7",
    text: "South<br>Korea",
    top: "60.0827%",
    left: "58.7427%",
    width: "64px",
    marginTop: "-19.4px",
    marginLeft: "-32px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-8",
    text: "Taiwan",
    top: "57.9008%",
    left: "73.839%",
    width: "70px",
    marginTop: "-9.8px",
    marginLeft: "-35px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-9",
    text: "<span style=\"font-weight:700;color:#ffffff\">Mexico</span><br><span style=\"font-weight:500;color:#e8e8e8\">$506 bil.</span>",
    top: "62.819%",
    left: "24.4311%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-10",
    text: "U.K.",
    top: "64.9463%",
    left: "91.0067%",
    width: "51px",
    marginTop: "-9.8px",
    marginLeft: "-25.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-11",
    text: "Switz.",
    top: "73.8099%",
    left: "62.6786%",
    width: "64px",
    marginTop: "-9.8px",
    marginLeft: "-32px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-12",
    text: "<span style=\"font-weight:700;color:#ffffff\">Japan</span><br><span style=\"font-weight:500;color:#e8e8e8\">$148 bil.</span>",
    top: "82.3645%",
    left: "13.2228%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-13",
    text: "<span style=\"font-weight:700;color:#ffffff\">Vietnam</span><br><span style=\"font-weight:500;color:#e8e8e8\">$137 bil.</span>",
    top: "82.3645%",
    left: "38.5605%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttm-14",
    text: "Other major U.S. exporters are<br><span style=\"font-weight:700;color:#4e9493\">trying to negotiate</span><span style=\"font-weight:500;color:#666666\"> instead.</span>",
    top: "90.9091%",
    left: "0.0896%",
    width: "229px",
    style: { fontWeight: 500, fontSize: 16, lineHeight: "19px", color: "#666666" },
  },
];

// ─── TRADE TREEMAP — DESKTOP ────────────────────────────────────────
// Desktop artboard asset: 1200 × 900
// Source: ai2html v0.121.1 — trade-treemap Artboard_1_copy

export const TRADE_TREEMAP_DESKTOP_OVERLAYS: Ai2htmlOverlay[] = [
  {
    id: "ttd-1",
    text: "A few of the biggest<br>economies are<br><span style=\"font-weight:700;color:#b86200\">retaliating</span><span style=\"font-weight:500;color:#666666\">, or</span><br>threatening to.",
    bottom: "67.8809%",
    left: "76.6417%",
    width: "154px",
    style: { fontWeight: 500, fontSize: 16, lineHeight: "19px", color: "#666666" },
  },
  {
    id: "ttd-2",
    text: "<span style=\"font-weight:700;color:#ffffff\">E.U.</span><br><span style=\"font-weight:500;color:#d3d3d3\">$606 bil.</span>",
    top: "23.201%",
    left: "15.3407%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-3",
    text: "<span style=\"font-weight:700;color:#ffffff\">China</span><br><span style=\"font-weight:500;color:#d3d3d3\">$439 bil.</span>",
    top: "23.201%",
    left: "42.386%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-4",
    text: "<span style=\"font-weight:700;color:#ffffff\">Canada</span><br><span style=\"font-weight:500;color:#d3d3d3\">$413 bil.</span>",
    top: "23.201%",
    left: "64.6197%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-5",
    text: "(Exports to U.S.)",
    top: "29.384%",
    left: "15.5741%",
    width: "106px",
    marginTop: "-7.2px",
    marginLeft: "-53px",
    style: { fontWeight: 500, fontSize: 12, lineHeight: "14px", textAlign: "center", color: "rgba(211, 211, 211, 0.6)" },
  },
  {
    id: "ttd-6",
    text: "<span style=\"font-weight:700;color:#ffffff\">India</span><br><span style=\"font-weight:500;color:#e8e8e8\">$87 bil.</span>",
    top: "55.6453%",
    left: "67.4827%",
    width: "74px",
    marginTop: "-19.4px",
    marginLeft: "-37px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-7",
    text: "<span style=\"font-weight:700;color:#ffffff\">S. Korea</span><br><span style=\"font-weight:500;color:#e8e8e8\">$132 bil.</span>",
    top: "61.6453%",
    left: "43.954%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-8",
    text: "<span style=\"font-weight:700;color:#ffffff\">Taiwan</span><br><span style=\"font-weight:500;color:#e8e8e8\">$116 bil.</span>",
    top: "61.6453%",
    left: "55.2919%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-9",
    text: "<span style=\"font-weight:700;color:#ffffff\">Mexico</span><br><span style=\"font-weight:500;color:#e8e8e8\">$506 bil.</span>",
    top: "64.5342%",
    left: "19.7535%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-10",
    text: "Other major U.S.<br>exporters are<br><span style=\"font-weight:700;color:#4e9493\">trying to negotiate</span><br>instead.",
    top: "64.2222%",
    left: "76.7908%",
    width: "153px",
    style: { fontWeight: 500, fontSize: 16, lineHeight: "19px", color: "#666666" },
  },
  {
    id: "ttd-11",
    text: "<span style=\"font-weight:700;color:#ffffff\">U.K.</span><br><span style=\"font-weight:500;color:#e8e8e8\">$68 bil.</span>",
    top: "69.2008%",
    left: "67.4827%",
    width: "74px",
    marginTop: "-19.4px",
    marginLeft: "-37px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-12",
    text: "<span style=\"font-weight:700;color:#ffffff\">Switzerland</span><br><span style=\"font-weight:500;color:#e8e8e8;font-size:14px;line-height:17px\">$63 bil.</span>",
    top: "79.5924%",
    left: "46.5038%",
    width: "94px",
    marginTop: "-17.2px",
    marginLeft: "-47px",
    style: { fontWeight: 700, fontSize: 14, lineHeight: "17px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-13",
    text: "<span style=\"font-weight:700;color:#ffffff\">Japan</span><br><span style=\"font-weight:500;color:#e8e8e8\">$148 bil.</span>",
    top: "90.7564%",
    left: "9.8871%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-14",
    text: "<span style=\"font-weight:700;color:#ffffff\">Vietnam</span><br><span style=\"font-weight:500;color:#e8e8e8\">$137 bil.</span>",
    top: "90.7564%",
    left: "28.8445%",
    width: "83px",
    marginTop: "-19.4px",
    marginLeft: "-41.5px",
    style: { fontWeight: 700, fontSize: 16, lineHeight: "19px", textAlign: "center", color: "#ffffff" },
  },
  {
    id: "ttd-15",
    text: "<span style=\"font-weight:700;color:#ffffff\">Thailand</span><br><span style=\"font-weight:500;color:#e8e8e8;font-size:14px;line-height:17px\">$63 bil.</span>",
    top: "90.7036%",
    left: "42.8752%",
    width: "75px",
    marginTop: "-17.2px",
    marginLeft: "-37.5px",
    style: { fontWeight: 700, fontSize: 14, lineHeight: "17px", textAlign: "center", color: "#ffffff" },
  },
];

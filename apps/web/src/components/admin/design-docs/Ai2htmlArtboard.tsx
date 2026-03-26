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
  top: string;       // e.g. "6.32%"
  left: string;      // e.g. "51.13%"
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
              top: o.top,
              left: o.left,
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

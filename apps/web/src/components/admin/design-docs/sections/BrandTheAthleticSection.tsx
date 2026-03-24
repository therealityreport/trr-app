"use client";

import AIIllustration, { type IllustrationPrompts } from "../AIIllustration";
import allPrompts from "../illustration-prompts.json";

const PROMPTS = allPrompts["the-athletic"] as Record<string, IllustrationPrompts>;

/* ================================================================
   BrandTheAthleticSection — The Athletic brand reference
   Premium sports journalism, dark UI, live scores.
   Uses dd-* CSS variables throughout.
   ================================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-viz-blue)",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

function SpecimenMeta({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
        color: "#888888",
        marginTop: 8,
      }}
    >
      {text}
    </div>
  );
}

interface SwatchProps {
  name: string;
  hex: string;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function Swatch({ name, hex }: SwatchProps) {
  const lum = relativeLuminance(hex);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          background: hex,
          border: lum < 0.05 ? "1px solid #3A3A5C" : "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: lum > 0.4 ? "#1A1A2E" : "#fff",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 9,
        }}
      >
        {hex}
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
          }}
        >
          {hex}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const ATH_COLORS: SwatchProps[] = [
  { name: "Deep Navy", hex: "#1A1A2E" },
  { name: "Card Dark", hex: "#252542" },
  { name: "Card Hover", hex: "#2E2E52" },
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "Light Gray", hex: "#E0E0E0" },
  { name: "Muted Gray", hex: "#888888" },
  { name: "Athletic Green", hex: "#1DB954" },
  { name: "Score Red", hex: "#E74C3C" },
  { name: "Athletic Gold", hex: "#F5A623" },
  { name: "Divider", hex: "#3A3A5C" },
];

/* ------------------------------------------------------------------ */
/*  Component specimens                                               */
/* ------------------------------------------------------------------ */

function LiveScoreCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  homeColor,
  awayColor,
  period,
}: {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homeColor: string;
  awayColor: string;
  period: string;
}) {
  return (
    <div
      style={{
        background: "#252542",
        borderRadius: 8,
        padding: "16px 20px",
        minWidth: 200,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: "#1DB954",
            boxShadow: "0 0 6px rgba(29,185,84,0.5)",
          }}
        />
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 10,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "#1DB954",
          }}
        >
          LIVE
        </span>
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            color: "#888888",
            marginLeft: "auto",
          }}
        >
          {period}
        </span>
      </div>

      {/* Teams */}
      {[
        { team: awayTeam, score: awayScore, color: awayColor },
        { team: homeTeam, score: homeScore, color: homeColor },
      ].map((t) => (
        <div
          key={t.team}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 9999,
              background: t.color,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 600,
              fontSize: 14,
              color: "#FFFFFF",
              flex: 1,
            }}
          >
            {t.team}
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 24,
              color: "#FFFFFF",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t.score}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArticleCardDark({
  headline,
  byline,
  timestamp,
}: {
  headline: string;
  byline: string;
  timestamp: string;
}) {
  return (
    <div
      style={{
        background: "#252542",
        borderRadius: 8,
        overflow: "hidden",
        maxWidth: 340,
        borderBottom: "1px solid #3A3A5C",
      }}
    >
      {/* Image placeholder */}
      <div
        style={{
          height: 180,
          background: "linear-gradient(135deg, #2E2E52, #1A1A2E)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="4" fill="#3A3A5C" />
          <path
            d="M12 28L18 20L22 25L26 19L28 22"
            stroke="#888888"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="16" cy="16" r="3" fill="#888888" />
        </svg>
      </div>

      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 20,
            color: "#FFFFFF",
            lineHeight: 1.25,
            marginBottom: 10,
          }}
        >
          {headline}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "#888888",
          }}
        >
          {byline} &middot; {timestamp}
        </div>
      </div>
    </div>
  );
}

function StatTable() {
  const headers = ["Player", "PTS", "REB", "AST", "FG%"];
  const rows = [
    { name: "J. Tatum", team: "#0F7A3C", stats: ["32", "8", "5", ".524"] },
    { name: "J. Brown", team: "#0F7A3C", stats: ["24", "5", "3", ".467"] },
    { name: "D. White", team: "#0F7A3C", stats: ["18", "4", "6", ".500"] },
    { name: "A. Horford", team: "#0F7A3C", stats: ["12", "10", "4", ".429"] },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          maxWidth: 520,
          borderCollapse: "collapse",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: h === "Player" ? "left" : "right",
                  padding: "8px 10px",
                  fontWeight: 700,
                  fontSize: 11,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  color: "#888888",
                  borderBottom: "1px solid #3A3A5C",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.name}>
              <td
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #3A3A5C",
                  background: ri % 2 === 0 ? "#252542" : "#1A1A2E",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 9999,
                    background: r.team,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{r.name}</span>
              </td>
              {r.stats.map((s, si) => (
                <td
                  key={si}
                  style={{
                    padding: "8px 10px",
                    textAlign: "right",
                    borderBottom: "1px solid #3A3A5C",
                    background: ri % 2 === 0 ? "#252542" : "#1A1A2E",
                    color: "#E0E0E0",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: si === 0 ? 700 : 400,
                  }}
                >
                  {s}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PodcastCard() {
  return (
    <div
      style={{
        background: "#252542",
        borderRadius: 8,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        maxWidth: 380,
      }}
    >
      {/* Play button */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 9999,
          background: "#F5A623",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
          <path d="M0 0L18 10L0 20V0Z" fill="#1A1A2E" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 11,
            textTransform: "uppercase" as const,
            letterSpacing: "0.06em",
            color: "#F5A623",
            marginBottom: 4,
          }}
        >
          The Athletic NBA Show
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 600,
            fontSize: 14,
            color: "#FFFFFF",
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          Trade deadline fallout: winners and losers
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            color: "#888888",
          }}
        >
          42 min
        </div>
      </div>
    </div>
  );
}

function StandingsTable() {
  const teams = [
    { rank: 1, name: "BOS", color: "#0F7A3C", w: 52, l: 14, pct: ".788", streak: "W5" },
    { rank: 2, name: "OKC", color: "#007AC1", w: 50, l: 16, pct: ".758", streak: "W3" },
    { rank: 3, name: "CLE", color: "#6F263D", w: 48, l: 18, pct: ".727", streak: "L1" },
    { rank: 4, name: "NYK", color: "#006BB6", w: 44, l: 22, pct: ".667", streak: "W2" },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          maxWidth: 420,
          borderCollapse: "collapse",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
        }}
      >
        <thead>
          <tr>
            {["#", "Team", "W", "L", "PCT", "Streak"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: h === "Team" ? "left" : "center",
                  padding: "6px 8px",
                  fontWeight: 700,
                  fontSize: 10,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                  color: "#888888",
                  borderBottom: "1px solid #3A3A5C",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr key={t.name}>
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  color: "#888888",
                  borderBottom: "1px solid #3A3A5C",
                  background: i % 2 === 0 ? "#252542" : "#1A1A2E",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {t.rank}
              </td>
              <td
                style={{
                  padding: "6px 8px",
                  borderBottom: "1px solid #3A3A5C",
                  background: i % 2 === 0 ? "#252542" : "#1A1A2E",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 9999,
                      background: t.color,
                    }}
                  />
                  <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{t.name}</span>
                </div>
              </td>
              {[t.w, t.l, t.pct].map((v, vi) => (
                <td
                  key={vi}
                  style={{
                    padding: "6px 8px",
                    textAlign: "center",
                    color: "#E0E0E0",
                    borderBottom: "1px solid #3A3A5C",
                    background: i % 2 === 0 ? "#252542" : "#1A1A2E",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {v}
                </td>
              ))}
              <td
                style={{
                  padding: "6px 8px",
                  textAlign: "center",
                  borderBottom: "1px solid #3A3A5C",
                  background: i % 2 === 0 ? "#252542" : "#1A1A2E",
                  fontWeight: 600,
                  fontSize: 12,
                  color: t.streak.startsWith("W") ? "#1DB954" : "#E74C3C",
                }}
              >
                {t.streak}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                      */
/* ------------------------------------------------------------------ */

export default function BrandTheAthleticSection() {
  return (
    <div>
      {/* ── 1. Brand Header ─────────────────────────────── */}
      <div
        style={{
          background: "#1A1A2E",
          borderRadius: 8,
          padding: "32px 40px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 32,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "#888888",
            lineHeight: 1.5,
          }}
        >
          Premium sports media &mdash; dark, dense, data-rich
        </div>
      </div>

      {/* ── 2. Typography ───────────────────────────────── */}
      <div id="typography" />
      <SectionLabel>Typography</SectionLabel>

      {/* All type specimens on dark bg */}
      <div
        style={{
          background: "#1A1A2E",
          borderRadius: 8,
          padding: "28px 32px",
          marginBottom: 40,
        }}
      >
        {/* Headlines — Cheltenham Bold */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 700,
              fontSize: 32,
              color: "#FFFFFF",
              lineHeight: 1.15,
            }}
          >
            Inside the Trade Deadline
          </div>
          <SpecimenMeta text="Headlines: Cheltenham Bold | 32px | white" />
        </div>

        {/* Section Titles — Franklin Gothic Bold uppercase */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontWeight: 700,
              fontSize: 22,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "#FFFFFF",
            }}
          >
            NBA Power Rankings
          </div>
          <SpecimenMeta text="Section Titles: Franklin Gothic Bold | 22px | uppercase | 0.08em tracking" />
        </div>

        {/* Body — Gloucester Regular */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 17,
              lineHeight: 1.7,
              color: "#E0E0E0",
              maxWidth: 640,
            }}
          >
            The trade deadline is always a flurry of activity, but this year felt different.
            Teams that were expected to stand pat became aggressive, and franchises assumed
            to be sellers suddenly pivoted to buying. The reverberations will be felt well
            into the playoffs and beyond.
          </div>
          <SpecimenMeta text="Body: Gloucester Regular | 17px | 1.7 line-height | #E0E0E0" />
        </div>

        {/* Stat Numbers */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 36,
                color: "#FFFFFF",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              112
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 36,
                color: "#FFFFFF",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              &ndash;
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 36,
                color: "#FFFFFF",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              104
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                color: "#888888",
                alignSelf: "center",
              }}
            >
              FINAL
            </div>
          </div>
          <SpecimenMeta text="Stat Numbers: Franklin Gothic Bold | 36px | tabular-nums | white" />
        </div>

        {/* Metadata */}
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "#888888",
            }}
          >
            By Shams Charania &middot; 2h ago &middot; 8 min read
          </div>
          <SpecimenMeta text="Metadata: Franklin Gothic | 12px | #888888" />
        </div>

        {/* Live Indicator */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 11,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
                color: "#FFFFFF",
                background: "#E74C3C",
                borderRadius: 4,
                padding: "2px 8px",
              }}
            >
              LIVE
            </span>
            <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "#888888" }}>
              4th Quarter &middot; 3:42
            </span>
          </div>
          <SpecimenMeta text="Live Indicator: Franklin Gothic Bold | 11px | uppercase | red bg" />
        </div>

        {/* Type Scale */}
        <div style={{ paddingTop: 16, borderTop: "1px solid #3A3A5C" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "#888888",
              marginBottom: 12,
            }}
          >
            Type Scale
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline" }}>
            {[36, 32, 24, 22, 17, 14, 12, 11].map((s) => (
              <span
                key={s}
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 600,
                  fontSize: s,
                  color: "#FFFFFF",
                }}
              >
                {s}px
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Color Palette ────────────────────────────── */}
      <div id="colors" />
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
          marginBottom: 40,
        }}
      >
        {ATH_COLORS.map((c) => (
          <Swatch key={c.name} {...c} />
        ))}
      </div>

      {/* ── 4. Components ───────────────────────────────── */}
      <div id="components" />
      <SectionLabel>Components</SectionLabel>

      {/* All component specimens on dark bg */}
      <div
        style={{
          background: "#1A1A2E",
          borderRadius: 8,
          padding: "28px 32px",
          marginBottom: 40,
        }}
      >
        {/* Live Score Cards */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Live Score Cards
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <LiveScoreCard
            homeTeam="BOS"
            awayTeam="LAL"
            homeScore={112}
            awayScore={104}
            homeColor="#0F7A3C"
            awayColor="#552583"
            period="4th 3:42"
          />
          <LiveScoreCard
            homeTeam="GSW"
            awayTeam="PHX"
            homeScore={98}
            awayScore={101}
            homeColor="#1D428A"
            awayColor="#E56020"
            period="3rd 8:15"
          />
        </div>

        {/* Article Card (Dark) */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Article Card (Dark)
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <ArticleCardDark
            headline="Inside the Celtics&#8217; championship blueprint"
            byline="Jay King"
            timestamp="3h ago"
          />
          <ArticleCardDark
            headline="Why the trade deadline changed everything for the West"
            byline="Sam Amick"
            timestamp="5h ago"
          />
        </div>

        {/* Stat Table */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Stat Table
        </div>
        <div style={{ marginBottom: 32 }}>
          <StatTable />
        </div>

        {/* Podcast Card */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Podcast Card
        </div>
        <div style={{ marginBottom: 32 }}>
          <PodcastCard />
        </div>

        {/* Standings Table */}
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "#888888",
            marginBottom: 12,
          }}
        >
          Standings Table
        </div>
        <div>
          <StandingsTable />
        </div>
      </div>

      {/* AI-Generated Illustrations */}
      <div id="ai-illustrations" />
      <div className="dd-section-label" style={{ color: "#F5A623", marginTop: 48 }}>AI-Generated Illustrations</div>
      <p style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, color: "var(--dd-ink-soft)", marginBottom: 24 }}>
        Sports media illustration and icon styles on dark backgrounds.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 48 }}>
        <AIIllustration
          prompts={PROMPTS["sports-action"]}
          brandAccent="#F5A623"
          height={280}
        />
        <AIIllustration
          prompts={PROMPTS["live-score-icon"]}
          brandAccent="#1DB954"
          height={280}
        />
        <AIIllustration
          prompts={PROMPTS["stats-dashboard-icon"]}
          brandAccent="#F5A623"
          height={240}
        />
      </div>

      {/* ── 5. Layout Patterns ──────────────────────────── */}
      <div id="layout" />
      <SectionLabel>Layout Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          {
            label: "Homepage Feed",
            desc: "2-column: main features + sidebar scores/standings",
          },
          {
            label: "Live Scores Bar",
            desc: "Horizontal scrolling row of live game cards at page top",
          },
          {
            label: "Article Page",
            desc: "Dark bg, white text, 640px max-width, full-bleed header image",
          },
          {
            label: "Stats Dashboard",
            desc: "Dense multi-column grid of stat tables and standings",
          },
        ].map((p) => (
          <div
            key={p.label}
            style={{
              background: "#252542",
              borderRadius: 8,
              padding: 20,
              border: "1px solid #3A3A5C",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontWeight: 700,
                fontSize: 14,
                color: "#FFFFFF",
                marginBottom: 4,
              }}
            >
              {p.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "#888888",
                lineHeight: 1.4,
              }}
            >
              {p.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── 6. Shapes & Radius ──────────────────────────── */}
      <div id="shapes" />
      <SectionLabel>Shapes &amp; Radius</SectionLabel>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-end",
          marginBottom: 16,
        }}
      >
        {[
          { label: "Cards", radius: 8, color: "#252542" },
          { label: "Score Badges", radius: 4, color: "#E74C3C" },
          { label: "Live Dots", radius: 9999, color: "#1DB954" },
          { label: "Buttons", radius: 6, color: "#F5A623" },
          { label: "Table Container", radius: 8, color: "#252542" },
          { label: "Table Rows", radius: 0, color: "#3A3A5C" },
          { label: "Player Avatars", radius: 9999, color: "#888888" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: s.color,
                borderRadius: s.radius,
                margin: "0 auto 8px",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--dd-ink-medium)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
              }}
            >
              {s.radius === 9999 ? "9999px" : `${s.radius}px`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

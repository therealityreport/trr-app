"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Components                                        */
/*  Content block types from NFL article + brand design patterns       */
/* ------------------------------------------------------------------ */

function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <h3
      id={id}
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid var(--dd-brand-accent)",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

/* ── Content Block Types from NFL Article ───────────────────────────── */

interface ContentBlockCard {
  type: string;
  description: string;
  detail: string;
}

const CONTENT_BLOCKS: ContentBlockCard[] = [
  {
    type: "storyline",
    description: "Horizontal nav bar for related coverage",
    detail: "\"Super Bowl LX\" with 5 story links — headlineSansBoldExtraSmall 15px/700, ItemTitle 14px/500 #52524F",
  },
  {
    type: "featured-image",
    description: "Full-width hero image with srcSet",
    detail: "srcSet 600-1920w, fetchpriority=high, object-fit:cover, credit span Typography_body1",
  },
  {
    type: "showcase-link",
    description: "Inline recommendation card (3 instances in article)",
    detail: "Image 200x150 r:8px + title cheltenham 24px + excerpt imperial 16px, border-top/bottom rgba(150,150,147,0.4)",
  },
  {
    type: "datawrapper-table",
    description: "Embedded heatmap table with The Athletic theme",
    detail: "iframe#datawrapper-chart-UYsk6, dark/light mode pair with .dw-dark/.dw-light classes, heatmap on xGC+ column",
  },
  {
    type: "twitter-embed",
    description: "Embedded tweet with async widgets.js",
    detail: "blockquote.twitter-tweet data-width=550 data-dnt=true — Matt Schneidman (@mattschneidman) quote",
  },
  {
    type: "ad-container",
    description: "Mid-article ad slots (3 positions)",
    detail: ".ad-wrapper min-h:300px, margin:48px/40px, .ad-slug 11px/500 uppercase var(--Gray60)",
  },
  {
    type: "puzzle-entry-point",
    description: "Connections: Sports Edition promo card",
    detail: "PuzzleEntryPoint_PuzzleContainer: date, title (franklin 20px/600), subtitle, play CTA button with chevron",
  },
  {
    type: "author-bio",
    description: "Author bio with headshot and social link",
    detail: "Grid 9-col: headshot 100px + bio text utilitySansRegularLarge 16px/400 + Twitter link bold #386C92",
  },
];

/* ── Architecture / UI Patterns ────────────────────────────────────── */

interface ArchPatternCard {
  name: string;
  description: string;
  detail: string;
}

const ARCH_PATTERNS: ArchPatternCard[] = [
  {
    name: "Hamburger Nav",
    description: "Toggle hamburger menu with league list + search",
    detail: "button.DesktopNav_HamburgerMenuContainer — 3 rects 17x2.5px, 5px gap, aria-label toggle",
  },
  {
    name: "Pill Buttons",
    description: "Share, comment count, icon-only variants",
    detail: "button.Pill — icon 28x28/24x24/14x15 + optional label, aria-pressed toggle, franklin 12px/500",
  },
  {
    name: "DesktopNav",
    description: "Primary navigation with league icons",
    detail: "DesktopNav_PrimaryNav — league icons 24x24, team dropdown subnavs, StorylineHeight variant",
  },
  {
    name: "Grid System",
    description: "12-column responsive grid",
    detail: "Grid_xsNumber12 (12-col base) — article uses 9/12 content + sidebar split on md+",
  },
];

/* ── Brand Design Pattern Specimens (from BrandTheAthleticSection) ── */

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
      {[
        { team: awayTeam, score: awayScore, color: awayColor },
        { team: homeTeam, score: homeScore, color: homeColor },
      ].map((t) => (
        <div key={t.team} style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
          <path d="M12 28L18 20L22 25L26 19L28 22" stroke="#888888" strokeWidth="1.5" fill="none" />
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
          The Athletic NFL Show
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
          Fourth-down analytics: who&rsquo;s getting it right?
        </div>
        <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "#888888" }}>
          38 min
        </div>
      </div>
    </div>
  );
}

function StandingsTable() {
  const teams = [
    { rank: 1, name: "SEA", color: "#002244", w: 52, l: 14, pct: ".788", streak: "W5" },
    { rank: 2, name: "DEN", color: "#FB4F14", w: 50, l: 16, pct: ".758", streak: "W3" },
    { rank: 3, name: "BUF", color: "#00338D", w: 48, l: 18, pct: ".727", streak: "L1" },
    { rank: 4, name: "PHI", color: "#004C54", w: 44, l: 22, pct: ".667", streak: "W2" },
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

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticComponents() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="dd-brand-card"
        style={{
          padding: "32px 40px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 700,
            fontSize: 32,
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Components
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Content block types from the NFL article + brand design pattern specimens
        </div>
      </div>

      {/* ── Content Block Types ────────────────────────── */}
      <SectionLabel id="content-blocks">Content Blocks (from NFL Article)</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 12,
          marginBottom: 40,
        }}
      >
        {CONTENT_BLOCKS.map((block) => (
          <div
            key={block.type}
            className="dd-brand-card"
            style={{
              padding: "16px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--dd-brand-text-primary)",
                  background: "var(--dd-brand-surface, #f5f5f5)",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                {block.type}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              {block.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {block.detail}
            </div>
          </div>
        ))}
      </div>

      {/* ── Architecture / UI Patterns ─────────────────── */}
      <SectionLabel id="arch-patterns">Architecture Patterns</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 40,
        }}
      >
        {ARCH_PATTERNS.map((p) => (
          <div
            key={p.name}
            className="dd-brand-card"
            style={{
              padding: "16px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              {p.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
                marginBottom: 6,
              }}
            >
              {p.description}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
              }}
            >
              {p.detail}
            </div>
          </div>
        ))}
      </div>

      {/* ── Site Header Specimen ─────────────────────────── */}
      <SectionLabel id="site-header">Site Header</SectionLabel>
      <div
        className="dd-brand-card"
        style={{ padding: "28px 32px", marginBottom: 40 }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen &mdash; Header
        </div>
        {/* Dark inner container for the actual dark-themed header */}
        <div style={{ background: "#121212", borderRadius: 8, overflow: "hidden" }}>
          {/* ── Primary Nav Bar ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 56,
              padding: "0 16px",
            }}
          >
            {/* Hamburger */}
            <button
              style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                flexShrink: 0,
              }}
              aria-label="Toggle menu"
            >
              <svg width="30" height="30" viewBox="0 0 30 30">
                <rect x="6.5" y="8.75" width="17" height="2.5" fill="white" />
                <rect x="6.5" y="13.75" width="17" height="2.5" fill="white" />
                <rect x="6.5" y="18.75" width="17" height="2.5" fill="white" />
              </svg>
            </button>

            {/* Divider */}
            <div
              style={{
                width: 2,
                height: 32,
                background: "#52524F",
                margin: "0 16px",
                flexShrink: 0,
              }}
            />

            {/* Wordmark */}
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 800,
                fontSize: 18,
                letterSpacing: "0.18em",
                color: "#FFFFFF",
                minWidth: 127,
                whiteSpace: "nowrap" as const,
                flexShrink: 0,
              }}
            >
              THE ATHLETIC
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Right-side placeholder links */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#DBDBD9",
                  cursor: "pointer",
                }}
              >
                Subscribe
              </span>
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#DBDBD9",
                  cursor: "pointer",
                }}
              >
                Log In
              </span>
            </div>
          </div>

          {/* ── League Navigation Bar ── */}
          <div
            style={{
              borderTop: "1px solid #333330",
              display: "flex",
              alignItems: "center",
              gap: 0,
              padding: "0 16px",
              height: 48,
              overflowX: "auto",
            }}
          >
            {[
              { label: "NFL", color: "#013369" },
              { label: "NBA", color: "#C9082A" },
              { label: "MLB", color: "#002D72" },
              { label: "NHL", color: "#000000" },
              { label: "NCAAM", color: "#FF6600" },
            ].map((league, idx) => (
              <div
                key={league.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 16px",
                  height: "100%",
                  cursor: "pointer",
                  borderLeft: idx === 0 ? "none" : "1px solid #333330",
                }}
              >
                {/* League icon placeholder (colored circle) */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    background: league.color,
                    flexShrink: 0,
                    border: "2px solid #3A3A3A",
                  }}
                />
                <span
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 14,
                    fontWeight: 400,
                    letterSpacing: "0.25px",
                    color: "#DBDBD9",
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {league.label}
                </span>
                {/* Chevron down */}
                <svg width="10" height="6" viewBox="0 0 10 6" style={{ flexShrink: 0 }}>
                  <path
                    fill="#969693"
                    d="m1.281.193-.948.947 4.673 4.667.948-.947 3.712-3.707-.948-.946-3.712 3.706z"
                  />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Site Footer Specimen ─────────────────────────── */}
      <SectionLabel id="site-footer">Site Footer</SectionLabel>
      <div
        className="dd-brand-card"
        style={{ padding: "28px 32px", marginBottom: 40 }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen &mdash; Footer
        </div>
        {/* Dark inner container for the actual dark-themed footer */}
        <div style={{ background: "#121212", borderRadius: 8, overflow: "hidden", padding: "40px 32px 24px" }}>
          {/* ── 4-Column Link Grid ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 32,
              marginBottom: 40,
            }}
          >
            {/* Column 1 — National */}
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.25px",
                  color: "#F0F0EE",
                  marginBottom: 16,
                }}
              >
                National
              </div>
              {["NFL", "NBA", "MLB", "NHL", "College Football", "Fantasy"].map((link) => (
                <div
                  key={link}
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.15px",
                    color: "#C4C4C0",
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                >
                  {link}
                </div>
              ))}
            </div>

            {/* Column 2 — US */}
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.25px",
                  color: "#F0F0EE",
                  marginBottom: 16,
                }}
              >
                US
              </div>
              {["New York", "Boston", "Chicago", "Los Angeles", "Philadelphia", "Bay Area"].map(
                (link) => (
                  <div
                    key={link}
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.15px",
                      color: "#C4C4C0",
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    {link}
                  </div>
                ),
              )}
            </div>

            {/* Column 3 — Canada + Partners */}
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.25px",
                  color: "#F0F0EE",
                  marginBottom: 16,
                }}
              >
                Canada &amp; Partners
              </div>
              {["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Podcasts"].map(
                (link) => (
                  <div
                    key={link}
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.15px",
                      color: "#C4C4C0",
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    {link}
                  </div>
                ),
              )}
            </div>

            {/* Column 4 — Subscribe + Support */}
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.25px",
                  color: "#F0F0EE",
                  marginBottom: 16,
                }}
              >
                Subscribe &amp; Support
              </div>
              {["Subscribe", "Gift a Subscription", "Manage Account", "Help Center", "Careers", "Accessibility"].map(
                (link) => (
                  <div
                    key={link}
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: "0.15px",
                      color: "#C4C4C0",
                      marginBottom: 10,
                      cursor: "pointer",
                    }}
                  >
                    {link}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div style={{ borderTop: "1px solid #333330", marginBottom: 32 }} />

          {/* ── Bottom Section: Wordmark + Social + Copyright ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            {/* Larger wordmark */}
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 800,
                fontSize: 24,
                letterSpacing: "0.18em",
                color: "#FFFFFF",
              }}
            >
              THE ATHLETIC
            </div>

            {/* Social icons */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Twitter / X */}
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <path
                  d="M17.944 3.987c.013.175.013.35.013.526C17.957 9.85 13.833 16 6.294 16v-.003A11.618 11.618 0 0 1 0 14.154a8.252 8.252 0 0 0 6.073-1.701 4.112 4.112 0 0 1-3.836-2.852 4.098 4.098 0 0 0 1.853-.07A4.107 4.107 0 0 1 .8 5.497v-.051c.57.317 1.206.493 1.856.513A4.114 4.114 0 0 1 1.384.674a11.66 11.66 0 0 0 8.462 4.29 4.112 4.112 0 0 1 6.995-3.747 8.236 8.236 0 0 0 2.607-.997 4.12 4.12 0 0 1-1.806 2.271A8.18 8.18 0 0 0 20 1.78a8.34 8.34 0 0 1-2.056 2.207Z"
                  fill="#969693"
                />
              </svg>
              {/* Facebook */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M18 9a9 9 0 1 0-10.406 8.89v-6.29H5.31V9h2.284V7.017c0-2.254 1.343-3.5 3.4-3.5.984 0 2.014.176 2.014.176v2.213h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.6h-2.097v6.29A9.004 9.004 0 0 0 18 9Z"
                  fill="#969693"
                />
              </svg>
              {/* Instagram */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1.621c2.403 0 2.688.01 3.637.053.878.04 1.354.187 1.671.31.42.163.72.358 1.035.673.315.315.51.615.673 1.035.123.317.27.793.31 1.671.043.95.053 1.234.053 3.637s-.01 2.688-.053 3.637c-.04.878-.187 1.354-.31 1.671a2.786 2.786 0 0 1-.673 1.035 2.786 2.786 0 0 1-1.035.673c-.317.123-.793.27-1.671.31-.95.043-1.234.053-3.637.053s-2.688-.01-3.637-.053c-.878-.04-1.354-.187-1.671-.31a2.786 2.786 0 0 1-1.035-.673 2.786 2.786 0 0 1-.673-1.035c-.123-.317-.27-.793-.31-1.671C1.631 11.688 1.621 11.403 1.621 9s.01-2.688.053-3.637c.04-.878.187-1.354.31-1.671.163-.42.358-.72.673-1.035.315-.315.615-.51 1.035-.673.317-.123.793-.27 1.671-.31C6.312 1.631 6.597 1.621 9 1.621ZM9 0C6.556 0 6.25.011 5.29.054 4.33.098 3.677.25 3.105.472a4.405 4.405 0 0 0-1.593 1.04A4.405 4.405 0 0 0 .472 3.104C.25 3.677.098 4.33.054 5.29.011 6.25 0 6.556 0 9s.011 2.75.054 3.71c.044.96.196 1.613.418 2.186.23.592.538 1.094 1.04 1.593.499.502 1.001.81 1.593 1.04.573.222 1.226.374 2.186.418C6.25 17.989 6.556 18 9 18s2.75-.011 3.71-.054c.96-.044 1.613-.196 2.186-.418a4.405 4.405 0 0 0 1.593-1.04c.502-.499.81-1.001 1.04-1.593.222-.573.374-1.226.418-2.186C17.989 11.75 18 11.444 18 9s-.011-2.75-.054-3.71c-.044-.96-.196-1.613-.418-2.186a4.405 4.405 0 0 0-1.04-1.593A4.405 4.405 0 0 0 14.896.472C14.323.25 13.67.098 12.71.054 11.75.011 11.444 0 9 0Z"
                  fill="#969693"
                />
                <path
                  d="M9 4.378a4.622 4.622 0 1 0 0 9.244 4.622 4.622 0 0 0 0-9.244Zm0 7.622a3 3 0 1 1 0-6 3 3 0 0 1 0 6ZM14.884 4.196a1.08 1.08 0 1 1-2.16 0 1.08 1.08 0 0 1 2.16 0Z"
                  fill="#969693"
                />
              </svg>
            </div>
          </div>

          {/* App store badge placeholders */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            <div
              style={{
                background: "#2A2A28",
                borderRadius: 6,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
                <path
                  d="M13.07 10.55c-.02-2.12 1.73-3.14 1.81-3.19-1-1.45-2.54-1.65-3.08-1.67-1.3-.14-2.56.78-3.22.78-.67 0-1.69-.76-2.78-.74-1.42.02-2.74.84-3.47 2.12-1.5 2.59-.38 6.41 1.06 8.51.72 1.03 1.57 2.18 2.68 2.14 1.08-.04 1.49-.7 2.79-.7 1.3 0 1.67.7 2.79.67 1.16-.02 1.89-1.04 2.59-2.08.83-1.19 1.16-2.35 1.18-2.41-.03-.01-2.25-.87-2.27-3.43h-.08ZM10.94 3.88c.58-.72.98-1.7.87-2.7-.84.04-1.88.58-2.49 1.28-.54.63-1.02 1.65-.9 2.62.95.07 1.92-.48 2.52-1.2Z"
                  fill="#969693"
                />
              </svg>
              <div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 8, color: "#969693" }}>
                  Download on the
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#F0F0EE",
                  }}
                >
                  App Store
                </div>
              </div>
            </div>
            <div
              style={{
                background: "#2A2A28",
                borderRadius: 6,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                <path
                  d="M.77.32 8.57 8.6.77 16.88c-.2-.1-.35-.33-.35-.62V.94c0-.29.15-.52.35-.62ZM11.72 5.87 9.5 7.67.77.32l8.2 4.45 2.75 1.1ZM11.72 11.33l-2.75 1.1-8.2 4.45 8.73-7.35 2.22 1.8ZM15.15 8.06c.47.27.47.71 0 .98l-2.55 1.38-2.42-1.82 2.42-1.82 2.55 1.28Z"
                  fill="#969693"
                />
              </svg>
              <div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 8, color: "#969693" }}>
                  GET IT ON
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#F0F0EE",
                  }}
                >
                  Google Play
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 400,
              color: "#969693",
              marginBottom: 16,
            }}
          >
            &copy;2026 The Athletic Media Company, A New York Times Company
          </div>

          {/* Bottom policy links */}
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacy Policy", "Cookie Policy", "Support", "Sitemap"].map((link) => (
              <span
                key={link}
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.15px",
                  color: "#C4C4C0",
                  cursor: "pointer",
                }}
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 5. Feed & Layout Patterns ─────────────────── */}
      <SectionLabel id="feed-layouts">Feed &amp; Layout Patterns</SectionLabel>
      <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-faint)", marginBottom: 16 }}>
        Homepage content organization patterns &mdash; how stories are curated and displayed in editorial sections.
      </p>

      {/* ── Pattern 1: Storyline Bar ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Storyline Bar &mdash; Horizontal scrolling bar with bold title and story links
        </div>
        <div style={{ background: "#FFFFFF" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #DFDFDF",
              padding: "12px 0",
              overflowX: "auto",
              gap: 0,
            }}
          >
            {/* Bold title */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 15,
                fontWeight: 700,
                color: "#121212",
                whiteSpace: "nowrap" as const,
                paddingRight: 16,
                borderRight: "2px solid #52524F",
                flexShrink: 0,
              }}
            >
              Super Bowl LX
            </div>
            {/* Story links */}
            {[
              "Full Super Bowl LX coverage",
              "Keys to the game for each team",
              "Ranking the top 25 players",
              "Expert predictions and analysis",
              "Halftime show performers announced",
            ].map((link, idx) => (
              <span
                key={link}
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#52524F",
                  whiteSpace: "nowrap" as const,
                  paddingLeft: 16,
                  paddingRight: idx < 4 ? 16 : 0,
                  borderRight: idx < 4 ? "1px solid #DFDFDF" : "none",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                {link}
              </span>
            ))}
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Storyline Bar specs:</strong>
          <br />
          Title: nyt-franklin 15px/700 #121212, bold border-right 2px #52524F
          <br />
          Story links: nyt-franklin 14px/500 #52524F, horizontal scroll
          <br />
          Bottom border: 1px solid #DFDFDF
          <br />
          Layout: flex row, nowrap, overflow-x auto
        </div>
      </div>

      {/* ── Pattern 2: Featured Article Card ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Featured Article Card &mdash; Full-width hero image with headline and author avatar
        </div>
        <div style={{ background: "#FFFFFF" }}>
          {/* Full-width image placeholder */}
          <div
            style={{
              width: "100%",
              paddingTop: "50%",
              background: "linear-gradient(135deg, #d5d5d5 0%, #e8e8e8 50%, #d0d0d0 100%)",
              position: "relative" as const,
              marginBottom: 16,
            }}
          >
            <div style={{ position: "absolute" as const, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="6" fill="#c0c0c0" />
                <path d="M14 34L22 24L28 31L32 26L34 29" stroke="#999" strokeWidth="2" fill="none" />
                <circle cx="20" cy="18" r="4" fill="#999" />
              </svg>
            </div>
            {/* Image credit */}
            <div
              style={{
                position: "absolute" as const,
                bottom: 8,
                right: 12,
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 500,
                color: "#52524F",
                background: "rgba(255,255,255,0.85)",
                padding: "2px 6px",
                borderRadius: 2,
              }}
            >
              Photo: Associated Press
            </div>
          </div>

          {/* Headline */}
          <div
            style={{
              fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
              fontSize: 40,
              fontWeight: 400,
              color: "#121212",
              lineHeight: 1.1,
              marginBottom: 16,
            }}
          >
            Jalen Hurts Returns to Practice, Signals Playoff Readiness After Six-Week Absence
          </div>

          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            {/* Avatar placeholder */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 9999,
                background: "linear-gradient(135deg, #d5d5d5, #c0c0c0)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="8" r="4" fill="#999" />
                <path d="M3 18c0-3.86 3.14-7 7-7s7 3.14 7 7" stroke="#999" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500, color: "#121212" }}>
                Zack Rosenblatt
              </div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 500, color: "#121212" }}>
                Mar 25, 2026
              </div>
            </div>
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Featured Article Card specs:</strong>
          <br />
          Image: full-width, object-fit cover, srcSet responsive
          <br />
          Headline: nyt-cheltenham 40px/400 #121212 (featured variant)
          <br />
          Byline: nyt-franklin 14px/500 #121212 with author avatar 40&times;40 round
          <br />
          Timestamp: nyt-franklin 13px/500 #121212
          <br />
          Image credit: nyt-franklin 12px/500 #52524F
        </div>
      </div>

      {/* ── Pattern 3: Showcase Link Card ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Showcase Link Card &mdash; Inline recommendation with image and excerpt
        </div>
        <div style={{ background: "#FFFFFF" }}>
          <div
            style={{
              borderTop: "1px solid rgba(150, 150, 147, 0.4)",
              borderBottom: "1px solid rgba(150, 150, 147, 0.4)",
              padding: "20px 0",
            }}
          >
            {/* Label */}
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "1.1px",
                textTransform: "uppercase" as const,
                color: "#121212",
                marginBottom: 16,
              }}
            >
              WHAT YOU SHOULD READ NEXT
            </div>

            {/* Card content */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              {/* Image placeholder */}
              <div
                style={{
                  width: 200,
                  height: 150,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #d5d5d5 0%, #e8e8e8 100%)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <rect width="36" height="36" rx="4" fill="#c0c0c0" />
                  <path d="M10 26L16 18L20 23L24 19L26 22" stroke="#999" strokeWidth="1.5" fill="none" />
                  <circle cx="14" cy="14" r="3" fill="#999" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                    fontSize: 24,
                    fontWeight: 500,
                    color: "#121212",
                    lineHeight: 1.2,
                    marginBottom: 8,
                  }}
                >
                  The Trade That Changed Three Franchises and One Front Office Forever
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-body), Georgia, 'Times New Roman', serif",
                    fontSize: 16,
                    fontWeight: 400,
                    color: "#323232",
                    lineHeight: 1.4,
                  }}
                >
                  Two years later, the ripple effects of the blockbuster deal are still being felt across the league. Here is what each team gained and lost.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Showcase Link Card specs:</strong>
          <br />
          Border-top/bottom: 1px solid rgba(150, 150, 147, 0.4)
          <br />
          Label: &ldquo;WHAT YOU SHOULD READ NEXT&rdquo; nyt-franklin 14px/700, letter-spacing 1.1px, uppercase
          <br />
          Image: 200&times;150, border-radius 8px (mobile: 120&times;120)
          <br />
          Title: nyt-cheltenham 24px/500 #121212 (mobile: 16px)
          <br />
          Excerpt: nyt-imperial 16px/400 #323232 (mobile: 12px)
          <br />
          Layout: flexbox row, 16px gap
        </div>
      </div>

      {/* ── Pattern 4: Content Feed Section ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Content Feed Section &mdash; Vertical list with thumbnails and section header
        </div>
        <div style={{ background: "#FFFFFF" }}>
          {/* Section header */}
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 20,
              fontWeight: 700,
              color: "#121212",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(150, 150, 147, 0.4)",
            }}
          >
            Baseball Is Back
          </div>

          {/* Story list */}
          {[
            {
              headline: "Power Ranking Every AL Bullpen Heading Into Opening Day",
              byline: "C.J. Nitkowski",
              timestamp: "6h ago",
            },
            {
              headline: "Inside the Dodgers\u2019 Plan to Develop Pitching Depth Beyond the Rotation",
              byline: "Fabian Ardaya",
              timestamp: "8h ago",
            },
            {
              headline: "Why the Orioles\u2019 New Ballpark Deal Could Reshape Downtown Baltimore",
              byline: "Dan Connolly",
              timestamp: "12h ago",
            },
            {
              headline: "Spring Training Standouts: Five Under-the-Radar Prospects Turning Heads",
              byline: "Keith Law",
              timestamp: "1d ago",
            },
          ].map((story, idx) => (
            <div
              key={story.headline}
              style={{
                display: "flex",
                gap: 16,
                padding: "14px 0",
                borderBottom: idx < 3 ? "1px solid rgba(150, 150, 147, 0.4)" : "none",
                alignItems: "flex-start",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline), Georgia, 'Times New Roman', serif",
                    fontSize: 18,
                    fontWeight: 500,
                    color: "#121212",
                    lineHeight: 1.25,
                    marginBottom: 6,
                  }}
                >
                  {story.headline}
                </div>
                <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 500, color: "#52524F" }}>
                  {story.byline} &middot; {story.timestamp}
                </div>
              </div>
              {/* Thumbnail placeholder */}
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #ddd, #eee)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect width="28" height="28" rx="3" fill="#c0c0c0" />
                  <path d="M8 20L12 14L15 18L18 15L20 17" stroke="#999" strokeWidth="1.5" fill="none" />
                  <circle cx="11" cy="11" r="2.5" fill="#999" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Content Feed Section specs:</strong>
          <br />
          Section header: nyt-franklin 20px/700, #121212
          <br />
          Thumbnail: 120&times;120, border-radius 8px, positioned right
          <br />
          Headline: nyt-cheltenham 18px/500 #121212
          <br />
          Byline + timestamp: nyt-franklin 13px/500 #52524F
          <br />
          Divider: 1px solid rgba(150, 150, 147, 0.4)
        </div>
      </div>

      {/* ── Pattern 5: Puzzle Entry Point Card ── */}
      <div className="dd-brand-card" style={{ padding: "28px 32px", marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: "var(--dd-ink-faint)", marginBottom: 16 }}>
          Puzzle Entry Point Card &mdash; Game promotion card with play CTA
        </div>
        <div style={{ background: "#FFFFFF" }}>
          <div
            style={{
              display: "flex",
              gap: 0,
              borderRadius: 8,
              overflow: "hidden",
              border: "1px solid #e8e5e0",
            }}
          >
            {/* Icon container (green) */}
            <div
              style={{
                background: "#CFF08B",
                padding: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 140,
              }}
            >
              {/* Connections grid icon placeholder */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 48, height: 48 }}>
                <div style={{ background: "#7B61FF", borderRadius: 4 }} />
                <div style={{ background: "#F5A623", borderRadius: 4 }} />
                <div style={{ background: "#2ECC71", borderRadius: 4 }} />
                <div style={{ background: "#3498DB", borderRadius: 4 }} />
              </div>
            </div>
            {/* Info panel */}
            <div style={{ padding: "20px 24px", flex: 1 }}>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 500, color: "#52524F", marginBottom: 4 }}>
                Mar 26, 2026
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#000",
                  marginBottom: 4,
                }}
              >
                Connections: Sports Edition
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#323232",
                  marginBottom: 12,
                }}
              >
                Group sports terms that share a common thread. A new puzzle is available each day.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500, color: "#121212" }}>
                  Play today&apos;s puzzle
                </span>
                {/* Chevron right */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4.8 12.08L8.87 8 4.8 3.92 6.05 2.67l5.33 5.33-5.33 5.33z" fill="#121212" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Annotation */}
        <div
          style={{
            marginTop: 20,
            padding: "12px 16px",
            background: "#f7f7f7",
            borderRadius: 8,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.8,
          }}
        >
          <strong style={{ color: "var(--dd-ink-black)" }}>Puzzle Entry Point Card specs:</strong>
          <br />
          Background: white &middot; Icon container: bg #CFF08B with Connections Sports Edition logo grid
          <br />
          Date: nyt-franklin 12px/500 #52524F
          <br />
          Title: nyt-franklin 20px/600 #000
          <br />
          Subtitle: nyt-franklin 14px/500 #323232
          <br />
          CTA: &ldquo;Play today&rsquo;s puzzle&rdquo; with chevron-right SVG, nyt-franklin 14px/500 #121212
        </div>
      </div>

      {/* ── Brand Design Patterns (specimens) ─────────── */}
      <SectionLabel id="brand-patterns">Brand Design Patterns</SectionLabel>
      <div
        className="dd-brand-card"
        style={{
          padding: "28px 32px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "var(--dd-ink-faint)",
            marginBottom: 16,
          }}
        >
          Brand Specimen &mdash; Athletic Dark Theme Preview
        </div>
        <div
          style={{
            background: "#1A1A2E",
            borderRadius: 8,
            padding: "24px 28px",
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
            homeTeam="SEA"
            awayTeam="NE"
            homeScore={31}
            awayScore={17}
            homeColor="#002244"
            awayColor="#002244"
            period="4th 3:42"
          />
          <LiveScoreCard
            homeTeam="BUF"
            awayTeam="PHI"
            homeScore={28}
            awayScore={24}
            homeColor="#00338D"
            awayColor="#004C54"
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
            headline="Ranking NFL playoff coaches by fourth-down edge"
            byline="Austin Mock"
            timestamp="Jan 9, 2026"
          />
          <ArticleCardDark
            headline="Why each NFC playoff team will win the Super Bowl"
            byline="The Athletic Staff"
            timestamp="Jan 8, 2026"
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
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  HOMEPAGE COMPONENTS                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}

      <SectionLabel id="homepage-components">Homepage Components</SectionLabel>

      {/* ── Homepage Header (Enhanced) ── */}
      <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>
          header &gt; nav.HeaderNav_HeaderNav &gt; div.DesktopNav_Wrapper.DesktopNav_FullFollowingHeight
        </div>

        {/* Primary Nav Bar */}
        <div style={{ background: "#121212", borderRadius: 6, padding: "10px 20px", marginBottom: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Hamburger */}
            <svg width="24" height="24" viewBox="0 0 30 30" fill="none">
              <rect x="6.5" y="8.75" width="17" height="2.5" fill="#fff" />
              <rect x="6.5" y="13.75" width="17" height="2.5" fill="#fff" />
              <rect x="6.5" y="18.75" width="17" height="2.5" fill="#fff" />
            </svg>
            {/* Wordmark */}
            <div style={{ color: "#fff", fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>THE ATHLETIC</div>
            {/* Divider */}
            <div style={{ borderLeft: "2px solid #52524F", height: 20, marginLeft: 8 }} />
            {/* Nav Links */}
            {["NFL", "NBA", "MLB", "NHL", "NCAAM", "NCAAW", "College Football", "WNBA", "Tennis"].map((league) => (
              <div key={league} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <span style={{ color: "#DBDBD9", fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 400, whiteSpace: "nowrap" }}>{league}</span>
                <svg width="8" height="5" viewBox="0 0 10 6" fill="none"><path fill="#969693" d="m1.281.193-.948.947 4.673 4.667.948-.947 3.712-3.707-.948-.946-3.712 3.706z" /></svg>
              </div>
            ))}
            {/* Search */}
            <div style={{ marginLeft: "auto" }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #969693", position: "relative" as const }}>
                <div style={{ width: 5, height: 1.5, background: "#969693", position: "absolute" as const, bottom: -1, right: -2, transform: "rotate(45deg)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Nav Bar */}
        <div style={{ background: "#121212", borderRadius: "0 0 6px 6px", padding: "6px 20px", borderTop: "1px solid #2b2b2b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, overflowX: "auto" }}>
            {[
              { icon: "🏀", label: "Men's Sweet 16 Bracket" },
              { icon: "🏀", label: "Women's Sweet 16 Bracket" },
              { icon: "🔗", label: "Connections: Sports Edition" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ fontSize: 12 }}>{item.icon}</span>
                <span style={{ color: "#DBDBD9", fontFamily: "var(--dd-font-sans)", fontSize: 11, fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Region Banner */}
        <div style={{ background: "#1a1a1a", borderRadius: 6, padding: "10px 16px", marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none"><path d="M20.5335 8.8407L19.1596 7.4668L14.005 12.6214L8.8407 7.4668L7.4668 8.8407L12.6214 14.005L7.4668 19.1596L8.8407 20.5335L14.005 15.3789L19.1596 20.5335L20.5335 19.1596L15.3789 14.005L20.5335 8.8407Z" fill="#969693" /></svg>
          <span style={{ color: "#DBDBD9", fontFamily: "var(--dd-font-sans)", fontSize: 12, flex: 1 }}>You are viewing our U.S. edition. You may be interested in our International edition.</span>
          <button style={{ background: "#fff", color: "#121212", border: "none", borderRadius: 4, padding: "6px 12px", fontFamily: "var(--dd-font-sans)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>International</button>
          <button style={{ background: "transparent", color: "#DBDBD9", border: "none", fontFamily: "var(--dd-font-sans)", fontSize: 11, cursor: "pointer" }}>Stay on this edition</button>
        </div>

        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
          Primary nav: a.header-link.HeaderLink_HeaderLink (14px/400/40px #DBDBD9) · Secondary nav: SecondaryNavItems_SecondaryNavItemTitle (11px/500) · Region banner: ActionBanner_banner with Button_DarkPrimaryDefault
        </div>
      </div>

      {/* ── Hamburger Menu Overlay ── */}
      <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>
          div#subnav-hamburger.HeaderSubNav_Wrapper &gt; div.HamburgerNav_Wrapper
        </div>
        <div style={{ background: "#fff", border: "1px solid #e8e5e0", borderRadius: 6, padding: 16, maxWidth: 400 }}>
          {/* League list section */}
          <div style={{ marginBottom: 16 }}>
            {["NFL", "NBA", "MLB", "NHL", "NCAAM", "NCAAW", "College Football", "WNBA", "Tennis", "Premier League", "Golf", "Soccer"].map((league) => (
              <div key={league} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#e8e5e0", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "#333" }}>{league}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 12, marginBottom: 12 }}>
            {["Log In", "Subscribe Now", "Tickets by StubHub", "Connections: Sports Edition"].map((link) => (
              <div key={link} style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500, color: "#121212", padding: "6px 0" }}>{link}</div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#52524F", marginBottom: 8 }}>REGION</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ padding: "6px 16px", border: "2px solid #121212", borderRadius: 4, fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600 }}>U.S.</div>
              <div style={{ padding: "6px 16px", border: "1px solid #e8e5e0", borderRadius: 4, fontFamily: "var(--dd-font-sans)", fontSize: 13, color: "#52524F" }}>International</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 12 }}>
            {["Search", "Top News", "Podcasts"].map((link) => (
              <div key={link} style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500, color: "#121212", padding: "6px 0" }}>{link}</div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
          League items: a.subnav-item.HeaderSubNav_SubNavItem (img 20×20 + div.HeaderSubNav_TeamText) · Links: a.HamburgerNav_HamburgerLink · Region: ContentEdition_container with ContentEdition_option + ContentEdition_isActive
        </div>
      </div>

      {/* ── Content Card Specimens ── */}
      <SectionLabel id="content-cards">Content Card Variants</SectionLabel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Hero Card */}
        <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 16 }}>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>Hero Card (SubmoduleOneHero)</div>
          <div style={{ background: "#f0f0ee", borderRadius: 4, paddingTop: "66.67%", marginBottom: 12 }} />
          <div style={{ fontFamily: "var(--dd-font-headline, Georgia)", fontSize: 18, fontWeight: 500, lineHeight: 1.2, marginBottom: 8 }}>
            Frank Thomas files lawsuit against White Sox, Nike and Fanatics
          </div>
          <div style={{ fontFamily: "var(--dd-font-body, Georgia)", fontSize: 14, lineHeight: 1.4, color: "#323232", marginBottom: 8 }}>
            Thomas has had issues with the White Sox in the past, most recently over a social media graphic in February.
          </div>
          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "#52524F", display: "flex", alignItems: "center", gap: 8 }}>
            <span>Larry Holder</span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="9" height="9" viewBox="0 0 24 24"><path d="M0.319336 0.315796H22.6804V23.7609L16.214 17.3684H0.319336V0.315796Z" fill="#524F4F" /></svg>
              173
            </span>
          </div>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
            h4.Typography_h4 + p.Typography_body2.Content_ExcerptContent + p.Typography_utilitySansRegularSmall (byline)
          </div>
        </div>

        {/* Medium Card with Thumbnail */}
        <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 16 }}>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>Medium Card (side thumbnail)</div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 15, fontWeight: 500, lineHeight: 1.3, marginBottom: 8 }}>
                The 10 most important baseball cards of all time
              </div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "#52524F", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Benjamin Burrows</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24"><path d="M0.319336 0.315796H22.6804V23.7609L16.214 17.3684H0.319336V0.315796Z" fill="#524F4F" /></svg>
                  21
                </span>
              </div>
            </div>
            <div style={{ width: 80, height: 80, background: "#f0f0ee", borderRadius: 2, flexShrink: 0 }} />
          </div>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
            p.Typography_bodyMedium3 + thumbnail 1:1 aspect (maxImgWidthSide150) · LineClamp_LineClamp -webkit-line-clamp:3
          </div>
        </div>

        {/* Headline Text (no image) */}
        <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 16 }}>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>Headline Card (text only)</div>
          {["Doc Rivers on NBPA criticism", "Adam Silver praises Engelbert", "Pistons' Tom Gores among bidders"].map((title, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 0", borderBottom: i < 2 ? "1px solid #f0f0ee" : "none" }}>
              <svg width="16" height="16" viewBox="0 0 30 30" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <path fill="#e8e5e0" d="M13 13h4v4h-4z" />
              </svg>
              <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{title}</span>
            </div>
          ))}
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
            span.Typography_utilitySansMediumLarge + SVG square bullet (Styles_SquareBulletIcon: 20×20, path fill:#fff on dark bg)
          </div>
        </div>

        {/* Numbered Popular */}
        <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 16 }}>
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>Most Popular Card (numbered)</div>
          {[1, 2, 3].map((num) => (
            <div key={num} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: num < 3 ? "1px solid #f0f0ee" : "none" }}>
              <span style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 400, color: "#C4C4C0", minWidth: 24, textAlign: "center" as const }}>{num}</span>
              <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 15, fontWeight: 500, lineHeight: 1.3, flex: 1 }}>
                {num === 1 ? "Maryland coach went viral for yelling" : num === 2 ? "Ranking all 30 MLB lineups" : "UNC splits with Hubert Davis"}
              </span>
              <div style={{ width: 60, height: 40, background: "#f0f0ee", borderRadius: 2, flexShrink: 0 }} />
            </div>
          ))}
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
            h5.Typography_brand3 span (RegularSlabInline 32px, Gray40) + p.Typography_bodyMedium2 (18px) + thumbnail 2:3
          </div>
        </div>
      </div>

      {/* ── Connections: Sports Edition (Homepage Variant) ── */}
      <SectionLabel id="connections-homepage">Connections: Sports Edition (Homepage)</SectionLabel>
      <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 8 }}>
          Content_PuzzleModule &gt; Content_PuzzleContainer (differs from article PuzzleEntryPoint)
        </div>
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid #e8e5e0" }}>
          {/* Green icon container */}
          <div style={{ background: "#CFF08B", padding: 32, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 160 }}>
            <div style={{ width: 64, height: 64, background: "rgba(0,0,0,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 24 }}>🔗</span>
            </div>
          </div>
          {/* Info panel */}
          <div style={{ padding: "20px 24px", flex: 1 }}>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "#52524F", marginBottom: 4 }}>Mar 26, 2026</div>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 20, fontWeight: 700, color: "#121212", marginBottom: 4 }}>Connections: Sports Edition</div>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, color: "#52524F", marginBottom: 12 }}>Group sports terms that share a common thread. A new puzzle is available each day.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500, color: "#121212" }}>Play today&apos;s puzzle</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.8 12.08L8.87 8 4.8 3.92 6.05 2.67l5.33 5.33-5.33 5.33z" fill="#121212" /></svg>
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
          Icon container: Content_PuzzleIconContainer (bg: #CFF08B, filter:none) · Title: Content_PuzzleTitle · Subtitle: Content_PuzzleSubTitle · CTA: Content_PuzzleButton with chevron-right SVG · Note: homepage uses green bg + external icon PNG vs article uses PuzzleEntryPoint with base64 logo
        </div>
      </div>

      {/* ── Buttons Collection ── */}
      <SectionLabel id="buttons">Buttons</SectionLabel>
      <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          {/* Primary Dark */}
          <div style={{ textAlign: "center" }}>
            <button style={{ background: "#121212", color: "#fff", border: "none", borderRadius: 4, padding: "8px 20px", fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>International</button>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 4 }}>Button_DarkPrimaryDefault</div>
          </div>
          {/* Secondary Text */}
          <div style={{ textAlign: "center" }}>
            <button style={{ background: "transparent", color: "#121212", border: "none", padding: "8px 12px", fontFamily: "var(--dd-font-sans)", fontSize: 13, cursor: "pointer" }}>Stay on this edition</button>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 4 }}>RegionBanner_secondaryButton</div>
          </div>
          {/* Puzzle CTA */}
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
              <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 14, fontWeight: 500 }}>Play today&apos;s puzzle</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4.8 12.08L8.87 8 4.8 3.92 6.05 2.67l5.33 5.33-5.33 5.33z" fill="#121212" /></svg>
            </div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 4 }}>Content_PuzzleButton</div>
          </div>
          {/* See More */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>See More</div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 4 }}>Typography_utilitySansMediumSmall bold</div>
          </div>
          {/* Subscribe */}
          <div style={{ textAlign: "center" }}>
            <button style={{ background: "#F24A4A", color: "#fff", border: "none", borderRadius: 4, padding: "8px 20px", fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Subscribe Now</button>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 4 }}>Primary CTA (--primary-main)</div>
          </div>
        </div>
      </div>

      {/* ── Module Headers ── */}
      <SectionLabel id="module-headers">Module Headers</SectionLabel>
      <div style={{ background: "white", borderRadius: 8, border: "1px solid #e8e5e0", padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#969693", marginBottom: 12 }}>
          ModuleHeader_ModuleHeader &gt; h3.Typography_headlineRegularSlabExtraSmall
        </div>
        {/* Example module headers */}
        {[
          { icon: "⚾", title: "Baseball Is Back" },
          { icon: "🏈", title: "College Football Outlook" },
          { icon: "🏀", title: "Men's March Madness" },
          { icon: "🏀", title: "The Future of the NBA" },
        ].map((mod) => (
          <div key={mod.title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f0ee" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#f0f0ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              {mod.icon}
            </div>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 400 }}>{mod.title}</span>
          </div>
        ))}
        <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#969693", marginTop: 8 }}>
          CurationModuleTitle_TitleImgLogo (24×24 league icon) + Typography_headlineRegularSlabExtraSmall (RegularSlab font, ~16px) · Divider: hr.Divider_Horizontal (bg: var(--Gray30))
        </div>
      </div>
    </div>
  );
}

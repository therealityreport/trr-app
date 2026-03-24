"use client";

import { HUB } from "./game-palettes";

/* ------------------------------------------------------------------ */
/*  Hub Components — UI patterns from live nytimes.com/crosswords      */
/* ------------------------------------------------------------------ */

interface GameSectionProps {
  SectionLabel: React.ComponentType<{ children: React.ReactNode }>;
}

/* ── shared label style ────────────────────────────────────────────── */

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--dd-font-ui)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--dd-ink-black)",
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

/* ── A. Game Card Specimen ───────────────────────────────────────── */

const GAME_CARDS = [
  {
    name: "Spelling Bee",
    description: "How many words can you make with 7 letters?",
    coverBg: "#f7da21",
    coverIcon: "\u2B21",
    buttonText: "Play",
    isNew: false,
  },
  {
    name: "The Midi",
    description: "A new themed crossword, between the Mini and full-size.",
    coverBg: "#e8e8e8",
    coverIcon: "\u254B",
    buttonText: "Play",
    isNew: true,
  },
  {
    name: "Pips",
    description: "Place all tiles on the board.",
    coverBg: "#e3c3ff",
    coverIcon: "\u2680",
    buttonText: "Download app",
    isNew: true,
  },
];

function GameCardSpecimen() {
  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
      {GAME_CARDS.map((card) => (
        <div
          key={card.name}
          style={{
            width: 220,
            borderRadius: HUB.gameCard.borderRadius,
            border: HUB.gameCard.border,
            overflow: "hidden",
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          {/* hub-game-card__cover + hub-game-card__illustration */}
          <div
            style={{
              height: 140,
              background: card.coverBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 36,
                color: "rgba(0,0,0,0.25)",
                fontFamily: "var(--dd-font-ui)",
              }}
            >
              {card.coverIcon}
            </div>
            {/* Class annotation */}
            <div
              style={{
                position: "absolute",
                top: 4,
                left: 6,
                fontSize: 9,
                fontFamily: "var(--dd-font-mono)",
                color: "rgba(0,0,0,0.3)",
              }}
            >
              .hub-game-card__illustration
            </div>
          </div>

          {/* hub-game-card body */}
          <div style={{ padding: "14px 16px 16px" }}>
            {/* hub-game-card__name (h4) + optional PillGrey badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
              }}
            >
              <h4
                style={{
                  fontSize: HUB.fonts.gameTitleSize,
                  fontWeight: Number(HUB.fonts.gameTitleWeight),
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--dd-ink-black)",
                  margin: 0,
                  fontFamily: "var(--dd-font-ui)",
                }}
              >
                {card.name}
              </h4>
              {card.isNew && (
                <span
                  style={{
                    fontSize: HUB.pillBadge.fontSize,
                    fontWeight: HUB.pillBadge.fontWeight,
                    color: HUB.pillBadge.color,
                    background: HUB.pillBadge.bg,
                    borderRadius: HUB.pillBadge.borderRadius,
                    padding: HUB.pillBadge.padding,
                    lineHeight: 1,
                  }}
                >
                  New
                </span>
              )}
            </div>

            {/* hub-game-card__description */}
            <p
              style={{
                fontSize: HUB.fonts.descriptionSize,
                color: HUB.fonts.descriptionColor,
                margin: "0 0 14px",
                lineHeight: 1.4,
                fontFamily: "var(--dd-font-ui)",
              }}
            >
              {card.description}
            </p>

            {/* hub-game-card__button */}
            <button
              style={{
                borderRadius: HUB.button.borderRadius,
                border: HUB.button.border,
                background: "#fff",
                fontSize: HUB.button.fontSize,
                fontWeight: HUB.button.fontWeight,
                fontFamily: "var(--dd-font-ui)",
                padding: "8px 28px",
                cursor: "pointer",
                color: "var(--dd-ink-black)",
              }}
            >
              {card.buttonText}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── B. Progress Tracker Specimen ────────────────────────────────── */

interface DayCard {
  dayFull: string;
  dayAbbr: string;
  date: string;
  progress: 0 | 25 | 50 | 75 | 100;
}

const PROGRESS_DAYS: DayCard[] = [
  { dayFull: "Saturday", dayAbbr: "Sat", date: "Mar. 15", progress: 100 },
  { dayFull: "Sunday", dayAbbr: "Sun", date: "Mar. 16", progress: 100 },
  { dayFull: "Monday", dayAbbr: "Mon", date: "Mar. 17", progress: 75 },
  { dayFull: "Tuesday", dayAbbr: "Tue", date: "Mar. 18", progress: 50 },
  { dayFull: "Wednesday", dayAbbr: "Wed", date: "Mar. 19", progress: 25 },
  { dayFull: "Thursday", dayAbbr: "Thu", date: "Mar. 20", progress: 0 },
  { dayFull: "Friday", dayAbbr: "Fri", date: "Mar. 21", progress: 0 },
];

/** SVG-based progress circle matching puzzleProgress states */
function ProgressCircle({ pct, size = 34 }: { pct: 0 | 25 | 50 | 75 | 100; size?: number }) {
  const r = (size - 4) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (pct / 100) * circumference;
  // color mapping for progress states
  const fillColor =
    pct === 100
      ? "#daa520" // gold for complete
      : pct > 0
        ? "#000"
        : "transparent";
  const trackColor = "#d3d6da";
  const hasStar = pct === 100;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={2.5} />
      {/* Filled arc */}
      {pct > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth={2.5}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
      )}
      {/* Star icon for 100% */}
      {hasStar && (
        <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill="#daa520">
          &#9733;
        </text>
      )}
    </svg>
  );
}

function PuzzleDayCard({
  dayLabel,
  date,
  progress,
  showPrint,
}: {
  dayLabel: string;
  date: string;
  progress: 0 | 25 | 50 | 75 | 100;
  showPrint?: boolean;
}) {
  return (
    <div style={{ textAlign: "center", width: 56, flexShrink: 0 }}>
      {/* puzzleAction link area */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* puzzleInfoContent */}
        {/* h3.oneLiner — day name */}
        <h3
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--dd-ink-soft)",
            margin: "0 0 4px",
            fontFamily: "var(--dd-font-ui)",
            textTransform: "uppercase",
          }}
        >
          {dayLabel}
        </h3>

        {/* progressIcon + progressIconContent */}
        <div style={{ position: "relative", marginBottom: 2 }}>
          <ProgressCircle pct={progress} />
          {/* cardRibbon "Play" badge */}
          {progress < 100 && (
            <div
              style={{
                position: "absolute",
                bottom: -3,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: 8,
                fontWeight: 700,
                fontFamily: "var(--dd-font-ui)",
                color: "#fff",
                background: "#000",
                borderRadius: 3,
                padding: "1px 5px",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Play
            </div>
          )}
        </div>

        {/* date */}
        <div
          style={{
            fontSize: 10,
            color: "var(--dd-ink-light)",
            marginTop: 4,
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          {date}
        </div>

        {/* printTool — PDF link icon */}
        {showPrint && (
          <div
            style={{
              marginTop: 3,
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              cursor: "pointer",
            }}
            title="Print puzzle (PDF)"
          >
            &#x1F5B6;
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressTrackerSpecimen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Progress Icon States (specimen palette) ──────────────── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--dd-font-ui)",
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Progress Icon States
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            padding: "12px 16px",
            background: "var(--dd-paper-cool)",
            borderRadius: 6,
          }}
        >
          {([0, 25, 50, 75, 100] as const).map((pct) => (
            <div key={pct} style={{ textAlign: "center" }}>
              <ProgressCircle pct={pct} size={40} />
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--dd-font-mono)",
                  color: "var(--dd-ink-light)",
                  marginTop: 4,
                }}
              >
                {pct}%
              </div>
              <div
                style={{
                  fontSize: 8,
                  fontFamily: "var(--dd-font-mono)",
                  color: "var(--dd-ink-faint)",
                }}
              >
                puzzleProgress{pct}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile Accordion Version ─────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--dd-font-ui)",
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Mobile: progress__mobileOnly (accordion)
        </div>
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: 8,
            overflow: "hidden",
            fontFamily: "var(--dd-font-ui)",
            maxWidth: 380,
          }}
        >
          {/* accordion__drawer.isOpen — "Last 7 Days" */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid var(--dd-ink-faint)",
                cursor: "pointer",
              }}
            >
              <h6
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--dd-font-ui)",
                  color: "var(--dd-ink-black)",
                }}
              >
                Last 7 Days
              </h6>
              <span style={{ fontSize: 12, color: "var(--dd-ink-light)" }}>&#9650;</span>
            </div>
            {/* progress__accordionContent (min-height: 162px) */}
            <div
              style={{
                minHeight: 162,
                padding: "12px 8px",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "flex-start",
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
            >
              {PROGRESS_DAYS.map((day) => (
                <PuzzleDayCard
                  key={day.dayFull}
                  dayLabel={day.dayFull}
                  date={day.date}
                  progress={day.progress}
                  showPrint
                />
              ))}
            </div>
          </div>

          {/* accordion__drawer.isClosed — "In Progress" */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderTop: "1px solid var(--dd-ink-faint)",
              cursor: "pointer",
            }}
          >
            <h6
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 400,
                fontFamily: "var(--dd-font-ui)",
                color: "var(--dd-ink-soft)",
              }}
            >
              In Progress
            </h6>
            <span style={{ fontSize: 12, color: "var(--dd-ink-light)" }}>&#9660;</span>
          </div>
        </div>
      </div>

      {/* ── Desktop Tab Version ──────────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--dd-font-ui)",
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Desktop: progress__tabGroup
        </div>
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: 8,
            overflow: "hidden",
            fontFamily: "var(--dd-font-ui)",
            maxWidth: 520,
          }}
        >
          {/* tab__tabNav → tab__tabNavItems */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--dd-ink-faint)",
            }}
          >
            {/* tab__tab (50%) — "Last 7 Days" (active) */}
            <div
              style={{
                width: "50%",
                textAlign: "center",
                padding: "12px 0",
                fontFamily: "var(--dd-font-ui)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                borderBottom: "2px solid var(--dd-ink-black)",
                cursor: "pointer",
              }}
            >
              Last 7 Days
            </div>
            {/* tab__tab (50%) — "In Progress" (inactive) */}
            <div
              style={{
                width: "50%",
                textAlign: "center",
                padding: "12px 0",
                fontFamily: "var(--dd-font-ui)",
                fontSize: 14,
                fontWeight: 400,
                color: "var(--dd-ink-light)",
                borderBottom: "2px solid transparent",
                cursor: "pointer",
              }}
            >
              In Progress
            </div>
          </div>

          {/* tab_tabBody → expandToRow (min-height: 162px) */}
          <div
            style={{
              minHeight: 162,
              padding: "14px 16px 8px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {PROGRESS_DAYS.map((day) => (
              <PuzzleDayCard
                key={day.dayAbbr}
                dayLabel={day.dayAbbr}
                date={day.date}
                progress={day.progress}
              />
            ))}
          </div>

          {/* Desktop-only: "PLAY MORE FROM THE ARCHIVE" link */}
          <div
            style={{
              padding: "0 16px 14px",
              textAlign: "center",
            }}
          >
            <a
              href="#"
              style={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "var(--dd-font-ui)",
                color: "var(--dd-ink-black)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                textDecoration: "underline",
              }}
            >
              Play more from the archive
            </a>
          </div>
        </div>
      </div>

      {/* ── "In Progress" Empty State ────────────────────────────── */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "var(--dd-font-ui)",
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          &ldquo;In Progress&rdquo; Empty State (progress__noProgress)
        </div>
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: 8,
            padding: "24px 20px",
            fontFamily: "var(--dd-font-ui)",
            maxWidth: 520,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "var(--dd-ink-soft)",
              margin: "0 0 12px",
              lineHeight: 1.5,
            }}
          >
            Choose from over 20 years of the puzzles in our archive.
          </p>
          <a
            href="#"
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--dd-font-ui)",
              color: "var(--dd-ink-black)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              textDecoration: "underline",
            }}
          >
            Play more from the archive
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── C. Featured Article Promo ───────────────────────────────────── */

function FeaturedArticleSpecimen() {
  return (
    <div
      style={{
        border: "1px solid var(--dd-ink-faint)",
        borderRadius: 8,
        overflow: "hidden",
        fontFamily: "var(--dd-font-ui)",
        maxWidth: 380,
      }}
    >
      {/* Illustration placeholder */}
      <div
        style={{
          height: 120,
          background: "var(--dd-paper-warm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--dd-ink-light)",
          fontSize: 12,
          fontFamily: "var(--dd-font-mono)",
        }}
      >
        [illustration placeholder]
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <h4
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 22,
            fontWeight: 500,
            margin: "0 0 6px",
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
          }}
        >
          How to Solve the NYT Crossword
        </h4>
        <p
          style={{
            fontSize: 12,
            color: "var(--dd-ink-light)",
            margin: "0 0 10px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          A Guide by DEB AMLEN
        </p>
        <a
          href="#"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            textDecoration: "underline",
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          Read More
        </a>
      </div>
    </div>
  );
}

/* ── D. Navigation Menu Specimen ─────────────────────────────────── */

const NAV_SECTIONS = {
  games: [
    { name: "Wordle", icon: "\u25A6", isNew: false },
    { name: "The Crossword", icon: "\u254B", isNew: false },
    { name: "The Mini", icon: "\u25A3", isNew: false },
    { name: "The Midi", icon: "\u25A7", isNew: true },
    { name: "Connections", icon: "\u25C8", isNew: false },
    { name: "Crossplay", icon: "\u25CE", isNew: true },
    { name: "Spelling Bee", icon: "\u2B21", isNew: false },
    { name: "Strands", icon: "\u29EA", isNew: false },
    { name: "Letter Boxed", icon: "\u25FB", isNew: false },
    { name: "Tiles", icon: "\u25A8", isNew: false },
    { name: "Sudoku", icon: "\u25A9", isNew: false },
    { name: "Vertex", icon: "\u2B23", isNew: false },
    { name: "Pips", icon: "\u2680", isNew: false },
    { name: "Flashback", icon: "\u29D7", isNew: false },
  ],
  crossLinks: [
    { name: "The Athletic", icon: "\u26BD" },
    { name: "Cooking", icon: "\u{1F373}" },
    { name: "Wirecutter", icon: "\u2702" },
  ],
};

function NavigationMenuSpecimen() {
  return (
    <div
      style={{
        border: "1px solid var(--dd-ink-faint)",
        borderRadius: 8,
        fontFamily: "var(--dd-font-ui)",
        maxWidth: 280,
        overflow: "hidden",
      }}
    >
      {/* Header: "Games" with collapsible arrow */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid var(--dd-ink-faint)",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--dd-ink-black)" }}>
          Games
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--dd-ink-light)",
            cursor: "pointer",
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          pz-icon-arrow-down &#9660;
        </span>
      </div>

      {/* Game links — pz-icon system */}
      <div style={{ padding: "4px 0" }}>
        {NAV_SECTIONS.games.map((game) => (
          <div
            key={game.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 16px",
              cursor: "pointer",
            }}
          >
            {/* pz-icon (background-image SVG placeholder) */}
            <span
              style={{
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                color: "var(--dd-ink-soft)",
                flexShrink: 0,
              }}
            >
              {game.icon}
            </span>
            <span style={{ fontSize: 13, color: "var(--dd-ink-black)", flex: 1 }}>
              {game.name}
            </span>
            {game.isNew && (
              <span
                style={{
                  fontSize: HUB.pillBadge.fontSize,
                  fontWeight: HUB.pillBadge.fontWeight,
                  color: HUB.pillBadge.color,
                  background: HUB.pillBadge.bg,
                  borderRadius: HUB.pillBadge.borderRadius,
                  padding: "3px 6px",
                  lineHeight: 1,
                }}
              >
                NEW
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--dd-ink-faint)", margin: "4px 16px" }} />

      {/* Sub-menus — collapsible sections with pz-icon-arrow-down toggle */}
      {["Crosswords", "Statistics", "Leaderboards"].map((section) => (
        <div
          key={section}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--dd-ink-black)" }}>
            {section}
          </span>
          <span style={{ fontSize: 10, color: "var(--dd-ink-light)" }}>&#9660;</span>
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--dd-ink-faint)", margin: "4px 16px" }} />

      {/* Cross-links — Athletic, Cooking, Wirecutter */}
      {NAV_SECTIONS.crossLinks.map((link) => (
        <div
          key={link.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              color: "var(--dd-ink-soft)",
              flexShrink: 0,
            }}
          >
            {link.icon}
          </span>
          <span style={{ fontSize: 13, color: "var(--dd-ink-black)" }}>{link.name}</span>
        </div>
      ))}

      {/* +Expand All toggle */}
      <div
        style={{
          padding: "10px 16px",
          borderTop: "1px solid var(--dd-ink-faint)",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--dd-ink-light)",
            cursor: "pointer",
            fontFamily: "var(--dd-font-ui)",
          }}
        >
          + Expand All
        </span>
      </div>
    </div>
  );
}

/* ── E. Footer Specimen ──────────────────────────────────────────── */

const FOOTER_STRUCTURE = {
  about: {
    heading: "About New York Times Games",
    description:
      "Since 1942, The New York Times Crossword has been a beloved part of The Times. Our mission is to engage and delight solvers of all skill levels with puzzles, word games, and logic challenges.",
  },
  gamesCol: {
    heading: "New York Times Games",
    items: [
      "Wordle",
      "The Crossword",
      "The Mini",
      "The Midi",
      "Connections",
      "Spelling Bee",
      "Strands",
      "Letter Boxed",
      "Tiles",
      "Sudoku",
      "Vertex",
      "Crossplay",
      "Pips",
      "Flashback",
    ],
  },
  crosswordsCol: {
    heading: "Crosswords",
    items: ["Archive", "Statistics", "Leaderboards", "Submit a Crossword"],
  },
  communityCol: {
    heading: "Community",
    items: ["Gameplay Stories", "Spelling Bee Forum", "Games Threads"],
  },
  learnMoreCol: {
    heading: "Learn More",
    items: ["FAQs", "Gift Subscriptions", "Shop", "Download App"],
  },
};

function FooterSpecimen() {
  return (
    <div
      style={{
        background: HUB.footer.bg,
        padding: "28px 24px 16px",
        borderRadius: 8,
        fontFamily: "var(--dd-font-ui)",
      }}
    >
      {/* 4-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 24 }}>
        {/* Column 1: About + description */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {FOOTER_STRUCTURE.about.heading}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--dd-ink-soft)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {FOOTER_STRUCTURE.about.description}
          </p>
        </div>

        {/* Column 2: Crosswords */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {FOOTER_STRUCTURE.crosswordsCol.heading}
          </div>
          {FOOTER_STRUCTURE.crosswordsCol.items.map((item) => (
            <div key={item} style={{ fontSize: 13, color: "var(--dd-ink-black)", marginBottom: 6, cursor: "pointer" }}>
              {item}
            </div>
          ))}
        </div>

        {/* Column 3: Community */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {FOOTER_STRUCTURE.communityCol.heading}
          </div>
          {FOOTER_STRUCTURE.communityCol.items.map((item) => (
            <div key={item} style={{ fontSize: 13, color: "var(--dd-ink-black)", marginBottom: 6, cursor: "pointer" }}>
              {item}
            </div>
          ))}
        </div>

        {/* Column 4: Learn More */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {FOOTER_STRUCTURE.learnMoreCol.heading}
          </div>
          {FOOTER_STRUCTURE.learnMoreCol.items.map((item) => (
            <div key={item} style={{ fontSize: 13, color: "var(--dd-ink-black)", marginBottom: 6, cursor: "pointer" }}>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Games list — compact row */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: "1px solid var(--dd-ink-faint)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
          }}
        >
          {FOOTER_STRUCTURE.gamesCol.heading}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
          {FOOTER_STRUCTURE.gamesCol.items.map((item) => (
            <span key={item} style={{ fontSize: 12, color: "var(--dd-ink-black)", cursor: "pointer" }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom copyright bar */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: "1px solid var(--dd-ink-faint)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          fontFamily: "var(--dd-font-ui)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>&copy; 2026 The New York Times Company</span>
        <span style={{ display: "flex", gap: 16 }}>
          <span style={{ cursor: "pointer" }}>Terms of Service</span>
          <span style={{ cursor: "pointer" }}>Privacy Policy</span>
        </span>
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────────────────────── */

export default function HubComponents({ SectionLabel }: GameSectionProps) {
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionLabel>Hub Page Components</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 24px",
        }}
      >
        UI patterns from the live nytimes.com/crosswords hub page. CSS-only visual mockups
        showing actual HTML class structures.
      </p>

      {/* A — Game Card */}
      <h4 style={sectionHeadingStyle}>A. Game Card Specimen (hub-game-card)</h4>
      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          margin: "-6px 0 12px",
        }}
      >
        .hub-game-card &gt; .hub-game-card__cover &gt; .hub-game-card__illustration |
        .hub-game-card__name (h4) | .hub-game-card__description | .hub-game-card__button |
        PillGrey badge
      </p>
      <div style={{ marginBottom: 32 }}>
        <GameCardSpecimen />
      </div>

      {/* B — Progress Tracker */}
      <h4 style={sectionHeadingStyle}>
        B. Progress Tracker (progress__recentlyTabbedModule)
      </h4>
      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          margin: "-6px 0 12px",
        }}
      >
        Mobile: accordion__drawer (isOpen / isClosed) | Desktop: tab__tabGroup &gt;
        tab__tabNav + tab_tabBody | Puzzle cards: puzzleAction &gt; puzzleInfoContent &gt;
        progressIcon (puzzleProgress0..100) + cardRibbon
      </p>
      <div style={{ marginBottom: 32 }}>
        <ProgressTrackerSpecimen />
      </div>

      {/* C — Featured Article */}
      <h4 style={sectionHeadingStyle}>C. Featured Article Promo</h4>
      <div style={{ marginBottom: 32 }}>
        <FeaturedArticleSpecimen />
      </div>

      {/* D — Navigation Menu */}
      <h4 style={sectionHeadingStyle}>D. Navigation Menu (pz-icon system)</h4>
      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          margin: "-6px 0 12px",
        }}
      >
        pz-icon (background-image SVGs) | pz-icon-arrow-down toggles | PillGrey
        &ldquo;NEW&rdquo; badges | Cross-links: Athletic, Cooking, Wirecutter | +Expand All
        toggle
      </p>
      <div style={{ marginBottom: 32 }}>
        <NavigationMenuSpecimen />
      </div>

      {/* E — Footer */}
      <h4 style={sectionHeadingStyle}>E. Footer Specimen (4-column)</h4>
      <p
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-light)",
          margin: "-6px 0 12px",
        }}
      >
        About | Crosswords (Archive, Statistics, Leaderboards, Submit) | Community
        (Gameplay Stories, Forums) | Learn More (FAQs, Gift Subs, Shop, App) | Copyright bar
      </p>
      <div style={{ marginBottom: 16 }}>
        <FooterSpecimen />
      </div>
    </section>
  );
}

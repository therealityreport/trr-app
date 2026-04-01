"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import {
  DESIGN_DOC_SECTIONS,
  DESIGN_DOC_GROUPS,
  ARTICLES,
  getArticleSubLinks,
  getBrandSubSections,
  isBrandSection,
} from "@/lib/admin/design-docs-config";
import type { DesignDocSectionId } from "@/lib/admin/design-docs-config";

/* ═══════════════════════════════════════════════════════════════════════
   NYT "When to Vote in Your State" — Full-page article reproduction
   ═══════════════════════════════════════════════════════════════════════ */

/* ── NYT Design Tokens ───────────────────────────────────────────────── */
const T = {
  chelt: '"nyt-cheltenham", georgia, "times new roman", times, serif',
  franklin: '"nyt-franklin", arial, helvetica, sans-serif',
  imperial: '"nyt-imperial", georgia, "times new roman", times, serif',
  colorCopy: "#121212",
  bylineBlack: "#363636",
  colorAnchor: "#326891",
  widthBody: 600,
  bodyFontSize: "1.25rem",
  bodyLineHeight: 1.5,
  marginLeft: 20,
  marginRight: 20,
  headerMax: 800,
  early: "#bceb82",
  mail: "#bfa0f7",
  request: "#f7a0e1",
  register: "#f6cc79",
  today: "#cfcfcf",
  electionGradient: "linear-gradient(to left, #f4564a, #2b87d8)",
} as const;

/* ── State deadline data ─────────────────────────────────────────────── */
interface StateDeadlines {
  label: string;
  abbr: string;
  calendarOct: CalendarMark[];
  calendarNov: CalendarMark[];
  octStart: number; // grid-column-start for day 1
  novStart: number;
  register: { date: string; description: string; note?: string };
  mail: { requestBy: string; postmarkBy: string; description: string };
  earlyVoting: { first: string; last: string; description: string };
  electionDay: { date: string; description: string };
}

interface CalendarMark {
  day: number;
  types: Array<"register" | "request" | "mail" | "early_voting" | "election_day">;
}

const NY_DATA: StateDeadlines = {
  label: "New York",
  abbr: "NY",
  calendarOct: [{ day: 26, types: ["register", "request"] }],
  calendarNov: [
    { day: 3, types: ["early_voting"] },
    { day: 5, types: ["election_day", "mail"] },
  ],
  octStart: 3,
  novStart: 6,
  register: {
    date: "Saturday, Oct. 26",
    description: "Last day for voter registration in person or online, and deadline for registration by mail to be received",
    note: "Voters may register and cast a ballot at the same time on Oct. 26 only.",
  },
  mail: {
    requestBy: "Saturday, Oct. 26",
    postmarkBy: "Tuesday, Nov. 5",
    description: "Deadline for mail ballots to be postmarked",
  },
  earlyVoting: {
    first: "Saturday, Oct. 26",
    last: "Sunday, Nov. 3",
    description: "",
  },
  electionDay: {
    date: "Tuesday, Nov. 5",
    description: "Visit New York\u2019s election site to learn more.",
  },
};

const FL_DATA: StateDeadlines = {
  label: "Florida",
  abbr: "FL",
  calendarOct: [
    { day: 7, types: ["register"] },
    { day: 24, types: ["request"] },
    { day: 26, types: ["early_voting"] },
  ],
  calendarNov: [
    { day: 2, types: ["early_voting"] },
    { day: 5, types: ["election_day", "mail"] },
  ],
  octStart: 3,
  novStart: 6,
  register: {
    date: "Monday, Oct. 7",
    description: "Last day for voter registration in person or online, and deadline for registration by mail to be postmarked",
  },
  mail: {
    requestBy: "Thursday, Oct. 24",
    postmarkBy: "Tuesday, Nov. 5",
    description: "Deadline for mail ballots to be received by mail",
  },
  earlyVoting: {
    first: "Saturday, Oct. 26",
    last: "Saturday, Nov. 2",
    description: "",
  },
  electionDay: {
    date: "Tuesday, Nov. 5",
    description: "Visit Florida\u2019s election site to learn more.",
  },
};

const CA_DATA: StateDeadlines = {
  label: "California",
  abbr: "CA",
  calendarOct: [
    { day: 7, types: ["early_voting"] },
    { day: 21, types: ["register"] },
    { day: 29, types: ["request"] },
  ],
  calendarNov: [
    { day: 5, types: ["election_day", "mail", "early_voting"] },
    { day: 12, types: ["mail"] },
  ],
  octStart: 3,
  novStart: 6,
  register: {
    date: "Monday, Oct. 21",
    description: "Last day for voter registration online, and deadline for registration by mail to be postmarked",
    note: "Voters may register and cast a ballot at the same time during early voting and on Election Day.",
  },
  mail: {
    requestBy: "Tuesday, Oct. 29",
    postmarkBy: "Tuesday, Nov. 5",
    description: "Deadline for mail ballots to be received by Nov. 12",
  },
  earlyVoting: {
    first: "Monday, Oct. 7",
    last: "Tuesday, Nov. 5",
    description: "",
  },
  electionDay: {
    date: "Tuesday, Nov. 5",
    description: "Visit California\u2019s election site to learn more.",
  },
};

const TX_DATA: StateDeadlines = {
  label: "Texas",
  abbr: "TX",
  calendarOct: [
    { day: 7, types: ["register"] },
    { day: 21, types: ["early_voting"] },
    { day: 25, types: ["request"] },
  ],
  calendarNov: [
    { day: 1, types: ["early_voting"] },
    { day: 5, types: ["election_day", "mail"] },
  ],
  octStart: 3,
  novStart: 6,
  register: {
    date: "Monday, Oct. 7",
    description: "Last day for voter registration, and deadline for registration by mail to be postmarked",
  },
  mail: {
    requestBy: "Friday, Oct. 25",
    postmarkBy: "Tuesday, Nov. 5",
    description: "Deadline for mail ballots to be received by Nov. 6 at 7 p.m.",
  },
  earlyVoting: {
    first: "Monday, Oct. 21",
    last: "Friday, Nov. 1",
    description: "",
  },
  electionDay: {
    date: "Tuesday, Nov. 5",
    description: "Visit Texas\u2019s election site to learn more.",
  },
};

const OH_DATA: StateDeadlines = {
  label: "Ohio",
  abbr: "OH",
  calendarOct: [
    { day: 7, types: ["register"] },
    { day: 8, types: ["early_voting"] },
    { day: 29, types: ["request"] },
  ],
  calendarNov: [
    { day: 4, types: ["early_voting", "mail"] },
    { day: 5, types: ["election_day"] },
    { day: 9, types: ["mail"] },
  ],
  octStart: 3,
  novStart: 6,
  register: {
    date: "Monday, Oct. 7",
    description: "Last day for voter registration in person or online, and deadline for registration by mail to be postmarked",
  },
  mail: {
    requestBy: "Tuesday, Oct. 29",
    postmarkBy: "Monday, Nov. 4",
    description: "Deadline for mail ballots to be received by Nov. 9",
  },
  earlyVoting: {
    first: "Tuesday, Oct. 8",
    last: "Monday, Nov. 4",
    description: "",
  },
  electionDay: {
    date: "Tuesday, Nov. 5",
    description: "Visit Ohio\u2019s election site to learn more.",
  },
};

/** Map state name → data for states with full data */
const STATE_DATA_MAP: Record<string, StateDeadlines> = {
  "New York": NY_DATA,
  "Florida": FL_DATA,
  "California": CA_DATA,
  "Texas": TX_DATA,
  "Ohio": OH_DATA,
};

const STATES: { label: string; abbr: string }[] = [
  { label: "Alabama", abbr: "AL" },
  { label: "Alaska", abbr: "AK" },
  { label: "Arizona", abbr: "AZ" },
  { label: "Arkansas", abbr: "AR" },
  { label: "California", abbr: "CA" },
  { label: "Colorado", abbr: "CO" },
  { label: "Connecticut", abbr: "CT" },
  { label: "Delaware", abbr: "DE" },
  { label: "District of Columbia", abbr: "DC" },
  { label: "Florida", abbr: "FL" },
  { label: "Georgia", abbr: "GA" },
  { label: "Hawaii", abbr: "HI" },
  { label: "Idaho", abbr: "ID" },
  { label: "Illinois", abbr: "IL" },
  { label: "Indiana", abbr: "IN" },
  { label: "Iowa", abbr: "IA" },
  { label: "Kansas", abbr: "KS" },
  { label: "Kentucky", abbr: "KY" },
  { label: "Louisiana", abbr: "LA" },
  { label: "Maine", abbr: "ME" },
  { label: "Maryland", abbr: "MD" },
  { label: "Massachusetts", abbr: "MA" },
  { label: "Michigan", abbr: "MI" },
  { label: "Minnesota", abbr: "MN" },
  { label: "Mississippi", abbr: "MS" },
  { label: "Missouri", abbr: "MO" },
  { label: "Montana", abbr: "MT" },
  { label: "Nebraska", abbr: "NE" },
  { label: "Nevada", abbr: "NV" },
  { label: "New Hampshire", abbr: "NH" },
  { label: "New Jersey", abbr: "NJ" },
  { label: "New Mexico", abbr: "NM" },
  { label: "New York", abbr: "NY" },
  { label: "North Carolina", abbr: "NC" },
  { label: "North Dakota", abbr: "ND" },
  { label: "Ohio", abbr: "OH" },
  { label: "Oklahoma", abbr: "OK" },
  { label: "Oregon", abbr: "OR" },
  { label: "Pennsylvania", abbr: "PA" },
  { label: "Rhode Island", abbr: "RI" },
  { label: "South Carolina", abbr: "SC" },
  { label: "South Dakota", abbr: "SD" },
  { label: "Tennessee", abbr: "TN" },
  { label: "Texas", abbr: "TX" },
  { label: "Utah", abbr: "UT" },
  { label: "Vermont", abbr: "VT" },
  { label: "Virginia", abbr: "VA" },
  { label: "Washington", abbr: "WA" },
  { label: "West Virginia", abbr: "WV" },
  { label: "Wisconsin", abbr: "WI" },
  { label: "Wyoming", abbr: "WY" },
];

/* ── Headline animation hook ─────────────────────────────────────────── */
const HEADLINE_PHRASES = ["Register to Vote", "Vote Early", "Vote by Mail"];

function useAnimatedPhrase(interval = 3000) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % HEADLINE_PHRASES.length), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return HEADLINE_PHRASES[idx];
}

/* ── Calendar helpers ────────────────────────────────────────────────── */
const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getCellColor(types: string[]): string {
  if (types.includes("election_day")) return "transparent";
  if (types.includes("early_voting")) return T.early;
  if (types.includes("mail")) return T.mail;
  if (types.includes("request")) return T.request;
  if (types.includes("register")) return T.register;
  return "transparent";
}

function getCellBorder(types: string[]): string | undefined {
  if (types.includes("election_day")) return "2px solid transparent";
  return undefined;
}

function getCellBackground(types: string[]): string | undefined {
  if (types.includes("election_day")) {
    return T.electionGradient;
  }
  return undefined;
}

/* ── Overlay Menu — Design Docs Navigation ──────────────────────────── */
function NYTOverlayMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const articleSubLinks = getArticleSubLinks();

  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkStyle: React.CSSProperties = {
    display: "block",
    padding: "7px 0",
    fontSize: 14,
    fontWeight: 500,
    color: "#363636",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: T.franklin,
  };

  const subLinkStyle: React.CSSProperties = {
    ...linkStyle,
    fontSize: 13,
    fontWeight: 400,
    paddingLeft: 16,
    color: "#727272",
  };

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#727272",
    marginBottom: 10,
    marginTop: 4,
    fontFamily: T.franklin,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(0,0,0,0.3)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />
      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: 320,
          zIndex: 9999,
          background: "#fff",
          borderRight: "1px solid #e2e2e2",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.3s ease",
          overflowY: "auto",
          boxShadow: open ? "4px 0 16px rgba(0,0,0,0.08)" : "none",
          fontFamily: T.franklin,
        }}
      >
        {/* Close button */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 16px 0" }}>
          <button
            onClick={onClose}
            aria-label="Close menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              fontSize: 24,
              lineHeight: 1,
              color: "#727272",
            }}
          >
            &times;
          </button>
        </div>

        {/* Design Docs navigation */}
        <nav style={{ padding: "8px 24px 32px" }}>
          {DESIGN_DOC_GROUPS.map((group) => (
            <div
              key={group.label}
              style={{
                borderBottom: "1px solid #e2e2e2",
                paddingBottom: 14,
                marginBottom: 14,
              }}
            >
              <div style={sectionHeaderStyle}>{group.label}</div>
              {group.sectionIds.map((sectionId) => {
                const section = DESIGN_DOC_SECTIONS.find((s) => s.id === sectionId);
                if (!section) return null;
                const isBrand = isBrandSection(sectionId);
                const isExpanded = expandedBrand === sectionId;

                if (isBrand) {
                  const subSections = getBrandSubSections(sectionId);
                  return (
                    <div key={sectionId}>
                      <div
                        style={{
                          ...linkStyle,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onClick={() => setExpandedBrand(isExpanded ? null : sectionId)}
                      >
                        <span>{section.label}</span>
                        <span style={{ fontSize: 10, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}>
                          &#9654;
                        </span>
                      </div>
                      {isExpanded && (
                        <div style={{ marginLeft: 8, borderLeft: "1px solid #e2e2e2", paddingLeft: 8 }}>
                          <Link href={buildDesignDocsPath(sectionId)} style={subLinkStyle} onClick={onClose}>
                            Overview
                          </Link>
                          {subSections.map((sub) => (
                            <Link
                              key={sub.anchor}
                              href={sub.href || buildDesignDocsPath(`${sectionId}#${sub.anchor}`)}
                              style={subLinkStyle}
                              onClick={onClose}
                            >
                              {sub.label}
                            </Link>
                          ))}
                          {/* Article sub-links under Pages for NYT brand */}
                          {sectionId === "brand-nyt" && (
                            <div style={{ marginTop: 4 }}>
                              <div style={{ ...sectionHeaderStyle, fontSize: 10, marginBottom: 6, paddingLeft: 16 }}>
                                Article Pages
                              </div>
                              {articleSubLinks.map((link) => (
                                <Link
                                  key={link.slug}
                                  href={buildDesignDocsPath(`nyt-articles/${link.slug}`)}
                                  style={{
                                    ...subLinkStyle,
                                    paddingLeft: 24,
                                    fontSize: 12,
                                    color: link.slug === "voting-deadlines-state" ? "#121212" : "#727272",
                                    fontWeight: link.slug === "voting-deadlines-state" ? 600 : 400,
                                  }}
                                  onClick={onClose}
                                >
                                  {link.label.length > 40 ? link.label.slice(0, 40) + "..." : link.label}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={sectionId}
                    href={buildDesignDocsPath(sectionId)}
                    style={linkStyle}
                    onClick={onClose}
                  >
                    {section.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}

/* ── Calendar Grid Component ─────────────────────────────────────────── */
function CalendarMonth({
  monthName,
  year,
  monthIndex,
  startCol,
  marks,
}: {
  monthName: string;
  year: number;
  monthIndex: number;
  startCol: number;
  marks: CalendarMark[];
}) {
  const total = daysInMonth(monthIndex, year);
  const markMap = new Map<number, string[]>();
  for (const m of marks) {
    markMap.set(m.day, m.types);
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: T.chelt,
          fontWeight: 700,
          fontSize: 16,
          color: T.colorCopy,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {monthName}
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
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: T.franklin,
              color: "#999",
              textTransform: "uppercase",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
        }}
      >
        {Array.from({ length: total }, (_, i) => {
          const day = i + 1;
          const types = markMap.get(day) || [];
          const isElection = types.includes("election_day");
          const hasColor = types.length > 0 && !isElection;
          const bgColor = hasColor ? getCellColor(types) : "transparent";

          // Multicolor for cells with register + request
          const hasMultiple = types.length > 1 && !isElection;
          let background: string;
          if (isElection && types.includes("mail")) {
            // Election day with mail — gradient border + purple center
            background = T.mail;
          } else if (isElection) {
            background = "transparent";
          } else if (hasMultiple && types.includes("register") && types.includes("request")) {
            // Diagonal split
            background = `linear-gradient(135deg, ${T.register} 50%, ${T.request} 50%)`;
          } else {
            background = bgColor;
          }

          return (
            <div
              key={day}
              style={{
                gridColumnStart: day === 1 ? startCol : undefined,
                textAlign: "center",
                fontSize: 14,
                fontWeight: 400,
                fontFamily: T.franklin,
                color: "#444",
                padding: "6px 2px",
                borderRadius: 4,
                position: "relative",
                background,
                ...(isElection
                  ? {
                      border: "3px solid transparent",
                      backgroundImage: `${types.includes("mail") ? `linear-gradient(${T.mail}, ${T.mail})` : "linear-gradient(#fff, #fff)"}, ${T.electionGradient}`,
                      backgroundOrigin: "border-box",
                      backgroundClip: "padding-box, border-box",
                    }
                  : {}),
              }}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Calendar Key ────────────────────────────────────────────────────── */
function CalendarKey() {
  const items: { label: string; color: string; gradient?: boolean }[] = [
    { label: "Register", color: T.register },
    { label: "Request", color: T.request },
    { label: "Mail", color: T.mail },
    { label: "Early", color: T.early },
    { label: "Election Day", color: "", gradient: true },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px 20px",
        justifyContent: "center",
        marginTop: 16,
        marginBottom: 24,
      }}
    >
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: it.gradient ? "transparent" : it.color,
              border: it.gradient ? "2px solid transparent" : "none",
              ...(it.gradient
                ? {
                    backgroundImage: `linear-gradient(#fff, #fff), ${T.electionGradient}`,
                    backgroundOrigin: "border-box",
                    backgroundClip: "padding-box, border-box",
                  }
                : {}),
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: T.franklin,
              textTransform: "uppercase",
              color: T.colorCopy,
            }}
          >
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Deadline Section Component ──────────────────────────────────────── */
function DeadlineSection({
  emoji,
  title,
  children,
  isLast = false,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        display: "block",
        position: "relative",
        paddingBottom: isLast ? 0 : 20,
        marginBottom: isLast ? 0 : 20,
        borderBottom: isLast ? "none" : "1px solid #dedede",
      }}
    >
      <h3
        style={{
          fontFamily: T.franklin,
          fontWeight: 500,
          fontSize: 13,
          margin: "8px 0 8px 0",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#545454",
          display: "flex",
          alignItems: "center",
        }}
      >
        <span style={{ width: 20, height: 20, display: "inline-block", position: "relative", marginRight: 6, marginBottom: -1.5, fontSize: 20 }}>
          {emoji}
        </span>
        {title}
      </h3>
      <div style={{ marginLeft: 26 }}>{children}</div>
    </div>
  );
}

/* ── Share toolbar ───────────────────────────────────────────────────── */
function ShareToolbar() {
  const btnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 8px",
    border: "1px solid #e2e2e2",
    borderRadius: 4,
    background: "transparent",
    cursor: "pointer",
    fontFamily: T.franklin,
    fontSize: 12,
    fontWeight: 500,
    textTransform: "uppercase",
    color: T.colorCopy,
    letterSpacing: "0.02em",
  };
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, marginBottom: 24 }}>
      <button style={btnStyle} title="Gift this article">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="7" width="14" height="8" rx="1" />
          <path d="M8 7v8M1 10h14M4 7c0-2 1-3 4-3s4 1 4 3" />
        </svg>
        Gift
      </button>
      <button style={btnStyle} title="Share">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M4 9l4-5 4 5M8 4v9" />
        </svg>
        Share
      </button>
      <button style={btnStyle} title="Save">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M3 2h10v12l-5-3-5 3z" />
        </svg>
        Save
      </button>
    </div>
  );
}

/* ── CSS Annotation overlay — mirrors BlockAnnotation from ArticleDetailPage ── */
function CssNote({ type, css, show }: { type: string; css: string[]; show: boolean }) {
  if (!show) return null;
  return (
    <div
      style={{
        fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
        fontSize: 10,
        lineHeight: 1.5,
        color: "#727272",
        background: "rgba(247,245,240,0.95)",
        border: "1px solid #e8e5e0",
        borderRadius: 4,
        padding: "6px 10px",
        marginBottom: 8,
        backdropFilter: "blur(4px)",
        position: "relative",
        zIndex: 10,
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
        <div key={i} style={{ marginTop: 2 }}>{line}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════ */
export default function VotingDeadlinesArticle() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedState, setSelectedState] = useState("New York");
  const [showCss, setShowCss] = useState(false);
  const animatedPhrase = useAnimatedPhrase(3000);

  const stateData = STATE_DATA_MAP[selectedState] ?? NY_DATA;
  const articleData = ARTICLES.find((a) => a.id === "voting-deadlines-state");

  const handleMenuToggle = useCallback(() => setMenuOpen((p) => !p), []);
  const handleMenuClose = useCallback(() => setMenuOpen(false), []);

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#fff",
        color: T.colorCopy,
        fontFamily: T.franklin,
      }}
    >
      <NYTOverlayMenu open={menuOpen} onClose={handleMenuClose} />

      {/* ── Floating Toolbar ──────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          top: 56,
          right: 16,
          zIndex: 200,
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid #e2e2e2",
          borderRadius: 6,
          padding: "6px 10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontFamily: T.franklin,
        }}
      >
        <Link
          href={buildDesignDocsPath("nyt-articles")}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.colorCopy,
            textDecoration: "none",
            padding: "4px 8px",
            borderRadius: 3,
            background: "#f5f5f5",
            whiteSpace: "nowrap",
          }}
        >
          &larr; Design Docs
        </Link>
        <button
          onClick={() => setShowCss((p) => !p)}
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: showCss ? "#fff" : T.colorCopy,
            background: showCss ? "#326891" : "#f5f5f5",
            border: "none",
            borderRadius: 3,
            padding: "4px 8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontFamily: T.franklin,
          }}
        >
          {showCss ? "Hide CSS" : "Show CSS"}
        </button>
        <a
          href={articleData?.url || "https://www.nytimes.com/interactive/2024/us/elections/voting-deadlines-state.html"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: T.colorCopy,
            padding: "4px 8px",
            borderRadius: 3,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          VIEW PAGE &#8599;
        </a>
      </div>

      {/* ── NYT Masthead Bar ──────────────────────────────────────────── */}
      <CssNote type="masthead" css={[
        "header: border-bottom: 2px solid #121212; position: sticky; top: 0; z-index: 100",
        "NYT wordmark: nyt-cheltenham 26px/700 letter-spacing: -0.02em #121212",
        "Hamburger: 3 × span 18×2px background: #121212; gap: 3px",
      ]} show={showCss} />
      <header
        style={{
          borderBottom: "2px solid #121212",
          padding: "8px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "#fff",
          zIndex: 100,
        }}
      >
        {/* Left: hamburger + search */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={handleMenuToggle}
            aria-label="Open navigation menu"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <span style={{ display: "block", width: 18, height: 2, background: T.colorCopy }} />
            <span style={{ display: "block", width: 18, height: 2, background: T.colorCopy }} />
            <span style={{ display: "block", width: 18, height: 2, background: T.colorCopy }} />
          </button>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={T.colorCopy} strokeWidth="1.5" style={{ opacity: 0.7 }}>
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" />
          </svg>
        </div>

        {/* Center: NYT wordmark */}
        <div
          style={{
            fontFamily: '"nyt-cheltenham", georgia, "times new roman", times, serif',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "-0.02em",
            color: T.colorCopy,
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          The New York Times
        </div>

        {/* Right: back to design docs */}
        <Link
          href={buildDesignDocsPath("nyt-articles")}
          style={{
            fontFamily: T.franklin,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#fff",
            background: T.colorCopy,
            padding: "6px 12px",
            borderRadius: 4,
            textDecoration: "none",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
          }}
        >
          Design Docs
        </Link>
      </header>

      {/* ── Section label ─────────────────────────────────────────────── */}
      <CssNote type="section-label" css={[
        "span.SectionLabel (css-1ev7j75): nyt-franklin 10px/500 uppercase letter-spacing: 0.05rem #727272",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.headerMax,
          margin: "0 auto",
          padding: `12px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05rem",
            color: "#727272",
            fontFamily: T.franklin,
          }}
        >
          <span style={{ cursor: "pointer" }}>U.S.</span>
          {" \u203a "}
          <span style={{ cursor: "pointer" }}>Elections</span>
        </div>
      </div>

      {/* ── Countdown Badge ───────────────────────────────────────────── */}
      <CssNote type="countdown-badge" css={[
        "div.g-days-left (svelte-46mr9t): nyt-franklin 12px/600 uppercase letter-spacing: 0.06em",
        "background: linear-gradient(to left, #f4564a, #2b87d8); -webkit-background-clip: text; color: transparent",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.headerMax,
          margin: "0 auto",
          padding: `20px ${T.marginRight}px 0 ${T.marginLeft}px`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: T.franklin,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            background: T.electionGradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          27 days until election day
        </div>
      </div>

      {/* ── Animated Headline (#custom-header) ─────────────────────────── */}
      <CssNote type="animated-headline" css={[
        "h1 span.interactive-heading (svelte-n6zzpu): nyt-cheltenham 40px/300/1.0 text-align: left #121212",
        "span.headline-animated: nyt-cheltenham 40px/700 font-style: italic; letter-spacing: -0.025em",
        "animation: nytFadeIn 0.6s ease (translateY 8px → 0, opacity 0 → 1) — cycles 3 variants at 3000ms interval",
        "max-width: 800px (--header-max); width: calc(100% - 40px); margin: 30px auto 20px",
      ]} show={showCss} />
      <div
        id="custom-header"
        style={{
          maxWidth: T.headerMax,
          width: "calc(100% - 40px)",
          margin: "30px auto 20px",
        }}
      >
        <h1 style={{ margin: 0, lineHeight: 1 }}>
          <span
            className="interactive-heading"
            style={{
              color: T.colorCopy,
              fontSize: 40,
              fontWeight: 300,
              fontFamily: T.chelt,
              textAlign: "left",
              marginTop: 6,
              display: "block",
            }}
          >
            <span style={{ display: "block" }}>When to</span>
            <span style={{ display: "block" }}>
              <span
                className="headline-animated"
                key={animatedPhrase}
                style={{
                  fontFamily: T.chelt,
                  fontSize: 40,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1,
                  paddingTop: 2,
                  paddingBottom: 2,
                  display: "inline-block",
                  animation: "nytFadeIn 0.6s ease",
                }}
              >
                <i style={{ fontStyle: "italic" }}>{animatedPhrase}</i>
              </span>
            </span>
            <span style={{ display: "block" }}>in Your State</span>
          </span>
        </h1>
      </div>

      {/* ── Intro Paragraph ───────────────────────────────────────────── */}
      <CssNote type="intro-text" css={[
        "p.g-text (svelte-n6zzpu): nyt-imperial 20px/500/25px #363636",
        "a (inline links): color: #326891; text-decoration: underline; text-decoration-color: #ccc; text-underline-offset: 3px",
        "max-width: 600px (vi-interactive body width)",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.widthBody,
          margin: "0 auto",
          padding: `20px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <p
          style={{
            fontFamily: T.imperial,
            fontWeight: 500,
            fontSize: 20,
            lineHeight: "25px",
            color: T.bylineBlack,
            margin: 0,
          }}
        >
          The 2024 presidential election is on Nov. 5. Here are the key dates and deadlines for{" "}
          <a
            href="#"
            style={{
              color: T.colorAnchor,
              textDecoration: "underline",
              textDecorationColor: "#ccc",
              textUnderlineOffset: 3,
            }}
          >
            voter registration
          </a>
          ,{" "}
          <a
            href="#"
            style={{
              color: T.colorAnchor,
              textDecoration: "underline",
              textDecorationColor: "#ccc",
              textUnderlineOffset: 3,
            }}
          >
            mail ballots
          </a>
          ,{" "}
          <a
            href="#"
            style={{
              color: T.colorAnchor,
              textDecoration: "underline",
              textDecorationColor: "#ccc",
              textUnderlineOffset: 3,
            }}
          >
            early voting
          </a>{" "}
          and{" "}
          <a
            href="#"
            style={{
              color: T.colorAnchor,
              textDecoration: "underline",
              textDecorationColor: "#ccc",
              textUnderlineOffset: 3,
            }}
          >
            Election Day
          </a>{" "}
          in your state.
        </p>
      </div>

      {/* ── Byline ───────────────────────────────────────────────────── */}
      <CssNote type="byline" css={[
        "p.g-byline (svelte-n6zzpu): nyt-franklin 14px/700/18px #363636",
        "a (author name): color: #121212; text-decoration: underline; text-decoration-color: #ccc",
        "time (date line): nyt-franklin 13px/400 #999",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.widthBody,
          margin: "0 auto",
          padding: `16px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <p
          style={{
            fontFamily: T.franklin,
            fontWeight: 700,
            fontSize: 14,
            lineHeight: "18px",
            color: T.bylineBlack,
            margin: 0,
          }}
        >
          By{" "}
          {["Alice Fang", "Lisa Waananen Jones", "Destin\u00e9e-Charisse Royal", "Amy Schoenfeld Walker"].map((name, i, arr) => (
            <span key={name}>
              <a href="#" style={{ color: T.colorCopy, textDecoration: "underline", textDecorationColor: "#ccc", textUnderlineOffset: 2 }}>
                {name}
              </a>
              {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : ""}
            </span>
          ))}
        </p>
        <p
          style={{
            fontFamily: T.franklin,
            fontWeight: 400,
            fontSize: 13,
            color: "#999",
            margin: "4px 0 0 0",
          }}
        >
          Published Sept. 28, 2024 &middot; Updated Oct. 9, 2024
        </p>
      </div>

      {/* ── Share Tools ───────────────────────────────────────────────── */}
      <CssNote type="share-tools" css={[
        "button.ShareButton (css-10d8k1f): nyt-franklin 12px/500/15px uppercase #121212",
        "border: 1px solid #e2e2e2; border-radius: 4px; inline SVG icons 16×16 stroke-width: 1.2",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.widthBody,
          margin: "0 auto",
          padding: `0 ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <ShareToolbar />
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: T.headerMax,
          margin: "0 auto",
          padding: `0 ${T.marginRight}px`,
        }}
      >
        <hr style={{ border: "none", borderTop: "1px solid #e2e2e2", margin: 0 }} />
      </div>

      {/* ── State Header (gradient border-top, flex row) ──────────────── */}
      <CssNote type="state-selector" css={[
        "div.g-state-header (svelte-gd1o93): border-top: 4px solid transparent; border-image: linear-gradient(to left, #f4564a, #2b87d8) 1 0 0 0",
        "h2: nyt-cheltenham 1.95rem/300/1.2 #121212 ('Important voting deadlines for')",
        "select.StateDropdown (svelte-122pd5k): nyt-cheltenham 1.95rem/700 letter-spacing: -0.025em; border-bottom: 1px solid rgba(0,0,0,0.3); appearance: none",
      ]} show={showCss} />
      <CssNote type="calendar-grid" css={[
        "table.calendar (svelte-190h5a9): display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px",
        "th (day-of-week): nyt-franklin 11px/600 uppercase #999",
        "td (day cell): nyt-franklin 14px/400 #444; border-radius: 4px; padding: 6px 2px",
        "Category colors: register=#F6CC79, request=#F7A0E1, mail=#BFA0F7, early=#BCEB82",
        "Election Day: border: 3px solid transparent; background-image: linear-gradient(#fff,#fff), linear-gradient(to left, #f4564a, #2b87d8); background-clip: padding-box, border-box",
      ]} show={showCss} />
      <CssNote type="deadline-sections" css={[
        "h3.g-category (svelte-2ql986): nyt-franklin 13px/500 uppercase letter-spacing: 0.06em #545454",
        "span.DateSpan: nyt-franklin 16px/600 #121212 (bold date)",
        "p.DescriptionText: nyt-franklin 16px/300 #545454 (description)",
        "Layout: flex-direction: row; calendar maxWidth: 230px + margin-right: 50px; dates maxWidth: 500px",
        "@media (max-width: 739px): flex-direction: column-reverse (deadlines above calendar)",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.headerMax,
          margin: "0 auto",
          padding: `24px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <div
          className="g-state-header"
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignContent: "center",
            justifyContent: "flex-start",
            alignItems: "center",
            marginBottom: 20,
            backgroundColor: "#fff",
            boxSizing: "border-box",
            padding: "16px 10px 10px 0",
            marginLeft: "auto",
            marginRight: "auto",
            maxWidth: T.headerMax,
            borderTop: "4px solid transparent",
            borderImage: `${T.electionGradient} 1 0 0 0 stretch`,
          }}
        >
          <h2
            style={{
              fontFamily: T.chelt,
              fontWeight: 300,
              fontSize: "1.95rem",
              lineHeight: 1.2,
              color: T.colorCopy,
              margin: 0,
            }}
          >
            Important voting deadlines for{" "}
          </h2>
          <div style={{ display: "inline-block", position: "relative", marginLeft: 4 }}>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{
                fontFamily: T.chelt,
                fontWeight: 700,
                fontSize: "1.95rem",
                letterSpacing: "-0.025em",
                color: T.colorCopy,
                lineHeight: 1.3,
                background: "#fff",
                border: "transparent",
                borderBottom: "1px solid rgba(0,0,0,0.3)",
                padding: "0 24px 0 0",
                cursor: "pointer",
                appearance: "none",
                WebkitAppearance: "none",
                outline: "none",
              }}
            >
              {STATES.map((s) => (
                <option key={s.abbr} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <span
              style={{
                position: "absolute",
                right: 4,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: 12,
                color: T.colorCopy,
              }}
            >
              &#9662;
            </span>
          </div>
        </div>

        {/* ── State Info: Calendar LEFT + Deadlines RIGHT (side by side on desktop) ── */}
        <div
          className="g-state-info"
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            justifyContent: "space-around",
            marginTop: "3rem",
          }}
        >
          {/* ── Calendar Column (left, narrow) ──────────────────────── */}
          <div
            className="calendar-column"
            style={{
              width: "100%",
              maxWidth: 230,
              display: "flex",
              flexDirection: "column",
              marginRight: 50,
              marginBottom: 8,
              paddingBottom: 20,
            }}
          >
            <CalendarMonth
              monthName="October"
              year={2024}
              monthIndex={9}
              startCol={stateData.octStart}
              marks={stateData.calendarOct}
            />
            <div style={{ marginTop: 16 }}>
              <CalendarMonth
                monthName="November"
                year={2024}
                monthIndex={10}
                startCol={stateData.novStart}
                marks={stateData.calendarNov}
              />
            </div>
            <CalendarKey />
          </div>

          {/* ── Dates Column (right, fills remaining width) ─────────── */}
          <div
            className="dates-column"
            style={{
              display: "block",
              maxWidth: 500,
              width: "100%",
            }}
          >
            {/* Register to Vote */}
            <DeadlineSection emoji={"📝"} title="Register to Vote">
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.register.date}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  {stateData.register.description}
                </span>
              </p>
              {stateData.register.note && (
                <p
                  style={{
                    fontFamily: T.franklin,
                    fontSize: 14,
                    fontWeight: 300,
                    fontStyle: "italic",
                    opacity: 0.5,
                    lineHeight: 1.5,
                    margin: 0,
                    marginTop: 16,
                    color: "#545454",
                  }}
                >
                  {stateData.register.note}
                </p>
              )}
            </DeadlineSection>

            {/* Vote by Mail */}
            <DeadlineSection emoji={"📨"} title="Vote by Mail">
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.mail.requestBy}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  Last day to request a mail ballot
                </span>
              </p>
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.mail.postmarkBy}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  {stateData.mail.description}
                </span>
              </p>
            </DeadlineSection>

            {/* Early Voting */}
            <DeadlineSection emoji={"🗳️"} title="Early Voting">
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.earlyVoting.first}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  First day of in-person early voting
                </span>
              </p>
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.earlyVoting.last}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  Last day of in-person early voting
                </span>
              </p>
            </DeadlineSection>

            {/* Election Day */}
            <DeadlineSection emoji={"🇺🇸"} title="Election Day" isLast>
              <p style={{ fontFamily: T.franklin, fontSize: "1rem", fontWeight: 300, color: "#545454", marginBottom: 8, marginLeft: 0 }}>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8, fontWeight: 600, marginRight: 6, color: T.colorCopy }}>
                  {stateData.electionDay.date}
                </span>
                <span style={{ display: "inline-block", lineHeight: 1.3, marginTop: 8 }}>
                  {stateData.electionDay.description}
                </span>
              </p>
            </DeadlineSection>
          </div>
        </div>
      </div>

      {/* ── Corrections ───────────────────────────────────────────────── */}
      <CssNote type="corrections" css={[
        "h4: nyt-franklin 13px/700 uppercase letter-spacing: 0.04em #121212",
        "p.CorrectionText (css-8hnokg): nyt-imperial 15px/400/1.6 #363636",
        "strong (date): font-weight: 500",
        "border-top: 1px solid #e2e2e2; padding-top: 16px",
      ]} show={showCss} />
      <div
        style={{
          maxWidth: T.widthBody,
          margin: "0 auto",
          padding: `16px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <div style={{ borderTop: "1px solid #e2e2e2", paddingTop: 16 }}>
          <h4
            style={{
              fontFamily: T.franklin,
              fontWeight: 700,
              fontSize: 13,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: T.colorCopy,
              margin: "0 0 8px 0",
            }}
          >
            Corrections
          </h4>
          <p
            style={{
              fontFamily: T.imperial,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.6,
              color: T.bylineBlack,
              margin: "0 0 12px 0",
            }}
          >
            <strong style={{ fontWeight: 500 }}>Sept. 30, 2024:</strong> An earlier version of this article misstated the deadline in Virginia for registering to vote online and for voter registration by mail to be postmarked. It is Oct. 15, not Oct. 14.
          </p>
          <p
            style={{
              fontFamily: T.imperial,
              fontSize: 15,
              fontWeight: 400,
              lineHeight: 1.6,
              color: T.bylineBlack,
              margin: 0,
            }}
          >
            <strong style={{ fontWeight: 500 }}>Oct. 10, 2024:</strong> Because of a technical issue, an earlier version of this article had some inaccurate dates for readers with devices set to time zones outside of the United States.
          </p>
        </div>
      </div>

      {/* ── Footer / Sources ──────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: T.widthBody,
          margin: "0 auto",
          padding: `32px ${T.marginRight}px 0 ${T.marginLeft}px`,
        }}
      >
        <div style={{ borderTop: "1px solid #e2e2e2", paddingTop: 16, marginBottom: 48 }}>
          <p
            style={{
              fontFamily: T.franklin,
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "#999",
              margin: 0,
            }}
          >
            Sources: State election offices; U.S. Vote Foundation; Vote.org; National Conference of State Legislatures.
          </p>
          <p
            style={{
              fontFamily: T.franklin,
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.6,
              color: "#999",
              margin: "8px 0 0 0",
            }}
          >
            Methodology: Deadlines and dates are sourced from official state election offices and verified against nonpartisan voting resources. Dates shown are the latest confirmed as of the publication date. Readers should verify deadlines with their local election office, as dates are subject to change.
          </p>
        </div>
      </div>

      {/* ── NYT Footer Bar ────────────────────────────────────────────── */}
      <CssNote type="footer" css={[
        "footer: border-top: 2px solid #121212; padding: 16px 20px; text-align: center",
        "NYT wordmark: nyt-cheltenham 18px/700 #121212",
        "nav links: nyt-franklin 11px/400 #999 (flex-wrap row, gap: 4px 16px)",
      ]} show={showCss} />
      <footer
        style={{
          borderTop: "2px solid #121212",
          padding: "16px 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: T.chelt,
            fontWeight: 700,
            fontSize: 18,
            color: T.colorCopy,
            marginBottom: 8,
          }}
        >
          The New York Times
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "4px 16px",
            fontFamily: T.franklin,
            fontSize: 11,
            color: "#999",
          }}
        >
          {["\u00a9 2024 The New York Times Company", "NYTCo", "Contact Us", "Accessibility", "Work with us", "Advertise", "T Brand Studio", "Your Ad Choices", "Privacy Policy", "Terms of Service", "Terms of Sale", "Site Map", "Help", "Subscriptions"].map((item) => (
            <span key={item} style={{ cursor: "pointer" }}>
              {item}
            </span>
          ))}
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════
         Design Documentation — article metadata, typography, colors, etc.
         ═══════════════════════════════════════════════════════════════════ */}
      {articleData && (
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            padding: "0 20px 48px",
          }}
        >
          {/* Section divider */}
          <div
            style={{
              borderTop: "3px solid #121212",
              marginTop: 0,
              paddingTop: 24,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                fontFamily: T.franklin,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#326891",
                marginBottom: 4,
              }}
            >
              Design Documentation
            </div>
            <div
              style={{
                fontFamily: T.chelt,
                fontSize: 24,
                fontWeight: 700,
                color: T.colorCopy,
                marginBottom: 4,
              }}
            >
              {articleData.title}
            </div>
            <div
              style={{
                fontFamily: T.franklin,
                fontSize: 12,
                color: "#727272",
              }}
            >
              {articleData.section} &middot; {articleData.type} &middot; {articleData.date}
            </div>
          </div>

          {/* ── Typography ─────────────────────────────────────────── */}
          {articleData.fonts && articleData.fonts.length > 0 && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 32 }}>
              <h3
                style={{
                  fontFamily: T.chelt,
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                Typography
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {articleData.fonts.map((f) => (
                  <div
                    key={f.name}
                    style={{
                      border: "1px solid #e8e5e0",
                      borderRadius: 6,
                      padding: 16,
                      background: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <div style={{ fontFamily: T.chelt, fontSize: 20, fontWeight: 600, color: T.colorCopy }}>
                        {f.name}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#727272" }}>
                        Weights: {f.weights.join(", ")}
                      </div>
                    </div>
                    <div style={{ fontFamily: T.franklin, fontSize: 11, fontWeight: 700, color: "#326891", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      {f.role}
                    </div>
                    {f.fullStack && (
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#969693", marginBottom: 8 }}>
                        {f.fullStack}
                      </div>
                    )}

                    {/* ── Always-visible Preview Specimens ── */}
                    <div style={{ marginTop: 8, marginBottom: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {f.name === "nyt-cheltenham" && (
                        <>
                          <div style={{
                            padding: "16px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Animated phrase — 40px / weight 700 / italic / letter-spacing: -0.025em
                            </div>
                            <div style={{
                              fontFamily: T.chelt,
                              fontSize: 40,
                              fontWeight: 700,
                              fontStyle: "italic",
                              letterSpacing: "-0.025em",
                              lineHeight: 1,
                              color: T.colorCopy,
                            }}>
                              Register to Vote
                            </div>
                          </div>
                          <div style={{
                            padding: "16px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Full headline — 40px / weight 300 (prefix + suffix) + weight 700 italic (animated phrase)
                            </div>
                            <div style={{
                              fontFamily: T.chelt,
                              fontSize: 40,
                              fontWeight: 300,
                              lineHeight: 1,
                              color: T.colorCopy,
                            }}>
                              When to <span style={{ fontWeight: 700, fontStyle: "italic", letterSpacing: "-0.025em" }}>Vote Early</span> in Your State
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Calendar heading — 16px / weight 700
                            </div>
                            <div style={{
                              fontFamily: T.chelt,
                              fontSize: 16,
                              fontWeight: 700,
                              color: T.colorCopy,
                            }}>
                              October &nbsp;&nbsp; November
                            </div>
                          </div>
                        </>
                      )}
                      {f.name === "nyt-franklin" && (
                        <>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Byline — 14px / weight 700
                            </div>
                            <div style={{
                              fontFamily: T.franklin,
                              fontSize: 14,
                              fontWeight: 700,
                              lineHeight: "18px",
                              color: "#363636",
                            }}>
                              By Alice Fang, Lisa Waananen Jones, Destin{"\u00e9"}e-Charisse Royal and Amy Schoenfeld Walker
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Countdown badge — 12px / weight 600 / uppercase
                            </div>
                            <div style={{
                              fontFamily: T.franklin,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              background: T.electionGradient,
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                              backgroundClip: "text",
                            }}>
                              27 days until election day
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Key label — 11px / weight 600 / uppercase
                            </div>
                            <div style={{ display: "flex", gap: 16 }}>
                              {[
                                { label: "Register", color: T.register },
                                { label: "Request", color: T.request },
                                { label: "Mail", color: T.mail },
                                { label: "Early", color: T.early },
                              ].map((k) => (
                                <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <span style={{ width: 10, height: 10, borderRadius: 2, background: k.color, display: "inline-block" }} />
                                  <span style={{
                                    fontFamily: T.franklin,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: T.colorCopy,
                                  }}>
                                    {k.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Category heading — 13px / weight 500 / uppercase
                            </div>
                            <div style={{
                              fontFamily: T.franklin,
                              fontWeight: 500,
                              fontSize: 13,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: "#545454",
                            }}>
                              Register to Vote
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Date span (bold) + Description (light) — 14–16px
                            </div>
                            <div style={{ fontFamily: T.franklin, fontSize: 16, color: "#545454" }}>
                              <span style={{ fontWeight: 600, color: T.colorCopy, marginRight: 6 }}>Saturday, Oct. 26</span>
                              <span style={{ fontWeight: 300 }}>Last day for voter registration in person or online</span>
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Section label — 10px / weight 500 / uppercase
                            </div>
                            <div style={{
                              fontFamily: T.franklin,
                              fontSize: 10,
                              fontWeight: 500,
                              textTransform: "uppercase",
                              letterSpacing: "0.05rem",
                              color: "#727272",
                            }}>
                              U.S. &rsaquo; Elections
                            </div>
                          </div>
                        </>
                      )}
                      {f.name === "nyt-cheltenham-small" && (
                        <div style={{
                          padding: "12px 20px",
                          border: "1px solid #e8e5e0",
                          borderRadius: 4,
                          background: "#fff",
                        }}>
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Masthead breadcrumb — 13px / weight 400
                          </div>
                          <div style={{
                            fontFamily: f.fullStack || '"nyt-cheltenham-small", georgia, "times new roman"',
                            fontSize: 13,
                            fontWeight: 400,
                            letterSpacing: "0.015em",
                            color: T.colorCopy,
                          }}>
                            When to Vote in Your State
                          </div>
                        </div>
                      )}
                      {f.name === "nyt-imperial" && (
                        <>
                          <div style={{
                            padding: "16px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Intro paragraph — 20px / weight 500
                            </div>
                            <div style={{
                              fontFamily: T.imperial,
                              fontSize: 20,
                              fontWeight: 500,
                              lineHeight: "25px",
                              color: "#363636",
                            }}>
                              The 2024 presidential election is on Nov. 5. Here are the key dates and deadlines for voter registration, mail ballots, early voting and Election Day in your state.
                            </div>
                          </div>
                          <div style={{
                            padding: "12px 20px",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            background: "#fff",
                          }}>
                            <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Correction text — 15px / weight 400
                            </div>
                            <div style={{
                              fontFamily: T.imperial,
                              fontSize: 15,
                              fontWeight: 400,
                              lineHeight: 1.6,
                              color: "#363636",
                            }}>
                              <strong style={{ fontWeight: 500 }}>Sept. 30, 2024:</strong> An earlier version of this article misstated the deadline in Virginia for registering to vote online.
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {/* Style Configs with live specimens */}
                    <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 8, marginTop: 4 }}>
                      <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 700, color: "#52524F", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                        Style Configs
                      </div>
                      {(Array.isArray(f.usedIn) ? Array.from(f.usedIn) : [String(f.usedIn)]).map((usage: string, ui: number, arr: string[]) => {
                        const colonIdx = usage.indexOf(":");
                        const className = colonIdx > 0 ? usage.slice(0, colonIdx).trim() : "";
                        const specs = colonIdx > 0 ? usage.slice(colonIdx + 1).trim() : usage;
                        const hexMatch = specs.match(/#[0-9A-Fa-f]{6}/);
                        const hexColor = hexMatch ? hexMatch[0] : null;

                        return (
                          <div key={ui} style={{
                            display: "flex", gap: 8, alignItems: "flex-start",
                            padding: "4px 0", borderBottom: ui < arr.length - 1 ? "1px solid #f0f0ee" : "none",
                          }}>
                            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#969693", minWidth: 16, textAlign: "right", flexShrink: 0 }}>
                              {ui + 1}.
                            </span>
                            {hexColor && (
                              <span style={{
                                display: "inline-block", width: 12, height: 12, borderRadius: 2,
                                background: hexColor, border: "1px solid #e0e0e0", flexShrink: 0, marginTop: 1,
                              }} />
                            )}
                            <div style={{ flex: 1 }}>
                              <span style={{ fontFamily: "monospace", fontSize: 11, color: T.colorCopy, lineHeight: 1.4 }}>
                                {className && (
                                  <span style={{ color: "#326891", fontWeight: 600 }}>{className}</span>
                                )}
                                {className && ": "}
                                <span style={{ color: "#52524F" }}>{specs}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Colors ─────────────────────────────────────────────── */}
          {articleData.colors && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 32 }}>
              <h3
                style={{
                  fontFamily: T.chelt,
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                Colors
              </h3>

              {/* Calendar Categories */}
              {articleData.colors.calendarCategories && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontFamily: T.franklin, fontSize: 12, fontWeight: 600,
                    color: "#363636", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    Calendar Categories
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {articleData.colors.calendarCategories.map((c, i) => {
                      const note = "note" in c ? (c as { note?: string }).note : undefined;
                      return (
                        <div key={i} style={{ textAlign: "center", maxWidth: 80 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 4,
                            background: c.hex, border: "1px solid #e0e0e0", margin: "0 auto 4px",
                          }} />
                          <div style={{ fontFamily: "monospace", fontSize: 9, color: "#727272" }}>{c.hex}</div>
                          <div style={{ fontFamily: T.franklin, fontSize: 9, color: "#999", lineHeight: 1.2 }}>{c.name}</div>
                          {note && <div style={{ fontFamily: T.franklin, fontSize: 8, color: "#b0b0b0", lineHeight: 1.1, marginTop: 1 }}>{note}</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Editorial Tokens */}
              {articleData.colors.editorial && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{
                    fontFamily: T.franklin, fontSize: 12, fontWeight: 600,
                    color: "#363636", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em",
                  }}>
                    Editorial Tokens
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {Object.entries(articleData.colors.editorial).map(([name, hex]) => (
                      <div key={name} style={{ textAlign: "center", maxWidth: 64 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 4,
                          background: hex, border: "1px solid #e0e0e0", margin: "0 auto 4px",
                        }} />
                        <div style={{ fontFamily: "monospace", fontSize: 9, color: "#727272" }}>{hex}</div>
                        <div style={{ fontFamily: T.franklin, fontSize: 9, color: "#999", lineHeight: 1.2 }}>{name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Icons ────────────────────────────────────────────── */}
          <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 32 }}>
            <h3
              style={{
                fontFamily: T.chelt,
                fontSize: 22,
                fontWeight: 700,
                color: T.colorCopy,
                marginTop: 0,
                marginBottom: 16,
              }}
            >
              Icons
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 16 }}>
              {/* Hamburger Menu */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#121212" strokeWidth="1.8" strokeLinecap="round">
                    <line x1="2" y1="4.5" x2="16" y2="4.5" />
                    <line x1="2" y1="9" x2="16" y2="9" />
                    <line x1="2" y1="13.5" x2="16" y2="13.5" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Hamburger</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>18&times;18</div>
              </div>

              {/* Search */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#121212" strokeWidth="1.5">
                    <circle cx="7" cy="7" r="5" />
                    <path d="M11 11l3.5 3.5" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Search</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>16&times;16</div>
              </div>

              {/* Gift */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#121212" strokeWidth="1.2">
                    <rect x="1" y="7" width="14" height="8" rx="1" />
                    <path d="M8 7v8M1 10h14M4 7c0-2 1-3 4-3s4 1 4 3" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Gift</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>16&times;16</div>
              </div>

              {/* Share */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#121212" strokeWidth="1.2">
                    <path d="M4 9l4-5 4 5M8 4v9" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Share</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>16&times;16</div>
              </div>

              {/* Bookmark / Save */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#121212" strokeWidth="1.2">
                    <path d="M3 2h10v12l-5-3-5 3z" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Save</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>16&times;16</div>
              </div>

              {/* Dropdown Arrow */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <span style={{ fontSize: 20, color: "#121212" }}>&#9662;</span>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Dropdown</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>Caret</div>
              </div>

              {/* Close X */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#121212" strokeWidth="2" strokeLinecap="round">
                    <line x1="4" y1="4" x2="14" y2="14" />
                    <line x1="14" y1="4" x2="4" y2="14" />
                  </svg>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>Close</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>18&times;18</div>
              </div>

              {/* External Link */}
              <div style={{ textAlign: "center", padding: 16, border: "1px solid #e8e5e0", borderRadius: 6, background: "#fafafa" }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: 40, height: 40, margin: "0 auto 8px" }}>
                  <span style={{ fontSize: 16, color: "#121212" }}>&#8599;</span>
                </div>
                <div style={{ fontFamily: T.franklin, fontSize: 10, fontWeight: 600, color: "#363636" }}>External</div>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#999" }}>Arrow</div>
              </div>
            </div>
            <div style={{ fontFamily: T.franklin, fontSize: 11, color: "#999", marginTop: 12 }}>
              All icons are inline SVG &middot; Stroke-based &middot; No external icon library
            </div>
          </div>

          {/* ── Production Stack ────────────────────────────────────── */}
          {articleData.tools && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 24 }}>
              <h4
                style={{
                  fontFamily: T.franklin,
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginBottom: 8,
                  marginTop: 0,
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
                  fontFamily: T.franklin,
                  fontSize: 13,
                  marginBottom: 24,
                }}
              >
                {Object.entries(articleData.tools).map(([key, val]) => (
                  <div key={key} style={{ display: "contents" }}>
                    <span style={{ fontWeight: 600, color: "#363636", textTransform: "capitalize" }}>
                      {key}
                    </span>
                    <span style={{ color: "#727272" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Architecture ────────────────────────────────────────── */}
          {articleData.architecture && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 24 }}>
              <h4
                style={{
                  fontFamily: T.franklin,
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginBottom: 8,
                  marginTop: 0,
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
                  fontFamily: T.franklin,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {articleData.architecture.framework && (
                  <div style={{ display: "contents" }}>
                    <span style={{ fontWeight: 600, color: "#363636" }}>Framework</span>
                    <span style={{ color: "#727272" }}>{articleData.architecture.framework}</span>
                  </div>
                )}
                {articleData.architecture.projectId && (
                  <div style={{ display: "contents" }}>
                    <span style={{ fontWeight: 600, color: "#363636" }}>Project ID</span>
                    <span style={{ color: "#727272", fontFamily: "monospace", fontSize: 12 }}>{articleData.architecture.projectId}</span>
                  </div>
                )}
                {articleData.architecture.hydrationId && (
                  <div style={{ display: "contents" }}>
                    <span style={{ fontWeight: 600, color: "#363636" }}>Hydration ID</span>
                    <span style={{ color: "#727272", fontFamily: "monospace", fontSize: 12 }}>{articleData.architecture.hydrationId}</span>
                  </div>
                )}
                {articleData.architecture.hosting && (
                  <div style={{ display: "contents" }}>
                    <span style={{ fontWeight: 600, color: "#363636" }}>Hosting</span>
                    <span style={{ color: "#727272" }}>{articleData.architecture.hosting}</span>
                  </div>
                )}
              </div>

              {/* Hierarchy tree */}
              {articleData.architecture.hierarchy && showCss && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <div style={{
                    fontFamily: T.franklin, fontSize: 10, fontWeight: 700, color: "#52524F",
                    textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
                  }}>
                    DOM Hierarchy
                  </div>
                  <pre style={{
                    fontFamily: "monospace", fontSize: 11, color: "#52524F",
                    background: "#f7f5f0", padding: 12, borderRadius: 4,
                    border: "1px solid #e8e5e0", overflow: "auto", lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {articleData.architecture.hierarchy.join("\n")}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* ── Images ──────────────────────────────────────────────── */}
          {articleData.architecture?.publicAssets?.socialImages && articleData.architecture.publicAssets.socialImages.length > 0 && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 24 }}>
              <h3
                style={{
                  fontFamily: T.chelt,
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginTop: 0,
                  marginBottom: 4,
                }}
              >
                Images
              </h3>
              <div style={{
                fontFamily: T.franklin, fontSize: 12, fontWeight: 600,
                color: "#363636", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em",
              }}>
                Social &amp; OG Images
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                {articleData.architecture.publicAssets.socialImages.map(
                  (img) => {
                    const ext = (img.url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG";
                    const imgWidth = "width" in img ? (img as { width?: number }).width : undefined;
                    const imgDesc = "desc" in img ? (img as { desc?: string }).desc : undefined;
                    return (
                      <div key={img.name}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt={`${img.name} - ${img.ratio}${imgWidth ? ` - ${imgWidth}px` : ""}`}
                          style={{
                            width: "100%",
                            maxHeight: 120,
                            objectFit: "cover",
                            border: "1px solid #e8e5e0",
                            borderRadius: 4,
                            display: "block",
                          }}
                        />
                        <div style={{ fontFamily: "monospace", fontSize: 10, color: "#727272", marginTop: 4, lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, color: "#363636" }}>{img.name}</span>
                          {" \u00b7 "}{img.ratio}
                          {imgWidth ? ` \u00b7 ${imgWidth}px` : ""}
                          {" \u00b7 "}<span style={{ color: "#969693", textTransform: "uppercase" }}>{ext}</span>
                        </div>
                        {imgDesc && (
                          <div style={{ fontFamily: T.franklin, fontSize: 9, color: "#999", marginTop: 2 }}>{imgDesc}</div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          {/* ── Tags/Topics ─────────────────────────────────────────── */}
          {articleData.tags && articleData.tags.length > 0 && (
            <div style={{ borderTop: "1px solid #e8e5e0", paddingTop: 24, marginBottom: 24 }}>
              <h4
                style={{
                  fontFamily: T.franklin,
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.colorCopy,
                  marginBottom: 8,
                  marginTop: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Topics
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {articleData.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: T.franklin,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#363636",
                      background: "#f5f5f5",
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
          )}
        </div>
      )}

      {/* ── NYT Web Fonts ──────────────────────────────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        href="https://g1.nyt.com/fonts/css/web-fonts.c851560786173ad206e1f76c1901be7e096e8f8b.css"
        rel="stylesheet"
      />

      {/* ── Keyframe animation + responsive layout ─────────────────────── */}
      <style>{`
        @keyframes nytFadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Mobile: stack deadlines above calendar (column-reverse) */
        @media (max-width: 739px) {
          .g-state-info {
            flex-direction: column-reverse !important;
            margin-top: 0 !important;
          }
          .calendar-column {
            max-width: 100% !important;
            margin-right: 0 !important;
            margin-top: 20px !important;
            padding-top: 0 !important;
            border-top: 2px solid #121212;
          }
        }
      `}</style>
    </div>
  );
}

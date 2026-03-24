"use client";

/* ================================================================
   CardsSection — Comprehensive Card Format Guide
   Inspired by NYT Instagram sub-brands and editorial design systems.
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
      }}
    >
      {children}
    </div>
  );
}

function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
        color: "var(--dd-ink-faint)",
        marginTop: 8,
        marginBottom: 32,
      }}
    >
      {children}
    </div>
  );
}

/* ==========================================================
   1. Instagram-Style Content Cards (4:5 aspect, 260px grid)
   ========================================================== */

function CookingCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#FDF6EC",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Red accent bar */}
      <div style={{ height: 4, background: "#DF321B", flexShrink: 0 }} />

      <div
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* Kicker */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "var(--dd-accent-saffron)",
            marginBottom: 16,
          }}
        >
          NYT COOKING
        </div>

        {/* Food illustration placeholder */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <svg viewBox="0 0 120 120" width={100} height={100}>
            {/* Plate */}
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="none"
              stroke="#E8D5B8"
              strokeWidth="2"
            />
            <circle
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke="#E8D5B8"
              strokeWidth="0.5"
            />
            {/* Fork */}
            <line
              x1="28"
              y1="30"
              x2="28"
              y2="90"
              stroke="#C4A97D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="30"
              x2="22"
              y2="52"
              stroke="#C4A97D"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="28"
              y1="30"
              x2="28"
              y2="52"
              stroke="#C4A97D"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="34"
              y1="30"
              x2="34"
              y2="52"
              stroke="#C4A97D"
              strokeWidth="1"
              strokeLinecap="round"
            />
            {/* Knife */}
            <line
              x1="92"
              y1="30"
              x2="92"
              y2="90"
              stroke="#C4A97D"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M89 30 Q92 45 95 30"
              fill="none"
              stroke="#C4A97D"
              strokeWidth="1"
            />
            {/* Garnish dots */}
            <circle cx="52" cy="55" r="3" fill="#DF321B" opacity="0.5" />
            <circle cx="68" cy="50" r="2" fill="#6AAA64" opacity="0.5" />
            <circle cx="60" cy="65" r="2.5" fill="#C9B458" opacity="0.4" />
          </svg>
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 22,
            fontWeight: 700,
            color: "#2A2119",
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          Crispy Lemon Herb Chicken Thighs
        </div>
        {/* Description */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "#6B5D4F",
            lineHeight: 1.5,
          }}
        >
          A weeknight staple with golden skin and a bright, punchy pan sauce you
          will want to make again and again.
        </div>
      </div>
    </div>
  );
}

function GamesCard() {
  const tileColors = [
    ["#787C7E", "#787C7E", "#6AAA64", "#787C7E", "#C9B458"],
    ["#C9B458", "#787C7E", "#787C7E", "#6AAA64", "#787C7E"],
    ["#787C7E", "#6AAA64", "#C9B458", "#787C7E", "#6AAA64"],
    ["#6AAA64", "#6AAA64", "#6AAA64", "#6AAA64", "#6AAA64"],
    ["#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c"],
    ["#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c", "#3a3a3c"],
  ];

  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#FFFFFF",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--dd-paper-grey)",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "var(--dd-font-ui)",
          fontSize: 18,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 20,
          letterSpacing: "-0.01em",
        }}
      >
        Daily Puzzle
      </div>

      {/* Wordle grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 4,
          width: "100%",
          maxWidth: 180,
          marginBottom: 20,
        }}
      >
        {tileColors.flat().map((color, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 2,
              background: color,
              border:
                color === "#3a3a3c"
                  ? "1.5px solid #3a3a3c"
                  : `1.5px solid ${color}`,
              opacity: color === "#3a3a3c" ? 0.25 : 1,
            }}
          />
        ))}
      </div>

      {/* Score / Streak */}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              lineHeight: 1,
            }}
          >
            4
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "var(--dd-ink-soft)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            Guesses
          </div>
        </div>
        <div
          style={{
            width: 1,
            height: 32,
            background: "var(--dd-paper-grey)",
          }}
        />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 28,
              fontWeight: 700,
              color: "#6AAA64",
              lineHeight: 1,
            }}
          >
            47
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              color: "var(--dd-ink-soft)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            Streak
          </div>
        </div>
      </div>
    </div>
  );
}

function OpinionEditorialCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#0B1222",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 24,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* OPINION badge */}
      <div
        style={{
          display: "inline-block",
          alignSelf: "flex-start",
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "#A1C6D4",
          border: "1.5px solid rgba(161,198,212,0.4)",
          borderRadius: "var(--dd-radius-xs)",
          padding: "3px 8px",
          marginBottom: 16,
        }}
      >
        OPINION
      </div>

      {/* Abstract geometric shapes */}
      <div
        style={{
          flex: 1,
          position: "relative",
          marginBottom: 20,
        }}
      >
        <svg
          viewBox="0 0 200 160"
          style={{ width: "100%", height: "100%" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Large blush circle */}
          <circle cx="70" cy="80" r="55" fill="#DFC3D9" opacity="0.35" />
          {/* Powder blue triangle */}
          <polygon
            points="130,20 190,130 70,130"
            fill="#A1C6D4"
            opacity="0.3"
          />
          {/* Rose circle overlap */}
          <circle cx="140" cy="70" r="40" fill="#C37598" opacity="0.4" />
          {/* Small accent */}
          <circle cx="50" cy="40" r="12" fill="#A1C6D4" opacity="0.5" />
          {/* Geometric line accents */}
          <line
            x1="20"
            y1="140"
            x2="180"
            y2="140"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
          <line
            x1="100"
            y1="10"
            x2="100"
            y2="150"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Headline */}
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 24,
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
        }}
      >
        The Quiet Erosion of Public Trust
      </div>
    </div>
  );
}

function BreakingNewsCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#000000",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* BREAKING label with red left bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 4,
            height: 18,
            background: "#DF321B",
            borderRadius: 1,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#FFFFFF",
          }}
        >
          BREAKING
        </div>
      </div>

      {/* Large headline */}
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 28,
          fontWeight: 700,
          color: "#FFFFFF",
          lineHeight: 1.12,
          letterSpacing: "-0.015em",
          marginBottom: 16,
        }}
      >
        Supreme Court Blocks Federal Spending Freeze in Emergency Ruling
      </div>

      {/* Thin rule */}
      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(255,255,255,0.2)",
          marginBottom: 14,
        }}
      />

      {/* Deck */}
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.5,
        }}
      >
        The decision, issued late Friday, halts the administration&rsquo;s
        sweeping executive order affecting billions in appropriated funds.
      </div>
    </div>
  );
}

function DataVizCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "linear-gradient(160deg, #0a1628 0%, #142040 100%)",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      {/* Sparkline chart */}
      <svg
        viewBox="0 0 200 60"
        style={{ width: "100%", height: 60, marginBottom: 12 }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        <line
          x1="0"
          y1="15"
          x2="200"
          y2="15"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="30"
          x2="200"
          y2="30"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
        <line
          x1="0"
          y1="45"
          x2="200"
          y2="45"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
        {/* Area fill */}
        <path
          d="M0 55 L15 48 L35 50 L55 42 L75 44 L95 35 L115 30 L135 22 L155 25 L175 15 L200 8 L200 60 L0 60Z"
          fill="var(--dd-accent-saffron)"
          opacity="0.12"
        />
        {/* Line */}
        <path
          d="M0 55 L15 48 L35 50 L55 42 L75 44 L95 35 L115 30 L135 22 L155 25 L175 15 L200 8"
          fill="none"
          stroke="var(--dd-accent-saffron)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Endpoint dot */}
        <circle cx="200" cy="8" r="3.5" fill="var(--dd-accent-saffron)" />
      </svg>

      {/* Kicker */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          fontWeight: 700,
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          color: "var(--dd-accent-saffron)",
          marginBottom: 4,
        }}
      >
        YEAR OVER YEAR
      </div>

      {/* Big stat */}
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 48,
          fontWeight: 900,
          color: "#FFFFFF",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          marginBottom: 4,
        }}
      >
        +34.7%
      </div>

      {/* Metric label */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        Digital Subscription Growth
      </div>
    </div>
  );
}

function MagazineFeatureCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      {/* Full-bleed gradient mesh background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, #1a0a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)",
        }}
      >
        <svg
          viewBox="0 0 300 375"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="mg1" cx="30%" cy="40%">
              <stop offset="0%" stopColor="var(--dd-viz-purple)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="mg2" cx="70%" cy="60%">
              <stop offset="0%" stopColor="var(--dd-viz-teal)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <radialGradient id="mg3" cx="50%" cy="25%">
              <stop offset="0%" stopColor="var(--dd-viz-orange)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx="90" cy="150" r="120" fill="url(#mg1)" />
          <circle cx="210" cy="225" r="100" fill="url(#mg2)" />
          <circle cx="150" cy="90" r="80" fill="url(#mg3)" />
          {/* Geometric accent lines */}
          <line
            x1="0"
            y1="187"
            x2="300"
            y2="187"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
          <circle
            cx="150"
            cy="187"
            r="60"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Content overlay */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 24,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
          paddingTop: 60,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.12em",
            color: "var(--dd-accent-saffron)",
            marginBottom: 10,
          }}
        >
          THE MAGAZINE
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-masthead)",
            fontSize: 28,
            color: "#FFFFFF",
            lineHeight: 1.15,
          }}
        >
          What Happens When the Algorithm Decides Who You Are
        </div>
      </div>
    </div>
  );
}

function TravelLifestyleCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#FFFFFF",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--dd-paper-grey)",
      }}
    >
      {/* Image placeholder with warm gradient */}
      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          background:
            "linear-gradient(135deg, #FDDCB5 0%, #F6C781 40%, #E8A849 100%)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Subtle texture */}
        <svg
          viewBox="0 0 200 150"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.15,
          }}
        >
          <circle cx="160" cy="30" r="20" fill="#FFFFFF" />
          <path
            d="M0 120 Q50 80 100 100 T200 90 L200 150 L0 150Z"
            fill="rgba(0,0,0,0.1)"
          />
          <path
            d="M60 150 L90 100 L120 130 L140 90 L180 150Z"
            fill="rgba(0,0,0,0.08)"
          />
        </svg>
      </div>

      <div style={{ padding: "16px 20px 20px" }}>
        {/* Location tag */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 8,
          }}
        >
          <svg viewBox="0 0 14 14" width={12} height={12}>
            <circle
              cx="7"
              cy="7"
              r="5.5"
              fill="none"
              stroke="var(--dd-ink-soft)"
              strokeWidth="1"
            />
            <ellipse
              cx="7"
              cy="7"
              rx="2.5"
              ry="5.5"
              fill="none"
              stroke="var(--dd-ink-soft)"
              strokeWidth="0.6"
            />
            <line
              x1="1.5"
              y1="7"
              x2="12.5"
              y2="7"
              stroke="var(--dd-ink-soft)"
              strokeWidth="0.6"
            />
          </svg>
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
              color: "var(--dd-ink-soft)",
            }}
          >
            AMALFI COAST, ITALY
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          36 Hours on the Amalfi Coast
        </div>

        {/* Body */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          Cliffside villages, hidden coves, and the best lemon granita south of
          Naples.
        </div>
      </div>
    </div>
  );
}

function BooksReviewCard() {
  return (
    <div
      style={{
        aspectRatio: "4 / 5",
        background: "#FFFFFF",
        borderRadius: "var(--dd-radius-md)",
        overflow: "hidden",
        position: "relative",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        border: "1px solid var(--dd-paper-grey)",
      }}
    >
      {/* Faded rank number behind */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 20,
          fontFamily: "var(--dd-font-headline)",
          fontSize: 72,
          fontWeight: 900,
          color: "var(--dd-paper-grey)",
          lineHeight: 1,
          opacity: 0.5,
          userSelect: "none",
        }}
      >
        1
      </div>

      {/* Book cover placeholder */}
      <div
        style={{
          width: 100,
          height: 160,
          background: "linear-gradient(145deg, #F0ECE5 0%, #D9D2C5 100%)",
          borderRadius: 2,
          boxShadow:
            "4px 4px 12px rgba(0,0,0,0.15), 1px 1px 3px rgba(0,0,0,0.08)",
          marginBottom: 20,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Spine shadow */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.12), transparent)",
          }}
        />
        {/* Mini title text on cover */}
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--dd-ink-medium)",
            padding: "0 12px",
            lineHeight: 1.3,
            textAlign: "center",
          }}
        >
          INTERMEZZO
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          lineHeight: 1.25,
          marginBottom: 4,
        }}
      >
        Intermezzo
      </div>

      {/* Author */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 500,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        by Sally Rooney
      </div>

      {/* Star rating in saffron */}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background:
                i < 4
                  ? "var(--dd-accent-saffron)"
                  : "var(--dd-paper-grey)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ==========================================================
   2. Content Cards (Horizontal, for feeds)
   ========================================================== */

function ArticleCard() {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        padding: 16,
        background: "var(--dd-paper-white)",
        border: "1px solid var(--dd-paper-grey)",
        borderRadius: "var(--dd-radius-md)",
        alignItems: "flex-start",
      }}
    >
      {/* Image placeholder */}
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "var(--dd-radius-sm)",
          background:
            "linear-gradient(135deg, var(--dd-paper-grey) 0%, var(--dd-paper-mid) 100%)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 60 60"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.3,
          }}
        >
          <rect x="15" y="20" width="30" height="20" rx="2" fill="var(--dd-ink-faint)" />
          <circle cx="25" cy="27" r="4" fill="var(--dd-ink-faint)" />
          <path d="M15 40 L28 30 L35 35 L45 25 L45 40Z" fill="var(--dd-ink-faint)" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Headline */}
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          Federal Reserve Signals Patience on Rate Cuts Amid Sticky Inflation
        </div>
        {/* Description */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.45,
            marginBottom: 8,
          }}
        >
          Officials emphasized a data-dependent approach, pushing back against
          market expectations for early easing.
        </div>
        {/* Byline + date */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
          }}
        >
          Jeanna Smialek &middot; 14 min ago
        </div>
      </div>
    </div>
  );
}

function CompactListItem() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid var(--dd-paper-grey)",
      }}
    >
      {/* Dot bullet */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--dd-ink-faint)",
          flexShrink: 0,
          marginTop: 6,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Headline */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          New York City to Ban Gas Stoves in New Buildings Starting 2027
        </div>
        {/* Description */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.4,
          }}
        >
          The measure, part of a broader climate law, faces industry pushback.
        </div>
      </div>

      {/* Date right-aligned */}
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
          flexShrink: 0,
          whiteSpace: "nowrap",
          marginTop: 2,
        }}
      >
        2h ago
      </div>
    </div>
  );
}

function FeaturedStoryCard() {
  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        borderRadius: 0,
        overflow: "hidden",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Large 16:9 image placeholder */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          background:
            "linear-gradient(160deg, var(--dd-paper-mid) 0%, var(--dd-paper-grey) 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <svg
          viewBox="0 0 320 180"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0.2,
          }}
        >
          <rect x="100" y="40" width="120" height="80" rx="4" fill="var(--dd-ink-faint)" />
          <polygon points="140,65 180,90 140,90" fill="var(--dd-ink-faint)" />
        </svg>
      </div>

      <div style={{ padding: "16px 20px 20px" }}>
        {/* Badge */}
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
            color: "var(--dd-ink-soft)",
            border: "1.5px solid var(--dd-paper-mid)",
            borderRadius: "var(--dd-radius-xs)",
            padding: "3px 8px",
            marginBottom: 10,
          }}
        >
          ANALYSIS
        </span>

        {/* Headline */}
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          How a Quiet Shift in Trade Policy Could Reshape American Manufacturing
        </div>

        {/* Deck */}
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 15,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          A series of under-the-radar regulatory changes is rewriting the rules
          for domestic production in ways that will outlast the current
          administration.
        </div>

        {/* Byline */}
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "var(--dd-ink-faint)",
          }}
        >
          By Ana Swanson &middot; March 19, 2026
        </div>
      </div>
    </div>
  );
}

/* ==========================================================
   3. Stat / Metric Cards
   ========================================================== */

function BigNumberStat() {
  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        borderTop: "3px solid var(--dd-ink-black)",
        padding: 20,
        borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 42,
          fontWeight: 900,
          color: "var(--dd-ink-black)",
          lineHeight: 1,
          letterSpacing: "-0.02em",
          marginBottom: 2,
        }}
      >
        2.4M
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--dd-ink-medium)",
          marginBottom: 4,
        }}
      >
        active subscribers
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 13,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.4,
          marginBottom: 8,
        }}
      >
        Digital-only subscriptions surpassed print for the first time in Q4.
      </div>
      {/* Trend indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <svg viewBox="0 0 12 12" width={12} height={12}>
          <path d="M6 2 L10 8 L2 8Z" fill="#16a34a" />
        </svg>
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            fontWeight: 600,
            color: "#16a34a",
          }}
        >
          +12.3%
        </span>
      </div>
    </div>
  );
}

function ComparisonStat() {
  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        borderTop: "3px solid var(--dd-ink-black)",
        padding: 20,
        borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        ENGAGEMENT RATE
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 36,
            fontWeight: 900,
            color: "var(--dd-viz-teal)",
            lineHeight: 1,
          }}
        >
          4.8%
        </span>
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-faint)",
            fontWeight: 500,
          }}
        >
          vs.
        </span>
        <span
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 36,
            fontWeight: 900,
            color: "var(--dd-ink-faint)",
            lineHeight: 1,
          }}
        >
          2.1%
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 8,
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          color: "var(--dd-ink-soft)",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--dd-viz-teal)",
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Instagram
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--dd-ink-faint)",
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          Twitter
        </span>
      </div>
    </div>
  );
}

function ProgressStat() {
  const pct = 73;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        borderTop: "3px solid var(--dd-ink-black)",
        padding: 20,
        borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {/* Donut ring */}
      <div style={{ position: "relative", width: 60, height: 60, flexShrink: 0 }}>
        <svg viewBox="0 0 60 60" width={60} height={60}>
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="var(--dd-paper-grey)"
            strokeWidth="5"
          />
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="var(--dd-accent-saffron)"
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
          }}
        >
          {pct}%
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            marginBottom: 2,
          }}
        >
          Backfill Complete
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.4,
          }}
        >
          73 of 100 cast profiles processed
        </div>
      </div>
    </div>
  );
}

function SparklineStat() {
  return (
    <div
      style={{
        background: "var(--dd-paper-white)",
        borderTop: "3px solid var(--dd-ink-black)",
        padding: 20,
        borderRadius: "0 0 var(--dd-radius-sm) var(--dd-radius-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 32,
            fontWeight: 900,
            color: "var(--dd-ink-black)",
            lineHeight: 1,
          }}
        >
          847
        </span>
        <svg viewBox="0 0 80 24" width={80} height={24}>
          <path
            d="M2 20 L12 16 L22 18 L32 12 L42 14 L52 8 L62 10 L72 4 L78 6"
            fill="none"
            stroke="var(--dd-viz-blue)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="78" cy="6" r="2" fill="var(--dd-viz-blue)" />
        </svg>
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
        }}
      >
        New articles this week
      </div>
    </div>
  );
}

/* ==========================================================
   4. Badge System
   ========================================================== */

const BADGES: {
  label: string;
  color: string;
  borderColor: string;
  bg?: string;
  pulseDot?: boolean;
}[] = [
  {
    label: "Analysis",
    color: "var(--dd-ink-soft)",
    borderColor: "var(--dd-paper-mid)",
  },
  {
    label: "Opinion",
    color: "var(--dd-viz-blue)",
    borderColor: "var(--dd-viz-blue)",
  },
  {
    label: "Breaking",
    color: "#FFFFFF",
    borderColor: "#DF321B",
    bg: "#DF321B",
  },
  {
    label: "Data",
    color: "var(--dd-viz-teal)",
    borderColor: "var(--dd-viz-teal)",
  },
  {
    label: "Live",
    color: "var(--dd-viz-red)",
    borderColor: "var(--dd-viz-red)",
    pulseDot: true,
  },
  {
    label: "Games",
    color: "var(--dd-viz-purple)",
    borderColor: "var(--dd-viz-purple)",
  },
  {
    label: "Cooking",
    color: "#DF321B",
    borderColor: "#DF321B",
  },
  {
    label: "Travel",
    color: "var(--dd-viz-green)",
    borderColor: "var(--dd-viz-green)",
  },
  {
    label: "Books",
    color: "var(--dd-viz-orange)",
    borderColor: "var(--dd-viz-orange)",
  },
  {
    label: "Style",
    color: "var(--dd-ink-black)",
    borderColor: "var(--dd-ink-black)",
  },
  {
    label: "Magazine",
    color: "var(--dd-accent-saffron)",
    borderColor: "var(--dd-accent-saffron)",
  },
  {
    label: "Editorial",
    color: "var(--dd-ink-medium)",
    borderColor: "var(--dd-ink-medium)",
  },
];

/* ==========================================================
   Main Export
   ========================================================== */

export default function CardsSection() {
  return (
    <div>
      <div className="dd-section-label">Cards &amp; Social</div>
      <h2 className="dd-section-title">Card &amp; Social Formats</h2>
      <p className="dd-section-desc">
        A comprehensive card format guide inspired by editorial sub-brands.
        Instagram-style content cards, horizontal feed layouts, metric displays,
        and a unified badge system &mdash; each format carries a distinct visual
        voice while sharing common typographic hierarchy and design tokens.
      </p>

      {/* ──────── 1. Instagram-Style Content Cards ──────── */}
      <SectionLabel>Instagram-Style Content Cards</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.55,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Eight distinct card types at 4:5 aspect ratio. Each represents a
        sub-brand voice: Cooking, Games, Opinion, Breaking, Data, Magazine,
        Travel, and Books. Grid columns at 260px minimum.
      </p>
      <div
        className="mb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <CookingCard />
        <GamesCard />
        <OpinionEditorialCard />
        <BreakingNewsCard />
        <DataVizCard />
        <MagazineFeatureCard />
        <TravelLifestyleCard />
        <BooksReviewCard />
      </div>
      <SectionNote>
        All cards: aspect-ratio 4/5 &bull; border-radius var(--dd-radius-md)
        &bull; overflow hidden &bull; relative positioning
      </SectionNote>

      {/* ──────── 2. Content Cards (Horizontal) ──────── */}
      <SectionLabel>Content Cards &mdash; Horizontal Feed Layouts</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.55,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Three horizontal card formats for article feeds: a standard article card
        with thumbnail, a compact text-only list item, and a featured story card
        with large hero image.
      </p>
      <div
        className="mb-4"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 640,
        }}
      >
        <ArticleCard />
        <div
          style={{
            background: "var(--dd-paper-white)",
            borderRadius: "var(--dd-radius-md)",
            border: "1px solid var(--dd-paper-grey)",
            padding: "0 16px",
          }}
        >
          <CompactListItem />
          <CompactListItem />
        </div>
      </div>
      <div
        className="mb-4"
        style={{ maxWidth: 640 }}
      >
        <FeaturedStoryCard />
      </div>
      <SectionNote>
        Article card: 120px square thumb &bull; Compact: no image, dot bullet,
        thin bottom border &bull; Featured: 16:9 hero, 0px radius top
      </SectionNote>

      {/* ──────── 3. Stat / Metric Cards ──────── */}
      <SectionLabel>Stat &amp; Metric Cards</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.55,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Four metric card variants: Big Number with trend indicator, Comparison
        with side-by-side values, Progress with a donut ring, and Sparkline Stat
        with inline chart. All share a 3px black top border.
      </p>
      <div
        className="mb-4"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <BigNumberStat />
        <ComparisonStat />
        <ProgressStat />
        <SparklineStat />
      </div>
      <SectionNote>
        All stat cards: 3px black top border &bull; white bg &bull;
        var(--dd-radius-sm) bottom corners &bull; 20px padding
      </SectionNote>

      {/* ──────── 4. Badge System ──────── */}
      <SectionLabel>Badge System</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          lineHeight: 1.55,
          marginBottom: 16,
          maxWidth: 640,
        }}
      >
        Twelve category badges using 10px uppercase Franklin Gothic with 1.5px
        borders and 0.08em letter-spacing. Color encodes content type.
        &ldquo;Breaking&rdquo; fills its background; &ldquo;Live&rdquo; shows a
        pulsing red dot indicator.
      </p>
      <div className="flex flex-wrap gap-3 mb-4">
        {BADGES.map((b) => (
          <span
            key={b.label}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: b.color,
              border: `1.5px solid ${b.borderColor}`,
              borderRadius: "var(--dd-radius-xs)",
              padding: "3px 8px",
              background: b.bg ?? "transparent",
            }}
          >
            {b.pulseDot && (
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--dd-viz-red)",
                  boxShadow: "0 0 0 2px rgba(239,68,68,0.3)",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
            {b.label}
          </span>
        ))}
      </div>
      <SectionNote>
        Badge spec: inline-flex &bull; Franklin Gothic 10px &bull; uppercase
        &bull; 0.08em tracking &bull; 1.5px border &bull; 3px 8px padding
      </SectionNote>

      {/* Pulse animation keyframes via inline style tag */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

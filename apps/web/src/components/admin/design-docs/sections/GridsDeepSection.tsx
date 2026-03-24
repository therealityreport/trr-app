"use client";

/* ------------------------------------------------------------------ */
/*  Grids Deep Section — Advanced grid pattern specimens              */
/* ------------------------------------------------------------------ */

function GridCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--dd-ink-faint)",
        borderRadius: "var(--dd-radius-lg)",
        overflow: "hidden",
        marginBottom: "var(--dd-space-xl)",
      }}
    >
      <div
        style={{
          padding: "12px var(--dd-space-lg)",
          borderBottom: "1px solid var(--dd-ink-faint)",
          background: "var(--dd-paper-cool)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 12,
            color: "var(--dd-ink-soft)",
            marginTop: 4,
          }}
        >
          {description}
        </div>
      </div>
      <div style={{ padding: "var(--dd-space-lg)" }}>{children}</div>
    </div>
  );
}

function GridCell({
  label,
  bg = "var(--dd-paper-grey)",
  height,
  style: extraStyle,
}: {
  label: string;
  bg?: string;
  height?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: "var(--dd-radius-sm)",
        border: "1px solid var(--dd-ink-faint)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
        color: "var(--dd-ink-soft)",
        minHeight: height ?? 80,
        padding: 8,
        textAlign: "center",
        ...extraStyle,
      }}
    >
      {label}
    </div>
  );
}

export default function GridsDeepSection() {
  return (
    <div>
      <div className="dd-section-label">Grids</div>
      <h2 className="dd-section-title">Advanced Grid Patterns</h2>
      <p className="dd-section-desc">
        Six advanced layout patterns that cover the range of TRR use cases &mdash;
        from masonry editorial layouts to structured dashboard grids. Each pattern
        maps to a specific content scenario.
      </p>

      {/* ── 1. Masonry Grid ─────────────────────────────── */}
      <GridCard
        title="Masonry Grid"
        description="CSS columns for variable-height content. Use for gallery, portfolio, or mixed-media feeds."
      >
        <div
          style={{
            columnCount: 3,
            columnGap: 12,
          }}
        >
          {[180, 240, 150, 200, 280, 160, 220, 350, 190].map((h, i) => (
            <div
              key={i}
              style={{
                background: "var(--dd-paper-grey)",
                border: "1px solid var(--dd-ink-faint)",
                borderRadius: "var(--dd-radius-sm)",
                height: h,
                marginBottom: 12,
                breakInside: "avoid",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
              }}
            >
              {h}px
            </div>
          ))}
        </div>
      </GridCard>

      {/* ── 2. Asymmetric Editorial ─────────────────────── */}
      <GridCard
        title="Asymmetric Editorial"
        description="Alternating 2/3 + 1/3 split for magazine-style layouts. NYT Magazine pattern."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Row 1: 2/3 + 1/3 */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <GridCell label="Featured — 2/3" height={200} bg="var(--dd-paper-grey)" />
            <GridCell label="Sidebar — 1/3" height={200} bg="var(--dd-paper-cool)" />
          </div>
          {/* Row 2: 1/3 + 2/3 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <GridCell label="Sidebar — 1/3" height={180} bg="var(--dd-paper-cool)" />
            <GridCell label="Feature — 2/3" height={180} bg="var(--dd-paper-grey)" />
          </div>
        </div>
      </GridCard>

      {/* ── 3. Dashboard Grid ───────────────────────────── */}
      <GridCard
        title="Dashboard Grid"
        description="Complex grid-template-areas for admin and analytics dashboards."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr 1fr",
            gridTemplateRows: "48px 1fr 60px",
            gridTemplateAreas: `
              "header  header  header"
              "sidebar main    main"
              "sidebar stats   stats"
            `,
            gap: 12,
            minHeight: 280,
          }}
        >
          <GridCell label="Header" style={{ gridArea: "header" }} bg="var(--dd-paper-grey)" />
          <GridCell label="Sidebar" style={{ gridArea: "sidebar" }} bg="var(--dd-paper-cool)" />
          <GridCell label="Main Content" style={{ gridArea: "main" }} bg="var(--dd-paper-grey)" />
          <div
            style={{
              gridArea: "stats",
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {["Views", "Users", "Revenue", "Growth"].map((s) => (
              <GridCell key={s} label={s} height={48} bg="var(--dd-paper-cool)" />
            ))}
          </div>
        </div>
      </GridCard>

      {/* ── 4. Bento Grid ───────────────────────────────── */}
      <GridCard
        title="Bento Grid"
        description="Modern bento-box layout with mixed cell sizes. Use for feature showcases and landing pages."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(3, 100px)",
            gap: 12,
          }}
        >
          {/* 2x2 cell */}
          <GridCell
            label="2 x 2"
            bg="var(--dd-viz-blue)"
            style={{ gridColumn: "1 / 3", gridRow: "1 / 3", color: "#fff", opacity: 0.85 }}
          />
          {/* 1x1 cells */}
          <GridCell label="1 x 1" bg="var(--dd-viz-red)" style={{ color: "#fff", opacity: 0.85 }} />
          {/* 1x2 tall */}
          <GridCell
            label="1 x 2"
            bg="var(--dd-viz-teal)"
            style={{ gridRow: "1 / 3", color: "#fff", opacity: 0.85 }}
          />
          {/* 1x1 */}
          <GridCell label="1 x 1" bg="var(--dd-viz-green)" style={{ color: "#fff", opacity: 0.85 }} />
          {/* 2x1 wide */}
          <GridCell
            label="2 x 1"
            bg="var(--dd-viz-orange)"
            style={{ gridColumn: "1 / 3", color: "#fff", opacity: 0.85 }}
          />
          {/* 1x1 */}
          <GridCell label="1 x 1" bg="var(--dd-viz-purple)" style={{ color: "#fff", opacity: 0.85 }} />
          {/* 1x1 */}
          <GridCell label="1 x 1" bg="var(--dd-accent-saffron)" style={{ color: "#fff", opacity: 0.85 }} />
        </div>
      </GridCard>

      {/* ── 5. Newspaper Column Grid ────────────────────── */}
      <GridCard
        title="Newspaper Column Grid"
        description="4-column newspaper layout with spanning headline. Classic print editorial pattern."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Spanning headline */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <div
              style={{
                gridColumn: "1 / 3",
                background: "var(--dd-paper-grey)",
                border: "1px solid var(--dd-ink-faint)",
                borderRadius: "var(--dd-radius-sm)",
                padding: "var(--dd-space-lg)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.01em",
                }}
              >
                Spanning Headline Across Two Columns
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 14,
                  color: "var(--dd-ink-soft)",
                  marginTop: 8,
                }}
              >
                Subhead or summary deck for the lead story
              </div>
            </div>
          </div>
          {/* 4 columns of body text */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            {[1, 2, 3, 4].map((col) => (
              <div
                key={col}
                style={{
                  background: "var(--dd-paper-cool)",
                  border: "1px solid var(--dd-ink-faint)",
                  borderRadius: "var(--dd-radius-sm)",
                  padding: 12,
                  minHeight: 140,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--dd-font-body)",
                    fontSize: 11,
                    lineHeight: 1.6,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  Column {col} &mdash; Body text flows across multiple columns
                  in classic newspaper fashion. Each column maintains consistent
                  measure for optimal reading comfort.
                </div>
              </div>
            ))}
          </div>
        </div>
      </GridCard>

      {/* ── 6. Featured + Supporting ────────────────────── */}
      <GridCard
        title="Featured + Supporting"
        description="Large featured card above smaller supporting cards. Standard editorial content pattern."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Featured */}
          <div
            style={{
              background: "var(--dd-paper-grey)",
              border: "1px solid var(--dd-ink-faint)",
              borderRadius: "var(--dd-radius-md)",
              padding: "var(--dd-space-xl)",
              minHeight: 180,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--dd-viz-blue)",
                marginBottom: 6,
              }}
            >
              Featured
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 24,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
              }}
            >
              Lead Story Headline
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                color: "var(--dd-ink-soft)",
                marginTop: 8,
              }}
            >
              A brief summary of the lead story with enough text to show hierarchy.
            </div>
          </div>
          {/* Supporting cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {["Analysis", "Opinion", "Data"].map((cat) => (
              <div
                key={cat}
                style={{
                  background: "var(--dd-paper-cool)",
                  border: "1px solid var(--dd-ink-faint)",
                  borderRadius: "var(--dd-radius-md)",
                  padding: "var(--dd-space-lg)",
                  minHeight: 120,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--dd-viz-teal)",
                    marginBottom: 6,
                  }}
                >
                  {cat}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--dd-ink-black)",
                    lineHeight: 1.25,
                  }}
                >
                  Supporting Story
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-body)",
                    fontSize: 12,
                    color: "var(--dd-ink-soft)",
                    marginTop: 6,
                  }}
                >
                  Brief description of the supporting content.
                </div>
              </div>
            ))}
          </div>
        </div>
      </GridCard>
    </div>
  );
}

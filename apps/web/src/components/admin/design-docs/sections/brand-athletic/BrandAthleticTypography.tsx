"use client";

import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Typography                                        */
/*  Font families, weights, roles, specimens from NFL article          */
/* ------------------------------------------------------------------ */

const athleticArticles = ARTICLES.filter((a) => a.url.includes("/athletic/"));
const nflArticle = athleticArticles.find(
  (a) => a.id === "nfl-playoff-coaches-fourth-down",
);

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
        color: "#121212",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid #121212",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--dd-ink-black)",
        marginBottom: 8,
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

/* ── Font data from NFL article ─────────────────────────────────────── */

interface FontEntry {
  name: string;
  fullStack: string;
  weights: number[];
  role: string;
  usedIn: string[];
}

function getFonts(): FontEntry[] {
  if (!nflArticle || !nflArticle.fonts) return [];
  return nflArticle.fonts.map((f) => ({
    name: f.name as string,
    fullStack: f.fullStack as string,
    weights: [...f.weights] as number[],
    role: f.role as string,
    usedIn: [...f.usedIn] as string[],
  }));
}

/* ── Font specimen helpers ──────────────────────────────────────────── */

function CheltenhamSpecimen() {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
      <div
        style={{
          fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
          fontWeight: 400,
          fontSize: 40,
          color: "#FFFFFF",
          lineHeight: 1.1,
          marginBottom: 8,
        }}
      >
        Ranking NFL playoff coaches by who gives their team biggest edge on fourth down
      </div>
      <div
        style={{
          fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
          fontWeight: 700,
          fontSize: 30,
          color: "#FFFFFF",
          lineHeight: 1.2,
          marginBottom: 8,
        }}
      >
        Takeaways
      </div>
      <div
        style={{
          fontFamily: 'nyt-cheltenham, georgia, "times new roman", times, serif',
          fontWeight: 500,
          fontSize: 24,
          color: "#FFFFFF",
          lineHeight: 1.2,
          marginBottom: 4,
        }}
      >
        Let&rsquo;s go LaFleur it
      </div>
      <SpecimenMeta text="nyt-cheltenham: 400 (h1) / 700 (h2 section heads) / 500 (h3 sub-sections)" />
    </div>
  );
}

function FranklinSpecimen() {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline", marginBottom: 12 }}>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: "#FFFFFF",
            lineHeight: 1,
          }}
        >
          Super Bowl LX
        </span>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 14,
            color: "#52524F",
          }}
        >
          Seahawks Dominate Patriots
        </span>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 12,
            letterSpacing: "0.02em",
            textTransform: "uppercase" as const,
            color: "#969693",
          }}
        >
          Advertisement
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: "0.25px",
            color: "#DBDBD9",
          }}
        >
          By <span style={{ fontWeight: 700, textDecoration: "underline" }}>Austin Mock</span>
        </span>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 13,
            color: "#888888",
          }}
        >
          Jan. 9, 2026
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 12,
            color: "#121212",
            background: "#F0F0EE",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          Share full article
        </span>
        <span
          style={{
            fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
            fontWeight: 500,
            fontSize: 12,
            color: "#121212",
            background: "#F0F0EE",
            borderRadius: 4,
            padding: "4px 10px",
          }}
        >
          46
        </span>
      </div>
      <SpecimenMeta text="nyt-franklin: 300-700 | UI chrome, nav, pills, byline, Datawrapper, storyline, ads" />
    </div>
  );
}

function ImperialSpecimen() {
  return (
    <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #3A3A5C" }}>
      <div
        style={{
          fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1.5,
          color: "#E0E0E0",
          maxWidth: 640,
          marginBottom: 8,
        }}
      >
        There will be times during the playoffs when coaches must make crucial fourth-down
        decisions. Who&rsquo;s most likely to make the right call? We dug into the data to
        find which NFL coaches are giving their teams the biggest edge &mdash; and which
        ones are leaving points on the table.
      </div>
      <div
        style={{
          fontFamily: '"nyt-imperial", georgia, "times new roman", times, serif',
          fontSize: 14,
          fontWeight: 500,
          color: "#888888",
          marginBottom: 4,
        }}
      >
        Illustration: Will Tullos / The Athletic; Nic Antaya, Bruce Yeung and Logan Bowles / Getty Images
      </div>
      <SpecimenMeta text="nyt-imperial: 400 (body 20px/30px) / 500 (captions 14px)" />
    </div>
  );
}

function RegularSlabSpecimen() {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          background: "#121212",
          borderRadius: 8,
          padding: "12px 20px",
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {["NFL", "NBA", "MLB", "NHL", "Soccer"].map((league) => (
          <span
            key={league}
            style={{
              fontFamily: "RegularSlab, serif",
              fontWeight: 400,
              fontSize: 18,
              letterSpacing: "0.18px",
              color: "#FFFFFF",
              lineHeight: 1,
            }}
          >
            {league}
          </span>
        ))}
      </div>
      <SpecimenMeta text="RegularSlab: 400 / 18px / Nav bar league labels — wordmark-style slab serif" />
    </div>
  );
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticTypography() {
  const fonts = getFonts();

  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
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
            color: "var(--dd-ink-black)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Typography
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.5,
          }}
        >
          Font families, weights, and usage patterns from the NFL fourth-down article
        </div>
      </div>

      {/* ── Font Specimens ─────────────────────────────── */}
      <SectionLabel id="font-specimens">Font Specimens</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
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
          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "#FFFFFF", marginBottom: 8 }}>
            nyt-cheltenham &mdash; Headlines &amp; Section Heads
          </div>
          <CheltenhamSpecimen />

          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "#FFFFFF", marginBottom: 8 }}>
            nyt-franklin &mdash; UI Chrome, Nav, Datawrapper
          </div>
          <FranklinSpecimen />

          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "#FFFFFF", marginBottom: 8 }}>
            nyt-imperial &mdash; Body Text
          </div>
          <ImperialSpecimen />

          <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 600, color: "#FFFFFF", marginBottom: 8 }}>
            RegularSlab &mdash; Nav Bar League Labels
          </div>
          <RegularSlabSpecimen />

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
              Type Scale (Athletic article)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "baseline" }}>
              {[40, 30, 24, 20, 18, 16, 15, 14, 13, 12, 11].map((s) => (
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
      </div>

      {/* ── Dynamic Font Cards ──────────────────────────── */}
      <SectionLabel id="font-cards">Font Family Cards</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {fonts.map((f) => (
          <div
            key={f.name}
            className="rounded-xl border border-zinc-200 bg-white shadow-sm"
            style={{
              padding: "20px 24px",
            }}
          >
            {/* Font name + role */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--dd-ink-black)",
                }}
              >
                {f.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "#121212",
                }}
              >
                {f.weights.join(", ")}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-faint)",
                lineHeight: 1.4,
                marginBottom: 12,
              }}
            >
              {f.role}
            </div>

            {/* Full font stack */}
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginBottom: 12,
                background: "#fafafa",
                borderRadius: 4,
                padding: "6px 10px",
                overflowX: "auto",
              }}
            >
              {f.fullStack}
            </div>

            {/* Used-in entries */}
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
              }}
            >
              Usage ({f.usedIn.length} entries)
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {f.usedIn.map((entry, i) => (
                <div
                  key={i}
                  style={{
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 11,
                    color: "var(--dd-ink-faint)",
                    lineHeight: 1.4,
                    background: "#fafafa",
                    borderRadius: 3,
                    padding: "4px 8px",
                    overflowX: "auto",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Weight specimens rendered ─────────────────── */}
      <SectionLabel id="weight-ramp">Weight Ramp</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
        style={{
          padding: "28px 32px",
          marginBottom: 40,
        }}
      >
        {[
          { name: "nyt-cheltenham", stack: 'nyt-cheltenham, georgia, "times new roman", times, serif', weights: [400, 500, 700] },
          { name: "nyt-franklin", stack: '"nyt-franklin", helvetica, arial, sans-serif', weights: [300, 400, 500, 600, 700] },
          { name: "nyt-imperial", stack: '"nyt-imperial", georgia, "times new roman", times, serif', weights: [400, 500] },
        ].map((fam) => (
          <div key={fam.name} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "#121212",
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {fam.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "baseline" }}>
              {fam.weights.map((w) => (
                <div key={w} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: fam.stack,
                      fontWeight: w,
                      fontSize: 28,
                      color: "var(--dd-ink-black)",
                      lineHeight: 1.2,
                    }}
                  >
                    Aa
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 10,
                      color: "var(--dd-ink-faint)",
                      marginTop: 4,
                    }}
                  >
                    {w}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* RegularSlab weight */}
        <div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "#121212",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            RegularSlab
          </div>
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                fontFamily: "RegularSlab, serif",
                fontWeight: 400,
                fontSize: 28,
                color: "var(--dd-ink-black)",
                lineHeight: 1.2,
              }}
            >
              Aa
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 4,
              }}
            >
              400
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

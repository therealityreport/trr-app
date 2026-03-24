"use client";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function SpecimenLabel({ children }: { children: React.ReactNode }) {
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
        marginTop: 24,
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
        color: "var(--dd-ink-faint)",
        marginTop: 6,
      }}
    >
      {text}
    </div>
  );
}

function FontCard({
  name,
  role,
  cssVar,
  borderColor,
  children,
}: {
  name: string;
  role: string;
  cssVar: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-12"
      style={{
        border: "1px solid var(--dd-paper-grey, #e0e0e0)",
        borderRadius: "var(--dd-radius-md, 6px)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          borderTop: `3px solid ${borderColor}`,
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--dd-paper-grey, #e0e0e0)",
          background: "var(--dd-paper-cool, #fafafa)",
        }}
      >
        <div
          style={{
            fontFamily: cssVar,
            fontWeight: 700,
            fontSize: 28,
            color: "var(--dd-ink-black)",
            marginBottom: 4,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "var(--dd-ink-soft)",
          }}
        >
          {role} &mdash;{" "}
          <span
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 11,
              color: "var(--dd-ink-faint)",
            }}
          >
            {cssVar.replace("var(", "").replace(")", "")}
          </span>
        </div>
      </div>
      <div style={{ padding: "20px 24px 24px" }}>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function FontsShowcaseSection() {
  return (
    <div>
      <div className="dd-section-label">Font Specimens</div>
      <h2 className="dd-section-title">Full Typeface Showcase</h2>
      <p className="dd-section-desc">
        Complete specimens for every TRR typeface, rendered live from R2 CDN via
        CSS custom properties. Each panel shows weight ramps, alphabets, size
        scales, and contextual pairings.
      </p>

      {/* ============================================================ */}
      {/*  CHELTENHAM                                                  */}
      {/* ============================================================ */}
      <FontCard
        name="Cheltenham"
        role="Headline Serif"
        cssVar="var(--dd-font-headline)"
        borderColor="var(--dd-accent-saffron)"
      >
        {/* Weight ramp */}
        <SpecimenLabel>Weight Ramp</SpecimenLabel>
        <div className="flex flex-wrap gap-8 mb-6">
          {([
            [300, "Light"],
            [400, "Regular"],
            [700, "Bold"],
            [900, "Ultra"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: weight,
                  fontSize: 32,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Aa
              </div>
              <SpecimenMeta text={`${label} ${weight}`} />
            </div>
          ))}
        </div>

        {/* Size scale */}
        <SpecimenLabel>Size Scale</SpecimenLabel>
        <div className="space-y-3 mb-6">
          {[72, 56, 42, 36, 28, 18, 12].map((size) => (
            <div key={size} className="flex items-baseline gap-3">
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  width: 36,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {size}px
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: size,
                  lineHeight: 1.1,
                  color: "var(--dd-ink-black)",
                  letterSpacing: "-0.02em",
                }}
              >
                Headlines Set the Tone
              </div>
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet &mdash; 700</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 700,
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            letterSpacing: "0.01em",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* Tracking specimens */}
        <SpecimenLabel>Tracking Specimens</SpecimenLabel>
        <div className="space-y-3 mb-6">
          {([
            ["-0.02em", "Tight (headlines)"],
            ["0", "Normal"],
            ["+0.01em", "Slight open"],
          ] as const).map(([tracking, label]) => (
            <div key={tracking}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: tracking,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.15,
                }}
              >
                The Reality Report
              </div>
              <SpecimenMeta text={`tracking: ${tracking} — ${label}`} />
            </div>
          ))}
        </div>

        {/* Headline + Deck pairing */}
        <SpecimenLabel>Headline + Deck Pairing</SpecimenLabel>
        <div style={{ maxWidth: 640 }}>
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontWeight: 900,
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--dd-ink-black)",
              marginBottom: 12,
            }}
          >
            Streaming Wars Intensify as Networks Bet Big on Unscripted
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontWeight: 400,
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--dd-ink-medium)",
            }}
          >
            Major platforms are pouring unprecedented budgets into reality
            programming, reshaping the competitive landscape as linear viewership
            continues its steady decline.
          </div>
        </div>
      </FontCard>

      {/* ============================================================ */}
      {/*  GLOUCESTER                                                  */}
      {/* ============================================================ */}
      <FontCard
        name="Gloucester"
        role="Display &amp; Body Serif"
        cssVar="var(--dd-font-body)"
        borderColor="var(--dd-viz-blue)"
      >
        {/* Weight ramp */}
        <SpecimenLabel>Weights</SpecimenLabel>
        <div className="flex flex-wrap gap-8 mb-6">
          {([
            [400, "Regular"],
            [700, "Bold"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontWeight: weight,
                  fontSize: 32,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Aa
              </div>
              <SpecimenMeta text={`${label} ${weight}`} />
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontWeight: 400,
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            letterSpacing: "0.01em",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* Line-height specimens */}
        <SpecimenLabel>Body Text &mdash; Line-Height Comparison</SpecimenLabel>
        <div className="grid grid-cols-3 gap-6 mb-6">
          {([1.4, 1.55, 1.7] as const).map((lh) => (
            <div key={lh}>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontWeight: 400,
                  fontSize: 16,
                  lineHeight: lh,
                  color: "var(--dd-ink-medium)",
                  marginBottom: 8,
                }}
              >
                Reality television has undergone a remarkable transformation in
                the streaming era, with platforms investing heavily in unscripted
                content that drives subscriber engagement and social conversation.
              </div>
              <SpecimenMeta text={`16px / line-height: ${lh}`} />
            </div>
          ))}
        </div>

        {/* Body paragraph */}
        <SpecimenLabel>Body Paragraph &mdash; 18px</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontWeight: 400,
            fontSize: 18,
            lineHeight: 1.7,
            color: "var(--dd-ink-medium)",
            maxWidth: 640,
          }}
        >
          The economics of reality programming have shifted dramatically. Where
          networks once viewed unscripted series as inexpensive filler, today&apos;s
          top franchises command budgets that rival scripted dramas. Production
          values have climbed in tandem with audience expectations, creating a
          virtuous cycle that rewards investment with engagement.
        </div>
      </FontCard>

      {/* ============================================================ */}
      {/*  FRANKLIN GOTHIC                                             */}
      {/* ============================================================ */}
      <FontCard
        name="Franklin Gothic"
        role="Data &amp; UI Sans-Serif"
        cssVar="var(--dd-font-sans)"
        borderColor="var(--dd-viz-green)"
      >
        {/* Weight ramp */}
        <SpecimenLabel>Weight Ramp</SpecimenLabel>
        <div className="flex flex-wrap gap-8 mb-6">
          {([
            [400, "Book"],
            [500, "Medium"],
            [600, "Demi"],
            [800, "Heavy"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: weight,
                  fontSize: 28,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Aa
              </div>
              <SpecimenMeta text={`${label} ${weight}`} />
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontWeight: 500,
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            letterSpacing: "0.01em",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* Data label specimens */}
        <SpecimenLabel>Data Label Sizes</SpecimenLabel>
        <div className="flex flex-wrap gap-8 mb-6">
          {[10, 11, 12, 13, 14].map((size) => (
            <div key={size}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 600,
                  fontSize: size,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--dd-ink-medium)",
                  marginBottom: 4,
                }}
              >
                Total Viewers
              </div>
              <SpecimenMeta text={`${size}px / 600 / uppercase`} />
            </div>
          ))}
        </div>

        {/* Tracking specimens */}
        <SpecimenLabel>Uppercase Tracking</SpecimenLabel>
        <div className="space-y-3 mb-6">
          {([
            ["0.08em", "Standard labels"],
            ["0.12em", "Section headers"],
            ["0.14em", "Kickers & overlines"],
          ] as const).map(([tracking, label]) => (
            <div key={tracking}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase" as const,
                  letterSpacing: tracking,
                  color: "var(--dd-ink-black)",
                }}
              >
                Season 14 Premiere Ratings
              </div>
              <SpecimenMeta text={`tracking: ${tracking} — ${label}`} />
            </div>
          ))}
        </div>
      </FontCard>

      {/* ============================================================ */}
      {/*  HAMBURG SERIAL                                              */}
      {/* ============================================================ */}
      <FontCard
        name="Hamburg Serial"
        role="UI &amp; Interface"
        cssVar="var(--dd-font-ui)"
        borderColor="var(--dd-viz-orange)"
      >
        {/* Weight ramp */}
        <SpecimenLabel>Weight Ramp</SpecimenLabel>
        <div className="flex flex-wrap gap-6 mb-6">
          {([
            [200, "ExtraLight"],
            [300, "Light"],
            [400, "Regular"],
            [500, "Medium"],
            [600, "SemiBold"],
            [700, "Bold"],
            [800, "ExtraBold"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontWeight: weight,
                  fontSize: 24,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Aa
              </div>
              <SpecimenMeta text={`${label} ${weight}`} />
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontWeight: 400,
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* Weight ramp paragraph */}
        <SpecimenLabel>Weight Ramp Paragraph</SpecimenLabel>
        <div style={{ maxWidth: 600, marginBottom: 16 }}>
          {([200, 300, 400, 500, 600, 700, 800] as const).map((w) => (
            <span
              key={w}
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: w,
                fontSize: 16,
                color: "var(--dd-ink-black)",
                lineHeight: 1.7,
              }}
            >
              Hamburg Serial {w}.{" "}
            </span>
          ))}
        </div>

        {/* UI context */}
        <SpecimenLabel>UI Context Specimens</SpecimenLabel>
        <div className="flex flex-wrap gap-4">
          {([
            ["Button Label", 500, 13, "0.04em"],
            ["Navigation Link", 400, 14, "0"],
            ["Tab Active", 600, 13, "0.02em"],
            ["Badge Text", 700, 10, "0.06em"],
          ] as const).map(([text, weight, size, tracking]) => (
            <div
              key={text}
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: weight,
                fontSize: size,
                letterSpacing: tracking,
                color: "var(--dd-ink-black)",
                background: "var(--dd-paper-cool, #fafafa)",
                border: "1px solid var(--dd-paper-grey, #e0e0e0)",
                padding: "8px 16px",
                borderRadius: "var(--dd-radius-sm, 3px)",
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </FontCard>

      {/* ============================================================ */}
      {/*  STYMIE                                                      */}
      {/* ============================================================ */}
      <FontCard
        name="Stymie"
        role="Slab Serif &amp; Pull-Quotes"
        cssVar="var(--dd-font-slab)"
        borderColor="var(--dd-viz-red)"
      >
        {/* Weight ramp */}
        <SpecimenLabel>Weight Ramp</SpecimenLabel>
        <div className="flex flex-wrap gap-8 mb-6">
          {([
            [300, "Light"],
            [500, "Medium"],
            [700, "Bold"],
            [900, "Black"],
          ] as const).map(([weight, label]) => (
            <div key={weight}>
              <div
                style={{
                  fontFamily: "var(--dd-font-slab)",
                  fontWeight: weight,
                  fontSize: 32,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                Aa
              </div>
              <SpecimenMeta text={`${label} ${weight}`} />
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-slab)",
            fontWeight: 500,
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* Slab headline specimens */}
        <SpecimenLabel>Slab Headlines</SpecimenLabel>
        <div className="space-y-4 mb-8">
          {([
            [900, 36, "Black 36px"],
            [700, 28, "Bold 28px"],
            [500, 22, "Medium 22px"],
          ] as const).map(([weight, size, meta]) => (
            <div key={meta}>
              <div
                style={{
                  fontFamily: "var(--dd-font-slab)",
                  fontWeight: weight,
                  fontSize: size,
                  lineHeight: 1.15,
                  color: "var(--dd-ink-black)",
                }}
              >
                Viewer Data Tells a Different Story
              </div>
              <SpecimenMeta text={meta} />
            </div>
          ))}
        </div>

        {/* Pull-quote specimens */}
        <SpecimenLabel>Pull-Quote Specimens</SpecimenLabel>
        <div className="space-y-6">
          {([
            [300, 24, "Light italic pull-quote"],
            [700, 20, "Bold pull-quote"],
          ] as const).map(([weight, size, meta]) => (
            <div
              key={meta}
              style={{
                borderLeft: "3px solid var(--dd-accent-saffron)",
                paddingLeft: 20,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-slab)",
                  fontWeight: weight,
                  fontStyle: weight === 300 ? "italic" : "normal",
                  fontSize: size,
                  lineHeight: 1.45,
                  color: "var(--dd-ink-black)",
                  maxWidth: 540,
                }}
              >
                &ldquo;The numbers don&rsquo;t lie&mdash;audiences are choosing
                authenticity over production gloss, and the smartest producers are
                listening.&rdquo;
              </div>
              <SpecimenMeta text={meta} />
            </div>
          ))}
        </div>
      </FontCard>

      {/* ============================================================ */}
      {/*  CHOMSKY                                                     */}
      {/* ============================================================ */}
      <FontCard
        name="Chomsky"
        role="Blackletter Masthead"
        cssVar="var(--dd-font-masthead)"
        borderColor="var(--dd-ink-black)"
      >
        {/* Size specimens */}
        <SpecimenLabel>Masthead Sizes</SpecimenLabel>
        <div className="space-y-6 mb-8">
          {[48, 36, 24].map((size) => (
            <div key={size}>
              <div
                style={{
                  fontFamily: "var(--dd-font-masthead)",
                  fontSize: size,
                  color: "var(--dd-ink-black)",
                  lineHeight: 1.15,
                }}
              >
                The Reality Report
              </div>
              <SpecimenMeta text={`${size}px`} />
            </div>
          ))}
        </div>

        {/* Full alphabet */}
        <SpecimenLabel>Full Alphabet</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-masthead)",
            fontSize: 20,
            lineHeight: 1.6,
            color: "var(--dd-ink-black)",
            wordBreak: "break-all",
            marginBottom: 16,
          }}
        >
          {ALPHABET}
        </div>

        {/* With and without rules */}
        <SpecimenLabel>With &amp; Without Rules</SpecimenLabel>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-masthead)",
                fontSize: 32,
                color: "var(--dd-ink-black)",
                textAlign: "center",
                lineHeight: 1.2,
              }}
            >
              The Reality Report
            </div>
            <SpecimenMeta text="Without rules" />
          </div>
          <div>
            <div
              style={{
                borderTop: "1px solid var(--dd-ink-black)",
                borderBottom: "1px solid var(--dd-ink-black)",
                padding: "8px 0",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-masthead)",
                  fontSize: 32,
                  color: "var(--dd-ink-black)",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}
              >
                The Reality Report
              </div>
            </div>
            <SpecimenMeta text="With thin rules" />
          </div>
        </div>
      </FontCard>
    </div>
  );
}

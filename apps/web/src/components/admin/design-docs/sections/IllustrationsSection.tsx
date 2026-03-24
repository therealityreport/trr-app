"use client";

/* ------------------------------------------------------------------ */
/*  Illustrations Section — Rich editorial illustration specimens      */
/*  Inspired by NYT sub-brand visual styles                            */
/* ------------------------------------------------------------------ */

export default function IllustrationsSection() {
  return (
    <div>
      <div className="dd-section-label">Illustrations</div>
      <h2 className="dd-section-title">Illustration Style Guide</h2>
      <p className="dd-section-desc">
        TRR draws from the full range of NYT editorial illustration traditions
        &mdash; from Opinion&rsquo;s abstract geometric art to Cooking&rsquo;s
        warm hand-drawn feel, Games&rsquo; playful tile graphics, and the
        Magazine&rsquo;s bold brush-stroke covers. Each sub-brand has a distinct
        visual voice.
      </p>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  1. NYT Opinion Art Style                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">1 &middot; Opinion / Editorial Art</div>
      <div
        style={{
          borderRadius: "var(--dd-radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--dd-space-2xl)",
          border: "1px solid var(--dd-ink-faint)",
        }}
      >
        <div
          style={{
            background: "#0B1222",
            padding: "var(--dd-space-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 320,
            position: "relative",
          }}
        >
          <svg
            width="520"
            height="280"
            viewBox="0 0 520 280"
            fill="none"
            style={{ maxWidth: "100%" }}
          >
            {/* Large blush circle */}
            <circle cx="160" cy="150" r="110" fill="#DFC3D9" opacity={0.35} />
            {/* Powder blue circle overlapping */}
            <circle cx="280" cy="120" r="90" fill="#A1C6D4" opacity={0.4} />
            {/* Smaller rose circle */}
            <circle cx="220" cy="200" r="70" fill="#C37598" opacity={0.5} />
            {/* Lavender circle top-right */}
            <circle cx="380" cy="80" r="60" fill="#6568AB" opacity={0.45} />
            {/* Small accent circle */}
            <circle cx="420" cy="200" r="35" fill="#DFC3D9" opacity={0.3} />

            {/* Geometric cutting lines */}
            <line
              x1="40"
              y1="60"
              x2="480"
              y2="220"
              stroke="#A1C6D4"
              strokeWidth="1.5"
              opacity={0.6}
            />
            <line
              x1="100"
              y1="260"
              x2="450"
              y2="30"
              stroke="#C37598"
              strokeWidth="1"
              opacity={0.5}
            />
            <line
              x1="0"
              y1="140"
              x2="520"
              y2="140"
              stroke="#6568AB"
              strokeWidth="0.75"
              opacity={0.4}
            />
            <line
              x1="260"
              y1="0"
              x2="260"
              y2="280"
              stroke="#DFC3D9"
              strokeWidth="0.75"
              opacity={0.3}
            />

            {/* Angular geometric overlay */}
            <polygon
              points="320,40 460,120 380,200"
              stroke="#6568AB"
              strokeWidth="1"
              fill="#6568AB"
              opacity={0.08}
            />
            <polygon
              points="60,80 180,40 140,180"
              stroke="#C37598"
              strokeWidth="1"
              fill="#C37598"
              opacity={0.06}
            />

            {/* Small accent dots at intersections */}
            <circle cx="260" cy="140" r="4" fill="#DFC3D9" opacity={0.8} />
            <circle cx="340" cy="110" r="3" fill="#A1C6D4" opacity={0.8} />
            <circle cx="200" cy="170" r="3" fill="#C37598" opacity={0.8} />
          </svg>
        </div>
        <div
          style={{
            padding: "14px var(--dd-space-lg)",
            background: "#0B1222",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "#DFC3D9",
                letterSpacing: "0.04em",
              }}
            >
              Opinion / Editorial Art
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontStyle: "italic",
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                marginTop: 2,
              }}
            >
              Bold, abstract, conceptual &mdash; overlapping forms and muted
              pastels
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
            }}
          >
            {["#DFC3D9", "#A1C6D4", "#C37598", "#6568AB"].map((c) => (
              <div
                key={c}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  2. NYT Cooking Style                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">
        2 &middot; Lifestyle / Recipe Illustration
      </div>
      <div
        style={{
          borderRadius: "var(--dd-radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--dd-space-2xl)",
          border: "1px solid var(--dd-ink-faint)",
        }}
      >
        <div
          style={{
            background: "#FDF6EC",
            padding: "var(--dd-space-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 300,
          }}
        >
          <svg
            width="480"
            height="260"
            viewBox="0 0 480 260"
            fill="none"
            style={{ maxWidth: "100%" }}
          >
            {/* Large plate circle */}
            <circle
              cx="240"
              cy="140"
              r="90"
              stroke="#DF321B"
              strokeWidth="1.5"
              fill="none"
            />
            <circle
              cx="240"
              cy="140"
              r="80"
              stroke="#DF321B"
              strokeWidth="0.5"
              fill="none"
              opacity={0.4}
            />

            {/* Food elements on plate - abstract shapes */}
            <ellipse
              cx="225"
              cy="130"
              rx="25"
              ry="18"
              fill="#F8E19A"
              opacity={0.6}
            />
            <ellipse
              cx="260"
              cy="145"
              rx="20"
              ry="15"
              fill="#DF321B"
              opacity={0.2}
            />
            <circle cx="235" cy="150" r="8" fill="#DF321B" opacity={0.15} />

            {/* Small herb lines */}
            <path
              d="M210 120 Q215 110, 220 115"
              stroke="#5B9E5B"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M250 125 Q255 115, 260 120"
              stroke="#5B9E5B"
              strokeWidth="1"
              fill="none"
            />
            <path
              d="M240 118 Q242 108, 248 113"
              stroke="#5B9E5B"
              strokeWidth="1"
              fill="none"
            />

            {/* Fork - left side */}
            <line
              x1="100"
              y1="80"
              x2="120"
              y2="220"
              stroke="#9A8A78"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="92"
              y1="78"
              x2="97"
              y2="108"
              stroke="#9A8A78"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="100"
              y1="76"
              x2="103"
              y2="106"
              stroke="#9A8A78"
              strokeWidth="1"
              strokeLinecap="round"
            />
            <line
              x1="108"
              y1="78"
              x2="109"
              y2="108"
              stroke="#9A8A78"
              strokeWidth="1"
              strokeLinecap="round"
            />

            {/* Knife - right side */}
            <line
              x1="370"
              y1="75"
              x2="355"
              y2="225"
              stroke="#9A8A78"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M370 75 Q380 80, 378 110 L370 108"
              stroke="#9A8A78"
              strokeWidth="1"
              fill="none"
            />

            {/* Small ingredient squares - scattered */}
            <rect
              x="60"
              y="180"
              width="8"
              height="8"
              rx="1"
              fill="#DF321B"
              opacity={0.3}
              transform="rotate(15 64 184)"
            />
            <rect
              x="400"
              y="100"
              width="7"
              height="7"
              rx="1"
              fill="#F8E19A"
              opacity={0.5}
              transform="rotate(-10 403 103)"
            />
            <rect
              x="80"
              y="130"
              width="6"
              height="6"
              rx="1"
              fill="#5B9E5B"
              opacity={0.4}
            />
            <rect
              x="410"
              y="170"
              width="9"
              height="9"
              rx="1"
              fill="#DF321B"
              opacity={0.2}
              transform="rotate(25 414 174)"
            />
            <rect
              x="420"
              y="130"
              width="5"
              height="5"
              rx="1"
              fill="#F8E19A"
              opacity={0.4}
              transform="rotate(-5 422 132)"
            />

            {/* Handwritten-feel labels */}
            <text
              x="55"
              y="50"
              fontFamily="var(--dd-font-display)"
              fontStyle="italic"
              fontSize="14"
              fill="#9A8A78"
              opacity={0.7}
            >
              farm fresh
            </text>
            <text
              x="370"
              y="50"
              fontFamily="var(--dd-font-display)"
              fontStyle="italic"
              fontSize="14"
              fill="#9A8A78"
              opacity={0.7}
            >
              seasonal
            </text>
            <text
              x="190"
              y="248"
              fontFamily="var(--dd-font-display)"
              fontStyle="italic"
              fontSize="13"
              fill="#DF321B"
              opacity={0.5}
            >
              simple &amp; delicious
            </text>
          </svg>
        </div>
        <div
          style={{
            padding: "14px var(--dd-space-lg)",
            background: "#FDF6EC",
            borderTop: "1px solid rgba(223,50,27,0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "#DF321B",
                letterSpacing: "0.04em",
              }}
            >
              Lifestyle / Recipe Illustration
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-display)",
                fontStyle: "italic",
                fontSize: 12,
                color: "#9A8A78",
                marginTop: 2,
              }}
            >
              Warm, inviting, approachable &mdash; line art with handwritten
              labels
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["#DF321B", "#FDF6EC", "#F8E19A", "#5B9E5B"].map((c) => (
              <div
                key={c}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: c,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  3. NYT Games Style                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">
        3 &middot; Games / Interactive Graphics
      </div>
      <div
        style={{
          borderRadius: "var(--dd-radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--dd-space-2xl)",
          border: "1px solid var(--dd-ink-faint)",
        }}
      >
        <div
          style={{
            background: "var(--dd-paper-white)",
            padding: "var(--dd-space-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 48,
            minHeight: 280,
            flexWrap: "wrap",
          }}
        >
          {/* Wordle-style tile grid 5x3 */}
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--dd-ink-faint)",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Wordle
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                ["#6AAA64", "#787C7E", "#C9B458", "#787C7E", "#6AAA64"],
                ["#787C7E", "#C9B458", "#6AAA64", "#6AAA64", "#787C7E"],
                ["#6AAA64", "#6AAA64", "#6AAA64", "#6AAA64", "#6AAA64"],
              ].map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 4 }}>
                  {row.map((color, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: 36,
                        height: 36,
                        background: color,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--dd-font-ui)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#fff",
                      }}
                    >
                      {["C", "R", "A", "N", "E"][ci]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Connections-style category groups */}
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--dd-ink-faint)",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Connections
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { bg: "#F9DF6D", label: "Types of Charts" },
                { bg: "#A0C35A", label: "Data Sources" },
                { bg: "#B0C4EF", label: "Color Models" },
                { bg: "#BA81C5", label: "Font Styles" },
              ].map((cat) => (
                <div
                  key={cat.label}
                  style={{
                    background: cat.bg,
                    padding: "8px 20px",
                    borderRadius: 4,
                    textAlign: "center",
                    fontFamily: "var(--dd-font-ui)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#1a1a1a",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    minWidth: 180,
                  }}
                >
                  {cat.label}
                </div>
              ))}
            </div>
          </div>

          {/* Mini crossword grid */}
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--dd-ink-faint)",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              Mini
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {[
                [1, 1, 1, 1, 0],
                [1, 0, 1, 1, 1],
                [1, 1, 1, 0, 1],
                [1, 1, 0, 1, 1],
                [0, 1, 1, 1, 1],
              ].map((row, ri) => (
                <div key={ri} style={{ display: "flex", gap: 1 }}>
                  {row.map((cell, ci) => (
                    <div
                      key={ci}
                      style={{
                        width: 28,
                        height: 28,
                        background: cell ? "#fff" : "#1a1a1a",
                        border: cell ? "1.5px solid #1a1a1a" : "none",
                        borderRadius: 1,
                        position: "relative",
                      }}
                    >
                      {cell === 1 &&
                        ri === 0 &&
                        ci === 0 && (
                          <span
                            style={{
                              position: "absolute",
                              top: 1,
                              left: 2,
                              fontSize: 7,
                              fontFamily: "var(--dd-font-ui)",
                              color: "#1a1a1a",
                            }}
                          >
                            1
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "14px var(--dd-space-lg)",
            borderTop: "1px solid var(--dd-ink-faint)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                letterSpacing: "0.04em",
              }}
            >
              Games / Interactive Graphics
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                marginTop: 2,
              }}
            >
              Playful, systematic, tile-based &mdash; structured color coding
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["#6AAA64", "#C9B458", "#787C7E", "#F9DF6D"].map((c) => (
              <div
                key={c}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 2,
                  background: c,
                  border: "1px solid rgba(0,0,0,0.1)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  4. NYT Magazine Style                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">4 &middot; Magazine / Cover Art</div>
      <div
        style={{
          borderRadius: "var(--dd-radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--dd-space-2xl)",
          border: "1px solid var(--dd-ink-faint)",
        }}
      >
        <div
          style={{
            background: "var(--dd-paper-white)",
            padding: "var(--dd-space-2xl)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 340,
            position: "relative",
          }}
        >
          <svg
            width="400"
            height="300"
            viewBox="0 0 400 300"
            fill="none"
            style={{ maxWidth: "100%" }}
          >
            {/* Bold brush-stroke elements with rounded linecaps */}
            {/* Main diagonal swoosh */}
            <path
              d="M40 260 Q80 180, 160 150 Q240 120, 320 40"
              stroke="var(--dd-viz-red)"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
              opacity={0.85}
            />
            {/* Secondary arc */}
            <path
              d="M60 40 Q140 100, 200 200 Q230 260, 360 240"
              stroke="var(--dd-accent-saffron)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              opacity={0.5}
            />
            {/* Thick vertical stroke */}
            <path
              d="M200 20 L200 280"
              stroke="var(--dd-viz-red)"
              strokeWidth="5"
              strokeLinecap="round"
              opacity={0.2}
            />
            {/* Horizontal balance stroke */}
            <path
              d="M30 150 L370 150"
              stroke="var(--dd-ink-black)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.1}
            />
            {/* Expressive splash shapes */}
            <circle
              cx="160"
              cy="150"
              r="40"
              fill="var(--dd-viz-red)"
              opacity={0.08}
            />
            <circle
              cx="280"
              cy="100"
              r="25"
              fill="var(--dd-accent-saffron)"
              opacity={0.12}
            />
            {/* Drip effect */}
            <path
              d="M160 190 Q162 220, 158 250"
              stroke="var(--dd-viz-red)"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              opacity={0.25}
            />
            <path
              d="M320 80 Q325 105, 318 130"
              stroke="var(--dd-accent-saffron)"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity={0.2}
            />

            {/* Magazine masthead-style heading */}
            <text
              x="200"
              y="155"
              textAnchor="middle"
              fontFamily="var(--dd-font-masthead)"
              fontSize="48"
              fill="var(--dd-ink-black)"
              opacity={0.9}
            >
              The Magazine
            </text>
            <text
              x="200"
              y="180"
              textAnchor="middle"
              fontFamily="var(--dd-font-sans)"
              fontSize="10"
              fontWeight="600"
              letterSpacing="0.25em"
              fill="var(--dd-ink-soft)"
              textDecoration="none"
            >
              BOLD &middot; ARTISTIC &middot; HIGH CONCEPT
            </text>
          </svg>
        </div>
        <div
          style={{
            padding: "14px var(--dd-space-lg)",
            borderTop: "1px solid var(--dd-ink-faint)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--dd-font-masthead)",
                fontSize: 15,
                color: "var(--dd-ink-black)",
              }}
            >
              Magazine / Cover Art
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontStyle: "italic",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                marginTop: 2,
              }}
            >
              Expressive brush strokes, vibrant accent against white, Chomsky
              mastheads
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["var(--dd-viz-red)", "var(--dd-accent-saffron)", "var(--dd-ink-black)"].map(
              (c, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: c,
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                />
              ),
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  5. Spot Illustrations Grid                                   */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">5 &middot; Spot Illustrations</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--dd-space-md)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {/* Economy */}
        <SpotCard label="Economy" color="var(--dd-viz-blue)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <polyline
              points="10,60 25,50 40,55 55,30 70,15"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="70" cy="15" r="3" fill="currentColor" />
            {/* Arrow head */}
            <polyline
              points="63,15 70,15 70,22"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Baseline */}
            <line
              x1="8"
              y1="68"
              x2="72"
              y2="68"
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.3}
            />
          </svg>
        </SpotCard>

        {/* Health */}
        <SpotCard label="Health" color="var(--dd-viz-red)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path
              d="M40 65 C40 65, 12 45, 12 28 C12 18, 20 12, 28 12 C33 12, 37 15, 40 20 C43 15, 47 12, 52 12 C60 12, 68 18, 68 28 C68 45, 40 65, 40 65Z"
              stroke="currentColor"
              strokeWidth="2"
              fill="currentColor"
              fillOpacity={0.12}
            />
          </svg>
        </SpotCard>

        {/* Politics */}
        <SpotCard label="Politics" color="var(--dd-ink-medium)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Dome */}
            <path
              d="M20 50 Q20 28, 40 20 Q60 28, 60 50"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            {/* Cupola */}
            <path
              d="M35 20 Q35 12, 40 10 Q45 12, 45 20"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <line
              x1="40"
              y1="10"
              x2="40"
              y2="6"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            {/* Columns */}
            <line
              x1="24"
              y1="50"
              x2="24"
              y2="62"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="36"
              y1="50"
              x2="36"
              y2="62"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="44"
              y1="50"
              x2="44"
              y2="62"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="56"
              y1="50"
              x2="56"
              y2="62"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* Base */}
            <line
              x1="16"
              y1="62"
              x2="64"
              y2="62"
              stroke="currentColor"
              strokeWidth="2.5"
            />
            {/* Steps */}
            <line
              x1="12"
              y1="66"
              x2="68"
              y2="66"
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.5}
            />
            <line
              x1="8"
              y1="70"
              x2="72"
              y2="70"
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.3}
            />
          </svg>
        </SpotCard>

        {/* Environment */}
        <SpotCard label="Environment" color="var(--dd-viz-green)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Tree trunk */}
            <line
              x1="40"
              y1="45"
              x2="40"
              y2="68"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Canopy layers */}
            <ellipse
              cx="40"
              cy="30"
              rx="22"
              ry="18"
              fill="currentColor"
              fillOpacity={0.15}
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <ellipse
              cx="32"
              cy="36"
              rx="14"
              ry="10"
              fill="currentColor"
              fillOpacity={0.1}
            />
            <ellipse
              cx="48"
              cy="36"
              rx="14"
              ry="10"
              fill="currentColor"
              fillOpacity={0.1}
            />
            {/* Ground */}
            <line
              x1="20"
              y1="68"
              x2="60"
              y2="68"
              stroke="currentColor"
              strokeWidth="1"
              opacity={0.3}
            />
            {/* Leaf accent */}
            <path
              d="M55 22 Q62 16, 60 24"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              opacity={0.5}
            />
          </svg>
        </SpotCard>

        {/* Technology */}
        <SpotCard label="Technology" color="var(--dd-viz-teal)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Circuit board pattern */}
            <rect
              x="20"
              y="20"
              width="40"
              height="40"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Inner chip */}
            <rect
              x="30"
              y="30"
              width="20"
              height="20"
              rx="2"
              fill="currentColor"
              fillOpacity={0.12}
              stroke="currentColor"
              strokeWidth="1"
            />
            {/* Traces */}
            <line
              x1="30"
              y1="36"
              x2="20"
              y2="36"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="30"
              y1="44"
              x2="20"
              y2="44"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="50"
              y1="36"
              x2="60"
              y2="36"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="50"
              y1="44"
              x2="60"
              y2="44"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="36"
              y1="30"
              x2="36"
              y2="20"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="44"
              y1="30"
              x2="44"
              y2="20"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="36"
              y1="50"
              x2="36"
              y2="60"
              stroke="currentColor"
              strokeWidth="1"
            />
            <line
              x1="44"
              y1="50"
              x2="44"
              y2="60"
              stroke="currentColor"
              strokeWidth="1"
            />
            {/* Trace dots */}
            <circle cx="20" cy="36" r="2" fill="currentColor" />
            <circle cx="20" cy="44" r="2" fill="currentColor" />
            <circle cx="60" cy="36" r="2" fill="currentColor" />
            <circle cx="60" cy="44" r="2" fill="currentColor" />
            <circle cx="36" cy="20" r="2" fill="currentColor" />
            <circle cx="44" cy="20" r="2" fill="currentColor" />
            <circle cx="36" cy="60" r="2" fill="currentColor" />
            <circle cx="44" cy="60" r="2" fill="currentColor" />
          </svg>
        </SpotCard>

        {/* Culture */}
        <SpotCard label="Culture" color="var(--dd-viz-purple)">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            {/* Theater masks - happy */}
            <path
              d="M22 28 Q22 18, 34 18 Q46 18, 46 28 Q46 40, 34 44 Q22 40, 22 28Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="currentColor"
              fillOpacity={0.1}
            />
            <circle cx="29" cy="28" r="2" fill="currentColor" />
            <circle cx="39" cy="28" r="2" fill="currentColor" />
            <path
              d="M28 34 Q34 40, 40 34"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            {/* Theater masks - sad */}
            <path
              d="M38 32 Q38 22, 50 22 Q62 22, 62 32 Q62 44, 50 48 Q38 44, 38 32Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="currentColor"
              fillOpacity={0.06}
            />
            <circle cx="45" cy="32" r="2" fill="currentColor" />
            <circle cx="55" cy="32" r="2" fill="currentColor" />
            <path
              d="M44 40 Q50 36, 56 40"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
            {/* Music note */}
            <line
              x1="40"
              y1="54"
              x2="40"
              y2="68"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <ellipse
              cx="36"
              cy="68"
              rx="5"
              ry="3"
              fill="currentColor"
              fillOpacity={0.5}
              transform="rotate(-15 36 68)"
            />
          </svg>
        </SpotCard>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  6. Decorative Dividers Collection                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">6 &middot; Decorative Dividers</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
          border: "1px solid var(--dd-ink-faint)",
          borderRadius: "var(--dd-radius-lg)",
          padding: "var(--dd-space-xl)",
          background: "var(--dd-paper-white)",
        }}
      >
        {/* (a) Thin 1px rule */}
        <DividerSpecimen label="Thin Rule (Editorial Standard)">
          <div
            style={{
              width: "100%",
              height: 1,
              background: "var(--dd-ink-faint)",
            }}
          />
        </DividerSpecimen>

        {/* (b) Thick 3px black rule */}
        <DividerSpecimen label="Thick Rule (Section Start)">
          <div
            style={{
              width: "100%",
              height: 3,
              background: "var(--dd-ink-black)",
            }}
          />
        </DividerSpecimen>

        {/* (c) Double 3px rule */}
        <DividerSpecimen label="Double Rule (Masthead / Footer)">
          <div style={{ width: "100%" }}>
            <div
              style={{
                height: 3,
                background: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            />
            <div
              style={{
                height: 3,
                background: "var(--dd-ink-black)",
              }}
            />
          </div>
        </DividerSpecimen>

        {/* (d) Diamond ornament rule */}
        <DividerSpecimen label="Diamond Ornament Rule">
          <svg
            width="100%"
            height="20"
            viewBox="0 0 400 20"
            preserveAspectRatio="xMidYMid meet"
          >
            <line
              x1="0"
              y1="10"
              x2="182"
              y2="10"
              stroke="var(--dd-ink-faint)"
              strokeWidth="1"
            />
            <rect
              x="193"
              y="3"
              width="14"
              height="14"
              rx="1"
              transform="rotate(45 200 10)"
              fill="var(--dd-ink-faint)"
            />
            <line
              x1="218"
              y1="10"
              x2="400"
              y2="10"
              stroke="var(--dd-ink-faint)"
              strokeWidth="1"
            />
          </svg>
        </DividerSpecimen>

        {/* (e) Graduated dots */}
        <DividerSpecimen label="Graduated Dots">
          <svg
            width="100%"
            height="20"
            viewBox="0 0 400 20"
            preserveAspectRatio="xMidYMid meet"
          >
            {[0.08, 0.15, 0.25, 0.4, 0.6, 0.8, 1, 0.8, 0.6, 0.4, 0.25, 0.15, 0.08].map(
              (op, i) => (
                <circle
                  key={i}
                  cx={128 + i * 12}
                  cy="10"
                  r="2.5"
                  fill="var(--dd-ink-soft)"
                  opacity={op}
                />
              ),
            )}
          </svg>
        </DividerSpecimen>

        {/* (f) Wavy line */}
        <DividerSpecimen label="Wavy Line (SVG Sine)">
          <svg
            width="100%"
            height="20"
            viewBox="0 0 400 20"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="M0 10 Q10 2, 20 10 Q30 18, 40 10 Q50 2, 60 10 Q70 18, 80 10 Q90 2, 100 10 Q110 18, 120 10 Q130 2, 140 10 Q150 18, 160 10 Q170 2, 180 10 Q190 18, 200 10 Q210 2, 220 10 Q230 18, 240 10 Q250 2, 260 10 Q270 18, 280 10 Q290 2, 300 10 Q310 18, 320 10 Q330 2, 340 10 Q350 18, 360 10 Q370 2, 380 10 Q390 18, 400 10"
              stroke="var(--dd-ink-faint)"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </DividerSpecimen>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  7. Pull-Quote Styles                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="dd-palette-label">7 &middot; Pull-Quote Styles</div>

      {/* (a) Large open-quote with saffron left border */}
      <div
        style={{
          position: "relative",
          padding: "var(--dd-space-2xl) var(--dd-space-2xl) var(--dd-space-2xl) 40px",
          borderLeft: "4px solid var(--dd-accent-saffron)",
          background: "var(--dd-paper-cool)",
          borderRadius: "0 var(--dd-radius-md) var(--dd-radius-md) 0",
          marginBottom: "var(--dd-space-lg)",
          overflow: "hidden",
          minHeight: 120,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Style A &mdash; Open Quote + Saffron Border
        </div>
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            fontFamily: "var(--dd-font-headline)",
            fontWeight: 900,
            fontSize: 120,
            lineHeight: 1,
            color: "#E8E5E0",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          &ldquo;
        </div>
        <p
          style={{
            position: "relative",
            fontFamily: "var(--dd-font-display)",
            fontStyle: "italic",
            fontSize: 22,
            lineHeight: 1.5,
            color: "var(--dd-ink-black)",
            margin: 0,
            maxWidth: 560,
          }}
        >
          The data tells a story that words alone never could &mdash; and the
          best journalism finds the narrative in the numbers.
        </p>
        <div
          style={{
            position: "relative",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--dd-ink-soft)",
            marginTop: 16,
          }}
        >
          &mdash; Editorial Style Specimen
        </div>
      </div>

      {/* (b) Centered style with thin rules above and below */}
      <div
        style={{
          padding: "var(--dd-space-xl) var(--dd-space-2xl)",
          marginBottom: "var(--dd-space-lg)",
          textAlign: "center",
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-ink-faint)",
          borderRadius: "var(--dd-radius-md)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 20,
            textAlign: "left",
          }}
        >
          Style B &mdash; Centered with Rules
        </div>
        <div
          style={{
            height: 1,
            background: "var(--dd-ink-faint)",
            marginBottom: "var(--dd-space-lg)",
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
        <p
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontStyle: "italic",
            fontSize: 24,
            lineHeight: 1.45,
            color: "var(--dd-ink-black)",
            margin: "0 auto",
            maxWidth: 480,
          }}
        >
          Great design is born of constraint. Every pixel earns its place on the
          page.
        </p>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            marginTop: 12,
            letterSpacing: "0.02em",
          }}
        >
          Design Principles Specimen
        </div>
        <div
          style={{
            height: 1,
            background: "var(--dd-ink-faint)",
            marginTop: "var(--dd-space-lg)",
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
      </div>

      {/* (c) Indented style with thick left border */}
      <div
        style={{
          padding: "var(--dd-space-xl) var(--dd-space-xl) var(--dd-space-xl) 48px",
          marginBottom: "var(--dd-space-2xl)",
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-ink-faint)",
          borderRadius: "var(--dd-radius-md)",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
            color: "var(--dd-ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 16,
          }}
        >
          Style C &mdash; Indented with Thick Border
        </div>
        <div
          style={{
            paddingLeft: 32,
            borderLeft: "4px solid var(--dd-ink-black)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--dd-font-display)",
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--dd-ink-black)",
              margin: 0,
              maxWidth: 520,
            }}
          >
            We shape our tools, and thereafter our tools shape us. The medium is
            never neutral.
          </p>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--dd-ink-soft)",
              marginTop: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            &mdash; Media Theory Specimen
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Spot Card helper ─────────────────────────────────────────────── */

function SpotCard({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "var(--dd-space-lg)",
        border: "1px solid var(--dd-ink-faint)",
        borderRadius: "var(--dd-radius-md)",
        textAlign: "center",
        background: "var(--dd-paper-white)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 80,
          width: 80,
          margin: "0 auto",
          color,
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--dd-ink-soft)",
          marginTop: 10,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ── Divider Specimen helper ──────────────────────────────────────── */

function DividerSpecimen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 10,
          color: "var(--dd-ink-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}

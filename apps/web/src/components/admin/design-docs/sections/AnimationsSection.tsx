"use client";

/* ------------------------------------------------------------------ */
/*  Animations Section — Motion design guide and specimens            */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes dd-fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dd-fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes dd-slideInLeft {
  from { opacity: 0; transform: translateX(-24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes dd-scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes dd-pulse-100 {
  0%, 100% { box-shadow: 0 0 0 0 var(--dd-viz-blue); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes dd-pulse-200 {
  0%, 100% { box-shadow: 0 0 0 0 var(--dd-viz-green); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes dd-pulse-300 {
  0%, 100% { box-shadow: 0 0 0 0 var(--dd-viz-teal); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes dd-pulse-500 {
  0%, 100% { box-shadow: 0 0 0 0 var(--dd-viz-orange); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes dd-pulse-600 {
  0%, 100% { box-shadow: 0 0 0 0 var(--dd-viz-purple); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes dd-underline-from-left {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
`;

const EASING_CURVES = [
  { name: "linear", css: "linear", path: "M0,100 L100,0" },
  { name: "ease", css: "ease", path: "M0,100 C25,80 25,10 100,0" },
  { name: "ease-in-out", css: "ease-in-out", path: "M0,100 C42,100 58,0 100,0" },
  {
    name: "smooth-out",
    css: "cubic-bezier(0.22, 1, 0.36, 1)",
    path: "M0,100 C22,0 36,0 100,0",
  },
  {
    name: "bounce",
    css: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    path: "M0,100 C34,-56 64,0 100,0",
  },
] as const;

const SPEED_SCALE = [
  { ms: 100, label: "Snappy", context: "Data hover", color: "var(--dd-viz-blue)", anim: "dd-pulse-100" },
  { ms: 200, label: "Default", context: "Button", color: "var(--dd-viz-green)", anim: "dd-pulse-200" },
  { ms: 300, label: "Smooth", context: "Card", color: "var(--dd-viz-teal)", anim: "dd-pulse-300" },
  { ms: 500, label: "Editorial", context: "Page", color: "var(--dd-viz-orange)", anim: "dd-pulse-500" },
  { ms: 600, label: "Cinematic", context: "Color", color: "var(--dd-viz-purple)", anim: "dd-pulse-600" },
] as const;

const ENTRANCE_ANIMS = [
  { name: "fadeInUp", anim: "dd-fadeInUp", desc: "12px translateY + opacity", color: "var(--dd-viz-blue)" },
  { name: "fadeIn", anim: "dd-fadeIn", desc: "Opacity only", color: "var(--dd-viz-green)" },
  { name: "slideInLeft", anim: "dd-slideInLeft", desc: "translateX + opacity", color: "var(--dd-viz-orange)" },
  { name: "scaleIn", anim: "dd-scaleIn", desc: "0.95 \u2192 1 scale + opacity", color: "var(--dd-viz-purple)" },
] as const;

const CONTEXT_RULES = [
  { context: "Editorial", speed: "0.6s", easing: "ease", notes: "Long-form reading, page transitions" },
  { context: "Data Viz", speed: "0.15s", easing: "ease-in-out", notes: "Chart hovers, tooltip reveal" },
  { context: "Games", speed: "0.3s", easing: "cubic-bezier(0.34,1.56,0.64,1)", notes: "Bouncy, playful interactions" },
  { context: "Lifestyle", speed: "0.25s", easing: "ease", notes: "Card interactions, smooth transitions" },
  { context: "Interactive", speed: "scroll", easing: "scroll-driven", notes: "IntersectionObserver, scroll-timeline" },
] as const;

export default function AnimationsSection() {
  return (
    <div>
      {/* Inject keyframes */}
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />

      <div className="dd-section-label">Animations</div>
      <h2 className="dd-section-title">Motion Design Guide</h2>
      <p className="dd-section-desc">
        Motion reinforces content hierarchy and editorial pacing. Fast transitions
        keep data interactions snappy; slower easings give editorial content a
        cinematic weight. Every animation should feel intentional, never decorative.
      </p>

      {/* ── Easing Curve Visualizer ─────────────────────── */}
      <div className="dd-palette-label">Easing Curve Visualizer</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {EASING_CURVES.map((curve) => (
          <div
            key={curve.name}
            style={{
              border: "1px solid var(--dd-ink-faint)",
              borderRadius: "var(--dd-radius-md)",
              padding: "var(--dd-space-md)",
              textAlign: "center",
            }}
          >
            <svg
              width="100%"
              viewBox="-5 -10 110 120"
              style={{ maxWidth: 120, display: "block", margin: "0 auto" }}
            >
              {/* Grid lines */}
              <line x1="0" y1="0" x2="0" y2="100" stroke="var(--dd-ink-faint)" strokeWidth="0.5" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="var(--dd-ink-faint)" strokeWidth="0.5" />
              <line x1="0" y1="0" x2="100" y2="0" stroke="var(--dd-ink-faint)" strokeWidth="0.5" strokeDasharray="2 2" />
              <line x1="100" y1="0" x2="100" y2="100" stroke="var(--dd-ink-faint)" strokeWidth="0.5" strokeDasharray="2 2" />
              {/* Curve */}
              <path d={curve.path} stroke="var(--dd-viz-blue)" strokeWidth="2" fill="none" />
            </svg>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
                marginTop: 8,
              }}
            >
              {curve.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 9,
                color: "var(--dd-ink-faint)",
                marginTop: 4,
                wordBreak: "break-all",
              }}
            >
              {curve.css}
            </div>
          </div>
        ))}
      </div>

      {/* ── Transition Speed Scale ──────────────────────── */}
      <div className="dd-palette-label">Transition Speed Scale</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {SPEED_SCALE.map((s) => (
          <div key={s.ms} style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 80,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--dd-radius-md)",
                  background: s.color,
                  animation: `${s.anim} ${s.ms * 4}ms ease-in-out infinite`,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
              }}
            >
              {s.ms}ms
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                marginTop: 2,
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              {s.context}
            </div>
          </div>
        ))}
      </div>

      {/* ── Entrance Animations ─────────────────────────── */}
      <div className="dd-palette-label">Entrance Animations</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {ENTRANCE_ANIMS.map((a) => (
          <div
            key={a.name}
            style={{
              border: "1px solid var(--dd-ink-faint)",
              borderRadius: "var(--dd-radius-md)",
              padding: "var(--dd-space-lg)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 80,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--dd-radius-md)",
                  background: a.color,
                  opacity: 0.85,
                  animation: `${a.anim} 1.5s ease-in-out infinite alternate`,
                }}
              />
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
                marginTop: 8,
              }}
            >
              {a.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 4,
              }}
            >
              {a.desc}
            </div>
          </div>
        ))}
      </div>

      {/* ── Scroll-Trigger Pattern ──────────────────────── */}
      <div className="dd-palette-label">Scroll-Trigger Pattern</div>
      <div
        style={{
          border: "1px solid var(--dd-ink-faint)",
          borderRadius: "var(--dd-radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--dd-space-2xl)",
          height: 400,
          display: "grid",
          gridTemplateColumns: "1fr 200px",
        }}
      >
        {/* Sticky chart area */}
        <div
          style={{
            position: "relative",
            background: "var(--dd-paper-cool)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--dd-space-xl)",
          }}
        >
          <div
            style={{
              position: "sticky",
              top: 0,
            }}
          >
            <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
              {/* Axes */}
              <line x1="30" y1="10" x2="30" y2="140" stroke="var(--dd-ink-faint)" strokeWidth="1" />
              <line x1="30" y1="140" x2="190" y2="140" stroke="var(--dd-ink-faint)" strokeWidth="1" />
              {/* Bars */}
              <rect x="45" y="80" width="20" height="60" rx="2" fill="var(--dd-viz-blue)" opacity="0.7" />
              <rect x="75" y="50" width="20" height="90" rx="2" fill="var(--dd-viz-blue)" opacity="0.7" />
              <rect x="105" y="30" width="20" height="110" rx="2" fill="var(--dd-viz-blue)" opacity="0.7" />
              <rect x="135" y="60" width="20" height="80" rx="2" fill="var(--dd-viz-teal)" opacity="0.7" />
              <rect x="165" y="20" width="20" height="120" rx="2" fill="var(--dd-accent-saffron)" opacity="0.7" />
              {/* Y-axis labels */}
              <text x="25" y="145" textAnchor="end" fill="var(--dd-ink-faint)" fontSize="8" fontFamily="var(--dd-font-mono)">0</text>
              <text x="25" y="80" textAnchor="end" fill="var(--dd-ink-faint)" fontSize="8" fontFamily="var(--dd-font-mono)">50</text>
              <text x="25" y="15" textAnchor="end" fill="var(--dd-ink-faint)" fontSize="8" fontFamily="var(--dd-font-mono)">100</text>
            </svg>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                textAlign: "center",
                marginTop: 8,
              }}
            >
              Sticky chart element
            </div>
          </div>
        </div>

        {/* Scroll indicators */}
        <div
          style={{
            borderLeft: "1px solid var(--dd-ink-faint)",
            padding: "var(--dd-space-lg)",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {[
            { pct: "0%", label: "Initial state", desc: "Chart fades in" },
            { pct: "25%", label: "Trigger 1", desc: "Bars animate heights" },
            { pct: "50%", label: "Trigger 2", desc: "Highlight bar 3" },
            { pct: "75%", label: "Trigger 3", desc: "Color transition" },
            { pct: "100%", label: "Final state", desc: "Annotation appears" },
          ].map((step) => (
            <div key={step.pct}>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--dd-viz-blue)",
                }}
              >
                {step.pct}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--dd-ink-medium)",
                  marginTop: 2,
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                {step.desc}
              </div>
              <div
                style={{
                  width: "100%",
                  height: 1,
                  background: "var(--dd-ink-faint)",
                  marginTop: 12,
                }}
              />
            </div>
          ))}
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              color: "var(--dd-ink-faint)",
              padding: "8px 0",
              lineHeight: 1.5,
            }}
          >
            Pattern uses IntersectionObserver to trigger animation phases as the
            user scrolls through story steps.
          </div>
        </div>
      </div>

      {/* ── Micro-Interaction Specimens ─────────────────── */}
      <div className="dd-palette-label">Micro-Interaction Specimens</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {/* (a) Button hover */}
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
            padding: "var(--dd-space-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Button Hover
          </div>
          <div style={{ display: "flex", justifyContent: "center", height: 48, alignItems: "center" }}>
            <button
              type="button"
              className="dd-anim-btn-hover"
              style={{
                padding: "10px 24px",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-paper-white)",
                background: "var(--dd-ink-black)",
                border: "none",
                borderRadius: "var(--dd-radius-md)",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Hover Me
            </button>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 12,
            }}
          >
            scale(1.02) + shadow lift
          </div>
        </div>

        {/* (b) Card hover */}
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
            padding: "var(--dd-space-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Card Hover
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div
              style={{
                width: 120,
                height: 80,
                background: "var(--dd-paper-cool)",
                border: "1px solid var(--dd-ink-faint)",
                borderRadius: "var(--dd-radius-md)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-soft)",
                cursor: "pointer",
                transition: "transform 0.25s ease, box-shadow 0.25s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Card
            </div>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 12,
            }}
          >
            translateY(-2px) + shadow
          </div>
        </div>

        {/* (c) Link underline from left */}
        <div
          style={{
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
            padding: "var(--dd-space-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Link Underline
          </div>
          <div style={{ display: "flex", justifyContent: "center", height: 48, alignItems: "center" }}>
            <span
              style={{
                position: "relative",
                fontFamily: "var(--dd-font-body)",
                fontSize: 16,
                color: "var(--dd-viz-blue)",
                cursor: "pointer",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                const bar = e.currentTarget.querySelector<HTMLElement>("[data-underline]");
                if (bar) bar.style.transform = "scaleX(1)";
              }}
              onMouseLeave={(e) => {
                const bar = e.currentTarget.querySelector<HTMLElement>("[data-underline]");
                if (bar) bar.style.transform = "scaleX(0)";
              }}
            >
              Read full article
              <span
                data-underline=""
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: -2,
                  width: "100%",
                  height: 2,
                  background: "var(--dd-viz-blue)",
                  transformOrigin: "left",
                  transform: "scaleX(0)",
                  transition: "transform 0.3s ease",
                }}
              />
            </span>
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginTop: 12,
            }}
          >
            underline-from-left on hover
          </div>
        </div>
      </div>

      {/* ── Context Rules Table ──────────────────────────── */}
      <div className="dd-palette-label">Context Rules</div>
      <div
        style={{
          border: "1px solid var(--dd-ink-faint)",
          borderRadius: "var(--dd-radius-md)",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                background: "var(--dd-paper-cool)",
                borderBottom: "1px solid var(--dd-ink-faint)",
              }}
            >
              {["Context", "Speed", "Easing", "Notes"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: "left",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONTEXT_RULES.map((rule, i) => (
              <tr
                key={rule.context}
                style={{
                  borderBottom:
                    i < CONTEXT_RULES.length - 1 ? "1px solid var(--dd-ink-faint)" : "none",
                }}
              >
                <td
                  style={{
                    padding: "10px 16px",
                    fontFamily: "var(--dd-font-sans)",
                    fontWeight: 600,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  {rule.context}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 12,
                    color: "var(--dd-ink-medium)",
                  }}
                >
                  {rule.speed}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 11,
                    color: "var(--dd-ink-medium)",
                    wordBreak: "break-all",
                  }}
                >
                  {rule.easing}
                </td>
                <td
                  style={{
                    padding: "10px 16px",
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {rule.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

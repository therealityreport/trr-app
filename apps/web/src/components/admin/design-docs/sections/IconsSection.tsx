"use client";

/* ------------------------------------------------------------------ */
/*  Icons Section — Icon style guide, sizes, strokes, specimens       */
/* ------------------------------------------------------------------ */

/* ── Inline SVG Icon Primitives ─────────────────────────────────── */

function SearchIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function CloseIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MenuIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function ArrowRightIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ChevronDownIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronRightIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ExternalLinkIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ShareIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function BookmarkIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  );
}

function ClockIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CalendarIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UserIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1.08-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1.08 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001.08 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1.08z" />
    </svg>
  );
}

function ChartBarIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function GlobeIcon({ size = 18, strokeWidth = 1.5 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

/* ── Data ─────────────────────────────────────────────────────────── */

const SIZE_SCALE = [
  { px: 12, context: "Inline" },
  { px: 16, context: "Button" },
  { px: 20, context: "Nav" },
  { px: 24, context: "Default" },
  { px: 32, context: "Hero" },
  { px: 48, context: "Feature" },
] as const;

const STROKE_WEIGHTS = [
  { weight: 1, range: "12\u201316px icons" },
  { weight: 1.5, range: "20\u201324px icons" },
  { weight: 2, range: "32px+ icons" },
  { weight: 2.5, range: "48px+ accent" },
] as const;

const ICON_SET: { name: string; Icon: typeof SearchIcon }[] = [
  { name: "search", Icon: SearchIcon },
  { name: "close", Icon: CloseIcon },
  { name: "menu", Icon: MenuIcon },
  { name: "arrow-right", Icon: ArrowRightIcon },
  { name: "arrow-left", Icon: ArrowLeftIcon },
  { name: "chevron-down", Icon: ChevronDownIcon },
  { name: "chevron-right", Icon: ChevronRightIcon },
  { name: "external-link", Icon: ExternalLinkIcon },
  { name: "share", Icon: ShareIcon },
  { name: "bookmark", Icon: BookmarkIcon },
  { name: "clock", Icon: ClockIcon },
  { name: "calendar", Icon: CalendarIcon },
  { name: "user", Icon: UserIcon },
  { name: "settings", Icon: SettingsIcon },
  { name: "chart-bar", Icon: ChartBarIcon },
  { name: "globe", Icon: GlobeIcon },
];

/* ── Component ────────────────────────────────────────────────────── */

export default function IconsSection() {
  return (
    <div>
      <div className="dd-section-label">Icons</div>
      <h2 className="dd-section-title">Icon Style Guide</h2>
      <p className="dd-section-desc">
        All icons use a consistent outline style &mdash; round linecap, round linejoin,
        no fills. Stroke weight scales with icon size to maintain optical balance.
        Icons inherit color from their parent via <code>currentColor</code>.
      </p>

      {/* ── Size Scale ──────────────────────────────────── */}
      <div className="dd-palette-label">Size Scale</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {SIZE_SCALE.map((s) => {
          const sw = s.px <= 16 ? 1 : s.px <= 24 ? 1.5 : 2;
          return (
            <div key={s.px} style={{ textAlign: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 64,
                  color: "var(--dd-ink-medium)",
                }}
              >
                <SearchIcon size={s.px} strokeWidth={sw} />
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--dd-ink-medium)",
                }}
              >
                {s.px}px
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                {s.context}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stroke Weight Rules ─────────────────────────── */}
      <div className="dd-palette-label">Stroke Weight Rules</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {STROKE_WEIGHTS.map((s) => (
          <div key={s.weight} style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 64,
                color: "var(--dd-ink-medium)",
              }}
            >
              <SearchIcon size={24} strokeWidth={s.weight} />
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 700,
                color: "var(--dd-ink-medium)",
              }}
            >
              {s.weight}px stroke
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
              }}
            >
              {s.range}
            </div>
          </div>
        ))}
      </div>

      {/* ── Icon Set Specimens ──────────────────────────── */}
      <div className="dd-palette-label">Icon Set Specimens</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
          gap: "var(--dd-space-md)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {ICON_SET.map(({ name, Icon }) => (
          <div key={name} style={{ textAlign: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 48,
                color: "var(--dd-ink-faint)",
              }}
            >
              <Icon size={18} strokeWidth={1.5} />
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </div>
          </div>
        ))}
      </div>

      {/* ── Usage Context ───────────────────────────────── */}
      <div className="dd-palette-label">Usage Context</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "var(--dd-space-lg)",
          marginBottom: "var(--dd-space-2xl)",
        }}
      >
        {/* (a) Button with icon + label */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Button + Icon
          </div>
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--dd-paper-white)",
              background: "var(--dd-ink-black)",
              border: "none",
              borderRadius: "var(--dd-radius-md)",
              cursor: "pointer",
            }}
          >
            <SearchIcon size={16} strokeWidth={1.5} />
            Search
          </button>
        </div>

        {/* (b) Nav item with icon */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Nav Item
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--dd-ink-medium)",
            }}
          >
            <SettingsIcon size={20} strokeWidth={1.5} />
            Settings
          </div>
        </div>

        {/* (c) Inline icon in text */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Inline in Text
          </div>
          <p
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--dd-ink-medium)",
              margin: 0,
            }}
          >
            Updated 3 min ago{" "}
            <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
              <ClockIcon size={14} strokeWidth={1.5} />
            </span>{" "}
            &middot; Published{" "}
            <span style={{ display: "inline-flex", verticalAlign: "middle" }}>
              <GlobeIcon size={14} strokeWidth={1.5} />
            </span>
          </p>
        </div>

        {/* (d) Icon-only button with tooltip */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "1px solid var(--dd-ink-faint)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-faint)",
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Icon-Only Button
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[BookmarkIcon, ShareIcon, ExternalLinkIcon].map((Icon, i) => (
              <button
                key={i}
                type="button"
                title={["Bookmark", "Share", "Open"][i]}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  border: "1px solid var(--dd-ink-faint)",
                  borderRadius: "var(--dd-radius-md)",
                  background: "transparent",
                  color: "var(--dd-ink-medium)",
                  cursor: "pointer",
                }}
              >
                <Icon size={18} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Do / Don't Rules ────────────────────────────── */}
      <div className="dd-palette-label">Do / Don&rsquo;t Rules</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--dd-space-lg)",
        }}
      >
        {/* DO */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "2px solid var(--dd-viz-green)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-viz-green)",
              marginBottom: 12,
            }}
          >
            Do
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
            <div style={{ color: "var(--dd-ink-medium)" }}>
              <SearchIcon size={18} strokeWidth={1.5} />
            </div>
            <div style={{ color: "var(--dd-ink-medium)" }}>
              <SettingsIcon size={18} strokeWidth={1.5} />
            </div>
            <div style={{ color: "var(--dd-ink-medium)" }}>
              <UserIcon size={18} strokeWidth={1.5} />
            </div>
          </div>
          <ul
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 13,
              color: "var(--dd-ink-medium)",
              margin: 0,
              paddingLeft: 16,
              lineHeight: 1.8,
            }}
          >
            <li>Consistent 1.5px stroke at 18px</li>
            <li>Aligned to pixel grid</li>
            <li>Uniform padding inside containers</li>
            <li>Round linecap &amp; linejoin</li>
          </ul>
        </div>

        {/* DON'T */}
        <div
          style={{
            padding: "var(--dd-space-lg)",
            border: "2px solid var(--dd-viz-red)",
            borderRadius: "var(--dd-radius-md)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--dd-viz-red)",
              marginBottom: 12,
            }}
          >
            Don&rsquo;t
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
            {/* Mixed fill icon */}
            <svg width={18} height={18} viewBox="0 0 24 24" fill="var(--dd-ink-medium)" stroke="var(--dd-ink-medium)" strokeWidth={1}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {/* Inconsistent size */}
            <div style={{ color: "var(--dd-ink-medium)" }}>
              <SettingsIcon size={12} strokeWidth={2.5} />
            </div>
            {/* Oversized stroke */}
            <div style={{ color: "var(--dd-ink-medium)" }}>
              <UserIcon size={24} strokeWidth={3} />
            </div>
          </div>
          <ul
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 13,
              color: "var(--dd-ink-medium)",
              margin: 0,
              paddingLeft: 16,
              lineHeight: 1.8,
            }}
          >
            <li>Mixed fill and stroke styles</li>
            <li>Inconsistent sizes within a row</li>
            <li>Overly heavy stroke on small icons</li>
            <li>No padding or alignment in containers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

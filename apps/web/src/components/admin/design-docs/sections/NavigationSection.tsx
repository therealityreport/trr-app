"use client";

/* ------------------------------------------------------------------ */
/*  Navigation Section — Header, Breadcrumbs, Tabs, Pagination,        */
/*  Side Nav, Mobile Bottom Nav                                        */
/* ------------------------------------------------------------------ */

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

/* ── SVG Icons ───────────────────────────────────── */

function HamburgerIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="var(--dd-ink-black)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SearchNavIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="var(--dd-ink-soft)" strokeWidth="1.5" />
      <line x1="12.5" y1="12.5" x2="16" y2="16" stroke="var(--dd-ink-soft)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M4.5 2.5L7.5 6L4.5 9.5" stroke="var(--dd-ink-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownSmall() {
  return (
    <svg width={10} height={10} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
      <path d="M2.5 3.5L5 6.5L7.5 3.5" stroke="var(--dd-viz-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <path d="M3 10L10 3L17 10V17H12V13H8V17H3V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <rect x="3" y="10" width="3" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8.5" y="6" width="3" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="14" y="3" width="3" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Specimens ───────────────────────────────────── */

function StickyHeaderSpecimen() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Sticky Header
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Fixed header pattern: full-width, 56px height, 1px bottom border, shadow on scroll.
      </div>
      {/* Static specimen */}
      <div
        style={{
          width: "100%",
          height: 56,
          background: "var(--dd-paper-white)",
          borderBottom: "1px solid var(--dd-paper-grey)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderRadius: "var(--dd-radius-sm)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center gap-3">
          <HamburgerIcon />
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              letterSpacing: "-0.01em",
            }}
          >
            TRR
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchNavIcon />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--dd-viz-green)",
            }}
          />
        </div>
      </div>
      {/* Scrolled variant */}
      <div
        style={{
          marginTop: 8,
          width: "100%",
          height: 56,
          background: "var(--dd-paper-white)",
          borderBottom: "1px solid var(--dd-paper-grey)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderRadius: "var(--dd-radius-sm)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center gap-3">
          <HamburgerIcon />
          <div
            style={{
              fontFamily: "var(--dd-font-headline)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              letterSpacing: "-0.01em",
            }}
          >
            TRR
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SearchNavIcon />
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--dd-viz-green)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 10,
          color: "var(--dd-ink-faint)",
          marginTop: 6,
        }}
      >
        Top: resting &bull; Bottom: scrolled (elevated shadow)
      </div>
    </div>
  );
}

function BreadcrumbsSpecimen() {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Breadcrumbs
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Three variants: simple, current-page bolded, and dropdown on middle segment.
      </div>
      <div className="flex flex-col gap-4">
        {/* (a) Simple */}
        <div className="flex items-center gap-1">
          {["Admin", "Shows", "Season 3"].map((item, i, arr) => (
            <div key={item} className="flex items-center gap-1">
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  color: "var(--dd-ink-soft)",
                  cursor: "pointer",
                }}
              >
                {item}
              </span>
              {i < arr.length - 1 && <ChevronRight />}
            </div>
          ))}
        </div>

        {/* (b) Current page bolded */}
        <div className="flex items-center gap-1">
          {["Admin", "Shows", "Season 3"].map((item, i, arr) => (
            <div key={item} className="flex items-center gap-1">
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  color: i === arr.length - 1 ? "var(--dd-ink-black)" : "var(--dd-ink-soft)",
                  fontWeight: i === arr.length - 1 ? 700 : 400,
                  cursor: i < arr.length - 1 ? "pointer" : "default",
                }}
              >
                {item}
              </span>
              {i < arr.length - 1 && <ChevronRight />}
            </div>
          ))}
        </div>

        {/* (c) Dropdown on middle */}
        <div className="flex items-center gap-1">
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-soft)",
              cursor: "pointer",
            }}
          >
            Admin
          </span>
          <ChevronRight />
          <span
            className="flex items-center gap-1"
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-viz-blue)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Shows <ChevronDownSmall />
          </span>
          <ChevronRight />
          <span
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-black)",
              fontWeight: 700,
            }}
          >
            Season 3
          </span>
        </div>
      </div>
    </div>
  );
}

function TabBarSpecimen() {
  const tabs = ["Overview", "Cast", "Episodes", "Analytics"];
  const active = 0;

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Tab Bar
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Horizontal tabs with saffron underline on active, Franklin Gothic 13px 600-weight.
      </div>
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--dd-paper-grey)",
        }}
      >
        {tabs.map((tab, i) => (
          <div
            key={tab}
            style={{
              padding: "10px 16px",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: i === active ? "var(--dd-ink-black)" : "var(--dd-ink-faint)",
              borderBottom: i === active ? "2px solid var(--dd-accent-saffron)" : "2px solid transparent",
              cursor: "pointer",
              marginBottom: -1,
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
}

function PaginationSpecimen() {
  const pages = [1, 2, 3, 4, 5, "...", 12];
  const current = 3;

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Pagination
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Page number pattern with current page highlight, navigation arrows, and ellipsis.
      </div>
      <div className="flex items-center gap-1">
        {/* Prev arrows */}
        {["\u00AB", "\u2039"].map((arrow) => (
          <div
            key={arrow}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "1px solid var(--dd-paper-grey)",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              color: "var(--dd-ink-soft)",
              cursor: "pointer",
              background: "var(--dd-paper-white)",
            }}
          >
            {arrow}
          </div>
        ))}

        {/* Pages */}
        {pages.map((page, i) => (
          <div
            key={i}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: page === current ? "none" : typeof page === "number" ? "1px solid var(--dd-paper-grey)" : "none",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: page === current ? 700 : 400,
              color: page === current ? "var(--dd-paper-white)" : "var(--dd-ink-soft)",
              background: page === current ? "var(--dd-ink-black)" : "var(--dd-paper-white)",
              cursor: typeof page === "number" ? "pointer" : "default",
            }}
          >
            {page}
          </div>
        ))}

        {/* Next arrows */}
        {["\u203A", "\u00BB"].map((arrow) => (
          <div
            key={arrow}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "1px solid var(--dd-paper-grey)",
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              color: "var(--dd-ink-soft)",
              cursor: "pointer",
              background: "var(--dd-paper-white)",
            }}
          >
            {arrow}
          </div>
        ))}
      </div>
    </div>
  );
}

function SideNavigationSpecimen() {
  const items = [
    { label: "Overview", active: false },
    { label: "Shows", active: true },
    { label: "People", active: false },
    { label: "Episodes", active: false },
    { label: "Analytics", active: false },
    { label: "Settings", active: false },
  ];

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Side Navigation
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Vertical nav list with active state highlighting and hover backgrounds.
      </div>
      <div
        style={{
          width: 220,
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: "var(--dd-radius-md)",
          padding: 8,
        }}
      >
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 500,
                color: item.active ? "var(--dd-paper-white)" : "rgb(82,82,91)",
                background: item.active ? "rgb(24,24,27)" : "transparent",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background = "rgb(244,244,245)";
                }
              }}
              onMouseLeave={(e) => {
                if (!item.active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileBottomNavSpecimen() {
  const navItems = [
    { label: "Home", icon: HomeIcon, active: false },
    { label: "Browse", icon: GridIcon, active: true },
    { label: "Analytics", icon: ChartIcon, active: false },
    { label: "Profile", icon: PersonIcon, active: false },
  ];

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 13,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 4,
        }}
      >
        Mobile Bottom Nav
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Fixed bottom bar, 56px height, 4 items with SVG icons and labels. Active item in viz-blue.
      </div>
      <div
        style={{
          width: 320,
          height: 56,
          background: "var(--dd-paper-white)",
          borderTop: "1px solid var(--dd-paper-grey)",
          boxShadow: "0 -1px 4px rgba(0,0,0,0.06)",
          borderRadius: "var(--dd-radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          overflow: "hidden",
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                cursor: "pointer",
                color: item.active ? "var(--dd-viz-blue)" : "var(--dd-ink-faint)",
              }}
            >
              <Icon />
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: item.active ? 700 : 500,
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────── */

export default function NavigationSection() {
  return (
    <div>
      <div className="dd-section-label">Navigation</div>
      <h2 className="dd-section-title">Navigation Patterns</h2>
      <p className="dd-section-desc">
        Navigation elements provide wayfinding across the application. Each
        pattern uses Franklin Gothic for clarity and restraint, with saffron
        and blue accents to signal active and interactive states.
      </p>

      <div className="grid grid-cols-1 gap-8" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* Sticky Header */}
        <SectionLabel>Sticky Header</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <StickyHeaderSpecimen />
        </div>

        {/* Breadcrumbs */}
        <SectionLabel>Breadcrumbs</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <BreadcrumbsSpecimen />
        </div>

        {/* Tab Bar */}
        <SectionLabel>Tab Bar</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <TabBarSpecimen />
        </div>

        {/* Pagination */}
        <SectionLabel>Pagination</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <PaginationSpecimen />
        </div>

        {/* Side Nav */}
        <SectionLabel>Side Navigation</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <SideNavigationSpecimen />
        </div>

        {/* Mobile Bottom Nav */}
        <SectionLabel>Mobile Bottom Nav</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <MobileBottomNavSpecimen />
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        All nav: Franklin Gothic 12-14px &bull; saffron active underlines &bull;
        zinc-900 active backgrounds &bull; 56px header/bottom bar height
      </div>
    </div>
  );
}

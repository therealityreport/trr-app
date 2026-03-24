"use client";

/* ------------------------------------------------------------------ */
/*  Interactive Elements Section — Tooltip, Modal, Dropdown Menu,      */
/*  Accordion, Popover, Toast/Notification                             */
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

function CloseIcon({ size = 16, color = "var(--dd-ink-soft)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M4 4L12 12M12 4L4 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M5 3L9 7L5 11" stroke="var(--dd-ink-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M3 5L7 9L11 5" stroke="var(--dd-ink-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--dd-viz-green)" strokeWidth="1.5" />
      <path d="M5 8L7 10L11 6" stroke="var(--dd-viz-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorCircleIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--dd-viz-red)" strokeWidth="1.5" />
      <path d="M6 6L10 10M10 6L6 10" stroke="var(--dd-viz-red)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <path d="M8 2L14.5 13H1.5L8 2Z" stroke="var(--dd-accent-saffron)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="var(--dd-accent-saffron)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.75" fill="var(--dd-accent-saffron)" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="var(--dd-viz-blue)" strokeWidth="1.5" />
      <line x1="8" y1="7" x2="8" y2="11.5" stroke="var(--dd-viz-blue)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.75" fill="var(--dd-viz-blue)" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M2 12H4L11 5L9 3L2 10V12Z" stroke="var(--dd-ink-soft)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M3 4H11L10.2 12H3.8L3 4Z" stroke="var(--dd-viz-red)" strokeWidth="1.2" strokeLinejoin="round" />
      <line x1="2" y1="4" x2="12" y2="4" stroke="var(--dd-viz-red)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 4V2.5C5 2.2 5.2 2 5.5 2H8.5C8.8 2 9 2.2 9 2.5V4" stroke="var(--dd-viz-red)" strokeWidth="1.2" />
    </svg>
  );
}

function DuplicateIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1" stroke="var(--dd-ink-soft)" strokeWidth="1.2" />
      <path d="M10 4V3C10 2.4 9.6 2 9 2H3C2.4 2 2 2.4 2 3V9C2 9.6 2.4 10 3 10H4" stroke="var(--dd-ink-soft)" strokeWidth="1.2" />
    </svg>
  );
}

/* ── Specimens ───────────────────────────────────── */

function TooltipSpecimen() {
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
        Tooltip
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 16,
        }}
      >
        Dark background tooltip with arrow, appearing above a text link trigger.
      </div>
      <div style={{ position: "relative", display: "inline-block", paddingTop: 44 }}>
        {/* Tooltip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#121212",
            color: "var(--dd-paper-white)",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            padding: "6px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          Click to view cast details
          {/* Arrow */}
          <div
            style={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #121212",
            }}
          />
        </div>
        {/* Trigger link */}
        <span
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-viz-blue)",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            cursor: "pointer",
          }}
        >
          Lisa Vanderpump
        </span>
      </div>
    </div>
  );
}

function ModalSpecimen() {
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
        Modal / Dialog
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        480px wide modal with header, body, footer buttons, and dark backdrop.
      </div>
      {/* Backdrop */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 520,
          height: 280,
          background: "rgba(0,0,0,0.5)",
          borderRadius: "var(--dd-radius-md)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Modal card */}
        <div
          style={{
            width: "90%",
            maxWidth: 480,
            background: "var(--dd-paper-white)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid var(--dd-paper-grey)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontSize: 20,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
              }}
            >
              Confirm Action
            </div>
            <div style={{ cursor: "pointer", padding: 4 }}>
              <CloseIcon />
            </div>
          </div>
          {/* Body */}
          <div
            style={{
              padding: "16px 20px",
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              color: "var(--dd-ink-medium)",
              lineHeight: 1.55,
            }}
          >
            Are you sure you want to archive this show? This will remove it from
            the active catalog but preserve all associated data.
          </div>
          {/* Footer */}
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              borderTop: "1px solid var(--dd-paper-grey)",
            }}
          >
            <button
              type="button"
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid var(--dd-paper-grey)",
                background: "var(--dd-paper-white)",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-medium)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--dd-ink-black)",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-paper-white)",
                cursor: "pointer",
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DropdownMenuSpecimen() {
  const groups = [
    {
      items: [
        { label: "Edit", icon: EditIcon },
        { label: "Duplicate", icon: DuplicateIcon },
      ],
    },
    {
      items: [
        { label: "Delete", icon: TrashIcon },
      ],
    },
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
        Dropdown Menu
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Button trigger with floating menu, grouped items, icons, and divider.
      </div>
      <div style={{ position: "relative", display: "inline-block" }}>
        {/* Trigger */}
        <button
          type="button"
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--dd-paper-grey)",
            background: "var(--dd-paper-white)",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Actions
          <ChevronDownIcon />
        </button>
        {/* Menu */}
        <div
          style={{
            marginTop: 4,
            width: 180,
            background: "var(--dd-paper-white)",
            borderRadius: 8,
            border: "1px solid var(--dd-paper-grey)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
            overflow: "hidden",
            padding: "4px 0",
          }}
        >
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && (
                <div
                  style={{
                    height: 1,
                    background: "var(--dd-paper-grey)",
                    margin: "4px 0",
                  }}
                />
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    style={{
                      padding: "8px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 14,
                      color:
                        item.label === "Delete" ? "var(--dd-viz-red)" : "var(--dd-ink-black)",
                      cursor: "pointer",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgb(244,244,245)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Icon />
                    {item.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AccordionSpecimen() {
  const sections = [
    {
      title: "Show Details",
      open: false,
      body: "",
    },
    {
      title: "Cast Information",
      open: true,
      body: "The cast section displays all confirmed and rumored cast members for the current season, including headshots, social media handles, and screen-time metrics from the Screenalytics pipeline.",
    },
    {
      title: "Episode Guide",
      open: false,
      body: "",
    },
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
        Accordion
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Collapsible sections with rotating chevron indicator. One section shown open.
      </div>
      <div
        style={{
          maxWidth: 480,
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: "var(--dd-radius-md)",
          overflow: "hidden",
        }}
      >
        {sections.map((section, i) => (
          <div key={section.title}>
            {i > 0 && (
              <div style={{ height: 1, background: "var(--dd-paper-grey)" }} />
            )}
            {/* Title row */}
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                background: "var(--dd-paper-white)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                }}
              >
                {section.title}
              </span>
              {section.open ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </div>
            {/* Body */}
            {section.open && (
              <div
                style={{
                  padding: "0 16px 16px",
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 14,
                  color: "var(--dd-ink-medium)",
                  lineHeight: 1.55,
                }}
              >
                {section.body}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PopoverSpecimen() {
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
        Popover
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Button trigger with a floating info panel and connecting arrow.
      </div>
      <div style={{ position: "relative", display: "inline-block", paddingTop: 180 }}>
        {/* Popover panel */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            background: "var(--dd-paper-white)",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            border: "1px solid var(--dd-paper-grey)",
            padding: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: 8,
            }}
          >
            Quick Filter
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-body)",
              fontSize: 13,
              color: "var(--dd-ink-soft)",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            Filter the current view by network, season, or rating tier.
          </div>
          <div className="flex gap-2">
            {["Bravo", "NBC", "All"].map((label) => (
              <span
                key={label}
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 4,
                  border: "1px solid var(--dd-paper-grey)",
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  color: label === "Bravo" ? "var(--dd-paper-white)" : "var(--dd-ink-medium)",
                  background: label === "Bravo" ? "var(--dd-ink-black)" : "var(--dd-paper-white)",
                  cursor: "pointer",
                }}
              >
                {label}
              </span>
            ))}
          </div>
          {/* Arrow pointing down */}
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 12,
              height: 12,
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-paper-grey)",
              borderTop: "none",
              borderLeft: "none",
            }}
          />
        </div>
        {/* Trigger */}
        <button
          type="button"
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--dd-paper-grey)",
            background: "var(--dd-paper-white)",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            cursor: "pointer",
          }}
        >
          Filter
        </button>
      </div>
    </div>
  );
}

function ToastSpecimen() {
  const toasts = [
    {
      type: "success",
      borderColor: "var(--dd-viz-green)",
      icon: CheckCircleIcon,
      title: "Show added",
      message: "Real Housewives of Salt Lake City has been added to the catalog.",
    },
    {
      type: "error",
      borderColor: "var(--dd-viz-red)",
      icon: ErrorCircleIcon,
      title: "Import failed",
      message: "Could not import episode data. Check the file format and try again.",
    },
    {
      type: "warning",
      borderColor: "var(--dd-accent-saffron)",
      icon: WarningIcon,
      title: "Rate limit approaching",
      message: "You have used 90% of your API quota for this billing period.",
    },
    {
      type: "info",
      borderColor: "var(--dd-viz-blue)",
      icon: InfoIcon,
      title: "New data available",
      message: "Episode ratings for Season 4 have been updated with overnight numbers.",
    },
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
        Toast / Notification
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Four toast variants: success, error, warning, and info. Each 360px wide with colored left border.
      </div>
      <div className="flex flex-col gap-3">
        {toasts.map((toast) => {
          const Icon = toast.icon;
          return (
            <div
              key={toast.type}
              style={{
                width: 360,
                maxWidth: "100%",
                background: "var(--dd-paper-white)",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                borderLeft: `3px solid ${toast.borderColor}`,
                padding: "12px 14px",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>
                <Icon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--dd-ink-black)",
                    marginBottom: 2,
                  }}
                >
                  {toast.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    color: "var(--dd-ink-soft)",
                    lineHeight: 1.4,
                  }}
                >
                  {toast.message}
                </div>
              </div>
              <div style={{ flexShrink: 0, cursor: "pointer", padding: 2 }}>
                <CloseIcon size={14} color="var(--dd-ink-faint)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────── */

export default function InteractiveElementsSection() {
  return (
    <div>
      <div className="dd-section-label">Interactive</div>
      <h2 className="dd-section-title">Interactive UI Elements</h2>
      <p className="dd-section-desc">
        Overlays, popovers, and feedback elements that respond to user
        interaction. Each pattern uses consistent radii, shadow scales, and
        typographic hierarchy to feel native to the design system.
      </p>

      <div className="grid grid-cols-1 gap-8" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* Tooltip */}
        <SectionLabel>Tooltip</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <TooltipSpecimen />
        </div>

        {/* Modal */}
        <SectionLabel>Modal / Dialog</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <ModalSpecimen />
        </div>

        {/* Dropdown Menu */}
        <SectionLabel>Dropdown Menu</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <DropdownMenuSpecimen />
        </div>

        {/* Accordion */}
        <SectionLabel>Accordion</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <AccordionSpecimen />
        </div>

        {/* Popover */}
        <SectionLabel>Popover</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <PopoverSpecimen />
        </div>

        {/* Toast */}
        <SectionLabel>Toast / Notification</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <ToastSpecimen />
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        All overlays: white bg &bull; 8-12px radius &bull; shadow-md to shadow-xl &bull;
        1px border on menus &bull; #121212 bg on tooltips &bull; 3px colored left border on toasts
      </div>
    </div>
  );
}

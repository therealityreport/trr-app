"use client";

/* ------------------------------------------------------------------ */
/*  Forms Section — Inputs, Search, Select, Toggle, Checkbox, Radio,   */
/*  Form Layout, Validation States                                     */
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

/* ── Shared input base styles ────────────────────── */

const inputBase: React.CSSProperties = {
  fontFamily: "var(--dd-font-sans)",
  fontSize: 14,
  color: "var(--dd-ink-black)",
  padding: "10px 12px",
  borderRadius: 6,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "var(--dd-paper-white)",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

/* ── SVG Icons ───────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke="var(--dd-ink-faint)" strokeWidth="1.5" />
      <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="var(--dd-ink-faint)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 4.5L6 7.5L9 4.5" stroke="var(--dd-ink-soft)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GreenCheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="var(--dd-viz-green)" opacity={0.15} />
      <path d="M4 7L6 9L10 5" stroke="var(--dd-viz-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RedXIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="var(--dd-viz-red)" opacity={0.15} />
      <path d="M5 5L9 9M9 5L5 9" stroke="var(--dd-viz-red)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── Specimens ───────────────────────────────────── */

function TextInputStates() {
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
        Text Inputs
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 16,
        }}
      >
        Three states: default, focused, and error.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Default */}
        <div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--dd-ink-soft)",
              marginBottom: 6,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            Default
          </div>
          <input
            type="text"
            readOnly
            placeholder="Enter value..."
            style={{
              ...inputBase,
              border: "1px solid var(--dd-paper-grey)",
            }}
          />
        </div>
        {/* Focused */}
        <div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--dd-ink-soft)",
              marginBottom: 6,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            Focused
          </div>
          <input
            type="text"
            readOnly
            defaultValue="Show title"
            style={{
              ...inputBase,
              border: "2px solid var(--dd-viz-blue)",
              boxShadow: "0 0 0 3px rgba(59,130,246,0.15)",
            }}
          />
        </div>
        {/* Error */}
        <div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--dd-ink-soft)",
              marginBottom: 6,
              textTransform: "uppercase" as const,
              letterSpacing: "0.06em",
            }}
          >
            Error
          </div>
          <input
            type="text"
            readOnly
            defaultValue=""
            placeholder="Required field"
            style={{
              ...inputBase,
              border: "2px solid var(--dd-viz-red)",
              boxShadow: "0 0 0 3px rgba(239,68,68,0.1)",
            }}
          />
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-viz-red)",
              marginTop: 4,
            }}
          >
            This field is required
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchBarSpecimen() {
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
        Search Bar
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Full-width search with icon prefix and keyboard shortcut hint.
      </div>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: 40,
          borderRadius: 8,
          border: "1px solid var(--dd-paper-grey)",
          background: "var(--dd-paper-white)",
          padding: "0 12px",
          gap: 8,
        }}
      >
        <SearchIcon />
        <div
          style={{
            flex: 1,
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-faint)",
          }}
        >
          Search shows, people, episodes...
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-faint)",
            border: "1px solid var(--dd-paper-grey)",
            borderRadius: 4,
            padding: "2px 6px",
            lineHeight: 1,
          }}
        >
          /
        </div>
      </div>
    </div>
  );
}

function SelectDropdownSpecimen() {
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
        Select / Dropdown
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Styled select trigger with open-state dropdown menu.
      </div>
      <div style={{ maxWidth: 280, position: "relative" }}>
        {/* Trigger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid var(--dd-paper-grey)",
            background: "var(--dd-paper-white)",
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            color: "var(--dd-ink-black)",
            cursor: "pointer",
          }}
        >
          <span>Select network...</span>
          <ChevronDown />
        </div>
        {/* Dropdown */}
        <div
          style={{
            marginTop: 4,
            background: "var(--dd-paper-white)",
            borderRadius: 8,
            border: "1px solid var(--dd-paper-grey)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {["Bravo", "NBC", "Peacock", "E!", "Oxygen"].map((item, i) => (
            <div
              key={item}
              style={{
                padding: "8px 12px",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                color: "var(--dd-ink-black)",
                background: i === 0 ? "var(--dd-paper-cool)" : "transparent",
                cursor: "pointer",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitchSpecimen() {
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
        Toggle Switch
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Three states: off, on, and disabled.
      </div>
      <div className="flex items-center gap-6">
        {/* Off */}
        <div className="flex flex-col items-center gap-2">
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: "var(--dd-paper-mid)",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--dd-paper-white)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.15s",
              }}
            />
          </div>
          <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)" }}>Off</span>
        </div>
        {/* On */}
        <div className="flex flex-col items-center gap-2">
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: "var(--dd-accent-saffron)",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 22,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--dd-paper-white)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                transition: "left 0.15s",
              }}
            />
          </div>
          <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)" }}>On</span>
        </div>
        {/* Disabled */}
        <div className="flex flex-col items-center gap-2">
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              background: "var(--dd-paper-grey)",
              position: "relative",
              opacity: 0.5,
              cursor: "not-allowed",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: "var(--dd-paper-cool)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            />
          </div>
          <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "var(--dd-ink-faint)" }}>Disabled</span>
        </div>
      </div>
    </div>
  );
}

function CheckboxRadioSpecimen() {
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
        Checkbox &amp; Radio
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Custom styled controls with Hamburg Serial labels.
      </div>
      <div className="flex gap-8">
        {/* Checkboxes */}
        <div className="flex flex-col gap-3">
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "var(--dd-ink-faint)",
              marginBottom: 2,
            }}
          >
            Checkbox
          </div>
          {[
            { label: "Include cast data", checked: true },
            { label: "Show ratings", checked: false },
            { label: "Enable alerts", checked: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2" style={{ cursor: "pointer" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: item.checked ? "2px solid var(--dd-ink-black)" : "2px solid var(--dd-paper-mid)",
                  background: item.checked ? "var(--dd-ink-black)" : "var(--dd-paper-white)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.checked && (
                  <svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontSize: 14,
                  color: "var(--dd-ink-black)",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Radios */}
        <div className="flex flex-col gap-3">
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
              color: "var(--dd-ink-faint)",
              marginBottom: 2,
            }}
          >
            Radio
          </div>
          {[
            { label: "All seasons", selected: false },
            { label: "Current season", selected: true },
            { label: "Custom range", selected: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2" style={{ cursor: "pointer" }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: item.selected ? "2px solid var(--dd-ink-black)" : "2px solid var(--dd-paper-mid)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.selected && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--dd-ink-black)",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontSize: 14,
                  color: "var(--dd-ink-black)",
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormLayoutSpecimen() {
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
        Form Layout Pattern
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Complete form card with section title, stacked label-input pairs, required markers, and submit button.
      </div>
      <div
        style={{
          maxWidth: 400,
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: "var(--dd-radius-md)",
          padding: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-headline)",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            marginBottom: 4,
          }}
        >
          Add New Show
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 14,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          Enter the details for a new reality television show to add to the catalog.
        </div>

        <div className="flex flex-col gap-4">
          {/* Show Name */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Show Name <span style={{ color: "var(--dd-viz-red)" }}>*</span>
            </label>
            <input
              type="text"
              readOnly
              placeholder="e.g. Real Housewives of..."
              style={{
                ...inputBase,
                border: "1px solid var(--dd-paper-grey)",
              }}
            />
          </div>
          {/* Network */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Network <span style={{ color: "var(--dd-viz-red)" }}>*</span>
            </label>
            <input
              type="text"
              readOnly
              placeholder="e.g. Bravo"
              style={{
                ...inputBase,
                border: "1px solid var(--dd-paper-grey)",
              }}
            />
          </div>
          {/* Season Count */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Season Count
            </label>
            <input
              type="text"
              readOnly
              placeholder="e.g. 12"
              style={{
                ...inputBase,
                border: "1px solid var(--dd-paper-grey)",
              }}
            />
          </div>
          {/* Submit */}
          <button
            type="button"
            style={{
              marginTop: 8,
              padding: "10px 20px",
              background: "var(--dd-ink-black)",
              color: "var(--dd-paper-white)",
              border: "none",
              borderRadius: 6,
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Add Show
          </button>
        </div>
      </div>
    </div>
  );
}

function ValidationStatesSpecimen() {
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
        Validation States
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 12,
          color: "var(--dd-ink-soft)",
          marginBottom: 12,
        }}
      >
        Three fields showing valid, invalid, and neutral simultaneously.
      </div>
      <div
        style={{
          maxWidth: 400,
          background: "var(--dd-paper-white)",
          border: "1px solid var(--dd-paper-grey)",
          borderRadius: "var(--dd-radius-md)",
          padding: 24,
        }}
      >
        <div className="flex flex-col gap-4">
          {/* Valid */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Email <GreenCheckIcon />
            </label>
            <input
              type="text"
              readOnly
              defaultValue="editor@trr.com"
              style={{
                ...inputBase,
                border: "1.5px solid var(--dd-viz-green)",
              }}
            />
          </div>
          {/* Invalid */}
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Password <RedXIcon />
            </label>
            <input
              type="text"
              readOnly
              defaultValue="abc"
              style={{
                ...inputBase,
                border: "1.5px solid var(--dd-viz-red)",
              }}
            />
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-viz-red)",
                marginTop: 4,
              }}
            >
              Password must be at least 8 characters
            </div>
          </div>
          {/* Neutral */}
          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                marginBottom: 4,
              }}
            >
              Display Name
            </label>
            <input
              type="text"
              readOnly
              placeholder="Optional"
              style={{
                ...inputBase,
                border: "1px solid var(--dd-paper-grey)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ──────────────────────────────────── */

export default function FormsSection() {
  return (
    <div>
      <div className="dd-section-label">Forms</div>
      <h2 className="dd-section-title">Form Patterns</h2>
      <p className="dd-section-desc">
        Form elements follow a consistent visual language: Franklin Gothic for
        labels and inputs, 6px border-radius, and a clear state hierarchy for
        default, focus, error, and disabled.
      </p>

      <div className="grid grid-cols-1 gap-8" style={{ marginBottom: "var(--dd-space-2xl)" }}>
        {/* Text Inputs */}
        <SectionLabel>Text Input States</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <TextInputStates />
        </div>

        {/* Search Bar */}
        <SectionLabel>Search Bar</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <SearchBarSpecimen />
        </div>

        {/* Select / Dropdown */}
        <SectionLabel>Select / Dropdown</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <SelectDropdownSpecimen />
        </div>

        {/* Toggle Switch */}
        <SectionLabel>Toggle Switch</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <ToggleSwitchSpecimen />
        </div>

        {/* Checkbox & Radio */}
        <SectionLabel>Checkbox &amp; Radio</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <CheckboxRadioSpecimen />
        </div>

        {/* Form Layout */}
        <SectionLabel>Form Layout Pattern</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <FormLayoutSpecimen />
        </div>

        {/* Validation */}
        <SectionLabel>Validation States</SectionLabel>
        <div
          style={{
            background: "var(--dd-paper-cool)",
            borderRadius: "var(--dd-radius-md)",
            padding: 24,
          }}
        >
          <ValidationStatesSpecimen />
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          color: "var(--dd-ink-faint)",
        }}
      >
        All inputs: 14px Franklin Gothic &bull; 6px radius &bull; 1px border default &bull;
        2px border focused/error &bull; ring shadow on focus &bull; Hamburg Serial labels
      </div>
    </div>
  );
}

"use client";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

interface SwatchProps {
  name: string;
  hex: string;
}

function Swatch({ name, hex }: SwatchProps) {
  return (
    <div className="dd-swatch">
      <div className="dd-swatch-color" style={{ background: hex }} />
      <div className="dd-swatch-info">
        <div className="dd-swatch-name">{name}</div>
        <div className="dd-swatch-hex">{hex}</div>
      </div>
    </div>
  );
}

function PaletteRow({ colors }: { colors: { hex: string; label?: string }[] }) {
  return (
    <div className="dd-palette-row">
      {colors.map((c, i) => {
        const lum = relativeLuminance(c.hex);
        return (
          <div
            key={i}
            className="dd-palette-cell"
            style={{
              background: c.hex,
              color: lum > 0.4 ? "var(--dd-ink-black)" : "#fff",
            }}
          >
            {c.label ?? c.hex}
          </div>
        );
      })}
    </div>
  );
}

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
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

/** Quick sRGB relative luminance for contrast checks */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/* ------------------------------------------------------------------ */
/*  Data                                                              */
/* ------------------------------------------------------------------ */

const INK_SWATCHES: SwatchProps[] = [
  { name: "Ink Black", hex: "#121212" },
  { name: "Ink Dark", hex: "#1A1A1A" },
  { name: "Ink Medium", hex: "#333333" },
  { name: "Ink Soft", hex: "#555555" },
  { name: "Ink Light", hex: "#727272" },
  { name: "Ink Faint", hex: "#999999" },
];

const PAPER_SWATCHES: SwatchProps[] = [
  { name: "Paper White", hex: "#FFFFFF" },
  { name: "Paper Warm", hex: "#F7F5F0" },
  { name: "Paper Cool", hex: "#F0F0F0" },
  { name: "Paper Grey", hex: "#E8E5E0" },
  { name: "Paper Mid", hex: "#D5D2CC" },
];

const ACCENT_SWATCHES: SwatchProps[] = [
  { name: "Saffron", hex: "#F6CB2F" },
  { name: "Gold", hex: "#DFBD50" },
];

const VIZ_CATEGORICAL: SwatchProps[] = [
  { name: "Blue", hex: "#4A90D9" },
  { name: "Red", hex: "#D04040" },
  { name: "Orange", hex: "#E8913A" },
  { name: "Green", hex: "#5B9E5B" },
  { name: "Teal", hex: "#2D8C8C" },
  { name: "Purple", hex: "#7B5EA7" },
  { name: "Yellow", hex: "#F6CB2F" },
  { name: "Peach", hex: "#F4AE7B" },
];

const SEQ_BLUE = [
  { hex: "#DCE8F0" },
  { hex: "#B8D4E3" },
  { hex: "#86C3D6" },
  { hex: "#4A90D9" },
  { hex: "#326DA8" },
  { hex: "#1D4E7A" },
];

const DIV_RED_BLUE = [
  { hex: "#A03030" },
  { hex: "#D04040" },
  { hex: "#E89090" },
  { hex: "#E8E5E0" },
  { hex: "#86C3D6" },
  { hex: "#4A90D9" },
  { hex: "#326DA8" },
];

const SEQ_RED = [
  { hex: "#F5E0E0" },
  { hex: "#F0A0A0" },
  { hex: "#E87070" },
  { hex: "#D04040" },
  { hex: "#A03030" },
  { hex: "#6B1D1D" },
];

/* TRR Brand 45-color palette */
const BRAND_GROUPS: { label: string; swatches: SwatchProps[] }[] = [
  {
    label: "Reds & Warm",
    swatches: [
      { name: "Deep Crimson", hex: "#7A0307" },
      { name: "Magenta", hex: "#95164A" },
      { name: "Red", hex: "#B81D22" },
      { name: "Vermillion", hex: "#CF5315" },
      { name: "Amber", hex: "#C76D00" },
      { name: "Tangerine", hex: "#F1991B" },
      { name: "Sienna", hex: "#B05E2A" },
      { name: "Gold", hex: "#E3A320" },
      { name: "Butterscotch", hex: "#D48C42" },
    ],
  },
  {
    label: "Yellows & Earthy",
    swatches: [
      { name: "Sunflower", hex: "#ECC91C" },
      { name: "Ochre", hex: "#977022" },
      { name: "Walnut", hex: "#744A1F" },
      { name: "Olive", hex: "#C2B72D" },
    ],
  },
  {
    label: "Greens",
    swatches: [
      { name: "Fern", hex: "#76A34C" },
      { name: "Forest", hex: "#356A3B" },
      { name: "Teal", hex: "#0C454A" },
      { name: "Lime", hex: "#769F25" },
    ],
  },
  {
    label: "Blues",
    swatches: [
      { name: "Powder Blue", hex: "#A1C6D4" },
      { name: "Slate", hex: "#53769C" },
      { name: "Petrol", hex: "#4B7C89" },
      { name: "Cobalt", hex: "#28578A" },
      { name: "Navy", hex: "#063656" },
      { name: "Royal", hex: "#1D4782" },
      { name: "Indigo", hex: "#2C438D" },
      { name: "Sapphire", hex: "#144386" },
    ],
  },
  {
    label: "Purples & Pinks",
    swatches: [
      { name: "Lavender", hex: "#6568AB" },
      { name: "Plum", hex: "#644072" },
      { name: "Eggplant", hex: "#4F2F4B" },
      { name: "Rose", hex: "#C37598" },
      { name: "Orchid", hex: "#B05988" },
      { name: "Wine", hex: "#772149" },
      { name: "Blush", hex: "#DFC3D9" },
      { name: "Petal", hex: "#E9A6C7" },
      { name: "Mauve", hex: "#A5739F" },
      { name: "Carnation", hex: "#D37EAF" },
    ],
  },
  {
    label: "Neutrals",
    swatches: [
      { name: "Sand", hex: "#C8BEB3" },
      { name: "Khaki", hex: "#D2C09E" },
      { name: "Graphite", hex: "#666A6E" },
      { name: "Espresso", hex: "#34130C" },
      { name: "Charcoal", hex: "#34373F" },
      { name: "Mahogany", hex: "#35110B" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ColorsSection() {
  return (
    <div>
      <div className="dd-section-label">Colors</div>
      <h2 className="dd-section-title">Color System</h2>
      <p className="dd-section-desc">
        A restrained ink-and-paper foundation keeps the editorial tone neutral,
        while the data visualization and brand palettes provide earned color that
        always carries meaning. Every hue earns its place.
      </p>

      {/* Core Ink */}
      <SectionLabel>Core Ink</SectionLabel>
      <div className="dd-swatch-grid">
        {INK_SWATCHES.map((s) => (
          <Swatch key={s.hex} {...s} />
        ))}
      </div>

      {/* Paper */}
      <SectionLabel>Paper</SectionLabel>
      <div className="dd-swatch-grid">
        {PAPER_SWATCHES.map((s) => (
          <Swatch key={s.hex} {...s} />
        ))}
      </div>

      {/* Accent */}
      <SectionLabel>Accent</SectionLabel>
      <div className="dd-swatch-grid">
        {ACCENT_SWATCHES.map((s) => (
          <Swatch key={s.hex} {...s} />
        ))}
      </div>

      {/* Data Viz Categorical */}
      <SectionLabel>Data Viz &mdash; Categorical</SectionLabel>
      <div className="dd-swatch-grid">
        {VIZ_CATEGORICAL.map((s) => (
          <Swatch key={s.name} {...s} />
        ))}
      </div>

      {/* Sequential Blue */}
      <SectionLabel>Sequential Blue</SectionLabel>
      <PaletteRow colors={SEQ_BLUE} />

      {/* Diverging Red-Blue */}
      <SectionLabel>Diverging Red &mdash; Blue</SectionLabel>
      <PaletteRow colors={DIV_RED_BLUE} />

      {/* Sequential Red */}
      <SectionLabel>Sequential Red</SectionLabel>
      <PaletteRow colors={SEQ_RED} />

      {/* TRR Brand Palette */}
      <div style={{ marginTop: 48 }}>
        <SectionLabel>TRR Brand Palette &mdash; 45 Colors</SectionLabel>
      </div>

      {BRAND_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="dd-palette-label">{group.label}</div>
          <div className="dd-swatch-grid">
            {group.swatches.map((s) => (
              <Swatch key={s.name + s.hex} {...s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

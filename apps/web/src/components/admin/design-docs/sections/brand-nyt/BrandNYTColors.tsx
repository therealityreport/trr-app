"use client";

import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  BrandNYTColors — Aggregated color reference across all NYT articles */
/*  Core tokens, graphics palette, Datawrapper theme, per-article      */
/*  palettes, and a deduplicated combined chart palette                 */
/* ------------------------------------------------------------------ */

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
        color: "#326891",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid #326891",
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

/* ── Inline Data ──────────────────────────────────────────────────── */

interface ColorToken {
  name: string;
  token: string;
  hex: string;
  use: string;
}

const CORE_COLORS: ColorToken[] = [
  { name: "Content Primary", token: "--color-content-primary", hex: "#121212", use: "Text" },
  { name: "Background Default", token: "--color-background-default", hex: "#fff", use: "Page" },
  { name: "Signal Editorial", token: "--color-signal-editorial", hex: "#326891", use: "NYT blue links" },
  { name: "Signal Breaking", token: "--color-signal-breaking", hex: "#d0021b", use: "Breaking news red" },
];

const GRAPHICS_COLORS: { name: string; token: string; hex: string }[] = [
  { name: "Red", token: "--g-red", hex: "#e15759" },
  { name: "Blue", token: "--g-blue", hex: "#4e79a7" },
  { name: "Green", token: "--g-green", hex: "#59a14f" },
  { name: "Orange", token: "--g-orange", hex: "#f28e2c" },
  { name: "Purple", token: "--g-purple", hex: "#b07aa1" },
  { name: "Teal", token: "--g-teal", hex: "#76b7b2" },
];

const DATAWRAPPER_COLORS: { label: string; hex: string; note: string }[] = [
  { label: "Grid", hex: "#e6e6e6", note: "Chart gridlines" },
  { label: "Baseline", hex: "#333333", note: "Axis baseline" },
  { label: "Text", hex: "#333333", note: "Annotation text" },
  { label: "Primary Label", hex: "#121212", note: "weight 700" },
  { label: "Secondary Label", hex: "#a8a8a8", note: "weight 400" },
];

/* ── Per-Article Color Definitions ───────────────────────────────── */

interface ArticlePaletteEntry {
  name: string;
  hex: string;
  usage: string;
}

interface ArticlePalette {
  articleId: string;
  label: string;
  colors: ArticlePaletteEntry[];
}

/** Short title for display */
function shortTitle(title: string): string {
  if (title.length <= 40) return title;
  return title.slice(0, 37) + "\u2026";
}

/** Extract per-article palettes from ARTICLES config */
function buildArticlePalettes(): ArticlePalette[] {
  const palettes: ArticlePalette[] = [];

  for (const article of ARTICLES) {
    const palette: ArticlePaletteEntry[] = [];
    const label = shortTitle(article.title);

    /* --- Badge / status colors from quoteSections --- */
    if (article.quoteSections.length > 0) {
      const seenBadge = new Set<string>();
      for (const qs of article.quoteSections) {
        const key = qs.badgeColor.toUpperCase();
        if (!seenBadge.has(key)) {
          seenBadge.add(key);
          palette.push({
            name: `${qs.badge} badge`,
            hex: qs.badgeColor,
            usage: `Status badge for "${qs.section}" and similar sections`,
          });
        }
      }
    }

    /* --- Datawrapper theme colors from architecture --- */
    if ("architecture" in article && article.architecture) {
      const arch = article.architecture as Record<string, unknown>;
      if ("datawrapperTheme" in arch && arch.datawrapperTheme) {
        const dwTheme = arch.datawrapperTheme as Record<string, unknown>;
        const dwEntries: { key: string; hex: string }[] = [];
        for (const [key, val] of Object.entries(dwTheme)) {
          if (typeof val === "string" && val.startsWith("#")) {
            dwEntries.push({ key, hex: val });
          } else if (typeof val === "string" && /^#[0-9a-fA-F]{3,8}/.test(val.split(" ")[0])) {
            dwEntries.push({ key, hex: val.split(" ")[0] });
          }
        }
        const seenDw = new Set(palette.map((p) => p.hex.toUpperCase()));
        for (const entry of dwEntries) {
          const upper = entry.hex.toUpperCase();
          if (!seenDw.has(upper)) {
            seenDw.add(upper);
            const humanKey = entry.key.replace(/([A-Z])/g, " $1").trim();
            palette.push({
              name: `DW ${humanKey}`,
              hex: entry.hex,
              usage: `Datawrapper theme: ${entry.key}`,
            });
          }
        }
      }
    }

    /* --- chartPalette (array of {name, hex} or object of key:hex) --- */
    if ("colors" in article && article.colors) {
      const colorsObj = article.colors as Record<string, unknown>;
      const cpRaw = colorsObj.chartPalette;
      if (cpRaw && typeof cpRaw === "object") {
        const seenChart = new Set(palette.map((p) => p.hex.toUpperCase()));
        if (Array.isArray(cpRaw)) {
          for (const entry of cpRaw) {
            if (
              typeof entry === "object" &&
              entry !== null &&
              "hex" in entry &&
              "name" in entry
            ) {
              const hex = String((entry as { hex: string }).hex);
              const name = String((entry as { name: string }).name);
              const upper = hex.toUpperCase();
              if (!seenChart.has(upper)) {
                seenChart.add(upper);
                palette.push({ name, hex, usage: "Chart palette" });
              }
            }
          }
        } else {
          for (const [key, val] of Object.entries(cpRaw as Record<string, unknown>)) {
            if (typeof val === "string" && val.startsWith("#")) {
              const upper = val.toUpperCase();
              if (!seenChart.has(upper)) {
                seenChart.add(upper);
                const humanKey = key.replace(/([A-Z])/g, " $1").trim();
                palette.push({ name: humanKey, hex: val, usage: `Chart palette (${key})` });
              }
            }
          }
        }
      }
    }

    if (palette.length > 0) {
      palettes.push({ articleId: article.id, label, colors: palette });
    }
  }

  return palettes;
}

/** Build combined chart palette: union of all article colors, deduplicated by hex */
function buildCombinedPalette(): { label: string; hex: string; sources: string[] }[] {
  const map = new Map<string, { label: string; hex: string; sources: string[] }>();

  for (const article of ARTICLES) {
    if (!("colors" in article) || !article.colors) continue;
    const src = shortTitle(article.title);
    const colorsObj = article.colors as Record<string, unknown>;

    for (const [, groupVal] of Object.entries(colorsObj)) {
      if (!groupVal || typeof groupVal !== "object") continue;
      if (Array.isArray(groupVal)) {
        for (const entry of groupVal) {
          if (typeof entry === "object" && entry !== null && "hex" in entry && "name" in entry) {
            const hex = String((entry as { hex: string }).hex);
            const name = String((entry as { name: string }).name);
            const key = hex.toUpperCase();
            const existing = map.get(key);
            if (existing) {
              if (!existing.sources.includes(src)) existing.sources.push(src);
            } else {
              map.set(key, { label: name, hex, sources: [src] });
            }
          }
        }
      } else {
        for (const [k, val] of Object.entries(groupVal as Record<string, unknown>)) {
          if (typeof val === "string" && val.startsWith("#")) {
            const key = val.toUpperCase();
            const existing = map.get(key);
            const humanKey = k.replace(/([A-Z])/g, " $1").trim();
            if (existing) {
              if (!existing.sources.includes(src)) existing.sources.push(src);
            } else {
              map.set(key, { label: humanKey, hex: val, sources: [src] });
            }
          }
        }
      }
    }

    /* Also capture badge colors from quoteSections */
    if (article.quoteSections.length > 0) {
      for (const qs of article.quoteSections) {
        const key = qs.badgeColor.toUpperCase();
        const existing = map.get(key);
        if (existing) {
          if (!existing.sources.includes(src)) existing.sources.push(src);
        } else {
          map.set(key, { label: `${qs.badge} badge`, hex: qs.badgeColor, sources: [src] });
        }
      }
    }
  }

  return Array.from(map.values());
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTColors() {
  const articlePalettes = buildArticlePalettes();
  const combinedPalette = buildCombinedPalette();

  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Colors</h2>
      <p className="dd-section-desc">
        Aggregated color data from all NYT articles &mdash; core design tokens,
        graphics palette, Datawrapper theme, per-article palettes, and a
        deduplicated combined chart palette.
      </p>

      {/* ── 1. Core Tokens ─────────────────────────────────────── */}
      <SectionLabel id="core-tokens">Core Tokens</SectionLabel>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {CORE_COLORS.map((c) => (
          <div
            key={c.token}
            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
          >
            <div
              style={{
                width: "100%",
                height: 40,
                borderRadius: 8,
                background: c.hex,
                border: c.hex === "#fff" ? "1px solid #e5e5e5" : "none",
                marginBottom: 8,
              }}
            />
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--dd-ink-black)" }}>
              {c.name}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: "#326891", marginBottom: 2 }}>
              {c.token}
            </div>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-faint)" }}>
              {c.hex} &mdash; {c.use}
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. Graphics Palette ────────────────────────────────── */}
      <SectionLabel id="graphics-palette">Graphics Palette (g-* tokens)</SectionLabel>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {GRAPHICS_COLORS.map((c) => (
          <div
            key={c.token}
            className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm text-center"
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: c.hex,
                margin: "0 auto 6px",
              }}
            />
            <div className="font-mono" style={{ fontSize: 10, color: "#326891" }}>
              {c.token}
            </div>
            <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 11, color: "var(--dd-ink-faint)" }}>
              {c.hex}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Datawrapper Theme ───────────────────────────────── */}
      <SectionLabel id="datawrapper-theme">Datawrapper Theme</SectionLabel>

      <div className="flex flex-wrap gap-3 mb-6">
        {DATAWRAPPER_COLORS.map((c) => (
          <div
            key={c.label}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm flex items-center gap-2"
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: c.hex,
                border: "1px solid #e5e5e5",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--dd-ink-black)" }}>
                {c.label}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--dd-ink-faint)" }}>
                {c.hex} &mdash; {c.note}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. Per-Article Palettes ────────────────────────────── */}
      <SectionLabel id="article-palettes">Per-Article Palettes</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Colors dynamically extracted from each NYT article&apos;s configuration &mdash;
        badge/status colors, chart palettes, and Datawrapper theme values.
      </p>

      {articlePalettes.map((ap) => (
        <div key={ap.articleId} className="mb-6">
          <SubSectionLabel>{ap.label}</SubSectionLabel>
          <div className="flex flex-wrap gap-3">
            {ap.colors.map((c, i) => (
              <div
                key={`${ap.articleId}-${c.hex}-${i}`}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm flex items-center gap-2"
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: c.hex,
                    border: "1px solid #e5e5e5",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--dd-ink-black)" }}>
                    {c.name}
                  </div>
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--dd-ink-faint)" }}>
                    {c.hex}
                  </div>
                  <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, color: "var(--dd-ink-faint)", fontStyle: "italic" }}>
                    {c.usage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── 5. Combined Chart Palette ──────────────────────────── */}
      <SectionLabel id="combined-palette">Combined Chart Palette</SectionLabel>

      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Union of all article chart colors, deduplicated by hex value, with source
        attribution.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        {combinedPalette.map((c) => (
          <div
            key={c.hex}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm flex items-center gap-2"
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                background: c.hex,
                border: "1px solid #e5e5e5",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, fontWeight: 600, color: "var(--dd-ink-black)" }}>
                {c.label}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--dd-ink-faint)" }}>
                {c.hex}
              </div>
              <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 10, color: "var(--dd-ink-faint)", fontStyle: "italic" }}>
                {c.sources.join(", ")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

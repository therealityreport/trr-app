"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Layouts                                           */
/*  Homepage layout pattern wireframes from The Athletic homepage       */
/*  https://www.nytimes.com/athletic/                                  */
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
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid var(--dd-brand-accent)",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

/* ── Shared wireframe styles ──────────────────────────────────────── */

const IMG_BG = "#f0f0ee";
const TEXT_BG = "#e8e5e0";
const CARD_BORDER = "1px solid #e5e5e5";
const DOTTED_BORDER = "1px dotted #ccc";

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 9,
        fontWeight: 600,
        color: "#888",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </span>
  );
}

function MetaRow({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        padding: "10px 16px",
        borderTop: "1px solid #f0f0f0",
        background: "#fafafa",
        borderRadius: "0 0 12px 12px",
      }}
    >
      {items.map((item) => (
        <div key={item.label} style={{ display: "flex", gap: 4, alignItems: "baseline" }}>
          <span
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              fontWeight: 700,
              color: "#999",
              textTransform: "uppercase" as const,
            }}
          >
            {item.label}:
          </span>
          <span
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "#555",
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function WireframeCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div
      className="dd-brand-card"
      style={{ marginBottom: 40, overflow: "hidden" }}
    >
      <div style={{ padding: "20px 24px 16px" }}>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--dd-brand-text-primary)",
            marginBottom: 16,
          }}
        >
          {title}
        </div>
        {children}
      </div>
    </div>
  );
}

/* placeholder blocks */
function ImgBlock({ w, h, label, aspect }: { w?: string; h?: number; label?: string; aspect?: string }) {
  return (
    <div
      style={{
        width: w || "100%",
        height: h || undefined,
        aspectRatio: aspect || undefined,
        background: IMG_BG,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: h || 40,
        border: DOTTED_BORDER,
      }}
    >
      {label && <MonoLabel>{label}</MonoLabel>}
    </div>
  );
}

function TextLine({ w, h }: { w?: string; h?: number }) {
  return (
    <div
      style={{
        width: w || "80%",
        height: h || 8,
        background: TEXT_BG,
        borderRadius: 2,
      }}
    />
  );
}

function TextBlock({ lines, gap }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: gap || 4 }}>
      {Array.from({ length: lines || 3 }).map((_, i) => (
        <TextLine key={i} w={i === (lines || 3) - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticLayouts() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="dd-brand-card"
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
            color: "var(--dd-brand-text-primary)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Layouts
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Homepage layout pattern wireframes from The Athletic homepage.
          Each layout is shown as a proportional wireframe with CSS class names, proportions, and spacing tokens.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/*  1. Three-Topper (ContainerThreeTopper)           */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-three-topper">1. Three-Topper</SectionLabel>
      <WireframeCard title="ContainerThreeTopper">
        <div style={{ display: "flex", gap: 16, minHeight: 280 }}>
          {/* Hero 56% */}
          <div style={{ flex: "0 0 56%", display: "flex", flexDirection: "column", gap: 8, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>ContainerThreeTopper_HeroLeftWrapper (56%)</MonoLabel>
            <ImgBlock aspect="2/3" label="Hero Image (2:3)" />
            <TextLine w="70%" h={12} />
            <TextBlock lines={2} />
            <TextLine w="40%" h={6} />
          </div>
          {/* Article List 39% */}
          <div style={{ flex: "0 0 25%", display: "flex", flexDirection: "column", gap: 6, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>ArticleList (4 rows)</MonoLabel>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", borderBottom: i < 3 ? "1px solid #f0f0f0" : "none", paddingBottom: 6 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextLine w="90%" h={7} />
                  <TextLine w="50%" h={5} />
                </div>
                <div style={{ width: 48, height: 36, background: IMG_BG, borderRadius: 3, flexShrink: 0, border: DOTTED_BORDER }} />
              </div>
            ))}
          </div>
          {/* Headlines 25% */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <MonoLabel>SubmoduleHeadlinesList</MonoLabel>
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa" }}>See all &rarr;</span>
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 4 }}>
                <div style={{ width: 8, height: 8, background: TEXT_BG, borderRadius: 1, flexShrink: 0 }} />
                <TextLine w="85%" h={6} />
              </div>
            ))}
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "ContainerThreeTopper_TopperContainer" },
            { label: "Breakpoint", value: "Stacked < 600px" },
            { label: "Max-width", value: "1248px" },
            { label: "Gap", value: "16px" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  2. Curation Five Plus (ModuleCurationFivePlus)   */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-curation-five-plus">2. Curation Five Plus</SectionLabel>
      <WireframeCard title="ModuleCurationFivePlus">
        {/* League icon header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, background: IMG_BG, borderRadius: 12, border: DOTTED_BORDER }} />
          <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, fontWeight: 600, color: "#555" }}>headlineRegularSlabExtraSmall &mdash; &quot;Baseball Is Back&quot;</span>
        </div>
        <div style={{ display: "flex", gap: 16, minHeight: 240 }}>
          {/* Hero 50% */}
          <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", gap: 8, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>Hero Card (50%)</MonoLabel>
            <ImgBlock aspect="16/9" label="Large Image" />
            <TextLine w="75%" h={12} />
            <TextBlock lines={2} />
            <TextLine w="35%" h={6} />
          </div>
          {/* 4-item list 50% */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>ModuleCurationThreePlusList (50%)</MonoLabel>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", borderBottom: i < 3 ? "1px solid #f0f0f0" : "none", paddingBottom: 8 }}>
                <div style={{ width: 64, height: 48, background: IMG_BG, borderRadius: 3, flexShrink: 0, border: DOTTED_BORDER }}>
                  <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#aaa", padding: 2, display: "block" }}>4:3 ~165px</span>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  {i === 3 && (
                    <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#b45309", background: "#fef3c7", padding: "1px 4px", borderRadius: 2, alignSelf: "flex-start" }}>Power Rankings</span>
                  )}
                  <TextLine w="90%" h={8} />
                  <TextLine w="45%" h={5} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "ModuleCurationFivePlus_DefaultGridStyle" },
            { label: "Breakpoint", value: "Stacked < 600px" },
            { label: "Max-width", value: "1248px" },
            { label: "Spacing", value: "16px gap, 8px item padding" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  3. Curation Three-Four (ModuleCurationThreeFour) */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-curation-three-four">3. Curation Three-Four</SectionLabel>
      <WireframeCard title="ModuleCurationThreeFour">
        <div style={{ display: "flex", gap: 16, minHeight: 220 }}>
          {/* Hero area 8/12 cols */}
          <div style={{ flex: "0 0 66.66%", border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>Hero Area (8/12 cols)</MonoLabel>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ flex: "0 0 58.33%", border: DOTTED_BORDER, borderRadius: 4, overflow: "hidden" }}>
                <ImgBlock aspect="16/10" label="Image (7/12)" />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, padding: "4px 0" }}>
                <MonoLabel>Text (5/12)</MonoLabel>
                <TextLine w="85%" h={11} />
                <TextBlock lines={3} />
                <TextLine w="40%" h={6} />
              </div>
            </div>
          </div>
          {/* List area 4/12 cols */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>List Area (4/12 cols)</MonoLabel>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", borderBottom: i === 0 ? "1px solid #f0f0f0" : "none", paddingBottom: 10 }}>
                <div style={{ flex: "0 0 58.33%", display: "flex", flexDirection: "column", gap: 3 }}>
                  <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#aaa" }}>Text (7/12)</span>
                  <TextLine w="90%" h={8} />
                  <TextBlock lines={2} />
                  <TextLine w="40%" h={5} />
                </div>
                <div style={{ flex: 1, border: DOTTED_BORDER, borderRadius: 3 }}>
                  <ImgBlock h={52} label="Thumb (5/12)" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "ModuleCurationThreeFour_DefaultGridStyle" },
            { label: "Grid", value: "12-col: 8/12 hero + 4/12 list" },
            { label: "Max-width", value: "1248px" },
            { label: "Spacing", value: "16px column gap" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  4. Highlight Three (ModuleHighlightThreeContent) */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-highlight-three">4. Highlight Three</SectionLabel>
      <WireframeCard title="ModuleHighlightThreeContent">
        <div style={{ display: "flex", gap: 16, minHeight: 260 }}>
          {/* Left column: 2 stacked cards */}
          <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", gap: 0, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>Left Column (50%) &mdash; 2 stacked cards</MonoLabel>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", borderBottom: i === 0 ? "1px solid #e5e5e5" : "none", padding: "10px 0" }}>
                <div style={{ flex: "0 0 50%", border: DOTTED_BORDER, borderRadius: 3 }}>
                  <ImgBlock h={70} label={`Image (6/12)`} />
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#aaa" }}>Text (6/12)</span>
                  <TextLine w="90%" h={9} />
                  <TextBlock lines={2} />
                  <TextLine w="35%" h={5} />
                </div>
              </div>
            ))}
          </div>
          {/* Right column: single hero */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
            <MonoLabel>Right Column (50%) &mdash; Single Hero</MonoLabel>
            <ImgBlock aspect="4/3" label="Full-width Image" />
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <TextLine w="60%" h={11} />
              <TextLine w="30%" h={6} />
            </div>
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "ModuleHighlightThreeContent" },
            { label: "Grid", value: "50/50 equal split" },
            { label: "Divider", value: "border-bottom between left cards" },
            { label: "Spacing", value: "16px gap, 10px inner padding" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  5. Four-Column Grid                              */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-four-column-grid">5. Four-Column Grid</SectionLabel>
      <WireframeCard title="Four-Column Grid">
        <div style={{ display: "flex", minHeight: 200 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: "0 12px",
                borderRight: i < 3 ? "1px solid #e5e5e5" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <MonoLabel>Grid_mdNumber3</MonoLabel>
              <ImgBlock aspect="2/3" label="Image (2:3)" />
              <TextLine w="90%" h={9} />
              <TextLine w="85%" h={8} />
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <TextLine w="35%" h={5} />
                <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#bbb" }}>0 comments</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "6px 16px 2px", fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#aaa" }}>
          border-right: 1px solid var(--Gray30) between columns (except last)
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "Grid (4-col equal)" },
            { label: "Divider", value: "border-right: 1px solid var(--Gray30)" },
            { label: "Max-width", value: "1248px" },
            { label: "Spacing", value: "12px horizontal padding per column" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  6. Most Popular (numbered)                       */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-most-popular">6. Most Popular</SectionLabel>
      <WireframeCard title="Most Popular (Numbered)">
        {/* Header */}
        <div style={{ fontFamily: "var(--dd-font-sans)", fontSize: 18, fontWeight: 700, color: "var(--dd-brand-text-primary)", marginBottom: 12 }}>
          <MonoLabel>RegularSlabInline 32px &mdash; &quot;Most Popular&quot;</MonoLabel>
        </div>
        <div style={{ display: "flex", gap: 16, minHeight: 280 }}>
          {/* Two columns of 4 items each */}
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", gap: 0, border: DOTTED_BORDER, borderRadius: 6, padding: 10 }}>
              <MonoLabel>Column {col + 1} (6/12)</MonoLabel>
              {Array.from({ length: 4 }).map((_, row) => {
                const num = col * 4 + row + 1;
                return (
                  <div
                    key={row}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      borderBottom: row < 3 ? "1px solid #f0f0f0" : "none",
                      padding: "8px 0",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--dd-font-mono)",
                        fontSize: 22,
                        fontWeight: 700,
                        color: "#bbb",
                        lineHeight: 1,
                        width: 28,
                        flexShrink: 0,
                        textAlign: "center",
                      }}
                    >
                      {num}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 7, color: "#aaa" }}>Typography_brand3</span>
                      <TextLine w="90%" h={9} />
                      <TextLine w="70%" h={8} />
                    </div>
                    <div style={{ width: 52, height: 70, background: IMG_BG, borderRadius: 3, flexShrink: 0, border: DOTTED_BORDER }}>
                      <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 6, color: "#aaa", padding: 2, display: "block" }}>2:3 ~134px</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "Most Popular module" },
            { label: "Grid", value: "2-col (6/12 each)" },
            { label: "Number font", value: "RegularSlabInline 32px Gray40" },
            { label: "Title font", value: "bodyMedium2 18px" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  7. Headlines List (SubmoduleHeadlinesList)       */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-headlines-list">7. Headlines List</SectionLabel>
      <WireframeCard title="SubmoduleHeadlinesList">
        <div style={{ border: DOTTED_BORDER, borderRadius: 6, padding: 16, maxWidth: 360 }}>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--dd-font-sans)", fontSize: 13, fontWeight: 700, color: "var(--dd-brand-text-primary)" }}>Headlines</span>
            <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#888" }}>See all &rarr;</span>
          </div>
          <MonoLabel>SubmoduleHeadlinesList_headlinesMobileBox</MonoLabel>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 4 }}>
                {/* Square bullet SVG placeholder */}
                <div style={{ width: 10, height: 10, background: "#fff", border: "1.5px solid #ccc", borderRadius: 1, flexShrink: 0 }}>
                  <MonoLabel>&nbsp;</MonoLabel>
                </div>
                <div style={{ flex: 1 }}>
                  <TextLine w={`${70 + (i % 3) * 10}%`} h={7} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <MonoLabel>HeadlinesCard_cardLink &middot; utilitySansMediumLarge &middot; padding-bottom: 4px</MonoLabel>
          </div>
        </div>
        <div style={{ padding: "4px 0" }} />
        <MetaRow
          items={[
            { label: "Container", value: "SubmoduleHeadlinesList" },
            { label: "Bullet", value: "SVG 20x20, white fill" },
            { label: "Font", value: "utilitySansMediumLarge" },
            { label: "Spacing", value: "padding-bottom: 4px per item" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  8. Connections: Sports Edition                    */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-puzzle-module">8. Connections: Sports Edition</SectionLabel>
      <WireframeCard title="Content_PuzzleModule">
        <div style={{ display: "flex", gap: 0, minHeight: 160, border: DOTTED_BORDER, borderRadius: 6, overflow: "hidden" }}>
          {/* Left: green icon container */}
          <div
            style={{
              flex: "0 0 50%",
              background: "#CFF08B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 8,
              padding: 24,
            }}
          >
            <MonoLabel>Content_PuzzleIconContainer</MonoLabel>
            <div
              style={{
                width: 64,
                height: 64,
                background: "rgba(0,0,0,0.08)",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#555" }}>connections-se-icon.png</span>
            </div>
          </div>
          {/* Right: info panel */}
          <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
            <MonoLabel>Content_PuzzleContainer</MonoLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa" }}>Content_PuzzleDate</span>
              <TextLine w="30%" h={6} />
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa" }}>Content_PuzzleTitle</span>
              <TextLine w="70%" h={14} />
              <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa" }}>Content_PuzzleSubTitle</span>
              <TextLine w="55%" h={8} />
              <div style={{ marginTop: 8 }}>
                <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa" }}>Content_PuzzleButton</span>
                <div
                  style={{
                    marginTop: 4,
                    display: "inline-block",
                    padding: "6px 20px",
                    background: "#121212",
                    borderRadius: 4,
                  }}
                >
                  <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 9, color: "#fff" }}>Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "Content_PuzzleModule" },
            { label: "Grid", value: "2-col (6/6)" },
            { label: "Max-width", value: "1600px" },
            { label: "Accent", value: "#CFF08B (green)" },
          ]}
        />
      </WireframeCard>

      {/* ══════════════════════════════════════════════════ */}
      {/*  9. Ad Slot (ad-wrapper)                          */}
      {/* ══════════════════════════════════════════════════ */}
      <SectionLabel id="layout-ad-slot">9. Ad Slot</SectionLabel>
      <WireframeCard title="ad-wrapper">
        <div
          style={{
            border: DOTTED_BORDER,
            borderRadius: 6,
            padding: "11px 0 30px",
            margin: "0 auto",
            textAlign: "center",
            minHeight: 180,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <MonoLabel>ad-wrapper &middot; min-height: 300px &middot; margin: 48px 0 (40px mobile)</MonoLabel>
          {/* slug */}
          <div
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              fontWeight: 500,
              textTransform: "uppercase" as const,
              letterSpacing: "0.02em",
              color: "#999",
              marginTop: 4,
            }}
          >
            ad-slug &middot; &quot;Advertisement&quot;
          </div>
          {/* Ad placeholder */}
          <div
            style={{
              width: "80%",
              flex: 1,
              minHeight: 100,
              background: IMG_BG,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: DOTTED_BORDER,
            }}
          >
            <span style={{ fontFamily: "var(--dd-font-mono)", fontSize: 10, color: "#bbb" }}>Ad Content Area</span>
          </div>
          {/* skip link */}
          <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 8, color: "#aaa", textTransform: "uppercase" as const }}>
            SKIP ADVERTISEMENT (skip link)
          </div>
        </div>
        <MetaRow
          items={[
            { label: "Container", value: "ad-wrapper" },
            { label: "Min-height", value: "300px" },
            { label: "Margin", value: "48px 0 desktop, 40px 0 mobile" },
            { label: "Padding", value: "11px 0 30px" },
          ]}
        />
      </WireframeCard>

      {/* ── Summary Reference ────────────────────────────── */}
      <SectionLabel id="layout-summary">Layout Pattern Summary</SectionLabel>
      <div style={{ overflowX: "auto", marginBottom: 40 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
          }}
        >
          <thead>
            <tr>
              {["#", "Pattern", "CSS Class", "Grid", "Breakpoint"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    fontWeight: 700,
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.06em",
                    color: "var(--dd-ink-faint)",
                    borderBottom: "2px solid #e5e5e5",
                    background: "#fafafa",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { n: "1", pattern: "Three-Topper", cls: "ContainerThreeTopper", grid: "56% / 25% / flex", bp: "< 600px stacked" },
              { n: "2", pattern: "Curation Five Plus", cls: "ModuleCurationFivePlus", grid: "50% / 50%", bp: "< 600px stacked" },
              { n: "3", pattern: "Curation Three-Four", cls: "ModuleCurationThreeFour", grid: "8/12 + 4/12", bp: "< 600px stacked" },
              { n: "4", pattern: "Highlight Three", cls: "ModuleHighlightThreeContent", grid: "50% / 50%", bp: "< 600px stacked" },
              { n: "5", pattern: "Four-Column Grid", cls: "Grid_mdNumber3", grid: "4 equal cols", bp: "2-col tablet, 1-col mobile" },
              { n: "6", pattern: "Most Popular", cls: "Typography_brand3", grid: "6/12 + 6/12", bp: "1-col mobile" },
              { n: "7", pattern: "Headlines List", cls: "SubmoduleHeadlinesList", grid: "Single column", bp: "Full-width mobile" },
              { n: "8", pattern: "Connections: SE", cls: "Content_PuzzleModule", grid: "6/6 split", bp: "Stacked mobile" },
              { n: "9", pattern: "Ad Slot", cls: "ad-wrapper", grid: "Full-width centered", bp: "margin: 40px mobile" },
            ].map((row, i) => (
              <tr key={row.n}>
                <td style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#f9f9f9" : "white", fontWeight: 700, color: "var(--dd-brand-text-primary)" }}>{row.n}</td>
                <td style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#f9f9f9" : "white", color: "var(--dd-brand-text-primary)", fontWeight: 600 }}>{row.pattern}</td>
                <td style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#f9f9f9" : "white", color: "#555" }}>{row.cls}</td>
                <td style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#f9f9f9" : "white", color: "#555" }}>{row.grid}</td>
                <td style={{ padding: "6px 12px", borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#f9f9f9" : "white", color: "#888" }}>{row.bp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

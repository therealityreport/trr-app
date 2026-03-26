"use client";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Icons & Image Assets                              */
/*  Comprehensive catalog of SVG icons & image assets from Athletic    */
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
        color: "#121212",
        marginBottom: 8,
        marginTop: 32,
        borderLeft: "3px solid #121212",
        paddingLeft: 10,
      }}
    >
      {children}
    </h3>
  );
}

/* ── Shared Styles ────────────────────────────────────────────────── */

const mono10: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 10,
  color: "var(--dd-ink-faint)",
  lineHeight: 1.4,
};

const mono11Label: React.CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--dd-ink-medium)",
};

const cardStyle: React.CSSProperties = {
  padding: "20px 24px",
  display: "flex",
  alignItems: "center",
  gap: 24,
};

/* ── Icon Card ────────────────────────────────────────────────────── */

function IconCard({
  name,
  viewBox,
  size,
  fill,
  cssClass,
  usage,
  children,
  scaleFactor = 3,
  bgColor,
}: {
  name: string;
  viewBox: string;
  size: string;
  fill: string;
  cssClass: string;
  usage: string;
  children: React.ReactNode;
  scaleFactor?: number;
  bgColor?: string;
}) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white shadow-sm"
      style={cardStyle}
    >
      {/* Actual size */}
      <div
        style={{
          minWidth: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor ?? "#f4f4f5",
          borderRadius: 6,
          padding: 10,
        }}
      >
        {children}
      </div>

      {/* Enlarged */}
      <div
        style={{
          minWidth: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor ?? "#f4f4f5",
          borderRadius: 6,
          padding: 12,
          transform: `scale(${scaleFactor})`,
          transformOrigin: "center",
          margin: `0 ${scaleFactor * 16}px`,
        }}
      >
        {children}
      </div>

      {/* Metadata */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...mono11Label, marginBottom: 4 }}>{name}</div>
        <div style={mono10}>viewBox: {viewBox}</div>
        <div style={mono10}>size: {size}</div>
        <div style={mono10}>fill: {fill}</div>
        <div style={mono10}>class: {cssClass}</div>
        <div style={{ ...mono10, color: "#121212", marginTop: 4 }}>
          Usage: {usage}
        </div>
      </div>
    </div>
  );
}

/* ── Asset Reference Card (for external URLs) ─────────────────────── */

function AssetRefCard({
  name,
  size,
  urlPattern,
  examples,
  notes,
}: {
  name: string;
  size: string;
  urlPattern: string;
  examples: string[];
  notes: string;
}) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white shadow-sm"
      style={{ padding: "20px 24px" }}
    >
      <div style={{ ...mono11Label, marginBottom: 6 }}>{name}</div>
      <div style={mono10}>size: {size}</div>
      <div style={{ ...mono10, wordBreak: "break-all" as const }}>
        pattern: {urlPattern}
      </div>
      <div
        style={{
          ...mono10,
          marginTop: 6,
          color: "#121212",
        }}
      >
        {notes}
      </div>
      <div style={{ marginTop: 8, display: "flex", flexDirection: "column" as const, gap: 2 }}>
        {examples.map((url) => (
          <div
            key={url}
            style={{
              fontFamily: "var(--dd-font-mono)",
              fontSize: 9,
              color: "var(--dd-ink-faint)",
              wordBreak: "break-all" as const,
            }}
          >
            {url}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticIcons() {
  return (
    <div>
      {/* ── Brand Header ───────────────────────────────── */}
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
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
            color: "var(--dd-ink-black)",
            letterSpacing: "-0.01em",
            marginBottom: 8,
          }}
        >
          The Athletic &mdash; Icons &amp; Image Assets
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.5,
          }}
        >
          Comprehensive catalog of inline SVG icons, base64-encoded assets, and
          external image references extracted from Athletic article and homepage
          pages.
        </div>
      </div>

      {/* ============================================================ */}
      {/*  1. Navigation Icons                                          */}
      {/* ============================================================ */}
      <SectionLabel id="nav-icons">Navigation Icons</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {/* Hamburger Menu */}
        <IconCard
          name="Hamburger Menu"
          viewBox="0 0 30 30"
          size="30x30"
          fill="var(--Gray10)"
          cssClass="DesktopNav_HamburgerMenuContainer button svg"
          usage="DesktopNav hamburger menu button"
        >
          <svg width={30} height={30} viewBox="0 0 30 30" fill="none">
            <rect x={6.5} y={8.75} width={17} height={2.5} fill="var(--Gray10, #121212)" />
            <rect x={6.5} y={13.75} width={17} height={2.5} fill="var(--Gray10, #121212)" />
            <rect x={6.5} y={18.75} width={17} height={2.5} fill="var(--Gray10, #121212)" />
          </svg>
        </IconCard>

        {/* Chevron Down */}
        <IconCard
          name="Chevron Down"
          viewBox="(none specified)"
          size="10x6"
          fill="#969693"
          cssClass="HeaderLink_ShowSubNavButton svg"
          usage="Dropdown indicators on nav header links"
        >
          <svg width={10} height={6} fill="none">
            <path
              d="m1.281.193-.948.947 4.673 4.667.948-.947 3.712-3.707-.948-.946-3.712 3.706z"
              fill="#969693"
            />
          </svg>
        </IconCard>

        {/* Search (base64 PNG reference) */}
        <IconCard
          name="Search (Magnifying Glass)"
          viewBox="n/a (PNG)"
          size="20x20"
          fill="n/a (raster)"
          cssClass="DesktopNav search button img"
          usage="DesktopNav search button"
          bgColor="#f4f4f5"
        >
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <circle cx={8.5} cy={8.5} r={6} stroke="#121212" strokeWidth={2} />
            <line x1={13} y1={13} x2={18} y2={18} stroke="#121212" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </IconCard>

        {/* Close / Cancel */}
        <IconCard
          name="Close / Cancel"
          viewBox="0 0 28 28"
          size="28x28"
          fill="#969693"
          cssClass="ActionBanner close button svg"
          usage="ActionBanner close button (region banner dismiss)"
        >
          <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
            <path
              d="M20.5335 8.8407L19.1596 7.4668L14.005 12.6214L8.8407 7.4668L7.4668 8.8407L12.6214 14.005L7.4668 19.1596L8.8407 20.5335L14.005 15.3789L19.1596 20.5335L20.5335 19.1596L15.3789 14.005L20.5335 8.8407Z"
              fill="#969693"
            />
          </svg>
        </IconCard>
      </div>

      {/* ============================================================ */}
      {/*  2. Content Icons                                             */}
      {/* ============================================================ */}
      <SectionLabel id="content-icons">Content Icons</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {/* Comment Bubble */}
        <IconCard
          name="Comment Bubble"
          viewBox="0 0 14 15"
          size="14x15"
          fill="#121212"
          cssClass="Article comment count pill svg"
          usage="Article comment count pill"
        >
          <svg width={14} height={15} viewBox="0 0 14 15" fill="none">
            <path
              d="M0 0h14v14.849L9.951 10.8H0zm1.2 1.2v8.4h9.249l2.351 2.351V1.2z"
              fill="#121212"
            />
          </svg>
        </IconCard>

        {/* Comment Count (Pentagon) — base64 */}
        <IconCard
          name="Comment Count (Pentagon)"
          viewBox="0 0 24 24"
          size="9x9"
          fill="#524F4F"
          cssClass="Homepage content card byline img"
          usage="Homepage content cards byline comment count"
        >
          <svg width={9} height={9} viewBox="0 0 24 24" fill="none">
            <path
              d="M0.319336 0.315796H22.6804V23.7609L16.214 17.3684H0.319336V0.315796Z"
              fill="#524F4F"
            />
          </svg>
        </IconCard>

        {/* Square Bullet */}
        <IconCard
          name="Square Bullet"
          viewBox="0 0 30 30"
          size="20x20"
          fill="#fff"
          cssClass="SubmoduleHeadlinesList bullet svg"
          usage="SubmoduleHeadlinesList bullet points"
          bgColor="#252542"
        >
          <svg width={20} height={20} viewBox="0 0 30 30" fill="none">
            <path d="M13 13h4v4h-4z" fill="#fff" />
          </svg>
        </IconCard>

        {/* Share / Gift */}
        <IconCard
          name="Share / Gift"
          viewBox="0 0 28 28"
          size="28x28"
          fill="#000"
          cssClass="Article share menu pill button svg"
          usage="Article share menu pill button"
        >
          <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
            <path
              d="M20 12h-2v-2a4 4 0 00-8 0v2H8a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2zm-6-2a2 2 0 014 0v2h-4v-2zm6 12H8v-8h12v8zm-6-6a2 2 0 100 4 2 2 0 000-4z"
              fill="#000"
            />
          </svg>
        </IconCard>

        {/* Forward / Share */}
        <IconCard
          name="Forward / Share"
          viewBox="0 0 24 24"
          size="24x24"
          fill="#121212"
          cssClass="Article share button (icon-only) svg"
          usage="Article share button (icon-only variant)"
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <path
              d="M13.8 8.8c-7 1-10 6-11 11 2.5-3.5 6-5.1 11-5.1v4.1l7-7-7-7v4z"
              fill="#121212"
            />
          </svg>
        </IconCard>

        {/* Chevron Right */}
        <IconCard
          name="Chevron Right"
          viewBox="0 0 16 16"
          size="16x16"
          fill="#121212"
          cssClass="PuzzleEntryPoint CTA button svg"
          usage={'PuzzleEntryPoint CTA, Connections "Play today\'s puzzle"'}
        >
          <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
            <path
              d="M4.79999 12.08L8.8711 8.00002L4.79999 3.92002L6.05332 2.66669L11.3867 8.00002L6.05332 13.3334L4.79999 12.08Z"
              fill="#121212"
            />
          </svg>
        </IconCard>
      </div>

      {/* ============================================================ */}
      {/*  3. Brand Assets                                              */}
      {/* ============================================================ */}
      <SectionLabel id="brand-assets">Brand Assets</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {/* Athletic Wordmark */}
        <div
          className="rounded-xl border border-zinc-200 bg-white shadow-sm"
          style={{ padding: "20px 24px" }}
        >
          <div style={{ ...mono11Label, marginBottom: 12 }}>
            Athletic Wordmark (base64 SVG)
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* On dark background — actual usage context */}
            <div
              style={{
                background: "#121212",
                borderRadius: 8,
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                viewBox="0 0 1449 200"
                width={180}
                height={25}
                fill="none"
              >
                <text
                  x="0"
                  y="160"
                  fill="#fff"
                  fontFamily="var(--dd-font-sans)"
                  fontWeight="800"
                  fontSize="180"
                  letterSpacing="-0.02em"
                >
                  THE ATHLETIC
                </text>
              </svg>
            </div>
            {/* On light background for contrast */}
            <div
              style={{
                background: "#f4f4f5",
                borderRadius: 8,
                padding: "16px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                viewBox="0 0 1449 200"
                width={180}
                height={25}
                fill="none"
              >
                <text
                  x="0"
                  y="160"
                  fill="#121212"
                  fontFamily="var(--dd-font-sans)"
                  fontWeight="800"
                  fontSize="180"
                  letterSpacing="-0.02em"
                >
                  THE ATHLETIC
                </text>
              </svg>
            </div>
          </div>
          <div style={mono10}>viewBox: 0 0 1449 200</div>
          <div style={mono10}>fill: #fff (on dark backgrounds)</div>
          <div style={mono10}>
            encoding: base64 SVG (data:image/svg+xml;base64,PHN2ZyBpZD0iQ09OVEVOVCIg...)
          </div>
          <div style={{ ...mono10, color: "#121212", marginTop: 4 }}>
            Usage: Header logo, footer logo (on dark backgrounds)
          </div>
        </div>

        {/* Connections SE Logo */}
        <div
          className="rounded-xl border border-zinc-200 bg-white shadow-sm"
          style={{ padding: "20px 24px" }}
        >
          <div style={{ ...mono11Label, marginBottom: 12 }}>
            Connections: Sports Edition Logo (base64 PNG)
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            {/* Simulated grid pattern at actual size */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gridTemplateRows: "1fr 1fr 1fr 1fr",
                gap: 1,
                background: "#fff",
              }}
            >
              {["#4B6B3A","#6B8C42","#8BAF5A","#CFF08B",
                "#3A5C2E","#5A7C38","#7BA04E","#A8D468",
                "#2E4C22","#4E6C32","#6E8C48","#90B85E",
                "#223C18","#3E5C28","#5E7C3E","#7EA054",
              ].map((c, i) => (
                <div key={i} style={{ background: c }} />
              ))}
            </div>
            {/* 3x enlarged */}
            <div
              style={{
                width: 144,
                height: 144,
                borderRadius: 12,
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gridTemplateRows: "1fr 1fr 1fr 1fr",
                gap: 2,
                background: "#fff",
              }}
            >
              {["#4B6B3A","#6B8C42","#8BAF5A","#CFF08B",
                "#3A5C2E","#5A7C38","#7BA04E","#A8D468",
                "#2E4C22","#4E6C32","#6E8C48","#90B85E",
                "#223C18","#3E5C28","#5E7C3E","#7EA054",
              ].map((c, i) => (
                <div key={i} style={{ background: c }} />
              ))}
            </div>
          </div>
          <div style={mono10}>size: 288x288 (multicolor 4x4 grid)</div>
          <div style={mono10}>encoding: base64 PNG</div>
          <div style={{ ...mono10, color: "#121212", marginTop: 4 }}>
            Usage: PuzzleEntryPoint in articles, homepage connections module
          </div>
        </div>

        {/* Connections SE Icon (homepage variant) */}
        <div
          className="rounded-xl border border-zinc-200 bg-white shadow-sm"
          style={{ padding: "20px 24px" }}
        >
          <div style={{ ...mono11Label, marginBottom: 12 }}>
            Connections SE Icon (Homepage variant)
          </div>
          <div
            style={{
              display: "flex",
              gap: 24,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                background: "#CFF08B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <rect x={2} y={2} width={9} height={9} rx={1} fill="#223C18" />
                <rect x={13} y={2} width={9} height={9} rx={1} fill="#4E6C32" />
                <rect x={2} y={13} width={9} height={9} rx={1} fill="#4E6C32" />
                <rect x={13} y={13} width={9} height={9} rx={1} fill="#223C18" />
              </svg>
            </div>
            <div
              style={{
                width: 144,
                height: 144,
                borderRadius: 12,
                background: "#CFF08B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width={72} height={72} viewBox="0 0 24 24" fill="none">
                <rect x={2} y={2} width={9} height={9} rx={1} fill="#223C18" />
                <rect x={13} y={2} width={9} height={9} rx={1} fill="#4E6C32" />
                <rect x={2} y={13} width={9} height={9} rx={1} fill="#4E6C32" />
                <rect x={13} y={13} width={9} height={9} rx={1} fill="#223C18" />
              </svg>
            </div>
          </div>
          <div style={mono10}>background: #CFF08B</div>
          <div style={mono10}>filter: none (distinguishes from inline base64 logo)</div>
          <div style={mono10}>
            URL: theathletic.com/app/themes/athletic/assets/img/connections-se-icon.png
          </div>
          <div style={{ ...mono10, color: "#121212", marginTop: 4 }}>
            Usage: Homepage connections module icon (green background variant)
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  4. External Assets                                           */}
      {/* ============================================================ */}
      <SectionLabel id="external-assets">External Assets</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {/* League Logos */}
        <AssetRefCard
          name="League Logos"
          size="20x20 (hamburger), 24x24 (nav dropdowns)"
          urlPattern="cdn-league-logos.theathletic.com/league-{id}-color@2x.png"
          examples={[
            "cdn-league-logos.theathletic.com/league-1-color@2x.png  (NHL)",
            "cdn-league-logos.theathletic.com/league-2-color@2x.png  (NFL)",
            "cdn-league-logos.theathletic.com/league-3-color@2x.png  (NBA)",
            "cdn-league-logos.theathletic.com/league-4-color@2x.png  (MLB)",
            "cdn-league-logos.theathletic.com/league-8-color@2x.png  (NCAAF)",
          ]}
          notes="Color league logos served at @2x resolution from dedicated CDN"
        />

        {/* Team Logos */}
        <AssetRefCard
          name="Team Logos"
          size="24x24 (nav team dropdowns)"
          urlPattern="static01.nyt.com/athletic/logos/team/team-logo-{id}-72x72.png"
          examples={[
            "static01.nyt.com/athletic/logos/team/team-logo-1-72x72.png",
            "static01.nyt.com/athletic/logos/team/team-logo-12-72x72.png",
            "static01.nyt.com/athletic/logos/team/team-logo-25-72x72.png",
          ]}
          notes="Team logos served at 72x72 from NYT static CDN, displayed at 24x24"
        />

        {/* Social Icons */}
        <AssetRefCard
          name="Social Icons (Footer)"
          size="Twitter 20x16, Facebook 18x18, Instagram 18x18"
          urlPattern="static01.nyt.com/athletic/logos/team/{platform}-gray.png"
          examples={[
            "static01.nyt.com/athletic/logos/team/twitter-gray.png",
            "static01.nyt.com/athletic/logos/team/fb-gray.png",
            "static01.nyt.com/athletic/logos/team/ig-gray.png",
          ]}
          notes="Grayscale PNGs rendered on dark footer background (#121212)"
        />

        {/* App Store Badges */}
        <AssetRefCard
          name="App Store Badges"
          size="iOS 100x30, Android 100x30"
          urlPattern="static01.nyt.com/athletic/logos/team/appstore-{platform}.png"
          examples={[
            "static01.nyt.com/athletic/logos/team/appstore-ios.png",
            "static01.nyt.com/athletic/logos/team/appstore-android.png",
          ]}
          notes="App download badges in footer, compact 100x30 rendering"
        />
      </div>

      {/* ── Reference Table ──────────────────────────────── */}
      <SectionLabel id="icon-summary">Icon Summary Table</SectionLabel>
      <div
        className="rounded-xl border border-zinc-200 bg-white shadow-sm"
        style={{
          padding: "24px 32px",
          marginBottom: 40,
          overflowX: "auto" as const,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse" as const,
            fontFamily: "var(--dd-font-mono)",
            fontSize: 10,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #121212",
                textAlign: "left" as const,
              }}
            >
              {["Icon", "Size", "viewBox", "Fill", "Context"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "6px 10px",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.08em",
                    color: "#121212",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["Hamburger Menu", "30x30", "0 0 30 30", "var(--Gray10)", "DesktopNav"],
              ["Chevron Down", "10x6", "(none)", "#969693", "HeaderLink dropdown"],
              ["Chevron Right", "16x16", "0 0 16 16", "#121212", "PuzzleEntryPoint CTA"],
              ["Close/Cancel", "28x28", "0 0 28 28", "#969693", "ActionBanner dismiss"],
              ["Search", "20x20", "n/a (PNG)", "n/a", "DesktopNav search"],
              ["Square Bullet", "20x20", "0 0 30 30", "#fff", "SubmoduleHeadlinesList"],
              ["Comment Bubble", "14x15", "0 0 14 15", "#121212", "Article comment count"],
              ["Comment Count", "9x9", "0 0 24 24", "#524F4F", "Homepage byline"],
              ["Share/Gift", "28x28", "0 0 28 28", "#000", "Article share menu"],
              ["Forward/Share", "24x24", "0 0 24 24", "#121212", "Article share (icon-only)"],
              ["Wordmark", "1449x200", "0 0 1449 200", "#fff", "Header/footer logo"],
              ["Connections SE Logo", "288x288", "n/a (PNG)", "multicolor", "PuzzleEntryPoint"],
              ["Connections SE Icon", "varies", "n/a (PNG)", "#CFF08B bg", "Homepage module"],
            ].map((row, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                {row.map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      padding: "5px 10px",
                      color: j === 0 ? "#121212" : "var(--dd-ink-faint)",
                      fontWeight: j === 0 ? 600 : 400,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

/* ================================================================
   BrandNYMag — Resources Tab
   Links, tech stack, CDN infrastructure, and reference URLs.
   ================================================================ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-brand-accent)",
        marginBottom: 8,
        marginTop: 32,
      }}
    >
      {children}
    </div>
  );
}

export default function BrandNYMagResources() {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-body)",
        color: "var(--dd-ink-black)",
        maxWidth: 960,
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <SectionLabel>Resources</SectionLabel>
      <h2
        style={{
          fontFamily: "var(--dd-font-headline)",
          fontSize: 22,
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        Technical References
      </h2>

      {/* ── Site URLs ── */}
      <SectionLabel>Site URLs</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Homepage", url: "https://nymag.com/", note: "Main entry point" },
          { label: "Intelligencer", url: "https://nymag.com/intelligencer/", note: "Politics, business, tech" },
          { label: "The Cut", url: "https://www.thecut.com/", note: "Style, self, culture, power" },
          { label: "Vulture", url: "https://www.vulture.com/", note: "Entertainment & culture" },
          { label: "The Strategist", url: "https://nymag.com/strategist/", note: "Shopping & product reviews" },
          { label: "Curbed", url: "https://www.curbed.com/", note: "NYC real estate & design" },
          { label: "Grub Street", url: "https://www.grubstreet.com/", note: "NYC food & restaurants" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                minWidth: 110,
              }}
            >
              {r.label}
            </div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-brand-accent)" }}>
              {r.url}
            </div>
            <div style={{ fontFamily: "var(--dd-font-body)", fontSize: 12, color: "var(--dd-ink-faint)" }}>
              {r.note}
            </div>
          </div>
        ))}
      </div>

      {/* ── Infrastructure ── */}
      <SectionLabel>CDN Infrastructure</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Font CDN", url: "https://fonts.nymag.com/", note: "Self-hosted custom webfonts (woff2, otf)" },
          { label: "Image CDN", url: "https://pyxis.nymag.com/", note: "Responsive image crops (Pyxis service)" },
          { label: "Asset CDN", url: "https://assets.nymag.com/", note: "Static assets: icons, favicons, component media" },
          { label: "Ad Metrics", url: "https://metrics.nymag.com/", note: "GTM proxy + ad tracking" },
          { label: "Concert Ads", url: "https://cdn.concert.io/", note: "Vox Media ad platform" },
          { label: "Subs Portal", url: "https://subs.nymag.com/", note: "Subscription management + auth" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--dd-ink-black)",
                minWidth: 110,
              }}
            >
              {r.label}
            </div>
            <div style={{ fontFamily: "var(--dd-font-mono)", fontSize: 12, color: "var(--dd-brand-accent)" }}>
              {r.url}
            </div>
            <div style={{ fontFamily: "var(--dd-font-body)", fontSize: 12, color: "var(--dd-ink-faint)" }}>
              {r.note}
            </div>
          </div>
        ))}
      </div>

      {/* ── Image CDN pattern ── */}
      <SectionLabel>Image CDN Pattern (Pyxis)</SectionLabel>
      <div
        style={{
          background: "var(--dd-paper-grey)",
          borderRadius: 6,
          padding: 16,
          fontFamily: "var(--dd-font-mono)",
          fontSize: 12,
          lineHeight: 1.8,
          marginBottom: 32,
          overflowX: "auto",
        }}
      >
        <div style={{ color: "var(--dd-ink-faint)", marginBottom: 8 }}>
          URL pattern:
        </div>
        <div style={{ color: "var(--dd-ink-dark)" }}>
          https://pyxis.nymag.com/v1/imgs/&#123;hash&#125;/&#123;hash&#125;/&#123;filename&#125;.&#123;crop&#125;.w&#123;width&#125;.&#123;ext&#125;
        </div>
        <div style={{ color: "var(--dd-ink-faint)", marginTop: 12, marginBottom: 8 }}>
          Crop formats:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["rhorizontal", "rsquare", "rvertical", "rsquare-zoom", "rdeep-vertical"].map((c) => (
            <span
              key={c}
              style={{
                background: "var(--dd-brand-surface)",
                border: "1px solid var(--dd-brand-border)",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 11,
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <div style={{ color: "var(--dd-ink-faint)", marginTop: 12, marginBottom: 4 }}>
          Retina: prefix with <code>2x.</code> before crop (e.g. <code>.2x.rhorizontal.w787.jpg</code>)
        </div>
        <div style={{ color: "var(--dd-ink-faint)" }}>
          Responsive: <code>&lt;picture&gt;</code> with <code>&lt;source&gt;</code> per breakpoint + <code>srcset</code>
        </div>
      </div>

      {/* ── Tech stack ── */}
      <SectionLabel>Tech Stack</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        {[
          { category: "CMS", tools: "Vox Media Clay CMS" },
          { category: "Advertising", tools: "Concert Ads (Vox), Amazon A9, Google DFP, DoubleVerify" },
          { category: "Analytics", tools: "GTM, Parse.ly, Permutive, comScore, Microsoft Clarity" },
          { category: "Auth", tools: "Auth0-based (via Zephr paywall)" },
          { category: "Fonts", tools: "Self-hosted CDN (fonts.nymag.com)" },
          { category: "Images", tools: "Pyxis CDN (responsive auto-crops)" },
          { category: "CSS", tools: "All inline <style> blocks (no external stylesheets)" },
          { category: "Consent", tools: "OneTrust cookie compliance" },
          { category: "Paywall", tools: "Zephr (browser-side decisions)" },
          { category: "Email", tools: "Sailthru newsletters" },
          { category: "Subscriptions", tools: "Stripe + Profitwell" },
          { category: "CDN", tools: "Cloudflare" },
        ].map((t) => (
          <div
            key={t.category}
            style={{
              background: "var(--dd-paper-white)",
              border: "1px solid var(--dd-ink-rule)",
              borderRadius: 6,
              padding: 12,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-ink-faint)",
                marginBottom: 4,
              }}
            >
              {t.category}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 13,
                color: "var(--dd-ink-dark)",
              }}
            >
              {t.tools}
            </div>
          </div>
        ))}
      </div>

      {/* ── CSS architecture note ── */}
      <SectionLabel>CSS Architecture Note</SectionLabel>
      <div
        style={{
          background: "var(--dd-brand-surface)",
          border: "1px solid var(--dd-brand-border)",
          borderRadius: 6,
          padding: 16,
          maxWidth: 640,
        }}
      >
        <p
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-dark)",
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          <strong>No external stylesheets.</strong> NYMag embeds all CSS directly
          in <code>&lt;style&gt;</code> blocks in the HTML{" "}
          <code>&lt;head&gt;</code>. This is a deliberate choice of the Clay CMS
          architecture — each component ships its own CSS inline. The single
          <code>&lt;style&gt;</code> block on the homepage is ~85KB of CSS
          covering every component variant, responsive breakpoint, and
          interaction state. Font files are the only external style resources
          (loaded from <code>fonts.nymag.com</code>).
        </p>
      </div>
    </div>
  );
}

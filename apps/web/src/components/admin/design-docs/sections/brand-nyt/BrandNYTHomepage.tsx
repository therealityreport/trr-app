"use client"

import { NYT_HOMEPAGE_RENDER_SECTIONS } from "@/lib/admin/nyt-homepage-preview-config"
import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot"
import {
  HomepageDomEvidence,
  HomepageShellStackPreview,
  HomepageShellZonePreview,
  HomepageSourceSnippet,
} from "@/components/admin/design-docs/sections/brand-nyt/nyt-homepage-specimens"

function SectionLabel({
  children,
  id,
}: {
  children: React.ReactNode
  id?: string
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
  )
}

function SpecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--dd-ink-black)",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

export default function BrandNYTHomepage() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Homepage</h2>
      <p className="dd-section-desc">
        Source-faithful documentation for the live NYT main-page shell captured on{" "}
        {NYT_HOMEPAGE_SNAPSHOT.capturedAt}. This page is driven by a checked-in Scrapling export of
        <span className="font-mono"> https://www.nytimes.com/ </span>
        so the homepage remains a first-class NYT source instead of an article-side summary.
      </p>

      <div
        className="dd-brand-card"
        style={{
          padding: "18px 20px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.1em",
                  color: "var(--dd-brand-accent)",
                }}
              >
                Scrapling Export
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  color: "var(--dd-ink-faint)",
                  lineHeight: 1.6,
                }}
              >
                Status {NYT_HOMEPAGE_SNAPSHOT.exportMeta.status} · HTML {NYT_HOMEPAGE_SNAPSHOT.exportMeta.htmlBytes.toLocaleString()} bytes · CSS{" "}
                {NYT_HOMEPAGE_SNAPSHOT.exportMeta.stylesheetsCount} · JS{" "}
                {NYT_HOMEPAGE_SNAPSHOT.exportMeta.scriptsCount}
              </div>
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 11,
                color: "var(--dd-brand-accent)",
                wordBreak: "break-all",
              }}
            >
              {NYT_HOMEPAGE_SNAPSHOT.canonicalUrl}
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
              lineHeight: 1.6,
            }}
          >
            Saved bundle: <span className="font-mono">{NYT_HOMEPAGE_SNAPSHOT.sourceBundle.html.rendered}</span>
          </div>

          <HomepageSourceSnippet
            snippet={NYT_HOMEPAGE_SNAPSHOT.shellSections[0]?.htmlSnippet ?? ""}
            label="Captured shell root"
          />
        </div>
      </div>

      <SectionLabel id="homepage-page">Homepage Page</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        The homepage should read as a vertical shell specimen. The stack below uses live labels and module
        names from the Scrapling export so operators can see the actual homepage rhythm before drilling into
        the individual NYT tabs.
      </p>
      <div style={{ marginBottom: 28 }}>
        <HomepageShellStackPreview />
      </div>

      <SectionLabel id="shell-sequence">Shell Sequence</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        The homepage is a shell stack. Each zone below stays one column, shows a live-derived specimen, and
        preserves the DOM hooks that identify the real module.
      </p>
      <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
        {NYT_HOMEPAGE_RENDER_SECTIONS.map((section) => (
          <div
            key={section.id}
            className="dd-brand-card"
            style={{ padding: "18px 18px 20px" }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: "var(--dd-brand-accent)",
                marginBottom: 8,
              }}
            >
              {section.id}
            </div>
            <SpecLabel>{section.label}</SpecLabel>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                lineHeight: 1.6,
                color: "var(--dd-ink-faint)",
                marginBottom: 12,
              }}
            >
              {section.summary}
            </div>
            <HomepageDomEvidence evidence={section.domEvidence} />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              {section.visibleLabels.map((label) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 9px",
                    borderRadius: 999,
                    border: "1px solid var(--dd-brand-border-subtle)",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 11,
                    color: "var(--dd-ink-black)",
                    background: "#fafafa",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <HomepageShellZonePreview sectionId={section.id} />
            </div>
            <HomepageSourceSnippet snippet={section.htmlSnippet} />
          </div>
        ))}
      </div>

      <SectionLabel id="bundle-split">Bundle Split</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 12,
          color: "var(--dd-ink-faint)",
          marginBottom: 12,
        }}
      >
        Homepage assets split across shell, menus, interactives, media, and analytics. The inventory stays
        stacked so the loaded CSS and JS can be scanned in source order instead of as a multi-column dashboard.
      </p>

      <div style={{ display: "grid", gap: 16 }}>
        <div className="dd-brand-card p-4 overflow-x-auto">
          <SpecLabel>Stylesheets</SpecLabel>
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <tbody>
              {NYT_HOMEPAGE_SNAPSHOT.stylesheets.map((asset) => (
                <tr
                  key={`${asset.label}-${asset.href}`}
                  style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
                >
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-black)", fontWeight: 600 }}>
                    {asset.label}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>
                    {asset.area}
                  </td>
                  <td className="py-1.5">
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--dd-brand-accent)",
                        wordBreak: "break-all",
                      }}
                    >
                      {asset.href || "Inline / protocol-relative asset retained from export"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dd-brand-card p-4 overflow-x-auto">
          <SpecLabel>Scripts</SpecLabel>
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <tbody>
              {NYT_HOMEPAGE_SNAPSHOT.scripts.map((asset) => (
                <tr
                  key={`${asset.label}-${asset.href}`}
                  style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}
                >
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-black)", fontWeight: 600 }}>
                    {asset.label}
                  </td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>
                    {asset.area}
                  </td>
                  <td className="py-1.5">
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 10,
                        color: "var(--dd-brand-accent)",
                        wordBreak: "break-all",
                      }}
                    >
                      {asset.href || "Inline / protocol-relative asset retained from export"}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

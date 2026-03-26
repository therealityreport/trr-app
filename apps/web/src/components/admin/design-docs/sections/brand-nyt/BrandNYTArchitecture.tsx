"use client";

import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  NYT Brand — Architecture                                           */
/*  Framework features, per-article architecture, Birdkit framework     */
/* ------------------------------------------------------------------ */

const nytArticles = ARTICLES.filter((a) => !a.url.includes("/athletic/"));

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

function shortTitle(title: string): string {
  if (title.length <= 40) return title;
  return title.slice(0, 37) + "\u2026";
}

interface ArchFeature {
  label: string;
  value: string;
}

const ARCH_FEATURES: ArchFeature[] = [
  { label: "Framework", value: "Svelte / SvelteKit with SSR hydration" },
  { label: "Data viz", value: "D3 v3.4.11 (pinned legacy)" },
  { label: "Charts", value: "Datawrapper iframes with postMessage protocol" },
  { label: "Static graphics", value: "ai2html v0.121.1" },
  { label: "Hosting", value: "static01.nytimes.com/newsgraphics/" },
  { label: "Build output", value: "Hashed CSS/JS bundles" },
];

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTArchitecture() {
  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Architecture</h2>
      <p className="dd-section-desc">
        Framework features, per-article architecture breakdowns, and Birdkit
        framework details aggregated from {nytArticles.length} NYT articles.
      </p>

      {/* ── 1. Framework Features ─────────────────────────────── */}
      <SectionLabel id="framework-features">Framework Features</SectionLabel>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm mb-8 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e5e5" }}>
              <th
                className="py-1 pr-4 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Feature
              </th>
              <th
                className="py-1 font-semibold"
                style={{ color: "var(--dd-ink-black)" }}
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody>
            {ARCH_FEATURES.map((f) => (
              <tr
                key={f.label}
                style={{ borderBottom: "1px solid #f0f0f0" }}
              >
                <td
                  className="py-1 pr-4 font-semibold"
                  style={{ color: "var(--dd-ink-black)" }}
                >
                  {f.label}
                </td>
                <td
                  className="py-1 font-mono"
                  style={{ fontSize: 11, color: "var(--dd-ink-faint)" }}
                >
                  {f.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 2. Per-Article Architecture ───────────────────────── */}
      <SectionLabel id="per-article-architecture">
        Per-Article Architecture
      </SectionLabel>

      <div className="space-y-4 mb-8">
        {nytArticles.map((article) => {
          const arch = article.architecture as unknown as {
            framework?: string;
            projectId?: string;
            hydrationId?: string;
            hosting?: string;
            cssFiles?: readonly string[];
            datawrapperTheme?: Record<string, unknown>;
          } | undefined;
          if (!arch) return null;

          return (
            <div
              key={article.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                  marginBottom: 4,
                }}
              >
                {shortTitle(article.title)}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "#326891",
                  marginBottom: 12,
                }}
              >
                {article.id}
              </div>

              <table
                className="w-full text-left"
                style={{
                  fontSize: 12,
                  fontFamily: "var(--dd-font-sans)",
                }}
              >
                <tbody>
                  {arch.framework && (
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td
                        className="py-1 pr-4 font-semibold"
                        style={{
                          color: "var(--dd-ink-black)",
                          width: "30%",
                        }}
                      >
                        Framework
                      </td>
                      <td
                        className="py-1 font-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--dd-ink-faint)",
                        }}
                      >
                        {arch.framework}
                      </td>
                    </tr>
                  )}
                  {arch.projectId && (
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td
                        className="py-1 pr-4 font-semibold"
                        style={{ color: "var(--dd-ink-black)" }}
                      >
                        Project ID
                      </td>
                      <td
                        className="py-1 font-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--dd-ink-faint)",
                        }}
                      >
                        {arch.projectId}
                      </td>
                    </tr>
                  )}
                  {arch.hydrationId && (
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td
                        className="py-1 pr-4 font-semibold"
                        style={{ color: "var(--dd-ink-black)" }}
                      >
                        Hydration ID
                      </td>
                      <td
                        className="py-1 font-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--dd-ink-faint)",
                        }}
                      >
                        {arch.hydrationId}
                      </td>
                    </tr>
                  )}
                  {arch.hosting && (
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td
                        className="py-1 pr-4 font-semibold"
                        style={{ color: "var(--dd-ink-black)" }}
                      >
                        Hosting URL
                      </td>
                      <td
                        className="py-1 font-mono"
                        style={{
                          fontSize: 11,
                          color: "var(--dd-ink-faint)",
                        }}
                      >
                        {arch.hosting}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* CSS Files */}
              {arch.cssFiles && arch.cssFiles.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--dd-ink-black)",
                      marginBottom: 4,
                    }}
                  >
                    CSS Files
                  </div>
                  <div className="space-y-1">
                    {arch.cssFiles.map((file, i) => (
                      <div
                        key={i}
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--dd-ink-faint)",
                          paddingLeft: 8,
                          borderLeft: "2px solid #e5e5e5",
                        }}
                      >
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Datawrapper Theme */}
              {arch.datawrapperTheme && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--dd-ink-black)",
                      marginBottom: 4,
                    }}
                  >
                    Datawrapper Theme
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 overflow-x-auto">
                    <table
                      className="w-full text-left"
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--dd-font-sans)",
                      }}
                    >
                      <tbody>
                        {Object.entries(arch.datawrapperTheme)
                          .filter(
                            ([, val]) =>
                              typeof val === "string" ||
                              typeof val === "number",
                          )
                          .map(([key, val]) => (
                            <tr
                              key={key}
                              style={{
                                borderBottom: "1px solid #f0f0f0",
                              }}
                            >
                              <td
                                className="py-0.5 pr-3"
                                style={{
                                  color: "var(--dd-ink-black)",
                                  fontWeight: 500,
                                  width: "40%",
                                }}
                              >
                                {key}
                              </td>
                              <td
                                className="py-0.5 font-mono"
                                style={{
                                  fontSize: 10,
                                  color: "var(--dd-ink-faint)",
                                }}
                              >
                                {String(val)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 3. Birdkit Framework ──────────────────────────────── */}
      <SectionLabel id="birdkit-framework">Birdkit Framework</SectionLabel>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm mb-8">
        <SubSectionLabel>
          NYT&apos;s Internal Svelte/SvelteKit Framework
        </SubSectionLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 12,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--dd-ink-black)" }}>Birdkit</strong>{" "}
            is the New York Times&apos;s internal interactive graphics framework
            built on Svelte/SvelteKit. It powers all NYT interactive articles
            including data visualizations, ai2html graphics, and custom chart
            components.
          </p>
          <p style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--dd-ink-black)" }}>
              Key characteristics:
            </strong>
          </p>
          <ul
            style={{
              paddingLeft: 20,
              marginBottom: 12,
              listStyleType: "disc",
            }}
          >
            <li style={{ marginBottom: 4 }}>
              Server-side rendered Svelte components with client-side hydration
              via{" "}
              <code
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "#326891",
                  background: "#f4f4f4",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                data-birdkit-hydrate
              </code>{" "}
              attributes
            </li>
            <li style={{ marginBottom: 4 }}>
              Project IDs prefixed with{" "}
              <code
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "#326891",
                  background: "#f4f4f4",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                bk-
              </code>{" "}
              (e.g., bk-OsFcy_mg4zMq9g) or descriptive slugs (e.g.,
              2025-03-12-sweepstakes-casino)
            </li>
            <li style={{ marginBottom: 4 }}>
              Hosted on{" "}
              <code
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "#326891",
                  background: "#f4f4f4",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                static01.nytimes.com/newsgraphics/
              </code>{" "}
              with hashed CSS/JS bundles
            </li>
            <li style={{ marginBottom: 4 }}>
              Integrates with D3 v3.4.11 (pinned legacy), Datawrapper iframes,
              and ai2html v0.121.1 for static graphics
            </li>
            <li style={{ marginBottom: 4 }}>
              Uses a standardized wrapper structure:{" "}
              <code
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: "#326891",
                  background: "#f4f4f4",
                  padding: "1px 4px",
                  borderRadius: 3,
                }}
              >
                figure.g-wrapper
              </code>{" "}
              with nested margin, width, and content blocks
            </li>
            <li style={{ marginBottom: 4 }}>
              The &ldquo;vi platform&rdquo; (React) handles page chrome
              (headlines, bylines, sharetools) while Birdkit handles embedded
              interactive components
            </li>
          </ul>
          <p>
            <strong style={{ color: "var(--dd-ink-black)" }}>
              Component types:
            </strong>{" "}
            CTableDouble (double-header medal tables), CTable (interactive
            dropdown tables), custom Svelte charts, ai2html containers with
            responsive artboard selectors.
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  Athletic Brand — Resources                                         */
/*  Quick links, icons, external assets, Datawrapper theme             */
/* ------------------------------------------------------------------ */

const athleticArticles = ARTICLES.filter((a) => a.url.includes("/athletic/"));

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

/* ── Data Extraction Helpers ────────────────────────────────────────── */

interface IconEntry {
  name: string;
  file: string;
  r2: string;
  size: string;
  fill: string;
  usage: string;
  element: string;
}

function aggregateIcons(): IconEntry[] {
  const icons: IconEntry[] = [];
  for (const article of athleticArticles) {
    const arch = article.architecture as Record<string, unknown>;
    const assets = arch?.publicAssets as Record<string, unknown> | undefined;
    if (assets && Array.isArray(assets.icons)) {
      for (const icon of assets.icons) {
        icons.push(icon as IconEntry);
      }
    }
  }
  return icons;
}

function getDwTheme(): Record<string, string> | null {
  for (const article of athleticArticles) {
    const arch = article.architecture as Record<string, unknown>;
    const dwTheme = arch?.datawrapperTheme as Record<string, string> | undefined;
    if (dwTheme) return dwTheme;
  }
  return null;
}

function getDwCharts(): { id: string; topic: string; url: string }[] {
  const charts: { id: string; topic: string; url: string }[] = [];
  for (const article of athleticArticles) {
    const arch = article.architecture as Record<string, unknown>;
    const assets = arch?.publicAssets as Record<string, unknown> | undefined;
    if (assets && Array.isArray(assets.datawrapperCharts)) {
      for (const c of assets.datawrapperCharts) {
        charts.push(c as { id: string; topic: string; url: string });
      }
    }
  }
  return charts;
}

function aggregateSocialImages(): { name: string; url: string; ratio: string; desc: string }[] {
  const images: { name: string; url: string; ratio: string; desc: string }[] = [];
  for (const article of athleticArticles) {
    const arch = article.architecture as Record<string, unknown>;
    const assets = arch?.publicAssets as Record<string, unknown> | undefined;
    if (assets && Array.isArray(assets.socialImages)) {
      for (const img of assets.socialImages) {
        images.push(img as { name: string; url: string; ratio: string; desc: string });
      }
    }
  }
  return images;
}

function aggregateCssFiles(): { article: string; files: string[] }[] {
  const results: { article: string; files: string[] }[] = [];
  for (const article of athleticArticles) {
    const arch = article.architecture as Record<string, unknown>;
    const files = arch?.cssFiles as string[] | undefined;
    if (files && files.length > 0) {
      results.push({
        article: article.title.length > 40 ? article.title.slice(0, 37) + "\u2026" : article.title,
        files,
      });
    }
  }
  return results;
}

/* ================================================================ */
/*  Main Component                                                   */
/* ================================================================ */

export default function BrandAthleticResources() {
  const icons = aggregateIcons();
  const dwTheme = getDwTheme();
  const dwCharts = getDwCharts();
  const socialImages = aggregateSocialImages();
  const cssFiles = aggregateCssFiles();

  const uiIcons = icons.filter((i) => !i.file.includes("/teams/") && !i.file.includes("connections-sports"));
  const teamLogos = icons.filter((i) => i.file.includes("/teams/"));
  const puzzleLogo = icons.filter((i) => i.file.includes("connections-sports"));

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
          The Athletic &mdash; Resources
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 16,
            color: "var(--dd-brand-text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Icons, external assets, Datawrapper theme, CSS files, and quick links
        </div>
      </div>

      {/* ── Quick Links ────────────────────────────────── */}
      <SectionLabel id="quick-links">Quick Links</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
        <Link
          href={buildDesignDocsPath("athletic-articles")}
          className="dd-brand-card"
          style={{
            display: "block",
            textDecoration: "none",
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--dd-brand-text-primary)",
              marginBottom: 4,
            }}
          >
            Athletic Articles &rarr;
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
            }}
          >
            Article-level design breakdowns for The Athletic
          </div>
        </Link>
        <div
          className="dd-brand-card"
          style={{
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--dd-brand-text-primary)",
              marginBottom: 4,
            }}
          >
            NFL Fourth Down Article
          </div>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 12,
              color: "var(--dd-ink-faint)",
            }}
          >
            Primary source for icons, theme, and architecture data
          </div>
        </div>
      </div>

      {/* ─��� UI Icons ───────────────────────────────────── */}
      {uiIcons.length > 0 && (
        <>
          <SectionLabel id="ui-icons">UI Icons ({uiIcons.length})</SectionLabel>
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
                  {["Name", "Size", "Fill", "Usage", "R2 URL"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontWeight: 700,
                        fontSize: 10,
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
                {uiIcons.map((icon, i) => (
                  <tr key={icon.name}>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-ink-black)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {icon.name}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-ink-faint)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {icon.size}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-ink-faint)",
                      }}
                    >
                      {icon.fill}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-ink-faint)",
                        maxWidth: 300,
                      }}
                    >
                      {icon.usage.length > 80 ? icon.usage.slice(0, 77) + "\u2026" : icon.usage}
                    </td>
                    <td
                      style={{
                        padding: "6px 10px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                      }}
                    >
                      <a
                        href={icon.r2}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 10, color: "#386C92", textDecoration: "underline" }}
                      >
                        {icon.r2.split("/").pop()}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Team Logos ──────────────────────────────────── */}
      {teamLogos.length > 0 && (
        <>
          <SectionLabel id="team-logos">Team Logos ({teamLogos.length})</SectionLabel>
          <div
            className="dd-brand-card"
            style={{
              padding: "20px 24px",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                gap: 12,
              }}
            >
              {teamLogos.map((logo) => (
                <div key={logo.name} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      background: "#FFFFFF",
                      borderRadius: 8,
                      border: "1px solid #e5e5e5",
                      margin: "0 auto 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.r2}
                      alt={logo.name}
                      style={{ width: 36, height: 36, objectFit: "contain" }}
                      loading="lazy"
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 10,
                      color: "var(--dd-brand-text-muted)",
                    }}
                  >
                    {logo.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Puzzle Logo ────────────────────────────────── */}
      {puzzleLogo.length > 0 && (
        <>
          <SectionLabel id="puzzle-logo">Puzzle Logo</SectionLabel>
          <div
            className="dd-brand-card"
            style={{
              padding: "20px 24px",
              marginBottom: 40,
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {puzzleLogo.map((logo) => (
              <div key={logo.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#FFFFFF",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.r2}
                    alt={logo.name}
                    style={{ width: 52, height: 52, objectFit: "contain" }}
                    loading="lazy"
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontWeight: 600,
                      fontSize: 13,
                      color: "var(--dd-ink-black)",
                      marginBottom: 2,
                    }}
                  >
                    {logo.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 10,
                      color: "var(--dd-brand-text-muted)",
                    }}
                  >
                    {logo.size} &mdash; {logo.usage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── External Assets ────────────────────────────── */}
      <SectionLabel id="external-assets">External Assets</SectionLabel>
      <div
        className="dd-brand-card"
        style={{
          padding: "20px 24px",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            marginBottom: 12,
          }}
        >
          Datawrapper Charts
        </div>
        {dwCharts.map((chart) => (
          <div key={chart.id} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--dd-ink-faint)",
              }}
            >
              {chart.topic} (ID: {chart.id})
            </div>
            <a
              href={chart.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 10,
                color: "#386C92",
                textDecoration: "underline",
              }}
            >
              {chart.url}
            </a>
          </div>
        ))}
      </div>

      {/* Social Images */}
      {socialImages.length > 0 && (
        <div
          className="dd-brand-card"
          style={{
            padding: "20px 24px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--dd-ink-black)",
              marginBottom: 12,
            }}
          >
            Social Images
          </div>
          <div style={{ overflowX: "auto" }}>
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
                  {["Name", "Ratio", "Description", "URL"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontWeight: 700,
                        fontSize: 10,
                        textTransform: "uppercase" as const,
                        color: "var(--dd-ink-faint)",
                        borderBottom: "1px solid #e5e5e5",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {socialImages.map((img) => (
                  <tr key={img.name + img.url}>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f0f0", color: "var(--dd-ink-black)", fontWeight: 600 }}>
                      {img.name}
                    </td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f0f0", color: "var(--dd-ink-faint)" }}>
                      {img.ratio}
                    </td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f0f0", color: "var(--dd-ink-faint)" }}>
                      {img.desc}
                    </td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #f0f0f0" }}>
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 9, color: "#386C92", textDecoration: "underline" }}
                      >
                        Link
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Author Headshot */}
      <div
        className="dd-brand-card"
        style={{
          padding: "20px 24px",
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--dd-ink-black)",
            marginBottom: 12,
          }}
        >
          Author Headshots
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {athleticArticles.map((article) => {
            const arch = article.architecture as Record<string, unknown>;
            const assets = arch?.publicAssets as Record<string, unknown> | undefined;
            const headshot = assets?.authorHeadshot as { url: string; desc: string } | undefined;
            if (!headshot) return null;
            return (
              <div key={article.id} style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid #e5e5e5",
                    margin: "0 auto 4px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={headshot.url}
                    alt={headshot.desc}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    loading="lazy"
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    color: "var(--dd-brand-text-muted)",
                  }}
                >
                  {article.authors.join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CSS Files */}
      {cssFiles.length > 0 && (
        <>
          <SectionLabel id="css-files">CSS File Inventory</SectionLabel>
          {cssFiles.map((group) => (
            <div
              key={group.article}
              className="dd-brand-card"
              style={{
                padding: "16px 20px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                  marginBottom: 6,
                }}
              >
                {group.article}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.files.map((file, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 10,
                      color: "var(--dd-ink-faint)",
                    }}
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Datawrapper Theme ──────────────────────────── */}
      {dwTheme && (
        <>
          <SectionLabel id="dw-theme">Datawrapper Theme</SectionLabel>
          <div style={{ overflowX: "auto", marginBottom: 40 }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontFamily: "var(--dd-font-mono)",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {["Property", "Value"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        fontWeight: 700,
                        fontSize: 10,
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
                {Object.entries(dwTheme).map(([key, value], i) => (
                  <tr key={key}>
                    <td
                      style={{
                        padding: "6px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-brand-text-primary)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {key}
                    </td>
                    <td
                      style={{
                        padding: "6px 12px",
                        borderBottom: "1px solid #f0f0f0",
                        background: i % 2 === 0 ? "#f9f9f9" : "white",
                        color: "var(--dd-ink-faint)",
                      }}
                    >
                      {String(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

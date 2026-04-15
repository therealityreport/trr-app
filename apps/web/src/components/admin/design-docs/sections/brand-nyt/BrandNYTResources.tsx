"use client";

import Link from "next/link";
import type { Route } from "next";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";
import { ARTICLES } from "@/lib/admin/design-docs-config";

/* ------------------------------------------------------------------ */
/*  NYT Brand — Resources                                              */
/*  Quick links, external assets, CSS inventory, author headshots       */
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

interface QuickLink {
  title: string;
  href: string;
  description: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: "Tech Stack",
    href: buildDesignDocsPath("nyt-tech-stack"),
    description: "Complete asset inventory — stylesheets, scripts, sitemaps, Birdkit framework",
  },
  {
    title: "Pages",
    href: buildDesignDocsPath("nyt-articles"),
    description: "Article-level design breakdowns — charts, layouts, typography, and interactive patterns",
  },
];

function buildDatawrapperUrls() {
  const urls: { id: string; topic: string; url: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        datawrapperCharts?: readonly { id: string; topic: string; url: string }[];
      };
    } | undefined;
    if (!arch?.publicAssets?.datawrapperCharts) continue;
    for (const chart of arch.publicAssets.datawrapperCharts) {
      urls.push({
        id: chart.id,
        topic: chart.topic,
        url: chart.url,
        article: shortTitle(article.title),
      });
    }
  }
  return urls;
}

function buildAi2htmlArtboards() {
  const artboards: { label: string; url: string; width: number; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        reportCard?: {
          mobile?: { url: string; width: number; desc: string };
          desktop?: { url: string; width: number; desc: string };
        };
        ai2htmlArtboards?: {
          mobile?: { url: string; width: number; desc: string };
          desktop?: { url: string; width: number; desc: string };
        };
      };
    } | undefined;
    if (!arch?.publicAssets) continue;
    const title = shortTitle(article.title);

    if (arch.publicAssets.reportCard) {
      const rc = arch.publicAssets.reportCard;
      if (rc.mobile) {
        artboards.push({
          label: `${rc.mobile.desc || "Mobile report card"}`,
          url: rc.mobile.url,
          width: rc.mobile.width,
          article: title,
        });
      }
      if (rc.desktop) {
        artboards.push({
          label: `${rc.desktop.desc || "Desktop report card"}`,
          url: rc.desktop.url,
          width: rc.desktop.width,
          article: title,
        });
      }
    }

    if (arch.publicAssets.ai2htmlArtboards) {
      const ab = arch.publicAssets.ai2htmlArtboards;
      if (ab.mobile) {
        artboards.push({
          label: `${ab.mobile.desc || "Mobile artboard"}`,
          url: ab.mobile.url,
          width: ab.mobile.width,
          article: title,
        });
      }
      if (ab.desktop) {
        artboards.push({
          label: `${ab.desktop.desc || "Desktop artboard"}`,
          url: ab.desktop.url,
          width: ab.desktop.width,
          article: title,
        });
      }
    }
  }
  return artboards;
}

function buildSocialImages() {
  const images: { name: string; url: string; ratio: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        socialImages?: readonly { name: string; url: string; ratio: string }[];
      };
    } | undefined;
    if (!arch?.publicAssets?.socialImages) continue;
    const title = shortTitle(article.title);
    for (const img of arch.publicAssets.socialImages) {
      images.push({
        name: img.name,
        url: img.url,
        ratio: img.ratio,
        article: title,
      });
    }
  }
  return images;
}

function buildArticleImages() {
  const images: { name: string; url: string; category: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        images?: readonly {
          name: string;
          url: string;
          category?: string;
        }[];
      };
    } | undefined;
    if (!arch?.publicAssets?.images) continue;
    const title = shortTitle(article.title);
    for (const img of arch.publicAssets.images) {
      images.push({
        name: img.name,
        url: img.url,
        category: img.category ?? "Article asset",
        article: title,
      });
    }
  }
  return images;
}

function buildIconAssets() {
  const icons: { name: string; src: string; usage: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        icons?: readonly {
          name: string;
          file?: string;
          url?: string;
          usage?: string;
        }[];
      };
    } | undefined;
    if (!arch?.publicAssets?.icons) continue;
    const title = shortTitle(article.title);
    for (const icon of arch.publicAssets.icons) {
      const src = icon.file ?? icon.url;
      if (!src) continue;
      icons.push({
        name: icon.name,
        src,
        usage: icon.usage ?? "UI icon",
        article: title,
      });
    }
  }
  return icons;
}

function buildCssFiles() {
  const files: { file: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as unknown as {
      cssFiles?: readonly string[];
    } | undefined;
    if (!arch?.cssFiles) continue;
    const title = shortTitle(article.title);
    for (const file of arch.cssFiles) {
      files.push({ file, article: title });
    }
  }
  return files;
}

function buildAuthorHeadshots() {
  const seen = new Set<string>();
  const headshots: { url: string; desc: string; article: string }[] = [];
  for (const article of nytArticles) {
    const arch = article.architecture as {
      publicAssets?: {
        authorHeadshot?: { url: string; desc: string };
      };
    } | undefined;
    if (!arch?.publicAssets?.authorHeadshot) continue;
    const hs = arch.publicAssets.authorHeadshot;
    if (seen.has(hs.url)) continue;
    seen.add(hs.url);
    headshots.push({
      url: hs.url,
      desc: hs.desc,
      article: shortTitle(article.title),
    });
  }
  return headshots;
}

/* ── Component ────────────────────────────────────────────────────── */

export default function BrandNYTResources() {
  const datawrapperUrls = buildDatawrapperUrls();
  const ai2htmlArtboards = buildAi2htmlArtboards();
  const socialImages = buildSocialImages();
  const articleImages = buildArticleImages();
  const iconAssets = buildIconAssets();
  const cssFiles = buildCssFiles();
  const authorHeadshots = buildAuthorHeadshots();

  return (
    <div>
      <div className="dd-section-label">Brand Reference</div>
      <h2 className="dd-section-title">NYT Resources</h2>
      <p className="dd-section-desc">
        Quick links, external assets, article image inventories, icon inventories, CSS inventory, and author headshots
        from {nytArticles.length} NYT articles.
      </p>

      {/* ── 1. Quick Links ────────────────────────────────────── */}
      <SectionLabel id="quick-links">Quick Links</SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {QUICK_LINKS.map((r) => (
          <Link
            key={r.href}
            href={r.href as Route}
            className="dd-brand-card p-4 hover:-translate-y-0.5 hover:shadow-md transition"
            style={{ display: "block", textDecoration: "none" }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--dd-brand-accent)",
                marginBottom: 4,
              }}
            >
              {r.title} &rarr;
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 12,
                color: "var(--dd-ink-faint)",
              }}
            >
              {r.description}
            </div>
          </Link>
        ))}
      </div>

      {/* ── 2. External Assets ────────────────────────────────── */}
      <SectionLabel id="external-assets">External Assets</SectionLabel>

      {/* Datawrapper Chart URLs */}
      <SubSectionLabel>Datawrapper Chart URLs</SubSectionLabel>
      {datawrapperUrls.length > 0 && (
        <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>ID</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Topic</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
                <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {datawrapperUrls.map((d) => (
                <tr key={`${d.id}-${d.topic}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}>{d.id}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{d.topic}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{d.article}</td>
                  <td className="py-1.5">
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--dd-brand-accent)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      {d.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ai2html Artboard URLs */}
      <SubSectionLabel>ai2html Artboard URLs</SubSectionLabel>
      {ai2htmlArtboards.length > 0 ? (
        <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Label</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Width</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
                <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {ai2htmlArtboards.map((ab, i) => (
                <tr key={`${ab.url}-${i}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{ab.label}</td>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}>{ab.width}px</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{ab.article}</td>
                  <td className="py-1.5">
                    <a
                      href={ab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--dd-brand-accent)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      {ab.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-faint)", marginBottom: 12 }}>
          No ai2html artboards found in publicAssets.
        </p>
      )}

      {/* Social Image URLs */}
      <SubSectionLabel>Social Image URLs</SubSectionLabel>
      {socialImages.length > 0 && (
        <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Name</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Ratio</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
                <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {socialImages.map((img, i) => (
                <tr key={`${img.url}-${i}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}>{img.name}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{img.ratio}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{img.article}</td>
                  <td className="py-1.5">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--dd-brand-accent)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      {img.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SubSectionLabel>Article Image Assets</SubSectionLabel>
      {articleImages.length > 0 ? (
        <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Name</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Category</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
                <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>URL</th>
              </tr>
            </thead>
            <tbody>
              {articleImages.map((img, i) => (
                <tr key={`${img.url}-${i}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}>{img.name}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{img.category}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{img.article}</td>
                  <td className="py-1.5">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--dd-brand-accent)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      {img.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-faint)", marginBottom: 12 }}>
          No article image assets found in publicAssets.
        </p>
      )}

      <SubSectionLabel>Icon Assets</SubSectionLabel>
      {iconAssets.length > 0 ? (
        <div className="dd-brand-card p-4 mb-6 overflow-x-auto">
          <table
            className="w-full text-left"
            style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Name</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Usage</th>
                <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
                <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Source</th>
              </tr>
            </thead>
            <tbody>
              {iconAssets.map((icon, i) => (
                <tr key={`${icon.src}-${i}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                  <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-brand-accent)" }}>{icon.name}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{icon.usage}</td>
                  <td className="py-1.5 pr-4" style={{ color: "var(--dd-ink-faint)" }}>{icon.article}</td>
                  <td className="py-1.5">
                    <a
                      href={icon.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono"
                      style={{ fontSize: 10, color: "var(--dd-brand-accent)", textDecoration: "underline", wordBreak: "break-all" }}
                    >
                      {icon.src}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontFamily: "var(--dd-font-sans)", fontSize: 12, color: "var(--dd-ink-faint)", marginBottom: 12 }}>
          No icon assets found in publicAssets.
        </p>
      )}

      {/* ── 3. CSS File Inventory ─────────────────────────────── */}
      <SectionLabel id="css-inventory">CSS File Inventory</SectionLabel>

      <div className="dd-brand-card p-4 mb-8 overflow-x-auto">
        <table
          className="w-full text-left"
          style={{ fontSize: 12, fontFamily: "var(--dd-font-sans)" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--dd-brand-border)" }}>
              <th className="py-1 pr-4 font-semibold" style={{ color: "var(--dd-ink-black)" }}>CSS File</th>
              <th className="py-1 font-semibold" style={{ color: "var(--dd-ink-black)" }}>Article</th>
            </tr>
          </thead>
          <tbody>
            {cssFiles.map((f, i) => (
              <tr key={`${f.file}-${i}`} style={{ borderBottom: "1px solid var(--dd-brand-border-subtle)" }}>
                <td className="py-1.5 pr-4 font-mono" style={{ fontSize: 11, color: "var(--dd-ink-faint)" }}>{f.file}</td>
                <td className="py-1.5" style={{ color: "var(--dd-ink-faint)" }}>{f.article}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 4. Author Headshots ───────────────────────────────── */}
      <SectionLabel id="author-headshots">Author Headshots</SectionLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {authorHeadshots.map((hs) => (
          <div
            key={hs.url}
            className="dd-brand-card p-4 flex items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hs.url}
              alt={hs.desc}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                objectFit: "cover",
                flexShrink: 0,
                border: "1px solid var(--dd-brand-border)",
              }}
            />
            <div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--dd-ink-black)",
                  marginBottom: 2,
                }}
              >
                {hs.desc}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  color: "var(--dd-ink-faint)",
                  marginBottom: 2,
                }}
              >
                {hs.article}
              </div>
              <a
                href={hs.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: "var(--dd-brand-accent)",
                  textDecoration: "underline",
                  wordBreak: "break-all",
                }}
              >
                {hs.url}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

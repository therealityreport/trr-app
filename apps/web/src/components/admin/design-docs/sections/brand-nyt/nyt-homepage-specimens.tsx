"use client";

import {
  NYT_HOMEPAGE_COMPONENT_EXAMPLES,
  NYT_HOMEPAGE_PACKAGE_CONTAINERS,
  NYT_HOMEPAGE_RENDER_SECTIONS,
  type NytHomepagePreviewId,
} from "@/lib/admin/nyt-homepage-preview-config";
import {
  buildNytHomepagePreviewUrl,
  NYT_HOMEPAGE_SOURCE_BUNDLE,
} from "@/lib/admin/nyt-homepage-source-bundle";

const shellSectionById = Object.fromEntries(
  NYT_HOMEPAGE_RENDER_SECTIONS.map((section) => [section.id, section]),
) as Record<(typeof NYT_HOMEPAGE_RENDER_SECTIONS)[number]["id"], (typeof NYT_HOMEPAGE_RENDER_SECTIONS)[number]>;

const componentByPreviewId = Object.fromEntries(
  NYT_HOMEPAGE_COMPONENT_EXAMPLES.map((component) => [component.previewId, component]),
) as Record<(typeof NYT_HOMEPAGE_COMPONENT_EXAMPLES)[number]["previewId"], (typeof NYT_HOMEPAGE_COMPONENT_EXAMPLES)[number]>;

const packageByPreviewId = Object.fromEntries(
  NYT_HOMEPAGE_PACKAGE_CONTAINERS.map((item) => [item.previewId, item]),
) as Record<(typeof NYT_HOMEPAGE_PACKAGE_CONTAINERS)[number]["previewId"], (typeof NYT_HOMEPAGE_PACKAGE_CONTAINERS)[number]>;

function normalizeSnippet(snippet: string) {
  return snippet.replace(/\s+/g, " ").trim();
}

function clipSnippet(snippet: string, limit = 560) {
  const normalized = normalizeSnippet(snippet);
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized;
}

function TinyLabel({
  children,
  color = "var(--dd-ink-faint)",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color,
      }}
    >
      {children}
    </div>
  );
}

function previewHeightForId(previewId: NytHomepagePreviewId) {
  switch (previewId) {
    case "edition-rail":
      return 140;
    case "masthead":
      return 210;
    case "nested-nav":
      return 280;
    case "lead-programming":
      return 760;
    case "inline-interactives":
      return 1260;
    case "tip-strip":
      return 140;
    case "poetry-promo":
      return 420;
    case "weather-strip":
      return 430;
    case "opinion-label":
      return 160;
    case "betamax-player":
      return 460;
    case "watch-todays-videos":
      return 900;
    case "more-news":
      return 1120;
    case "well-package":
    case "culture-lifestyle-package":
    case "athletic-package":
    case "audio-package":
    case "cooking-package":
    case "wirecutter-package":
    case "games-package":
      return 900;
    case "product-rails":
      return 5200;
    case "site-index":
      return 240;
    case "footer":
      return 280;
    default:
      return 720;
  }
}

function PreviewFrame({
  previewId,
  title,
  height,
}: {
  previewId: NytHomepagePreviewId;
  title: string;
  height?: number;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--dd-brand-border)",
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <iframe
        title={title}
        src={buildNytHomepagePreviewUrl("fragment", { id: previewId })}
        style={{
          width: "100%",
          height: height ?? previewHeightForId(previewId),
          border: 0,
          background: "#fff",
        }}
      />
    </div>
  );
}

export function HomepageDomEvidence({ evidence }: { evidence: readonly string[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      {evidence.map((item) => (
        <span
          key={item}
          className="font-mono"
          style={{
            fontSize: 10,
            lineHeight: 1.4,
            color: "var(--dd-brand-accent)",
            background: "rgba(0, 103, 165, 0.06)",
            border: "1px solid rgba(0, 103, 165, 0.12)",
            borderRadius: 999,
            padding: "4px 9px",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function HomepageSourceSnippet({
  snippet,
  label = "Scrapling HTML export",
}: {
  snippet: string;
  label?: string;
}) {
  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid var(--dd-brand-border)",
      }}
    >
      <TinyLabel>{label}</TinyLabel>
      <pre
        style={{
          marginTop: 8,
          marginBottom: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 10,
          lineHeight: 1.6,
          color: "var(--dd-ink-faint)",
          background: "#fafafa",
          border: "1px solid var(--dd-brand-border-subtle)",
          borderRadius: 10,
          padding: "12px 14px",
          overflow: "hidden",
        }}
      >
        {clipSnippet(snippet)}
      </pre>
    </div>
  );
}

export function HomepageShellZonePreview({ sectionId }: { sectionId: string }) {
  const section = shellSectionById[sectionId as keyof typeof shellSectionById];
  if (!section) {
    return null;
  }

  return <PreviewFrame previewId={section.previewId} title={section.label} />;
}

export function HomepageComponentPreview({ previewId }: { previewId: NytHomepagePreviewId }) {
  const component = componentByPreviewId[previewId as keyof typeof componentByPreviewId];
  if (!component) {
    return null;
  }

  return <PreviewFrame previewId={component.previewId} title={component.label} />;
}

export function HomepagePackagePreview({ previewId }: { previewId: NytHomepagePreviewId }) {
  const item = packageByPreviewId[previewId as keyof typeof packageByPreviewId];
  if (!item) {
    return null;
  }

  return <PreviewFrame previewId={item.previewId} title={item.label} />;
}

export function HomepageShellStackPreview() {
  return (
    <div
      className="dd-brand-card"
      style={{
        padding: 0,
        overflow: "hidden",
        borderRadius: 16,
      }}
    >
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--dd-brand-border)",
          display: "grid",
          gap: 8,
          background: "#fff",
        }}
      >
        <TinyLabel color="var(--dd-brand-accent)">Saved Homepage Copy</TinyLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 13,
            color: "var(--dd-ink-faint)",
            lineHeight: 1.6,
            maxWidth: 840,
          }}
        >
          The homepage overview now comes from the checked-in NYT snapshot bundle: saved HTML, saved CSS/JS
          inventory, plus the locally saved native homepage copy when it is available on disk. The docs render
          each module from the saved source instead of rebuilding the homepage as synthetic React cards.
        </div>
        <div
          className="font-mono"
          style={{
            fontSize: 11,
            color: "var(--dd-brand-accent)",
            wordBreak: "break-all",
          }}
        >
          {NYT_HOMEPAGE_SOURCE_BUNDLE.html.rendered}
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, padding: 16 }}>
        {NYT_HOMEPAGE_RENDER_SECTIONS.map((section) => (
          <div
            key={section.id}
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            <TinyLabel color="var(--dd-brand-accent)">{section.label}</TinyLabel>
            <PreviewFrame previewId={section.previewId} title={section.label} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function homepageShellSection(sectionId: string) {
  return shellSectionById[sectionId as keyof typeof shellSectionById];
}

export function homepageComponentExample(previewId: string) {
  return componentByPreviewId[previewId as keyof typeof componentByPreviewId];
}

export function homepagePackageContainer(previewId: string) {
  return packageByPreviewId[previewId as keyof typeof packageByPreviewId];
}

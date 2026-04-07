"use client";

import type { ArticleReference, ArticleSocialImageReference } from "@/lib/admin/design-docs-config";
import { getPreferredArticleShareImage } from "@/lib/admin/design-docs-config";

function toCssAspectRatio(ratio?: string) {
  if (!ratio || !ratio.includes(":")) {
    return undefined;
  }
  const [width, height] = ratio.split(":").map((part) => part.trim());
  if (!width || !height) {
    return undefined;
  }
  return `${width} / ${height}`;
}

function getImageExtension(url: string) {
  return (url.match(/\.([a-zA-Z]+)(?:\?|$)/) || [])[1]?.toUpperCase() || "IMG";
}

function formatImageMeta(image: ArticleSocialImageReference) {
  return [
    image.name,
    image.ratio,
    image.width ? `${image.width}px` : null,
    getImageExtension(image.url),
  ].filter(Boolean).join(" · ");
}

export function ArticleListFeaturedImage({ article }: { article: ArticleReference }) {
  const image = getPreferredArticleShareImage(article);

  if (!image) {
    return null;
  }

  return (
    <div
      style={{
        padding: "20px 28px",
        background: "#f7f5f0",
        borderBottom: "1px solid var(--dd-paper-grey)",
      }}
    >
      <div
        style={{
          overflow: "hidden",
          borderRadius: 6,
          border: "1px solid var(--dd-paper-grey)",
          background: "#ece8de",
          aspectRatio: toCssAspectRatio(image.ratio),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={article.title}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 10,
          color: "var(--dd-ink-faint)",
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--dd-ink-medium)" }}>Featured image:</span>{" "}
        {formatImageMeta(image)}
      </div>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
"use client";

import {
  NYT_GAMES_PUBLIC_ASSET_GROUPS,
  type NYTGamesPublicAsset,
} from "./nyt-games-public-assets";

function AssetPreview({
  asset,
}: {
  asset: NYTGamesPublicAsset;
}) {
  const isRaster = /\.(jpg|jpeg|png|webp)$/i.test(asset.file);
  const previewSize = asset.display.desktop;

  return (
    <div
      className="dd-brand-card"
      style={{
        padding: 16,
        display: "grid",
        gap: 12,
        alignContent: "start",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: previewSize.height + 24,
          borderRadius: 10,
          background: isRaster ? "#f6f6f6" : "#ffffff",
          border: "1px solid var(--dd-paper-grey)",
          padding: 12,
        }}
      >
        <img
          src={asset.r2}
          alt={asset.label}
          style={{
            width: previewSize.width,
            height: previewSize.height,
            objectFit: previewSize.objectFit ?? "contain",
            objectPosition: previewSize.backgroundPosition ?? "center",
            maxWidth: "100%",
          }}
        />
      </div>

      <div>
        <div
          style={{
            fontFamily: "var(--dd-font-sans)",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--dd-ink-light)",
            marginBottom: 4,
          }}
        >
          {asset.kind}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            marginBottom: 6,
          }}
        >
          {asset.label}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-soft)",
            wordBreak: "break-word",
            marginBottom: 8,
          }}
        >
          {asset.file}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-soft)",
            marginBottom: 8,
            lineHeight: 1.5,
          }}
        >
          Slot: {asset.display.slot}
          <br />
          Desktop: {asset.display.desktop.width}x{asset.display.desktop.height}
          {asset.display.mobile ? (
            <>
              <br />
              Mobile: {asset.display.mobile.width}x{asset.display.mobile.height}
            </>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}
        >
          <div>R2: {asset.r2}</div>
          <div>Source: {asset.source}</div>
        </div>
      </div>
    </div>
  );
}

export default function BrandNYTGamesResources() {
  return (
    <div style={{ display: "grid", gap: 28 }}>
      <div
        className="dd-brand-card"
        style={{
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontSize: 24,
            fontWeight: 700,
            color: "var(--dd-ink-black)",
            marginBottom: 8,
          }}
        >
          R2-hosted NYT Games assets
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--dd-font-body)",
            fontSize: 15,
            lineHeight: 1.65,
            color: "var(--dd-ink-soft)",
          }}
        >
          Every asset preview below is rendered from the TRR hosted-media R2 mirror, not from
          nytimes.com. The original NYT URL is retained only as provenance metadata.
        </p>
      </div>

      {NYT_GAMES_PUBLIC_ASSET_GROUPS.map((group) => (
        <section key={group.title}>
          <div
            style={{
              fontFamily: "var(--dd-font-sans)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "var(--dd-brand-accent)",
              marginBottom: 8,
            }}
          >
            {group.title}
          </div>
          <p
            style={{
              margin: "0 0 16px",
              fontFamily: "var(--dd-font-body)",
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--dd-ink-soft)",
            }}
          >
            {group.description}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {group.assets.map((asset) => (
              <AssetPreview key={asset.file} asset={asset} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

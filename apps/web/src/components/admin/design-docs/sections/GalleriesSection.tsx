"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function SpecimenLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.12em",
        color: "var(--dd-viz-blue)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function SpecimenMeta({ text }: { text: string }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
        color: "var(--dd-ink-faint)",
        marginTop: 8,
      }}
    >
      {text}
    </div>
  );
}

function GalleryCard({
  label,
  usage,
  borderColor,
  children,
}: {
  label: string;
  usage: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-10"
      style={{
        borderTop: `3px solid ${borderColor}`,
        borderRadius: "var(--dd-radius-md, 6px)",
        background: "var(--dd-paper-white)",
        overflow: "hidden",
      }}
    >
      <div className="p-4 border-b border-zinc-200">
        <SpecimenLabel>{label}</SpecimenLabel>
        <div
          style={{
            fontFamily: "var(--dd-font-body)",
            fontSize: 13,
            color: "var(--dd-ink-soft)",
            lineHeight: 1.5,
          }}
        >
          {usage}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function GrayPlaceholder({
  aspectRatio,
  radius = 0,
  height,
  label,
  className,
}: {
  aspectRatio?: string;
  radius?: number;
  height?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        background: "var(--dd-paper-grey, #d4d4d4)",
        aspectRatio: aspectRatio,
        height: height,
        borderRadius: radius,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        color: "var(--dd-ink-soft)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
      }}
    >
      {label ?? "Image"}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function GalleriesSection() {
  const [selectedThumb, setSelectedThumb] = useState(0);

  return (
    <div>
      <div className="dd-section-label">Galleries</div>
      <h2 className="dd-section-title">Image Gallery Patterns</h2>
      <p className="dd-section-desc">
        Four gallery layout patterns following NYT-style minimal editorial
        treatment&mdash;no decorative borders or shadows on editorial images.
        All specimens use gray placeholder panels with CSS aspect-ratio.
      </p>

      {/* ---- Editorial Photo Grid ---- */}
      <GalleryCard
        label="Editorial Photo Grid"
        usage="Standard article image grids. 3-column with captions and source attribution."
        borderColor="var(--dd-viz-blue)"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <GrayPlaceholder
                aspectRatio="16/9"
                radius={0}
                label={`Photo ${i + 1}`}
              />
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 11,
                  fontStyle: "italic",
                  color: "var(--dd-ink-soft)",
                  marginTop: 6,
                  lineHeight: 1.4,
                }}
              >
                Caption for photo {i + 1} describing the scene.
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  color: "var(--dd-ink-faint)",
                  marginTop: 2,
                }}
              >
                Source / Credit
              </div>
            </div>
          ))}
        </div>
        <SpecimenMeta text="3-column grid | 16:9 aspect | 8px gap | 0px radius | Franklin Gothic 11px italic captions" />
      </GalleryCard>

      {/* ---- Masonry Gallery ---- */}
      <GalleryCard
        label="Masonry Gallery"
        usage="Visual features and photo essays. Staggered heights create dynamic visual rhythm."
        borderColor="var(--dd-viz-teal)"
      >
        <div
          style={{
            columnCount: 3,
            columnGap: 8,
          }}
        >
          {[200, 280, 240, 300, 220, 260].map((h, i) => (
            <div
              key={i}
              style={{
                breakInside: "avoid",
                marginBottom: 8,
                borderRadius: 4,
                overflow: "hidden",
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <GrayPlaceholder
                height={h}
                radius={0}
                label={`${h}px`}
              />
            </div>
          ))}
        </div>
        <SpecimenMeta text="CSS columns | 3-col | staggered heights (200-300px) | 8px gap | 4px radius | hover: scale + shadow" />
      </GalleryCard>

      {/* ---- Full-Width Feature Image ---- */}
      <GalleryCard
        label="Full-Width Feature Image"
        usage="Hero and feature story images. Full-bleed with caption overlay at bottom-left."
        borderColor="var(--dd-accent-saffron)"
      >
        <div style={{ position: "relative", borderRadius: 0, overflow: "hidden" }}>
          <GrayPlaceholder aspectRatio="16/9" radius={0} label="Feature Image" />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(transparent 0%, rgba(0,0,0,0.7) 100%)",
              padding: "40px 24px 20px",
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-headline)",
                fontWeight: 700,
                fontSize: 28,
                color: "#ffffff",
                lineHeight: 1.15,
                marginBottom: 8,
                maxWidth: 480,
              }}
            >
              Inside the Most-Watched Premiere of the Year
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 11,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Photography by Jane Doe for The Reality Report
            </div>
          </div>
        </div>
        <SpecimenMeta text="Full-width | 16:9 | dark gradient overlay | Cheltenham headline | caption bottom-left" />
      </GalleryCard>

      {/* ---- Lightbox Pattern ---- */}
      <GalleryCard
        label="Lightbox Pattern"
        usage="Photo galleries with selection. Thumbnails grid with enlarged preview panel."
        borderColor="var(--dd-viz-purple)"
      >
        <div className="flex gap-6">
          {/* Thumbnails grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 4,
              flexShrink: 0,
              width: 424,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                onClick={() => setSelectedThumb(i)}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 4,
                  overflow: "hidden",
                  cursor: "pointer",
                  border:
                    selectedThumb === i
                      ? "2px solid var(--dd-viz-blue)"
                      : "2px solid transparent",
                  transform: selectedThumb === i ? "scale(1.05)" : "scale(1)",
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background:
                      selectedThumb === i
                        ? "var(--dd-paper-mid, #b0b0b0)"
                        : "var(--dd-paper-grey, #d4d4d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Preview panel */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                background: "var(--dd-paper-mid, #b0b0b0)",
                aspectRatio: "4/3",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--dd-font-sans)",
                fontSize: 14,
                color: "var(--dd-ink-soft)",
                marginBottom: 12,
              }}
            >
              Photo {selectedThumb + 1} &mdash; Enlarged
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                lineHeight: 1.55,
                color: "var(--dd-ink-medium)",
              }}
            >
              Selected image description. Click any thumbnail to preview it at
              full size in this panel.
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                color: "var(--dd-ink-faint)",
                marginTop: 6,
              }}
            >
              Image {selectedThumb + 1} of 12
            </div>
          </div>
        </div>
        <SpecimenMeta text="4x3 thumbnails (100px squares, 4px radius) | blue selection border | enlarged preview panel" />
      </GalleryCard>
    </div>
  );
}

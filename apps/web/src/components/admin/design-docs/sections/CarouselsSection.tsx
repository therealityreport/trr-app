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

function CarouselCard({
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

function NavArrow({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "1px solid var(--dd-paper-grey, #d4d4d4)",
        background: "var(--dd-paper-white)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        fontFamily: "var(--dd-font-sans)",
        fontSize: 16,
        color: "var(--dd-ink-medium)",
        flexShrink: 0,
      }}
      aria-label={direction === "left" ? "Previous" : "Next"}
    >
      {direction === "left" ? "\u2039" : "\u203A"}
    </button>
  );
}

function DotPagination({
  count,
  active,
  onDotClick,
}: {
  count: number;
  active: number;
  onDotClick?: (i: number) => void;
}) {
  return (
    <div className="flex gap-2 justify-center" style={{ marginTop: 16 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          onClick={() => onDotClick?.(i)}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background:
              i === active
                ? "var(--dd-ink-black)"
                : "var(--dd-paper-grey, #d4d4d4)",
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide data                                                        */
/* ------------------------------------------------------------------ */

const HERO_SLIDES = [
  {
    headline: "Premiere Night Breaks All Records",
    deck: "The most-watched debut in franchise history drew 8.2 million live viewers.",
  },
  {
    headline: "Cast Shake-Up Sends Fans into Overdrive",
    deck: "Social media exploded after the surprise mid-season cast announcement.",
  },
  {
    headline: "Reunion Special Confirmed for May",
    deck: "Producers promise an unfiltered look at the season\u2019s biggest feuds.",
  },
];

const CARD_SLIDES = [
  { title: "Season Premiere Recap", desc: "All the key moments from episode one." },
  { title: "Cast Power Rankings", desc: "Who\u2019s on top after week four?" },
  { title: "Behind the Scenes", desc: "Exclusive production insights." },
  { title: "Viewer Poll Results", desc: "Fan favorites and surprise picks." },
  { title: "What to Watch Next", desc: "Our top picks for the week ahead." },
];

const STORY_NAMES = [
  "Lisa",
  "Kyle",
  "Teresa",
  "NeNe",
  "Bethenny",
  "Dorinda",
  "Erika",
  "Garcelle",
];

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export default function CarouselsSection() {
  const [heroSlide, setHeroSlide] = useState(0);
  const [activeThumb, setActiveThumb] = useState(0);
  const [activeStory, setActiveStory] = useState(0);

  return (
    <div>
      <div className="dd-section-label">Carousels</div>
      <h2 className="dd-section-title">Carousel &amp; Slider Patterns</h2>
      <p className="dd-section-desc">
        Four carousel and slider patterns with dot pagination, arrow controls,
        and active states. Specimens demonstrate navigation mechanics and visual
        treatments.
      </p>

      {/* ---- Hero Carousel ---- */}
      <CarouselCard
        label="Hero Carousel"
        usage="Full-width hero rotation for featured stories. Dark background with headline, deck, and dot navigation."
        borderColor="var(--dd-accent-saffron)"
      >
        <div style={{ position: "relative" }}>
          <div
            style={{
              background: "#121212",
              borderRadius: "var(--dd-radius-sm, 3px)",
              padding: "var(--dd-space-xl, 48px) var(--dd-space-lg, 32px)",
              minHeight: 280,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {/* Left arrow */}
            <div
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <NavArrow
                direction="left"
                onClick={() =>
                  setHeroSlide((s) =>
                    s === 0 ? HERO_SLIDES.length - 1 : s - 1
                  )
                }
              />
            </div>

            {/* Right arrow */}
            <div
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <NavArrow
                direction="right"
                onClick={() =>
                  setHeroSlide((s) =>
                    s === HERO_SLIDES.length - 1 ? 0 : s + 1
                  )
                }
              />
            </div>

            <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-headline)",
                  fontWeight: 900,
                  fontSize: 36,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                  marginBottom: 16,
                  transition: "opacity 0.3s ease",
                }}
              >
                {HERO_SLIDES[heroSlide].headline}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-body)",
                  fontSize: 16,
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.7)",
                  transition: "opacity 0.3s ease",
                }}
              >
                {HERO_SLIDES[heroSlide].deck}
              </div>
            </div>

            <DotPagination
              count={HERO_SLIDES.length}
              active={heroSlide}
              onDotClick={setHeroSlide}
            />
          </div>
        </div>
        <SpecimenMeta text="Full-width | dark bg | 3 slides | dot pagination center | circle nav arrows at edges" />
      </CarouselCard>

      {/* ---- Content Card Slider ---- */}
      <CarouselCard
        label="Content Card Slider"
        usage="Horizontal card scroll for related content. 4 visible cards with peek of next card."
        borderColor="var(--dd-viz-blue)"
      >
        <div
          className="flex items-center gap-3"
          style={{ position: "relative" }}
        >
          <NavArrow direction="left" />
          <div
            style={{
              display: "flex",
              gap: 16,
              overflow: "hidden",
              flex: 1,
            }}
          >
            {CARD_SLIDES.map((card, i) => (
              <div
                key={i}
                style={{
                  minWidth: 280,
                  maxWidth: 280,
                  border: "1px solid var(--dd-paper-grey, #e0e0e0)",
                  borderRadius: "var(--dd-radius-md, 6px)",
                  overflow: "hidden",
                  background: "var(--dd-paper-white)",
                  opacity: i === 4 ? 0.5 : 1,
                  // 5th card is partially visible (peek)
                  ...(i === 4 ? { marginRight: -250 } : {}),
                }}
              >
                <div
                  style={{
                    aspectRatio: "16/9",
                    background: "var(--dd-paper-grey, #d4d4d4)",
                    borderRadius: "4px 4px 0 0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 10,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  Image
                </div>
                <div style={{ padding: "12px 16px" }}>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-headline)",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1.25,
                      color: "var(--dd-ink-black)",
                      marginBottom: 6,
                    }}
                  >
                    {card.title}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-sans)",
                      fontSize: 13,
                      lineHeight: 1.4,
                      color: "var(--dd-ink-medium)",
                    }}
                  >
                    {card.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <NavArrow direction="right" />
        </div>
        <SpecimenMeta text="4 visible cards (280px) + peek of 5th | 16:9 image | 4px radius | Cheltenham 16px title | arrows" />
      </CarouselCard>

      {/* ---- Thumbnail Strip ---- */}
      <CarouselCard
        label="Thumbnail Strip"
        usage="Compact horizontal thumbnail scroller for image selection. Active state with blue ring."
        borderColor="var(--dd-viz-teal)"
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            overflowX: "auto",
            paddingBottom: 8,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              onClick={() => setActiveThumb(i)}
              style={{
                width: 80,
                height: 80,
                flexShrink: 0,
                borderRadius: 4,
                overflow: "hidden",
                cursor: "pointer",
                border:
                  activeThumb === i
                    ? "2px solid var(--dd-viz-blue)"
                    : "2px solid transparent",
                transition: "border-color 0.15s ease",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    activeThumb === i
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
        <SpecimenMeta text="Horizontal scroll | 80x80px squares | 4px radius | 4px gap | blue ring active state" />
      </CarouselCard>

      {/* ---- Story Carousel (IG-style) ---- */}
      <CarouselCard
        label="Story Carousel (IG-style)"
        usage="Circular avatar strip for cast stories or social highlights. Saffron border for active, gray for viewed."
        borderColor="var(--dd-viz-purple)"
      >
        <div
          className="flex gap-5 justify-center"
          style={{ padding: "8px 0" }}
        >
          {STORY_NAMES.map((name, i) => (
            <div
              key={name}
              onClick={() => setActiveStory(i)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  border: `2px solid ${
                    activeStory === i
                      ? "var(--dd-accent-saffron)"
                      : "var(--dd-paper-grey, #d4d4d4)"
                  }`,
                  padding: 2,
                  transition: "border-color 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    background:
                      activeStory === i
                        ? "var(--dd-paper-mid, #b0b0b0)"
                        : "var(--dd-paper-grey, #d4d4d4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--dd-ink-soft)",
                  }}
                >
                  {name[0]}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-sans)",
                  fontSize: 10,
                  fontWeight: activeStory === i ? 600 : 400,
                  color:
                    activeStory === i
                      ? "var(--dd-ink-black)"
                      : "var(--dd-ink-soft)",
                  textAlign: "center",
                  transition: "color 0.2s ease",
                }}
              >
                {name}
              </div>
            </div>
          ))}
        </div>
        <SpecimenMeta text="64px circles | 2px saffron (active) / gray (inactive) border | Franklin Gothic 10px labels" />
      </CarouselCard>
    </div>
  );
}

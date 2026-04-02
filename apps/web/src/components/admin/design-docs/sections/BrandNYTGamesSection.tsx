/* eslint-disable @next/next/no-img-element */
"use client";

import type { CSSProperties, ReactNode } from "react";
import { HubComponents } from "./games";
import {
  NYT_GAMES_RUNTIME_FONT_STACKS,
  resolveNYTGamesRuntimeFontFamily,
} from "./games/font-stacks";
import BrandNYTGamesResources from "./games/BrandNYTGamesResources";
import { FOUNDATION, TECH_STACK, AB_TESTS } from "./games/game-palettes";
import {
  NYT_GAMES_DRAWER_ICON_ASSETS,
  NYT_GAMES_GAME_CARD_ICON_ASSETS,
  NYT_GAMES_LOGO_ASSET,
  NYT_GAMES_SOURCE_COMPONENT_GROUPS,
  NYT_GAMES_SOURCE_COMPONENT_DATA,
  type NYTGamesPublicAsset,
  type NYTGamesSourceComponentSpec,
} from "./games/nyt-games-public-assets";
import {
  NYTGamesDocsAnchorSection,
  NYTGamesDocsPageShell,
  useNYTGamesDocsViewport,
} from "./games/NYTGamesPreviewShell";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--dd-font-sans)",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
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

const sectionCardStyle: CSSProperties = {
  background: "var(--dd-paper-white)",
  border: "1px solid var(--dd-paper-grey)",
  borderRadius: 12,
};

const PORTFOLIO_GAMES = [
  {
    slug: "crossplay",
    name: "Crossplay",
    description: "2-player word game",
    badge: "New",
    badgeColor: "#6aaa64",
    cover: "#c8d8f5",
    href: "/games/crossplay",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.crossplay,
  },
  {
    slug: "crossword",
    name: "The Crossword",
    description: "Daily puzzles since 1942",
    badge: "Original",
    badgeColor: "#787c7e",
    cover: "#d3d6da",
    href: "/crosswords/game/daily",
    asset: NYT_GAMES_DRAWER_ICON_ASSETS.crossword,
  },
  {
    slug: "midi",
    name: "The Midi",
    description: "9–11×9–11 themed crossword",
    badge: "New",
    badgeColor: "#6aaa64",
    cover: "#95befa",
    href: "/crosswords/game/midi",
    asset: NYT_GAMES_DRAWER_ICON_ASSETS.midi,
  },
  {
    slug: "mini",
    name: "The Mini",
    description: "5×5 quick crossword",
    badge: "Original",
    badgeColor: "#787c7e",
    cover: "#95befa",
    href: "/crosswords/game/mini",
    asset: NYT_GAMES_DRAWER_ICON_ASSETS.mini,
  },
  {
    slug: "connections",
    name: "Connections",
    description: "Group related words",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#b4a8ff",
    href: "/games/connections",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.connections,
  },
  {
    slug: "spelling-bee",
    name: "Spelling Bee",
    description: "Hexagon word game",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#f7da21",
    href: "/puzzles/spelling-bee",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.spellingBee,
  },
  {
    slug: "wordle",
    name: "Wordle",
    description: "Five-letter word puzzle",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#d3d6da",
    href: "/games/wordle/index.html",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.wordle,
  },
  {
    slug: "pips",
    name: "Pips",
    description: "Domino placement puzzle",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#daa8d0",
    href: "/games/pips",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.pips,
  },
  {
    slug: "strands",
    name: "Strands",
    description: "Theme word pathfinding",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#c0ddd9",
    href: "/games/strands",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.strands,
  },
  {
    slug: "letter-boxed",
    name: "Letter Boxed",
    description: "Square letter connections",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#fc716b",
    href: "/puzzles/letter-boxed",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.letterBoxed,
  },
  {
    slug: "tiles",
    name: "Tiles",
    description: "Visual pattern matching",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#b5e352",
    href: "/puzzles/tiles",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.tiles,
  },
  {
    slug: "sudoku",
    name: "Sudoku",
    description: "Logic number puzzle",
    badge: "Core",
    badgeColor: "#4f85e5",
    cover: "#fb9b00",
    href: "/puzzles/sudoku",
    asset: NYT_GAMES_GAME_CARD_ICON_ASSETS.sudoku,
  },
  {
    slug: "vertex",
    name: "Vertex",
    description: "Polygon art game",
    badge: "Unlisted",
    badgeColor: "#ba81c5",
    cover: "#e7e1d7",
    href: "https://www.nytimes.com/games/vertex",
    asset: null,
  },
  {
    slug: "flashback",
    name: "Flashback",
    description: "History timeline quiz",
    badge: "Unlisted",
    badgeColor: "#ba81c5",
    cover: "#efe1d9",
    href: "https://www.nytimes.com/games/flashback",
    asset: null,
  },
] as const;

const TYPOGRAPHY_ROLES = [
  {
    label: "Nav Button",
    detail: "Header subscribe CTA and shell controls",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.navButton,
    sample: "Subscribe",
  },
  {
    label: "Drawer Heading",
    detail: "Game-group labels in the hamburger menu",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.navDrawerHeading,
    sample: "New York Times Games",
  },
  {
    label: "Hub Card Title",
    detail: "Game portfolio titles on the non-specific games page",
    family: FOUNDATION.typography.families.karnakCondensed.family,
    style: FOUNDATION.typography.families.karnakCondensed.specimens.hubGameCardName,
    sample: "Connections",
  },
  {
    label: "Hub Card Description",
    detail: "Supporting copy beneath each hub card title",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.hubGameCardDescription,
    sample: "Group related words",
  },
  {
    label: "Featured Title",
    detail: "Guide-promo and featured-article headline role",
    family: FOUNDATION.typography.families.karnakCondensed.family,
    style: FOUNDATION.typography.families.karnakCondensed.specimens.featuredTitle,
    sample: "How to Solve The New York Times Crossword",
  },
  {
    label: "Banner Title",
    detail: "Drawer CTA banner title treatment",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.bannerTitle,
    sample: "Crossplay",
  },
  {
    label: "Footer Header",
    detail: "Section headers in the production footer",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.footerSectionHeader,
    sample: "Crosswords + Community",
  },
  {
    label: "Tab",
    detail: "Desktop Last 7 Days / In Progress tabs",
    family: FOUNDATION.typography.families.franklin.family,
    style: FOUNDATION.typography.families.franklin.specimens.tabActive,
    sample: "Last 7 Days",
  },
] as const;

function assetDisplaySize(asset: NYTGamesPublicAsset, isMobile: boolean) {
  return isMobile ? asset.display.mobile ?? asset.display.desktop : asset.display.desktop;
}

function BrandHeroCard() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <div style={{ ...sectionCardStyle, padding: isMobile ? "20px 18px 18px" : "28px 28px 24px" }}>
      <img
        src={NYT_GAMES_LOGO_ASSET.r2}
        alt="NYT Games"
        style={{
          width: NYT_GAMES_LOGO_ASSET.display.desktop.width,
          height: NYT_GAMES_LOGO_ASSET.display.desktop.height,
          objectFit: NYT_GAMES_LOGO_ASSET.display.desktop.objectFit ?? "contain",
          marginBottom: 18,
        }}
      />
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: isMobile ? 16 : 18,
          lineHeight: isMobile ? 1.55 : 1.65,
          color: "var(--dd-ink-soft)",
          maxWidth: isMobile ? "none" : 720,
        }}
      >
        The NYT Games brand page now documents the non-specific games hub instead of a mashup of
        per-game systems. The saved `/crosswords` bundle is the source of truth for the shell,
        hub cards, featured guide, recent-progress modules, footer structure, and mirrored media.
      </div>
      <div
        style={{
          marginTop: 16,
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          lineHeight: 1.6,
          color: "var(--dd-ink-light)",
        }}
      >
        Canonical source: {NYT_GAMES_SOURCE_COMPONENT_DATA.canonicalUrl}
      </div>
    </div>
  );
}

function SourceComponentCard({ component }: { component: NYTGamesSourceComponentSpec }) {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection
      id={component.id}
      label={component.label}
      sourceComponentName={component.sourceComponentName}
      provenance={component.provenance}
      style={{ ...sectionCardStyle, padding: isMobile ? 14 : 18 }}
    >
      <div
        style={{
          fontFamily: "var(--dd-font-sans)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--dd-ink-light)",
          marginBottom: 6,
        }}
      >
        {component.group}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-ui)",
          fontSize: 16,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          marginBottom: 8,
        }}
      >
        {component.label}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-mono)",
          fontSize: 11,
          lineHeight: 1.55,
          color: "var(--dd-ink-soft)",
          marginBottom: 10,
          wordBreak: "break-word",
        }}
      >
        {component.sourcePath}
      </div>
      <div
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--dd-ink-soft)",
          marginBottom: 10,
        }}
      >
        {component.provenance}
      </div>
      {component.cssModules?.length ? (
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            lineHeight: 1.55,
            color: "var(--dd-ink-light)",
            marginBottom: component.docsAnchor ? 10 : 0,
          }}
        >
          CSS: {component.cssModules.join(", ")}
        </div>
      ) : null}
      {component.docsAnchor ? (
        <a
          href={`#${component.docsAnchor}`}
          style={{
            fontFamily: "var(--dd-font-ui)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--dd-brand-accent)",
            textDecoration: "none",
          }}
        >
          Jump to docs coverage
        </a>
      ) : null}
    </NYTGamesDocsAnchorSection>
  );
}

function TypographySection() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection id="typography" label="Typography">
      <SectionLabel>Typography</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
          gap: isMobile ? 12 : 16,
        }}
      >
        {TYPOGRAPHY_ROLES.map((role) => (
          <div key={role.label} style={{ ...sectionCardStyle, padding: 18 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--dd-ink-light)",
                marginBottom: 6,
              }}
            >
              {role.label}
            </div>
            <div
              style={{
                fontFamily: resolveNYTGamesRuntimeFontFamily(role.family),
                color: "var(--dd-ink-black)",
                marginBottom: 10,
                ...role.style,
              }}
            >
              {role.sample}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--dd-ink-soft)",
                marginBottom: 12,
              }}
            >
              {role.detail}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-mono)",
                fontSize: 11,
                lineHeight: 1.5,
                color: "var(--dd-ink-light)",
              }}
            >
              {role.family}
            </div>
          </div>
        ))}
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function TypeScaleSection() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection id="type-scale" label="Type Scale">
      <SectionLabel>Type Scale</SectionLabel>
      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        {FOUNDATION.typography.scale.slice(0, 12).map((entry: { size: string; usage: string; context: string }) => (
          (() => {
            const numericSize =
              typeof entry.size === "number" ? entry.size : Number.parseFloat(String(entry.size));

            return (
              <div
                key={`${entry.size}-${entry.usage}`}
                style={{
                  ...sectionCardStyle,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "68px minmax(0, 1fr)" : "92px minmax(0, 1fr)",
                  gap: isMobile ? 12 : 16,
                  alignItems: "center",
                  padding: isMobile ? "12px 14px" : "14px 18px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--dd-font-headline)",
                    fontSize:
                      isMobile && Number.isFinite(numericSize) ? Math.min(numericSize, 40) : entry.size,
                    lineHeight: 1,
                    color: "var(--dd-ink-black)",
                  }}
                >
                  Aa
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-ui)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "var(--dd-ink-black)",
                      marginBottom: 4,
                    }}
                  >
                    {entry.size}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-body)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: "var(--dd-ink-soft)",
                    }}
                  >
                    {entry.usage}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "var(--dd-ink-light)",
                      marginTop: 4,
                    }}
                  >
                    {entry.context}
                  </div>
                </div>
              </div>
            );
          })()
        ))}
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function ColorPaletteSection() {
  const { isMobile } = useNYTGamesDocsViewport();
  const swatches = [
    ["gamesYellow", FOUNDATION.globalColors.gamesYellow],
    ["miniBlue", FOUNDATION.globalColors.miniBlue],
    ["connectionsPurple", FOUNDATION.globalColors.connectionsPurple],
    ["strandsMint", FOUNDATION.globalColors.strandsMint],
    ["sbYellow", FOUNDATION.globalColors.sbYellow],
    ["lbRed", FOUNDATION.globalColors.lbRed],
    ["tilesGreen", FOUNDATION.globalColors.tilesGreen],
    ["sudokuOrange", FOUNDATION.globalColors.sudokuOrange],
    ["pipsPurple", FOUNDATION.globalColors.pipsPurple],
    ["pipsSoftPink", FOUNDATION.globalColors.pipsSoftPink],
    ["wordleGray", FOUNDATION.globalColors.wordleGray],
    ["darkBlack", FOUNDATION.grayscale.darkBlack],
  ] as const;

  return (
    <NYTGamesDocsAnchorSection id="color-palette" label="Color Palette">
      <SectionLabel>Color Palette</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(180px, 1fr))",
          gap: isMobile ? 12 : 14,
        }}
      >
        {swatches.map(([label, value]) => (
          <div key={label} style={{ ...sectionCardStyle, overflow: "hidden" }}>
            <div style={{ height: 88, background: value }} />
            <div style={{ padding: 14 }}>
              <div
                style={{
                  fontFamily: "var(--dd-font-ui)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--dd-ink-black)",
                  marginBottom: 4,
                }}
              >
                {label}
              </div>
              <div
                style={{
                  fontFamily: "var(--dd-font-mono)",
                  fontSize: 11,
                  color: "var(--dd-ink-light)",
                }}
              >
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function PortfolioCard({
  asset,
  badge,
  badgeColor,
  cover,
  name,
  description,
  href,
}: {
  asset: NYTGamesPublicAsset | null;
  badge: string;
  badgeColor: string;
  cover: string;
  name: string;
  description: string;
  href: string;
}) {
  const { isMobile } = useNYTGamesDocsViewport();
  const illustrationSize = asset ? assetDisplaySize(asset, isMobile) : null;

  return (
    <a
      href={href}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        width: "100%",
        height: "100%",
        background: "#ffffff",
        border: "1px solid #dcdcdc",
        borderRadius: 8,
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: cover,
          paddingTop: 30,
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            display: "inline-flex",
            alignItems: "center",
            minHeight: 24,
            padding: "0 10px",
            borderBottomLeftRadius: 8,
            background: badgeColor,
            color: "#ffffff",
            fontFamily: NYT_GAMES_RUNTIME_FONT_STACKS.ui,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {badge}
        </span>
        {asset ? (
          <img
            src={asset.r2}
            alt=""
            aria-hidden="true"
            style={{
              width: illustrationSize?.width ?? 92,
              height: illustrationSize?.height ?? 92,
              objectFit: illustrationSize?.objectFit ?? "contain",
            }}
          />
        ) : (
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 16,
              border: "1px dashed rgba(18,18,18,0.28)",
              background: "rgba(255,255,255,0.22)",
            }}
          />
        )}
        <div
          style={{
            fontFamily: NYT_GAMES_RUNTIME_FONT_STACKS.headline,
            fontSize: 28,
            lineHeight: 1.1,
            color: "#000000",
            padding: "16px 0 25px",
          }}
        >
          {name}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          justifyContent: "space-between",
          flexBasis: "100%",
          padding: 20,
          fontFamily: NYT_GAMES_RUNTIME_FONT_STACKS.ui,
          fontSize: 16,
          lineHeight: "20.8px",
          minHeight: isMobile ? 132 : 140,
        }}
      >
        <div
          style={{
            fontFamily: NYT_GAMES_RUNTIME_FONT_STACKS.body,
            fontSize: isMobile ? 14 : 16,
            lineHeight: "20px",
            color: "#959595",
            margin: "0 0 15px",
          }}
        >
          {description}
        </div>
        <div
          style={{
            minHeight: 44,
            borderRadius: 44,
            border: "1px solid #cccccc",
            display: "grid",
            placeItems: "center",
            fontFamily: NYT_GAMES_RUNTIME_FONT_STACKS.ui,
            fontSize: 16,
            fontWeight: 700,
            color: "#333333",
          }}
        >
          Play
        </div>
      </div>
    </a>
  );
}

function GamePortfolioSection() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection id="game-portfolio" label="Game Portfolio">
      <SectionLabel>Game Portfolio</SectionLabel>
      <div
        style={{
          marginTop: 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
            columnGap: isMobile ? 16 : 24,
            rowGap: isMobile ? 16 : 24,
            padding: isMobile ? "0 10%" : 0,
            maxWidth: isMobile ? undefined : 890,
            margin: "10px auto 0",
            alignItems: "stretch",
          }}
        >
          {PORTFOLIO_GAMES.map((game) => (
            <PortfolioCard
              key={game.slug}
              asset={game.asset}
              badge={game.badge}
              badgeColor={game.badgeColor}
              cover={game.cover}
              name={game.name}
              description={game.description}
              href={game.href}
            />
          ))}
        </div>
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function TechStackSection() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection id="tech-stack" label="Tech Stack">
      <SectionLabel>Tech Stack</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
          gap: isMobile ? 12 : 16,
        }}
      >
        <div style={{ ...sectionCardStyle, padding: 18 }}>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            Build Snapshot
          </div>
          <div style={{ fontFamily: "var(--dd-font-body)", fontSize: 14, lineHeight: 1.7, color: "var(--dd-ink-soft)" }}>
            Commit {TECH_STACK.build.commit}, page `{TECH_STACK.build.pageName}`, Abra {TECH_STACK.featureFlags.abra.version}, and Games asset base `{TECH_STACK.build.assetBase}`.
          </div>
        </div>
        <div style={{ ...sectionCardStyle, padding: 18 }}>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            CSS Chunks
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {TECH_STACK.build.cssChunks.map((chunk) => (
              <div key={chunk} style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "var(--dd-ink-light)" }}>
                {chunk}
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...sectionCardStyle, padding: 18 }}>
          <div style={{ fontFamily: "var(--dd-font-ui)", fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
            JS Chunks
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {TECH_STACK.build.jsChunkExamples.map((chunk) => (
              <div key={chunk} style={{ fontFamily: "var(--dd-font-mono)", fontSize: 11, color: "var(--dd-ink-light)" }}>
                {chunk}
              </div>
            ))}
          </div>
        </div>
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function ABTestsSection() {
  const { isMobile } = useNYTGamesDocsViewport();
  const groups = Object.entries(AB_TESTS);

  return (
    <NYTGamesDocsAnchorSection id="ab-tests" label="A/B Tests">
      <SectionLabel>A/B Tests</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
          gap: isMobile ? 12 : 16,
        }}
      >
        {groups.map(([groupName, group]) => (
          <div key={groupName} style={{ ...sectionCardStyle, padding: 18 }}>
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--dd-ink-black)",
                marginBottom: 8,
                textTransform: "capitalize",
              }}
            >
              {groupName}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-body)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--dd-ink-soft)",
                marginBottom: 12,
              }}
            >
              {group.description}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {group.tests.slice(0, 6).map((test) => (
                <div
                  key={test.key}
                  style={{
                    fontFamily: "var(--dd-font-mono)",
                    fontSize: 11,
                    lineHeight: 1.5,
                    color: "var(--dd-ink-light)",
                  }}
                >
                  {test.key} — {test.scope}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function SourceTreeCoverageSection() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <NYTGamesDocsAnchorSection id="source-tree-coverage" label="Source Tree Coverage">
      <SectionLabel>Source Tree Coverage</SectionLabel>
      <p
        style={{
          margin: "0 0 18px",
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          lineHeight: 1.65,
          color: "var(--dd-ink-soft)",
        }}
      >
        The downloaded browser-save bundle contains compiled hub assets, not the original
        `webpack://xwords/phoenix/...` folders shown in the screenshots. These cards preserve that
        screenshot-backed component inventory and cross-link each recovered source module to the
        relevant docs coverage on this page.
      </p>

      <div style={{ display: "grid", gap: 20 }}>
        {NYT_GAMES_SOURCE_COMPONENT_GROUPS.map((group) => (
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
                margin: "0 0 14px",
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
                gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(240px, 1fr))",
                gap: isMobile ? 12 : 16,
              }}
            >
              {group.components.map((component) => (
                <SourceComponentCard key={component.id} component={component} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </NYTGamesDocsAnchorSection>
  );
}

function BrandNYTGamesBody() {
  return (
    <div style={{ display: "grid", gap: 0 }}>
      <NYTGamesDocsAnchorSection id="brand-overview" label="Brand Overview">
        <BrandHeroCard />
      </NYTGamesDocsAnchorSection>
      <TypographySection />
      <TypeScaleSection />
      <ColorPaletteSection />
      <GamePortfolioSection />
      <TechStackSection />
      <ABTestsSection />
      <SourceTreeCoverageSection />
      <HubComponents SectionLabel={SectionLabel} />
      <NYTGamesDocsAnchorSection id="resources" label="Resources">
        <SectionLabel>Resources</SectionLabel>
        <BrandNYTGamesResources />
      </NYTGamesDocsAnchorSection>
    </div>
  );
}

export default function BrandNYTGamesSection() {
  return (
    <NYTGamesDocsPageShell
      eyebrow="Brand Reference"
      title="NYT Games"
      description="Hub-level documentation for the non-specific NYT Games surface: header shell, drawer, featured guide, recent-progress modules, production footer, and mirrored hub-card media."
    >
      <BrandNYTGamesBody />
    </NYTGamesDocsPageShell>
  );
}

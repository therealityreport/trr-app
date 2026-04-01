/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { HUB } from "./game-palettes";
import {
  NYT_GAMES_ICON_BY_SLUG,
  NYT_GAMES_LOGO_ASSET,
  NYT_GAMES_PROGRESS_ASSETS,
  NYT_GAMES_SOURCE_COMPONENT_DATA,
  type NYTGamesPublicAsset,
} from "./nyt-games-public-assets";
import { NYTGamesDocsAnchorSection, useNYTGamesDocsViewport } from "./NYTGamesPreviewShell";

interface GameSectionProps {
  SectionLabel: ComponentType<{ children: ReactNode }>;
}

const sectionHeadingStyle: CSSProperties = {
  fontFamily: "var(--dd-font-ui)",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--dd-ink-black)",
  margin: "0 0 10px",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const cardStyle: CSSProperties = {
  background: "var(--dd-paper-white)",
  border: "1px solid var(--dd-paper-grey)",
  borderRadius: 8,
};

const captionStyle: CSSProperties = {
  fontFamily: "var(--dd-font-mono)",
  fontSize: 11,
  color: "var(--dd-ink-light)",
  margin: "-4px 0 12px",
  lineHeight: 1.5,
};

const resetButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  cursor: "pointer",
};

const linkResetStyle: CSSProperties = {
  color: "inherit",
  textDecoration: "none",
};

const NYT_GAMES_FONT_STACKS = {
  ui: '"NYTFranklin","nyt-franklin","Helvetica Neue",Arial,sans-serif',
  body: '"NYTFranklin","nyt-franklin","Helvetica Neue",Arial,sans-serif',
  headline: '"NYTKarnak_Condensed","nyt-karnakcondensed",Georgia,serif',
  display: '"KarnakPro-Book","nyt-karnak",Georgia,serif',
  slab: '"Stymie","nyt-stymie","Rockwell",serif',
} as const;

type RecentTabKey = "last-7-days" | "in-progress";

const GAME_ICON_BY_NAME: Record<string, NYTGamesPublicAsset> = {
  Crossplay: NYT_GAMES_ICON_BY_SLUG.crossplay,
  "The Crossword": NYT_GAMES_ICON_BY_SLUG.crossword,
  "The Midi": NYT_GAMES_ICON_BY_SLUG.midi,
  "The Midi Crossword": NYT_GAMES_ICON_BY_SLUG.midi,
  "The Mini": NYT_GAMES_ICON_BY_SLUG.mini,
  "The Mini Crossword": NYT_GAMES_ICON_BY_SLUG.mini,
  Connections: NYT_GAMES_ICON_BY_SLUG.connections,
  "Spelling Bee": NYT_GAMES_ICON_BY_SLUG["spelling-bee"],
  Wordle: NYT_GAMES_ICON_BY_SLUG.wordle,
  Pips: NYT_GAMES_ICON_BY_SLUG.pips,
  Strands: NYT_GAMES_ICON_BY_SLUG.strands,
  "Letter Boxed": NYT_GAMES_ICON_BY_SLUG["letter-boxed"],
  Tiles: NYT_GAMES_ICON_BY_SLUG.tiles,
  Sudoku: NYT_GAMES_ICON_BY_SLUG.sudoku,
};

function getAssetDisplaySize(
  asset: NYTGamesPublicAsset,
  viewport: "desktop" | "mobile" = "desktop",
) {
  return viewport === "mobile" ? asset.display.mobile ?? asset.display.desktop : asset.display.desktop;
}

function MountChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "4px 10px",
        background: "var(--dd-paper-cool)",
        color: "var(--dd-ink-soft)",
        fontFamily: "var(--dd-font-mono)",
        fontSize: 11,
      }}
    >
      #{label}
    </span>
  );
}

function GameIcon({ label }: { label: string }) {
  const asset = GAME_ICON_BY_NAME[label];

  if (!asset) {
    return (
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "var(--dd-paper-grey)",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <img
      src={asset.r2}
      alt=""
      aria-hidden="true"
      style={{
        width: 20,
        height: 20,
        objectFit: "contain",
        flexShrink: 0,
      }}
    />
  );
}

function SubscribeModalSpecimen({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        width: "min(100%, 420px)",
        background: "#ffffff",
        borderRadius: 12,
        border: "1px solid #dcdcdc",
        boxShadow: "0 20px 40px rgba(18, 18, 18, 0.18)",
        overflow: "hidden",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="NYT Games subscription offer"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid #e6e6e6",
          }}
        >
          <div
            style={{
              fontFamily: NYT_GAMES_FONT_STACKS.ui,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--dd-ink-light)",
            }}
          >
            Subscribe
          </div>
          <button
            type="button"
            aria-label="Close subscription offer"
            onClick={onClose}
            style={{
              ...resetButtonStyle,
              width: 28,
              height: 28,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              color: "var(--dd-ink-soft)",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontFamily: NYT_GAMES_FONT_STACKS.headline,
              fontSize: 34,
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--dd-ink-black)",
              marginBottom: 10,
            }}
          >
            New York Times Games
          </div>
          <p
            style={{
              margin: "0 0 14px",
              fontFamily: NYT_GAMES_FONT_STACKS.body,
              fontSize: 15,
              lineHeight: 1.6,
              color: "var(--dd-ink-soft)",
            }}
          >
            Unlock subscriber-only play and the broader Games offering surfaced from the live shell:
            Spelling Bee, archives, app perks, and subscriber routes wired off the same header CTA.
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            {[
              "Unlimited Crossword and archive access",
              "Subscriber-only games like Spelling Bee",
              "App and account actions mirrored from the source shell",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontFamily: NYT_GAMES_FONT_STACKS.ui,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "var(--dd-ink-black)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--dd-ink-black)",
                    marginTop: 7,
                    flexShrink: 0,
                  }}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a
              href="https://www.nytimes.com/subscription/games?campaignId=4QHQ8"
              style={{
                ...linkResetStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 999,
                background: "#121212",
                color: "#ffffff",
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Subscribe
            </a>
            <a
              href="https://www.nytimes.com/subscription/games?source=games.bar1.upgrade"
              style={{
                ...linkResetStyle,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 44,
                padding: "0 18px",
                borderRadius: 999,
                border: "1px solid #121212",
                color: "#121212",
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Upgrade
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderShellSpecimen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);
  const { isMobile } = useNYTGamesDocsViewport();
  const shellStageMinHeight = isMenuOpen ? 720 : isSubscribeOpen ? 360 : undefined;

  return (
    <div style={{ position: "relative", minHeight: shellStageMinHeight }}>
      <div
        style={{
          ...cardStyle,
          overflow: "visible",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            background: "var(--dd-paper-cool)",
            borderBottom: "1px solid var(--dd-paper-grey)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <MountChip label="banner-portal" />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "0 16px",
            minHeight: 44,
            background: "#ffffff",
            borderBottom: "1px solid #e8e8e8",
            fontFamily: NYT_GAMES_FONT_STACKS.ui,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              aria-label="Navigation menu button"
              aria-expanded={isMenuOpen}
              aria-controls="nyt-games-docs-nav-drawer"
              onClick={() => {
                setIsSubscribeOpen(false);
                setIsMenuOpen((value) => !value);
              }}
              style={{
                ...resetButtonStyle,
                width: 28,
                height: 28,
                display: "grid",
                placeItems: "center",
              }}
            >
              <span style={{ display: "grid", gap: isMobile ? 2.5 : 3 }}>
                {[0, 1, 2].map((line) => (
                  <span
                    key={line}
                    style={{
                      width: isMobile ? 15 : 16,
                      height: 2,
                      borderRadius: 999,
                      background: "#121212",
                      display: "block",
                    }}
                  />
                ))}
              </span>
            </button>
            <button
              type="button"
              style={{
                ...resetButtonStyle,
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 12,
                fontWeight: 600,
                color: "var(--dd-ink-soft)",
              }}
            >
              Back
            </button>
            <a href={NYT_GAMES_SOURCE_COMPONENT_DATA.canonicalUrl} style={linkResetStyle}>
              <img
                src={NYT_GAMES_LOGO_ASSET.r2}
                alt="NYT Games"
                style={{
                  width: NYT_GAMES_LOGO_ASSET.display.desktop.width,
                  height: NYT_GAMES_LOGO_ASSET.display.desktop.height,
                  objectFit: NYT_GAMES_LOGO_ASSET.display.desktop.objectFit ?? "contain",
                }}
              />
            </a>
          </div>
          <div
            style={{
              minWidth: isMobile ? 58 : 74,
              minHeight: 26,
              borderRadius: 999,
              border: "1px dashed var(--dd-paper-grey)",
              display: "grid",
              placeItems: "center",
              padding: "0 10px",
              fontFamily: "var(--dd-font-mono)",
              fontSize: 10,
              color: "var(--dd-ink-light)",
            }}
          >
            #js-mobile-toolbar
          </div>
          {!isMobile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <MountChip label="bar1-portal" />
              <MountChip label="nav-variant-experiment" />
            </div>
          ) : null}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isSubscribeOpen}
            onClick={() => {
              setIsMenuOpen(false);
              setIsSubscribeOpen((value) => !value);
            }}
            style={{
              ...resetButtonStyle,
              color: "#ffffff",
              background: "#121212",
              padding: "6px 14px",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.047em",
              textTransform: "uppercase",
            }}
          >
            Subscribe
          </button>
        </div>
      </div>
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <MountChip label="cywp-help-portal" />
        <MountChip label="js-nav-drawer" />
        {isMobile ? <MountChip label="nav-variant-experiment" /> : null}
      </div>
      {isMenuOpen ? (
        <div
          style={{
            position: "absolute",
            top: isMobile ? 60 : 66,
            right: isMobile ? 8 : 16,
            zIndex: 20,
            width: isMobile ? "min(100% - 16px, 320px)" : undefined,
          }}
        >
          <NavigationDrawerSpecimen id="nyt-games-docs-nav-drawer" compact />
        </div>
      ) : null}
      {isSubscribeOpen ? (
        <div
          style={{
            position: "absolute",
            top: isMobile ? 62 : 32,
            right: isMobile ? 8 : 20,
            zIndex: 30,
            width: isMobile ? "min(100% - 16px, 320px)" : undefined,
          }}
        >
          <SubscribeModalSpecimen open={isSubscribeOpen} onClose={() => setIsSubscribeOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function ShellMountsSpecimen() {
  const { shellMounts } = NYT_GAMES_SOURCE_COMPONENT_DATA;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {[
        {
          title: "Header portals",
          detail:
            "Banner, toolbar, experiment, help, and drawer mounts wired around the 44px shell.",
          ids: shellMounts.header,
        },
        {
          title: "Content mounts",
          detail:
            "Hydrated hub root, modal layer, bottom ad box, and the skip-link target after the ad.",
          ids: shellMounts.content,
        },
        {
          title: "Footer/legal mounts",
          detail:
            "Feedback affordance and legal portal are mounted at runtime instead of hardcoded into the docs.",
          ids: shellMounts.footer,
        },
      ].map((group) => (
        <div key={group.title} style={{ ...cardStyle, padding: 16 }}>
          <div
            style={{
              fontFamily: NYT_GAMES_FONT_STACKS.ui,
              fontSize: 15,
              fontWeight: 700,
              color: "var(--dd-ink-black)",
              marginBottom: 6,
            }}
          >
            {group.title}
          </div>
          <p
            style={{
              margin: "0 0 12px",
              fontFamily: NYT_GAMES_FONT_STACKS.body,
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--dd-ink-soft)",
            }}
          >
            {group.detail}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {group.ids.map((id) => (
              <MountChip key={id} label={id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceSectionShell({
  children,
  maxWidth = 960,
}: {
  children: ReactNode;
  maxWidth?: number;
}) {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: isMobile ? 0 : "24px 1%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          justifyContent: isMobile ? "center" : "space-around",
          width: "100%",
          maxWidth: isMobile ? undefined : maxWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SourceSectionHeader({ children }: { children: ReactNode }) {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <h3
      style={{
        margin: isMobile ? "0 0 12px" : "0 0 20px",
        textAlign: "center",
        fontFamily: NYT_GAMES_FONT_STACKS.slab,
        fontSize: 18,
        fontWeight: 700,
        lineHeight: "23.4px",
        color: "#121212",
      }}
    >
      {children}
    </h3>
  );
}

function MonthlyBonusSpecimen() {
  const bonus = NYT_GAMES_SOURCE_COMPONENT_DATA.monthlyBonus;

  return (
    <section style={{ display: "grid", justifyItems: "center" }}>
      <SourceSectionHeader>{bonus.sectionTitle}</SourceSectionHeader>
      <div
        style={{
          position: "relative",
          width: 158,
          maxWidth: "100%",
          height: 220,
          background: "#ffffff",
          border: "1px solid #dcdcdc",
          borderRadius: 7,
          overflow: "hidden",
        }}
      >
        <a href={bonus.href} style={linkResetStyle}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: 10,
              color: "#000000",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                margin: 0,
                width: "100%",
                fontFamily: NYT_GAMES_FONT_STACKS.headline,
                fontSize: 22,
                lineHeight: 1.2,
                color: "#000000",
              }}
            >
              {bonus.title}
            </h3>
            <div
              style={{
                marginTop: 4,
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 14,
                lineHeight: "18.2px",
                color: "#121212",
              }}
            >
              {bonus.date}
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                margin: "0.75em auto",
                position: "relative",
              }}
            >
              <img
                src={bonus.progressAsset.r2}
                alt="Monthly Bonus progress state"
                style={{
                  width: 48,
                  height: 48,
                  objectFit: bonus.progressAsset.display.desktop.objectFit ?? "contain",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: -10,
                  transform: "translateX(-50%)",
                  background: "#121212",
                  color: "#ffffff",
                  borderRadius: 4,
                  padding: "1px 6px",
                  fontFamily: NYT_GAMES_FONT_STACKS.ui,
                  fontSize: 8,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {bonus.ribbonText}
              </div>
            </div>
            <div
              style={{
                width: "100%",
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 12,
                lineHeight: 1.2,
                color: "#121212",
              }}
            >
              <div>{bonus.byline}</div>
              <div>{bonus.editor}</div>
            </div>
          </div>
        </a>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 10,
            background: "#ffffff",
          }}
        >
          <a href={bonus.printHref} style={linkResetStyle}>
            <img
              src={bonus.printAsset.r2}
              alt="Print affordance"
              style={{
                width: bonus.printAsset.display.desktop.width,
                height: bonus.printAsset.display.desktop.height,
                objectFit: bonus.printAsset.display.desktop.objectFit ?? "contain",
              }}
            />
          </a>
        </div>
      </div>
    </section>
  );
}

function ArchivePuzzleCard({
  href,
  printHref,
  dayLabel,
  date,
  progressAsset,
  printAsset,
  mobile,
}: {
  href: string;
  printHref: string;
  dayLabel: string;
  date: string;
  progressAsset: NYTGamesPublicAsset;
  printAsset: NYTGamesPublicAsset;
  mobile?: boolean;
}) {
  const progressDisplay = getAssetDisplaySize(progressAsset, mobile ? "mobile" : "desktop");
  const printDisplay = getAssetDisplaySize(printAsset, "desktop");

  return (
    <div
      style={{
        position: "relative",
        width: 160,
        maxWidth: 160,
        textAlign: "center",
        fontFamily: NYT_GAMES_FONT_STACKS.ui,
      }}
    >
      <a
        href={href}
        style={{
          ...linkResetStyle,
          display: "block",
          width: "100%",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: mobile ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: mobile ? 75 : undefined,
            padding: mobile ? "10px 6px" : "1rem 0.3rem",
            color: "#000000",
          }}
        >
          <h3
            style={{
              margin: 0,
              maxWidth: "100%",
              fontFamily: NYT_GAMES_FONT_STACKS.headline,
              fontSize: 18,
              lineHeight: "23.4px",
              whiteSpace: mobile ? "normal" : "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              alignSelf: mobile ? "flex-start" : "center",
              marginLeft: mobile ? 10 : 0,
              order: mobile ? 1 : 0,
            }}
          >
            {dayLabel}
          </h3>
          <div
            style={{
              position: mobile ? "absolute" : "static",
              top: mobile ? 39 : undefined,
              left: mobile ? 70 : undefined,
              fontSize: 14,
              lineHeight: "18.2px",
              color: "#121212",
            }}
          >
            {date}
          </div>
          <div
            style={{
              order: mobile ? 0 : 0,
              width: progressDisplay.width,
              minWidth: progressDisplay.width,
              height: progressDisplay.height,
              margin: mobile ? 0 : ".3em auto .5em",
              position: "relative",
            }}
          >
            <img
              src={progressAsset.r2}
              alt={`${dayLabel} progress state`}
              style={{
                width: progressDisplay.width,
                height: progressDisplay.height,
                objectFit: progressDisplay.objectFit ?? "contain",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "50%",
                bottom: -5,
                transform: "translateX(-50%)",
                background: "#121212",
                color: "#ffffff",
                borderRadius: 4,
                padding: "1px 6px",
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 8,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Play
            </span>
          </div>
        </div>
      </a>
      {!mobile ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "#ffffff",
            paddingBottom: 10,
          }}
        >
          <a href={printHref} style={linkResetStyle}>
            <img
              src={printAsset.r2}
              alt="Print affordance"
              style={{
                width: printDisplay.width,
                height: printDisplay.height,
                objectFit: printDisplay.objectFit ?? "contain",
              }}
            />
          </a>
        </div>
      ) : (
        <div
          style={{
            height: 10,
          }}
        />
      )}
    </div>
  );
}

function RecentlyTabbedSpecimen() {
  const recent = NYT_GAMES_SOURCE_COMPONENT_DATA.recentlyTabbed;
  const [mobileOpenTab, setMobileOpenTab] = useState<RecentTabKey>("last-7-days");
  const [desktopActiveTab, setDesktopActiveTab] = useState<RecentTabKey>("last-7-days");
  const { isMobile } = useNYTGamesDocsViewport();

  const inProgressItems = recent.items.slice(0, 4).map((item, index) => ({
    ...item,
    progressAsset:
      [
        NYT_GAMES_PROGRESS_ASSETS.states[4],
        NYT_GAMES_PROGRESS_ASSETS.states[8],
        NYT_GAMES_PROGRESS_ASSETS.states[12],
        NYT_GAMES_PROGRESS_ASSETS.goldStar,
      ][index] ?? item.progressAsset,
  }));

  const desktopItems = desktopActiveTab === "last-7-days" ? recent.items : inProgressItems;
  const showArchiveLink = desktopActiveTab === "last-7-days";

  if (isMobile) {
    return (
      <div
        style={{
          width: "100%",
          marginBottom: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {[
          { key: "last-7-days" as const, label: recent.mobileTitle },
          { key: "in-progress" as const, label: "In Progress" },
        ].map((section, index) => {
          const isOpen = mobileOpenTab === section.key;
          const items = section.key === "last-7-days" ? recent.items : inProgressItems;

          return (
            <div
              key={section.key}
              style={{
                borderTop: index === 0 ? "none" : "1px solid var(--dd-paper-grey)",
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setMobileOpenTab(section.key)}
                style={{
                  ...resetButtonStyle,
                  width: "100%",
                  height: 44,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  fontFamily: NYT_GAMES_FONT_STACKS.slab,
                  fontWeight: 700,
                  borderTop: index === 0 ? "1px solid #dcdcdc" : "none",
                  borderBottom: "1px solid #dcdcdc",
                  background: "#ffffff",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    color: "#000000",
                  }}
                >
                  {section.label}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    right: 0,
                    width: 44,
                    textAlign: "center",
                    fontSize: 20,
                    lineHeight: "44px",
                    color: "#dcdcdc",
                    transform: isOpen ? "rotate(-135deg)" : "rotate(0deg)",
                    transition: "transform 160ms ease",
                  }}
                >
                  +
                </span>
              </button>
              {isOpen ? (
                <div
                  style={{
                    background: "#fafafa",
                    padding: "10px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      justifyContent: "center",
                      width: 160,
                      margin: "0 auto",
                      padding: 10,
                    }}
                  >
                    {items.map((item) => (
                      <ArchivePuzzleCard
                        key={`${section.key}-${item.id}`}
                        href={item.href}
                        printHref={item.printHref}
                        dayLabel={item.mobileLabel}
                        date={item.date}
                        progressAsset={item.progressAsset}
                        printAsset={recent.printAsset}
                        mobile
                      />
                    ))}
                    {section.key === "last-7-days" ? (
                      <a
                        href={recent.archiveHref}
                        style={{
                          fontSize: 13,
                          lineHeight: "28px",
                          fontFamily: NYT_GAMES_FONT_STACKS.ui,
                          fontWeight: 700,
                          textDecoration: "none",
                          color: "#000000",
                          padding: "0 12px",
                          borderRadius: 13,
                          alignSelf: "center",
                        }}
                      >
                        PLAY MORE FROM THE ARCHIVE
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "70%",
        marginTop: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 38,
          background: "#f4f4f4",
          border: "1px solid #dcdcdc",
          borderRadius: 3,
        }}
      >
        <div style={{ padding: "0 20px" }}>
          {recent.desktopTabs.map((tab, index) => {
            const tabKey: RecentTabKey = index === 0 ? "last-7-days" : "in-progress";
            const isActive = desktopActiveTab === tabKey;

            return (
              <button
                type="button"
                key={tab}
                onClick={() => setDesktopActiveTab(tabKey)}
                aria-pressed={isActive}
                style={{
                  ...resetButtonStyle,
                  display: "inline-block",
                  position: "relative",
                  height: 36,
                  lineHeight: "38px",
                  padding: "0 5%",
                  maxWidth: "33.3333%",
                  fontFamily: NYT_GAMES_FONT_STACKS.ui,
                  fontSize: 16,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#000000" : "#959595",
                  background: "transparent",
                  textAlign: "center",
                  cursor: "pointer",
                  width: "50%",
                }}
              >
                <span
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {tab}
                </span>
                {isActive ? (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -1,
                      left: 0,
                      right: 0,
                      padding: "0 5px",
                      border: "1px solid #dcdcdc",
                      borderBottom: 0,
                      borderRadius: "3px 3px 0 0",
                      height: 45,
                      lineHeight: "52px",
                      color: "#000000",
                      background: "#ffffff",
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {tab}
                    </span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          minHeight: 162,
          width: "100%",
          overflow: "hidden",
        }}
      >
        {desktopItems.map((item) => (
          <ArchivePuzzleCard
            key={`${desktopActiveTab}-${item.id}`}
            href={item.href}
            printHref={item.printHref}
            dayLabel={item.desktopLabel}
            date={item.date}
            progressAsset={item.progressAsset}
            printAsset={recent.printAsset}
          />
        ))}
      </div>
      <div
        style={{
          paddingTop: 8,
          textAlign: "center",
          fontFamily: NYT_GAMES_FONT_STACKS.ui,
        }}
      >
        {showArchiveLink ? (
          <a
            href={recent.archiveHref}
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#000000",
              textDecoration: "none",
              padding: "0 12px",
              lineHeight: "28px",
              height: 28,
              borderRadius: 13,
              display: "inline-block",
              maxWidth: 250,
              textAlign: "center",
            }}
          >
            PLAY MORE FROM THE ARCHIVE
          </a>
        ) : (
          <span
            style={{
              fontSize: 12,
              color: "var(--dd-ink-light)",
            }}
          >
            Representative in-progress states rendered with the mirrored source progress assets.
          </span>
        )}
      </div>
    </div>
  );
}

function FeaturedArticleSpecimen() {
  const article = NYT_GAMES_SOURCE_COMPONENT_DATA.featuredArticle;
  const { isMobile } = useNYTGamesDocsViewport();
  const illustration = getAssetDisplaySize(article.image, isMobile ? "mobile" : "desktop");

  return (
    <div
      data-testid="nyt-games-featured-article-section"
      style={{
        width: "100%",
        maxWidth: isMobile ? 378 : 918,
        marginTop: isMobile ? 30 : 0,
      }}
    >
      <div
        style={{
          padding: isMobile ? "20px 0 0" : "10px 0 0",
        }}
      >
        <a
          data-testid="nyt-games-featured-article-card"
          href={article.href}
          style={{
            ...linkResetStyle,
            display: "block",
            width: "calc(100% - 28px)",
            margin: "0 14px",
            minHeight: isMobile ? undefined : 260,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #dcdcdc",
          }}
        >
          <div
            style={{
              display: isMobile ? "block" : "grid",
              gridTemplateColumns: isMobile ? undefined : "63% 37%",
              minHeight: isMobile ? undefined : 260,
            }}
          >
            <img
              src={article.image.r2}
              alt={article.title}
              style={{
                display: "block",
                width: "100%",
                height: isMobile ? 260 : illustration.height,
                objectFit: illustration.objectFit ?? "cover",
                objectPosition: illustration.backgroundPosition ?? "left",
              }}
            />
            <div
              style={{
                width: isMobile ? "auto" : "100%",
                padding: "26px 20px",
                background: "#ffffff",
                minHeight: isMobile ? undefined : "100%",
                fontFamily: NYT_GAMES_FONT_STACKS.body,
                fontSize: 16,
                lineHeight: "20.8px",
                color: "#959595",
              }}
            >
              <div
                style={{
                  fontFamily: NYT_GAMES_FONT_STACKS.ui,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#959595",
                  marginBottom: 8,
                }}
              >
                {article.sectionTitle}
              </div>
              <h2
                style={{
                  margin: "0 0 12px",
                  fontFamily: NYT_GAMES_FONT_STACKS.headline,
                  fontSize: 28,
                  lineHeight: 1.1,
                  color: "#000000",
                  textAlign: "left",
                }}
              >
                How to Solve <br />
                The New York Times Crossword
              </h2>
              <p style={{ margin: "0 0 0.5rem" }}>{article.kicker}</p>
              <p style={{ margin: 0 }}>
                {article.description}{" "}
                <span
                  style={{
                    color: "#2860d8",
                    display: "inline-block",
                  }}
                >
                  {article.linkText}
                </span>
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}

function CombinedProgressSectionSpecimen() {
  const { isMobile } = useNYTGamesDocsViewport();

  return (
    <SourceSectionShell maxWidth={960}>
      {!isMobile ? (
        <div style={{ display: "block" }}>
          <MonthlyBonusSpecimen />
        </div>
      ) : null}
      <NYTGamesDocsAnchorSection
        id="recently-tabbed"
        label="C. Recently Tabbed / Last 7 Days"
        sourceComponentName="Accordion / MobileStatsCard / Progress"
        style={{
          width: isMobile ? "100%" : "70%",
          marginTop: isMobile ? 0 : 24,
        }}
      >
        <RecentlyTabbedSpecimen />
      </NYTGamesDocsAnchorSection>
    </SourceSectionShell>
  );
}

function FeaturedArticleSectionSpecimen() {
  return (
    <SourceSectionShell maxWidth={960}>
      <FeaturedArticleSpecimen />
    </SourceSectionShell>
  );
}

function CrossplayCTASpecimen() {
  const cta = NYT_GAMES_SOURCE_COMPONENT_DATA.crossplayCta;
  const banner = cta.banner.display.desktop;
  const { isMobile } = useNYTGamesDocsViewport();
  const primaryIcon = getAssetDisplaySize(cta.primaryIcon, "desktop");
  const inlineStrip = getAssetDisplaySize(cta.inlineStrip, "desktop");

  return (
    <div style={{ ...cardStyle, overflow: "hidden", maxWidth: isMobile ? 288 : 320 }}>
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--dd-paper-grey)",
          background: "#ffffff",
          display: "grid",
          gap: 12,
        }}
      >
        <img
          src={cta.inlineStrip.r2}
          alt="NYT Games app strip"
          style={{
            width: inlineStrip.width,
            height: inlineStrip.height,
            objectFit: inlineStrip.objectFit ?? "contain",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px minmax(0, 1fr)",
            gap: 12,
            alignItems: "start",
          }}
        >
          <img
            src={cta.primaryIcon.r2}
            alt="Crossplay app icon"
            style={{
              width: primaryIcon.width,
              height: primaryIcon.height,
              objectFit: primaryIcon.objectFit ?? "contain",
            }}
          />
          <div>
            <div
              style={{
                fontFamily: NYT_GAMES_FONT_STACKS.headline,
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1,
                color: "var(--dd-ink-black)",
                marginBottom: 8,
              }}
            >
              {cta.title}
            </div>
            <p
              style={{
                margin: "0 0 10px",
                fontFamily: NYT_GAMES_FONT_STACKS.body,
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--dd-ink-soft)",
              }}
            >
              {cta.description}
            </p>
            <Link
              href={cta.href}
              style={{
                fontFamily: NYT_GAMES_FONT_STACKS.ui,
                fontSize: 14,
                fontWeight: 700,
                color: "#2860d8",
                textDecoration: "underline",
              }}
            >
              {cta.linkText}
            </Link>
          </div>
        </div>
      </div>
      <img
        src={cta.banner.r2}
        alt="Crossplay banner"
        style={{
          width: "100%",
          height: banner.height,
          objectFit: banner.objectFit ?? "cover",
          display: "block",
        }}
      />
      <div style={{ padding: 16, background: "#ffffff" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {cta.hamburgerIcons.map((icon) => {
            const display = getAssetDisplaySize(icon, "mobile");
            return (
              <img
                key={icon.file}
                src={icon.r2}
                alt=""
                aria-hidden="true"
                style={{
                  width: display.width,
                  height: display.height,
                  objectFit: display.objectFit ?? "contain",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NavigationDrawerSpecimen({
  id,
  compact = false,
}: {
  id?: string;
  compact?: boolean;
}) {
  const { isMobile } = useNYTGamesDocsViewport();
  const collapsibleNames = HUB.navDrawer.groups.flatMap((group) =>
    group.links
      .filter((link) => "collapsible" in link && link.collapsible)
      .map((link) => link.name),
  );
  const [expandedNames, setExpandedNames] = useState<string[]>([]);
  const allExpanded = collapsibleNames.length > 0 && collapsibleNames.every((name) => expandedNames.includes(name));

  const toggleExpanded = (name: string) => {
    setExpandedNames((current) =>
      current.includes(name) ? current.filter((value) => value !== name) : [...current, name],
    );
  };

  const toggleExpandAll = () => {
    setExpandedNames(allExpanded ? [] : collapsibleNames);
  };

  return (
    <div
      id={id}
      style={{
        ...cardStyle,
        width: compact ? (isMobile ? 320 : 360) : "min(100%, 360px)",
        maxHeight: compact ? 540 : undefined,
        overflow: "hidden auto",
      }}
    >
      <div style={{ padding: 16, borderBottom: "1px solid var(--dd-paper-grey)" }}>
        <CrossplayCTASpecimen />
      </div>
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        {HUB.navDrawer.groups.map((group, index) => (
          <div key={`${group.label ?? "cross-links"}-${index}`}>
            {group.label ? (
              <div
                style={{
                  fontFamily: NYT_GAMES_FONT_STACKS.ui,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--dd-ink-light)",
                  marginBottom: 8,
                }}
              >
                {group.label}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 8 }}>
              {group.links.map((link) => {
                const isCollapsible = "collapsible" in link && link.collapsible;
                const isExpanded = expandedNames.includes(link.name);

                return (
                  <div key={link.name} style={{ display: "grid", gap: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minHeight: 32,
                        fontFamily: NYT_GAMES_FONT_STACKS.ui,
                      }}
                    >
                      {"icon" in link && link.icon ? <GameIcon label={link.name} /> : null}
                      <a
                        href={link.href}
                        style={{
                          ...linkResetStyle,
                          flex: 1,
                          fontSize: 15,
                          color: "var(--dd-ink-black)",
                        }}
                      >
                        {link.name}
                      </a>
                      {"badge" in link && link.badge ? (
                        <span
                          style={{
                            borderRadius: 6,
                            background: "#363636",
                            color: "#ffffff",
                            padding: "4px 7px",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {link.badge}
                        </span>
                      ) : null}
                      {isCollapsible ? (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => toggleExpanded(link.name)}
                          style={{
                            ...resetButtonStyle,
                            fontFamily: "var(--dd-font-mono)",
                            fontSize: 11,
                            color: "var(--dd-ink-light)",
                          }}
                        >
                          {isExpanded ? "collapse" : "expand"}
                        </button>
                      ) : null}
                    </div>
                    {isCollapsible && isExpanded ? (
                      <div
                        style={{
                          marginLeft: 30,
                          borderLeft: "1px solid var(--dd-paper-grey)",
                          paddingLeft: 12,
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <a
                          href={link.href}
                          style={{
                            ...linkResetStyle,
                            fontFamily: NYT_GAMES_FONT_STACKS.ui,
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--dd-ink-black)",
                          }}
                        >
                          Open {link.name}
                        </a>
                        <span
                          style={{
                            fontFamily: "var(--dd-font-mono)",
                            fontSize: 10,
                            color: "var(--dd-ink-light)",
                          }}
                        >
                          Source snapshot captured this entry in its collapsed state.
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={toggleExpandAll}
          style={{
            ...resetButtonStyle,
            width: "100%",
            paddingTop: 12,
            borderTop: "1px solid var(--dd-paper-grey)",
            fontFamily: NYT_GAMES_FONT_STACKS.ui,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--dd-ink-light)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            textAlign: "center",
          }}
        >
          {allExpanded ? "− Collapse All" : "+ Expand All"}
        </button>
      </div>
    </div>
  );
}

function BottomAdSpecimen() {
  return (
    <div style={{ ...cardStyle, padding: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <MountChip label="ad-bottom" />
        <MountChip label="after-bottom" />
      </div>
      <div
        style={{
          minHeight: 94,
          borderRadius: 8,
          border: "1px dashed var(--dd-paper-grey)",
          background: "var(--dd-paper-cool)",
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--dd-font-mono)",
          fontSize: 12,
          color: "var(--dd-ink-light)",
          marginBottom: 12,
        }}
      >
        Bottom ad box
      </div>
      <a
        href="#after-bottom"
        style={{
          fontFamily: "var(--dd-font-ui)",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--dd-ink-black)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textDecoration: "underline",
        }}
      >
        Skip ad
      </a>
    </div>
  );
}

function FooterSpecimen() {
  const { isMobile } = useNYTGamesDocsViewport();
  const about = HUB.footerSections.about;
  const games = HUB.footerSections.gamesCol.links;
  const crosswords = HUB.footerSections.crosswordsCol.links;
  const community = HUB.footerSections.communityCol.links;
  const learnMore = HUB.footerSections.learnMoreCol.links;

  return (
    <div
      style={{
        background: HUB.footer.bg,
        borderRadius: 8,
        padding: "28px 24px 16px",
        fontFamily: NYT_GAMES_FONT_STACKS.ui,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "minmax(0, 1.6fr) minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.75px",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {about.heading}
          </div>
          <p
            style={{
              margin: "0 0 12px",
              fontFamily: NYT_GAMES_FONT_STACKS.body,
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--dd-ink-soft)",
            }}
          >
            {about.text}
          </p>
          <a
            href={about.cta.href}
            style={{
              fontFamily: NYT_GAMES_FONT_STACKS.body,
              fontSize: 15,
              color: "var(--dd-ink-black)",
              textDecoration: "underline",
            }}
          >
            {about.cta.text}
          </a>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.75px",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {HUB.footerSections.gamesCol.heading}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {games.map((link) => (
              <div key={link.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <GameIcon label={link.name} />
                <a href={link.href} style={{ ...linkResetStyle, fontSize: 14, color: "var(--dd-ink-black)" }}>
                  {link.name}
                </a>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.75px",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            Crosswords + Community
          </div>
          <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
            {crosswords.map((link) => (
              <a
                key={link.name}
                href={link.href}
                style={{ ...linkResetStyle, fontSize: 14, color: "var(--dd-ink-black)" }}
              >
                {link.name}
              </a>
            ))}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.75px",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            Community
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {community.map((link) => (
              <a
                key={link.name}
                href={link.href}
                style={{ ...linkResetStyle, fontSize: 14, color: "var(--dd-ink-black)" }}
              >
                {link.name}
              </a>
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.75px",
              color: "var(--dd-ink-soft)",
              marginBottom: 10,
            }}
          >
            {HUB.footerSections.learnMoreCol.heading}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {learnMore.map((link) => (
              <a
                key={link.name}
                href={link.href}
                style={{ ...linkResetStyle, fontSize: 14, color: "var(--dd-ink-black)" }}
              >
                {link.name}
              </a>
            ))}
            <span style={{ fontSize: 14, color: "var(--dd-ink-black)" }}>
              <MountChip label="js-feedback-link" />
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          paddingTop: 14,
          borderTop: "1px solid var(--dd-paper-grey)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--dd-font-mono)",
            fontSize: 11,
            color: "var(--dd-ink-light)",
          }}
        >
          Legal/consent content is injected at runtime via the footer portal.
        </div>
        <MountChip label="js-portal-footer-legal" />
      </div>
    </div>
  );
}

export default function HubComponents({ SectionLabel }: GameSectionProps) {
  return (
    <section id="hub-page-components" style={{ marginBottom: 48, scrollMarginTop: 28 }}>
      <SectionLabel>Hub Page Components</SectionLabel>
      <p
        style={{
          fontFamily: "var(--dd-font-body)",
          fontSize: 14,
          color: "var(--dd-ink-soft)",
          margin: "0 0 24px",
          lineHeight: 1.6,
        }}
      >
        Source-faithful specimens from the supplied NYT Games hub HTML/CSS snapshot. Media shown
        below uses the mirrored R2 asset set documented in the resources tab.
      </p>

      <NYTGamesDocsAnchorSection
        id="header-shell-and-portal-targets"
        label="A. Header Shell & Portal Targets"
        sourceComponentName="Welcome / shell mounts"
      >
        <h4 style={sectionHeadingStyle}>A. Header Shell & Portal Targets</h4>
        <p style={captionStyle}>
          `header.pz-header` + `div.pz-nav` with hamburger, hybrid back button, logo, subscribe CTA,
          toolbar slot, banner portal, bar1 portal, nav variant container, CYWP help portal, and
          nav drawer mount. Hamburger opens the mirrored drawer specimen; Subscribe opens the docs
          popup replica.
        </p>
        <div style={{ display: "grid", gap: 16, marginBottom: 32 }}>
          <HeaderShellSpecimen />
          <ShellMountsSpecimen />
        </div>
      </NYTGamesDocsAnchorSection>

      <NYTGamesDocsAnchorSection
        id="monthly-bonus"
        label="B. Monthly Bonus Island"
        sourceComponentName="PuzzleGroup / Progress"
      >
        <h4 style={sectionHeadingStyle}>B. Monthly Bonus Island</h4>
        <p style={captionStyle}>
          <code>white section__section {" > "} .section__container</code> pairing the fixed{" "}
          <code>158×220</code> Monthly Bonus island with the live Recently Tabbed module. Mobile
          mode follows the source responsive behavior and drops the island entirely.
        </p>
        <div style={{ marginBottom: 32 }}>
          <CombinedProgressSectionSpecimen />
        </div>
      </NYTGamesDocsAnchorSection>

      <NYTGamesDocsAnchorSection
        id="featured-article"
        label="D. Featured Article"
        sourceComponentName="GuidePromo"
      >
        <h4 style={sectionHeadingStyle}>D. Featured Article</h4>
        <p style={captionStyle}>
          <code>
            white section__section {" > "} .section__container {" > "} .hub-guide-promo-section
          </code>{" "}
          for <code>How to Solve The New York Times Crossword</code>, using the mirrored guide
          illustration and inline <code>Read More</code> styling.
        </p>
        <div style={{ marginBottom: 32 }}>
          <FeaturedArticleSectionSpecimen />
        </div>
      </NYTGamesDocsAnchorSection>

      <NYTGamesDocsAnchorSection
        id="navigation-drawer-crossplay-cta"
        label="E. Navigation Drawer & Crossplay CTA"
        sourceComponentName="PromoCard / GamesSection"
      >
        <h4 style={sectionHeadingStyle}>E. Navigation Drawer & Crossplay CTA</h4>
        <p style={captionStyle}>
          Games-group ordering follows the live drawer. Source-backed game icons replace the prior
          placeholder glyphs, the `+ Expand All` control is interactive, and collapsible game rows
          open within the specimen.
        </p>
        <div style={{ marginBottom: 32 }}>
          <NavigationDrawerSpecimen />
        </div>
      </NYTGamesDocsAnchorSection>

      <NYTGamesDocsAnchorSection
        id="bottom-ad-box-and-skip-target"
        label="F. Bottom Ad Box & Skip Target"
        sourceComponentName="LoadingCard / SponsoredCard"
      >
        <h4 style={sectionHeadingStyle}>F. Bottom Ad Box & Skip Target</h4>
        <p style={captionStyle}>
          Content shell mounts after `#hub-root`: `#hub-modal`, the bottom ad box, and the skip-link
          target mounted immediately after it.
        </p>
        <div style={{ marginBottom: 32 }}>
          <BottomAdSpecimen />
        </div>
      </NYTGamesDocsAnchorSection>

      <NYTGamesDocsAnchorSection
        id="production-footer"
        label="G. Production Footer"
        sourceComponentName="WordplayLink / footer portals"
      >
        <h4 style={sectionHeadingStyle}>G. Production Footer</h4>
        <p style={captionStyle}>
          Footer structure from source: About, New York Times Games, Crosswords + Community, Learn
          More, feedback slot, and the runtime legal portal.
        </p>
        <FooterSpecimen />
      </NYTGamesDocsAnchorSection>
    </section>
  );
}

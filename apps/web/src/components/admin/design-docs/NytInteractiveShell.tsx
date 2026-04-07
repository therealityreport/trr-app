"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContentBlock } from "@/lib/admin/design-docs-config";

type SiteHeaderShellBlock = Extract<ContentBlock, { type: "site-header-shell" }>;
type StorylineBlock = Extract<ContentBlock, { type: "storyline" }>;

const T_LOGO_PATH =
  "M43.6284633,34.8996508 C41.83393,39.6379642 38.53153,43.2989842 33.7932167,45.2371375 L33.7932167,34.8996508 L39.46463,29.8027175 L33.7932167,24.7777375 L33.7932167,17.6709842 C38.9621033,17.3120775 42.5514567,13.5074375 42.5514567,8.84136417 C42.5514567,2.73966417 36.7369967,0.5859375 33.4345967,0.5859375 C32.71707,0.5859375 31.9270167,0.5859375 30.7789167,0.872890833 L30.7789167,1.16013083 C31.20949,1.16013083 31.8550633,1.08846417 32.0709233,1.08846417 C34.36827,1.08846417 36.0911367,2.16518417 36.0911367,4.2469575 C36.0911367,5.82620417 34.7988433,7.40545083 32.5017833,7.40545083 C26.83037,7.40545083 20.15419,2.81133083 12.9038167,2.81133083 C6.44292333,2.81133083 1.99242333,7.6207375 1.99242333,12.5023842 C1.99242333,17.3120775 4.79201,18.8913242 7.73521667,19.9680442 L7.80717,19.6808042 C6.87378333,19.1066108 6.22763667,18.1018442 6.22763667,16.5223108 C6.22763667,14.3688708 8.23774333,12.5743375 10.7503767,12.5743375 C16.8520767,12.5743375 26.68675,17.6709842 32.7887367,17.6709842 L33.36293,17.6709842 L33.36293,24.8496908 L27.6918033,29.8027175 L33.36293,34.8996508 L33.36293,45.3804708 C30.9942033,46.2416175 28.5532367,46.6010975 26.0406033,46.6010975 C16.5648367,46.6010975 10.53509,40.8577308 10.53509,31.3102975 C10.53509,29.0135242 10.8220433,26.7878442 11.46819,24.6341175 L16.20593,22.5526308 L16.20593,43.6576042 L25.8253167,39.4226775 L25.8253167,17.8146042 L11.6834767,24.1315908 C13.1191033,19.9680442 16.06231,16.9531708 19.5799967,15.2303042 L19.50833,15.0150175 C10.0322767,17.0967908 0.84375,24.2754975 0.84375,35.0432708 C0.84375,47.4622442 11.32457,56.0768642 23.5285433,56.0768642 C36.4497567,56.0768642 43.7720833,47.4622442 43.84375,34.8996508 L43.6284633,34.8996508 Z";

function IconButton({
  label,
  children,
  onClick,
  expanded,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  expanded?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      data-testid={testId}
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        padding: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#121212",
      }}
    >
      {children}
    </button>
  );
}

function MenuIcon() {
  return (
    <svg width="17" height="14" viewBox="0 0 17 14" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="17" height="2" rx="0.5" fill="#121212" />
      <rect x="0" y="6" width="17" height="2" rx="0.5" fill="#121212" />
      <rect x="0" y="12" width="17" height="2" rx="0.5" fill="#121212" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="#121212" strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="15" y2="15" stroke="#121212" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="13" height="8" viewBox="0 0 13 8" fill="none" aria-hidden="true">
      <polygon fill="#121212" points="6.5,8 0,1.4 1.4,0 6.5,5.2 11.6,0 13,1.4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 25 24" fill="none" aria-hidden="true">
      <path d="M9.90283 3L8 5.115L14.1808 12L8 18.885L9.90283 21L18 12L9.90283 3Z" fill="#666666" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M2 2l11 11" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" stroke="#111" />
      <path d="M13 2L2 13" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="square" stroke="#111" />
    </svg>
  );
}

function NytGlyph({ size = 44 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 57" width={size} height={(size * 57) / 44} aria-hidden="true">
      <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
        <g fill="var(--color-content-primary,#121212)">
          <path d={T_LOGO_PATH} />
        </g>
      </g>
    </svg>
  );
}

function NytWordmark() {
  return (
    <div
      aria-label="The New York Times"
      style={{
        fontFamily:
          'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
        fontSize: 22,
        fontWeight: 700,
        color: "#121212",
        letterSpacing: "-0.02em",
        whiteSpace: "nowrap",
      }}
    >
      The New York Times
    </div>
  );
}

export function NytStorylineRail({ block }: { block: StorylineBlock }) {
  return (
    <div
      className="css-1gwp8pp"
      data-testid="nyt-storyline-rail"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        minHeight: 55,
        position: "relative",
        borderBottom: "1px solid #dfdfdf",
        overflowX: "auto",
        marginBottom: 16,
      }}
    >
      <span
        className="css-1aygtno"
        style={{
          display: "inline-flex",
          alignItems: "center",
          flexShrink: 0,
          paddingInline: 12,
        }}
      >
        <Link
          href="/"
          data-testid="tlogo-home-link"
          aria-label="The New York Times Home Page"
          style={{ display: "inline-flex", color: "#121212" }}
        >
          <NytGlyph size={34} />
        </Link>
      </span>
      <nav
        className="css-34mlm7"
        aria-labelledby="storyline-menu-title"
        role="navigation"
        style={{
          display: "flex",
          alignItems: "baseline",
          minWidth: "max-content",
          paddingLeft: 8,
          paddingRight: 16,
        }}
      >
        <p id="storyline-menu-title" style={{ margin: 0, padding: "0 15px 0 0", flexShrink: 0 }}>
          <span
            data-testid="nyt-storyline-title"
            style={{
              fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
              fontSize: 15,
              fontWeight: 700,
              lineHeight: "15px",
              color: "#121212",
              display: "flex",
              paddingRight: 15,
              marginRight: 16,
            }}
          >
            {block.title}
          </span>
        </p>
        <ul
          className="css-go3nob"
          aria-labelledby="storyline-menu-title"
          style={{
            display: "flex",
            alignItems: "baseline",
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {block.links.map((item) => (
            <li
              className="css-1qej4jr"
              key={item.href}
              style={{
                marginRight: 22.4,
                minHeight: 48,
                display: "flex",
                alignItems: "center",
              }}
            >
              <a
                className="css-etxl5s"
                href={item.href}
                style={{
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: "14px",
                  color: "#121212",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default function NytInteractiveShell({ block }: { block: SiteHeaderShellBlock }) {
  const [activePanel, setActivePanel] = useState<"menu" | "search" | "account" | null>(null);
  const [expandedSection, setExpandedSection] = useState(block.menuSections[0]?.label ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!activePanel) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanel(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activePanel]);

  const expandedMenuSection =
    block.menuSections.find((section) => section.label === expandedSection) ?? null;

  const filteredSearchLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return block.searchPanel.links;
    return block.searchPanel.links.filter((entry) =>
      `${entry.label} ${entry.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [block.searchPanel.links, searchQuery]);

  return (
    <>
      <div
        id="interactive-masthead-spacer"
        className="css-1xltzhg"
        data-testid="interactive-masthead-spacer"
        style={{ height: block.mastheadSpacerHeight }}
      />

      <div
        data-testid="nyt-site-header-shell"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "#ffffff",
          borderBottom: "1px solid #dfdfdf",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "8px 16px",
            minHeight: 52,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 100 }}>
            <IconButton
              label="Open section navigation"
              expanded={activePanel === "menu"}
              onClick={() => setActivePanel((value) => (value === "menu" ? null : "menu"))}
              testId="nyt-shell-menu-button"
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              label="Open search"
              expanded={activePanel === "search"}
              onClick={() => setActivePanel((value) => (value === "search" ? null : "search"))}
              testId="nyt-shell-search-button"
            >
              <SearchIcon />
            </IconButton>
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <NytWordmark />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140, justifyContent: "flex-end" }}>
            <a
              href={block.subscribeHref}
              style={{
                fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                background: "#326891",
                color: "#ffffff",
                borderRadius: 3,
                padding: "8px 12px",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {block.subscribeLabel}
            </a>
            <button
              type="button"
              aria-label={block.accountLabel}
              aria-expanded={activePanel === "account"}
              data-testid="nyt-shell-account-button"
              onClick={() => setActivePanel((value) => (value === "account" ? null : "account"))}
              style={{
                border: "none",
                background: "transparent",
                fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: "#121212",
                cursor: "pointer",
                padding: 0,
                whiteSpace: "nowrap",
              }}
            >
              {block.accountLabel}
            </button>
          </div>
        </div>
      </div>

      {activePanel === "menu" ? (
        <div
          className="ReactModal__Overlay ReactModal__Overlay--after-open css-175c5mb"
          data-testid="nyt-shell-menu-overlay"
          onClick={() => setActivePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 1000000110,
            padding: 24,
          }}
        >
          <div
            className="ReactModal__Content ReactModal__Content--after-open css-1olcfji"
            id="desktop-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Section Navigation"
            data-testid="desktop-nav"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: "#ffffff",
              width: "min(1180px, calc(100vw - 48px))",
              maxHeight: "calc(100vh - 48px)",
              overflow: "auto",
              margin: "0 auto",
              borderRadius: 6,
              padding: 24,
              position: "relative",
            }}
          >
            <nav data-testid="desktop-nav-inner">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
                <h1
                  style={{
                    margin: 0,
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#121212",
                  }}
                >
                  Section Navigation
                </h1>
                <button
                  id="close-modal"
                  aria-label="Close Section Navigation"
                  type="button"
                  onClick={() => setActivePanel(null)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 6,
                  }}
                >
                  <CloseIcon />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 24 }}>
                <div>
                  <ul id="mainList" style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
                    <li>
                      <Link
                        href="/"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          textDecoration: "none",
                          color: "#121212",
                          fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                          fontSize: 18,
                          fontWeight: 700,
                          padding: "8px 0 14px",
                        }}
                      >
                        Home <NytGlyph size={14} />
                      </Link>
                    </li>
                    {block.menuSections.map((section) => {
                      const isExpanded = section.label === expandedSection;
                      return (
                        <li key={section.label}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr auto",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 0",
                            }}
                          >
                            <a
                              className="css-z0hyu"
                              href={section.href}
                              style={{
                                textDecoration: "none",
                                color: "#121212",
                                fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                fontSize: 16,
                                fontWeight: isExpanded ? 700 : 500,
                              }}
                            >
                              {section.label}
                            </a>
                            <button
                              type="button"
                              aria-label={`Open ${section.label} submenu`}
                              aria-expanded={isExpanded}
                              data-testid={`menu-toggle-${section.label}`}
                              onClick={() =>
                                setExpandedSection((current) => (current === section.label ? "" : section.label))
                              }
                              style={{
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                padding: 4,
                                transform: isExpanded ? "rotate(180deg)" : undefined,
                              }}
                            >
                              <ChevronDown />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {expandedMenuSection ? (
                  <div
                    aria-label={`${expandedMenuSection.label} submenu`}
                    data-testid={`hamburger-pane-${expandedMenuSection.label}`}
                    style={{
                      borderLeft: "1px solid #e5e5e5",
                      paddingLeft: 24,
                    }}
                  >
                    <a
                      href={expandedMenuSection.href}
                      style={{
                        display: "inline-block",
                        marginBottom: 18,
                        textDecoration: "none",
                        color: "#121212",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontFamily:
                            'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
                          fontSize: 30,
                          fontWeight: 500,
                        }}
                      >
                        {expandedMenuSection.label}
                      </h2>
                    </a>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${Math.max(expandedMenuSection.columns.length, 1)}, minmax(0, 1fr))`,
                        gap: 20,
                        marginBottom: expandedMenuSection.promoGroups?.length ? 28 : 0,
                      }}
                    >
                      {expandedMenuSection.columns.map((column, index) => (
                        <div key={`${expandedMenuSection.label}-column-${index}`}>
                          {column.heading ? (
                            <h3
                              style={{
                                margin: "0 0 10px",
                                fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "#666666",
                              }}
                            >
                              {column.heading}
                            </h3>
                          ) : null}
                          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                            {column.links.map((link) => (
                              <li key={link.href}>
                                <a
                                  href={link.href}
                                  style={{
                                    textDecoration: "none",
                                    color: "#121212",
                                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    lineHeight: "18px",
                                  }}
                                >
                                  {link.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {expandedMenuSection.promoGroups?.length ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${expandedMenuSection.promoGroups.length}, minmax(0, 1fr))`,
                          gap: 20,
                        }}
                      >
                        {expandedMenuSection.promoGroups.map((group) => (
                          <div key={`${expandedMenuSection.label}-${group.heading}`}>
                            <h3
                              style={{
                                margin: "0 0 10px",
                                fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "#666666",
                              }}
                            >
                              {group.heading}
                            </h3>
                            <div style={{ display: "grid", gap: 12 }}>
                              {group.items.map((item) => (
                                <a
                                  key={item.href}
                                  href={item.href}
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: item.imageUrl ? "56px minmax(0, 1fr)" : "1fr",
                                    gap: 12,
                                    textDecoration: "none",
                                    color: "#121212",
                                    alignItems: "start",
                                  }}
                                >
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title}
                                      style={{
                                        width: 56,
                                        height: 56,
                                        objectFit: "cover",
                                        borderRadius: 6,
                                        border: "1px solid #e5e5e5",
                                      }}
                                    />
                                  ) : null}
                                  <div>
                                    <div
                                      style={{
                                        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                        fontSize: 14,
                                        fontWeight: 700,
                                        lineHeight: "18px",
                                        marginBottom: 4,
                                      }}
                                    >
                                      {item.title}
                                    </div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        lineHeight: "17px",
                                        color: "#52524F",
                                      }}
                                    >
                                      {item.description}
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                            {group.ctaHref && group.ctaLabel ? (
                              <a
                                href={group.ctaHref}
                                style={{
                                  display: "inline-block",
                                  marginTop: 10,
                                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: "#326891",
                                  textDecoration: "none",
                                }}
                              >
                                {group.ctaLabel}
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </nav>
          </div>
        </div>
      ) : null}

      {activePanel === "search" ? (
        <div
          onClick={() => setActivePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.3)",
            zIndex: 1000000110,
            padding: 24,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={block.searchPanel.title}
            data-testid="nyt-shell-search-panel"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              background: "#ffffff",
              borderRadius: 12,
              marginTop: 48,
              padding: 24,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#121212",
                }}
              >
                {block.searchPanel.title}
              </h2>
              <button
                type="button"
                aria-label="Close Search"
                onClick={() => setActivePanel(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
              >
                <CloseIcon />
              </button>
            </div>

            <label style={{ display: "block", marginBottom: 16 }}>
              <span
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  margin: -1,
                  padding: 0,
                  overflow: "hidden",
                  clip: "rect(0 0 0 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              >
                {block.searchPanel.placeholder}
              </span>
              <input
                type="search"
                placeholder={block.searchPanel.placeholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #d4d4d4",
                  borderRadius: 999,
                  padding: "12px 16px",
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 15,
                  color: "#121212",
                }}
              />
            </label>

            <div style={{ display: "grid", gap: 12 }}>
              {filteredSearchLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#121212",
                    padding: "12px 14px",
                    border: "1px solid #e5e5e5",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: "19px",
                      }}
                    >
                      {item.label}
                    </div>
                    {item.description ? (
                      <div
                        style={{
                          marginTop: 2,
                          fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#666666",
                        }}
                      >
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                  <ChevronRight />
                </a>
              ))}
              {filteredSearchLinks.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 14,
                    color: "#666666",
                  }}
                >
                  No matching destinations in this local facsimile.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {activePanel === "account" ? (
        <div
          onClick={() => setActivePanel(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            zIndex: 1000000120,
          }}
        >
          <div
            id="user-modal-drawer"
            className="ReactModal__Content ReactModal__Content--after-open css-xe33nq e12kje3u0"
            role="dialog"
            aria-label="Account Information"
            aria-modal="true"
            data-testid="user-modal-drawer"
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              width: "100%",
              maxWidth: 375,
              height: "100%",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              padding: 24,
              boxSizing: "border-box",
            }}
          >
            <div data-testid="masthead-user-modal-drawer">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h1
                    data-testid="email-address"
                    aria-label={`Account Information For: ${block.accountPanel.email}`}
                    style={{
                      margin: 0,
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: "26px",
                      color: "#121212",
                    }}
                  >
                    {block.accountPanel.email}
                  </h1>
                </div>
                <button
                  type="button"
                  aria-label="Close Account Information"
                  data-testid="close-btn"
                  onClick={() => setActivePanel(null)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                >
                  <CloseIcon />
                </button>
              </div>

              <hr style={{ border: 0, borderTop: "1px solid #e5e5e5", margin: "18px 0 20px" }} />

              <div data-testid="greeting-section" style={{ marginBottom: 20 }}>
                <p
                  data-testid="greeting"
                  style={{
                    margin: "0 0 8px",
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: "32px",
                    color: "#121212",
                  }}
                >
                  {block.accountPanel.greeting}
                </p>
                <p
                  data-testid="relationship-copy"
                  style={{
                    margin: 0,
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: "20px",
                    color: "#666666",
                  }}
                >
                  {block.accountPanel.relationshipCopy}
                </p>
              </div>

              <a
                data-testid="subscribe-CTA"
                href={block.accountPanel.subscribeHref}
                style={{
                  display: "inline-block",
                  background: "#326891",
                  color: "#ffffff",
                  textDecoration: "none",
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: "12px 16px",
                  borderRadius: 4,
                }}
              >
                {block.accountPanel.subscribeLabel}
              </a>

              <p
                style={{
                  margin: "14px 0 0",
                  fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: "20px",
                  color: "#666666",
                }}
              >
                Already subscribed?{" "}
                <a
                  data-testid="try-different-email-link"
                  href={block.accountPanel.alternateLoginHref}
                  style={{ color: "#326891", textDecoration: "none" }}
                >
                  {block.accountPanel.alternateLoginLabel}
                </a>
              </p>

              <div style={{ marginTop: 28, display: "grid", gap: 24 }}>
                {block.accountPanel.sections.map((section) => (
                  <div key={section.heading}>
                    <h2
                      style={{
                        margin: "0 0 10px",
                        fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: "#666666",
                      }}
                    >
                      {section.heading}
                    </h2>
                    <div style={{ display: "grid", gap: 8 }}>
                      {section.links.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            textDecoration: "none",
                            color: "#121212",
                            borderTop: "1px solid #efefef",
                            paddingTop: 10,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                              fontSize: 15,
                              fontWeight: 500,
                              lineHeight: "20px",
                            }}
                          >
                            {item.label}
                          </span>
                          <ChevronRight />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #efefef" }}>
                <a
                  data-testid="logout-link-regi"
                  href={block.accountPanel.logoutHref}
                  style={{
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#326891",
                    textDecoration: "none",
                  }}
                >
                  {block.accountPanel.logoutLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

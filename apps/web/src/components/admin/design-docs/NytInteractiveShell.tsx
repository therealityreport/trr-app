"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ContentBlock } from "@/lib/admin/design-docs-config";
import {
  getSvgIconPrimitive,
  resolveSiteHeaderShellBlock,
  resolveStorylineBlock,
  type PrimitiveSvgShape,
} from "@/lib/admin/design-docs-ui-primitives";

type SiteHeaderShellBlock = Extract<ContentBlock, { type: "site-header-shell" }>;
type StorylineBlock = Extract<ContentBlock, { type: "storyline" }>;

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

function renderPrimitiveShape(shape: PrimitiveSvgShape, index: number) {
  if (shape.kind === "rect") {
    return <rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} fill={shape.fill} />;
  }
  if (shape.kind === "circle") {
    return <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} />;
  }
  if (shape.kind === "line") {
    return <line key={index} x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinecap={shape.strokeLinecap} />;
  }
  if (shape.kind === "polygon") {
    return <polygon key={index} points={shape.points} fill={shape.fill} />;
  }
  return (
    <path
      key={index}
      d={shape.d}
      fill={shape.fill}
      stroke={shape.stroke}
      strokeWidth={shape.strokeWidth}
      strokeLinecap={shape.strokeLinecap}
      strokeLinejoin={shape.strokeLinejoin}
      strokeMiterlimit={shape.strokeMiterlimit}
    />
  );
}

function PrimitiveSvgIcon({ id, size }: { id: string; size?: number }) {
  const primitive = getSvgIconPrimitive(id);
  if (!primitive) {
    return null;
  }

  const width = size ?? primitive.width;
  const height = size ? (size * primitive.height) / primitive.width : primitive.height;

  return (
    <svg width={width} height={height} viewBox={primitive.viewBox} fill="none" aria-hidden="true">
      {primitive.shapes.map((shape, index) => renderPrimitiveShape(shape, index))}
    </svg>
  );
}

function NytGlyph({ size = 44 }: { size?: number }) {
  return <PrimitiveSvgIcon id="nyt.icon.t-logo.44" size={size} />;
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
  const resolvedBlock = resolveStorylineBlock(block);

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
            {resolvedBlock.title}
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
          {resolvedBlock.links.map((item) => (
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
  const resolvedBlock = resolveSiteHeaderShellBlock(block);
  const [activePanel, setActivePanel] = useState<"menu" | "search" | "account" | null>(null);
  const [expandedSection, setExpandedSection] = useState(resolvedBlock.menuSections[0]?.label ?? "");
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
    resolvedBlock.menuSections.find((section) => section.label === expandedSection) ?? null;

  const filteredSearchLinks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return resolvedBlock.searchPanel.links;
    return resolvedBlock.searchPanel.links.filter((entry) =>
      `${entry.label} ${entry.description ?? ""}`.toLowerCase().includes(query),
    );
  }, [resolvedBlock.searchPanel.links, searchQuery]);

  return (
    <>
      <div
        id="interactive-masthead-spacer"
        className="css-1xltzhg"
        data-testid="interactive-masthead-spacer"
        style={{ height: resolvedBlock.mastheadSpacerHeight }}
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
              <PrimitiveSvgIcon id="nyt.icon.menu.17" />
            </IconButton>
            <IconButton
              label="Open search"
              expanded={activePanel === "search"}
              onClick={() => setActivePanel((value) => (value === "search" ? null : "search"))}
              testId="nyt-shell-search-button"
            >
              <PrimitiveSvgIcon id="nyt.icon.search.16" />
            </IconButton>
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "hidden" }}>
            <NytWordmark />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140, justifyContent: "flex-end" }}>
            <a
              href={resolvedBlock.subscribeHref}
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
              {resolvedBlock.subscribeLabel}
            </a>
            <button
              type="button"
              aria-label={resolvedBlock.accountLabel}
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
              {resolvedBlock.accountLabel}
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
                  <PrimitiveSvgIcon id="nyt.icon.close.15" />
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
                    {resolvedBlock.menuSections.map((section) => {
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
                              <PrimitiveSvgIcon id="nyt.icon.chevron-down.13" />
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
            aria-label={resolvedBlock.searchPanel.title}
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
                {resolvedBlock.searchPanel.title}
              </h2>
              <button
                type="button"
                aria-label="Close Search"
                onClick={() => setActivePanel(null)}
                style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
              >
                <PrimitiveSvgIcon id="nyt.icon.close.15" />
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
                {resolvedBlock.searchPanel.placeholder}
              </span>
              <input
                type="search"
                placeholder={resolvedBlock.searchPanel.placeholder}
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
                  <PrimitiveSvgIcon id="nyt.icon.chevron-right.20" />
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
                    aria-label={`Account Information For: ${resolvedBlock.accountPanel.email}`}
                    style={{
                      margin: 0,
                      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                      fontSize: 20,
                      fontWeight: 700,
                      lineHeight: "26px",
                      color: "#121212",
                    }}
                  >
                    {resolvedBlock.accountPanel.email}
                  </h1>
                </div>
                <button
                  type="button"
                  aria-label="Close Account Information"
                  data-testid="close-btn"
                  onClick={() => setActivePanel(null)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                >
                  <PrimitiveSvgIcon id="nyt.icon.close.15" />
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
                  {resolvedBlock.accountPanel.greeting}
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
                  {resolvedBlock.accountPanel.relationshipCopy}
                </p>
              </div>

              <a
                data-testid="subscribe-CTA"
                href={resolvedBlock.accountPanel.subscribeHref}
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
                {resolvedBlock.accountPanel.subscribeLabel}
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
                  href={resolvedBlock.accountPanel.alternateLoginHref}
                  style={{ color: "#326891", textDecoration: "none" }}
                >
                  {resolvedBlock.accountPanel.alternateLoginLabel}
                </a>
              </p>

              <div style={{ marginTop: 28, display: "grid", gap: 24 }}>
                {resolvedBlock.accountPanel.sections.map((section) => (
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
                          <PrimitiveSvgIcon id="nyt.icon.chevron-right.20" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #efefef" }}>
                <a
                  data-testid="logout-link-regi"
                  href={resolvedBlock.accountPanel.logoutHref}
                  style={{
                    fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    color: "#326891",
                    textDecoration: "none",
                  }}
                >
                  {resolvedBlock.accountPanel.logoutLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

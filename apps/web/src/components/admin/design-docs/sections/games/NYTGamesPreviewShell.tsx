/* eslint-disable @next/next/no-img-element */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { NYT_GAMES_TOC_ICON_ASSET } from "./nyt-games-public-assets";

export type NYTGamesDocsViewport = "desktop" | "mobile";

export interface NYTGamesDocsSectionEntry {
  id: string;
  label: string;
  sourceComponentName?: string;
  provenance?: string;
}

interface NYTGamesDocsViewportContextValue {
  viewport: NYTGamesDocsViewport;
  isMobile: boolean;
  setViewport: (viewport: NYTGamesDocsViewport) => void;
  sections: readonly NYTGamesDocsSectionEntry[];
  registerSection: (entry: NYTGamesDocsSectionEntry) => () => void;
}

const NYTGamesDocsViewportContext = createContext<NYTGamesDocsViewportContextValue | null>(null);

const previewChipBaseStyle: CSSProperties = {
  borderRadius: 999,
  padding: "6px 14px",
  fontFamily: "var(--dd-font-sans)",
  fontSize: 12,
  fontWeight: 700,
  transition: "background-color 140ms ease, color 140ms ease, border-color 140ms ease",
};

function PreviewChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...previewChipBaseStyle,
        border: active ? "1px solid #18181b" : "1px solid #e4e4e7",
        background: active ? "#18181b" : "#ffffff",
        color: active ? "#ffffff" : "#52525b",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function TocButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? "Close table of contents" : "Open table of contents"}
      style={{
        ...previewChipBaseStyle,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        border: open ? "1px solid #18181b" : "1px solid #e4e4e7",
        background: "#ffffff",
        color: "#27272a",
        cursor: "pointer",
      }}
    >
      <img
        src={NYT_GAMES_TOC_ICON_ASSET.r2}
        alt=""
        aria-hidden="true"
        style={{
          width: NYT_GAMES_TOC_ICON_ASSET.display.desktop.width,
          height: NYT_GAMES_TOC_ICON_ASSET.display.desktop.height,
          objectFit: NYT_GAMES_TOC_ICON_ASSET.display.desktop.objectFit ?? "contain",
        }}
      />
      <span>Contents</span>
    </button>
  );
}

function IPhoneMockup({ children }: { children: ReactNode }) {
  return (
    <div style={{ margin: "0 auto", width: 272 }}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 44,
          background: "#ffffff",
          boxShadow: "0 0 0 3px #27272a, 0 8px 30px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 38,
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 28px 4px",
          }}
        >
          <span
            style={{
              color: "#000000",
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            9:41
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="black" aria-hidden="true">
              <rect x="0" y="7" width="2.5" height="4" rx="0.5" />
              <rect x="4" y="4.5" width="2.5" height="6.5" rx="0.5" />
              <rect x="8" y="2" width="2.5" height="9" rx="0.5" />
              <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
            </svg>
            <svg width="13" height="10" viewBox="0 0 13 10" fill="black" aria-hidden="true">
              <path d="M6.5 8a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
              <path
                d="M3 6a5 5 0 017 0"
                stroke="black"
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M0.5 3.2a8.5 8.5 0 0112 0"
                stroke="black"
                strokeWidth="1.3"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <svg width="22" height="11" viewBox="0 0 22 11" aria-hidden="true">
              <rect
                x="0.5"
                y="0.5"
                width="18"
                height="10"
                rx="2"
                stroke="black"
                strokeWidth="1"
                fill="none"
                opacity="0.35"
              />
              <rect x="2" y="2" width="15" height="7" rx="1" fill="black" />
              <rect x="19.5" y="3" width="1.5" height="5" rx="0.75" fill="black" opacity="0.4" />
            </svg>
          </div>
        </div>
        <div
          style={{
            overflowY: "auto",
            background: "#ffffff",
            padding: "0 8px",
            height: 480,
          }}
        >
          {children}
        </div>
        <div style={{ display: "flex", height: 22, alignItems: "center", justifyContent: "center" }}>
          <div style={{ height: 4, width: 96, borderRadius: 999, background: "#000000" }} />
        </div>
      </div>
    </div>
  );
}

export function useNYTGamesDocsViewport() {
  const context = useContext(NYTGamesDocsViewportContext);

  if (!context) {
    return {
      viewport: "desktop" as const,
      isMobile: false,
      setViewport: () => {},
      sections: [],
      registerSection: () => () => {},
    };
  }

  return context;
}

export function slugifyNYTGamesSectionLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractTextFromReactNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractTextFromReactNode).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    return extractTextFromReactNode((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return "";
}

export function NYTGamesDocsAnchorSection({
  id,
  label,
  sourceComponentName,
  provenance,
  children,
  style,
}: NYTGamesDocsSectionEntry & {
  children: ReactNode;
  style?: CSSProperties;
}) {
  const { registerSection } = useNYTGamesDocsViewport();

  useEffect(() => {
    return registerSection({ id, label, sourceComponentName, provenance });
  }, [id, label, provenance, registerSection, sourceComponentName]);

  return (
    <section
      id={id}
      style={{
        scrollMarginTop: 28,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function NYTGamesDocsPageShell({
  eyebrow,
  title,
  description,
  children,
  sectionIndex,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  sectionIndex?: readonly NYTGamesDocsSectionEntry[];
}) {
  const [viewport, setViewport] = useState<NYTGamesDocsViewport>("desktop");
  const [registeredSections, setRegisteredSections] = useState<NYTGamesDocsSectionEntry[]>([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const isMobile = viewport === "mobile";

  const registerSection = useCallback((entry: NYTGamesDocsSectionEntry) => {
    setRegisteredSections((previous) => {
      const index = previous.findIndex((item) => item.id === entry.id);
      if (index === -1) {
        return [...previous, entry];
      }
      const next = [...previous];
      next[index] = entry;
      return next;
    });

    return () => {
      setRegisteredSections((previous) => previous.filter((item) => item.id !== entry.id));
    };
  }, []);

  const sections = useMemo(() => {
    if (sectionIndex?.length) {
      return sectionIndex;
    }
    return registeredSections;
  }, [registeredSections, sectionIndex]);

  return (
    <NYTGamesDocsViewportContext.Provider
      value={{ viewport, isMobile, setViewport, sections, registerSection }}
    >
      <div className="nytg-scope" style={{ position: "relative", overflow: "visible" }}>
        <div className="dd-section-label">{eyebrow}</div>
        <h2 className="dd-section-title">{title}</h2>
        <p className="dd-section-desc">{description}</p>

        <div style={{ position: "relative", margin: "20px 0 24px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <PreviewChip active={viewport === "desktop"} onClick={() => setViewport("desktop")}>
              Desktop
            </PreviewChip>
            <PreviewChip active={viewport === "mobile"} onClick={() => setViewport("mobile")}>
              Mobile
            </PreviewChip>
            <TocButton open={isTocOpen} onClick={() => setIsTocOpen((open) => !open)} />
          </div>

          {isTocOpen && sections.length > 0 ? (
            <div
              role="dialog"
              aria-label="Page table of contents"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                zIndex: 80,
                width: "min(420px, 100%)",
                background: "#ffffff",
                border: "1px solid #d4d4d8",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
                padding: 18,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-ui)",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#18181b",
                      marginBottom: 2,
                    }}
                  >
                    Table of Contents
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--dd-font-mono)",
                      fontSize: 11,
                      color: "#71717a",
                    }}
                  >
                    Anchors for every documented NYT Games component on this page.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTocOpen(false)}
                  aria-label="Close table of contents"
                  style={{
                    ...resetButtonStyle,
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    border: "1px solid #e4e4e7",
                    color: "#52525b",
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setIsTocOpen(false)}
                    style={{
                      display: "block",
                      borderRadius: 12,
                      border: "1px solid #f1f5f9",
                      background: "#fafafa",
                      padding: "10px 12px",
                      textDecoration: "none",
                      color: "#18181b",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--dd-font-ui)",
                        fontSize: 14,
                        fontWeight: 700,
                        marginBottom: section.sourceComponentName ? 4 : 0,
                      }}
                    >
                      {section.label}
                    </div>
                    {section.sourceComponentName ? (
                      <div
                        style={{
                          fontFamily: "var(--dd-font-mono)",
                          fontSize: 11,
                          color: "#71717a",
                          lineHeight: 1.5,
                        }}
                      >
                        {section.sourceComponentName}
                      </div>
                    ) : null}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {isMobile ? (
          <IPhoneMockup>
            <div style={{ display: "grid", gap: 12, padding: "8px 0 24px" }}>{children}</div>
          </IPhoneMockup>
        ) : (
          <div>{children}</div>
        )}
      </div>
    </NYTGamesDocsViewportContext.Provider>
  );
}

const resetButtonStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  cursor: "pointer",
};

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import {
  DESIGN_DOC_GROUPS,
  DESIGN_DOC_SECTIONS,
  getBrandSubSections,
  getParentSection,
  getArticleSubLinks,
  getAthleticArticleSubLinks,
  getGameArticleSubLinks,
  isBrandSection,
  type DesignDocSectionId,
} from "@/lib/admin/design-docs-config";
import { buildDesignDocsPath } from "@/lib/admin/admin-route-paths";

/* ═══════════════════════════════════════════════════════════════════════
   NYT-styled Design Docs Sidebar
   White background · Black text · nyt-franklin typography
   ═══════════════════════════════════════════════════════════════════════ */

const F = {
  franklin: '"nyt-franklin", arial, helvetica, sans-serif',
  chelt: '"nyt-cheltenham", georgia, "times new roman", times, serif',
  copy: "#121212",
  secondary: "#363636",
  faint: "#727272",
  border: "#e2e2e2",
  hoverBg: "#f7f7f7",
  activeBg: "#f0f0f0",
} as const;

interface DesignDocsSidebarProps {
  activeSection: DesignDocSectionId;
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
  ).filter((el) => {
    const s = window.getComputedStyle(el);
    return s.display !== "none" && s.visibility !== "hidden";
  });
}

const sectionLabelMap = new Map(
  DESIGN_DOC_SECTIONS.map((s) => [s.id, s.label]),
);

/* ── Accordion Navigation — NYT style ─────────────────────────────── */

function AccordionNav({
  activeSection,
  onNavigate,
}: {
  activeSection: DesignDocSectionId;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const effectiveActiveSection = getParentSection(activeSection) ?? activeSection;

  const activeGroupIndex = useMemo(() => {
    return DESIGN_DOC_GROUPS.findIndex((g) =>
      g.sectionIds.includes(effectiveActiveSection),
    );
  }, [effectiveActiveSection]);

  const [expanded, setExpanded] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (activeGroupIndex >= 0) initial.add(activeGroupIndex);
    return initial;
  });

  useEffect(() => {
    if (activeGroupIndex >= 0) {
      setExpanded((prev) => {
        if (prev.has(activeGroupIndex)) return prev;
        const next = new Set(prev);
        next.add(activeGroupIndex);
        return next;
      });
    }
  }, [activeGroupIndex]);

  const toggle = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {DESIGN_DOC_GROUPS.map((group, groupIdx) => {
        const isExpanded = expanded.has(groupIdx);
        const hasActive = group.sectionIds.includes(effectiveActiveSection);

        return (
          <div key={group.label}>
            {/* Group header */}
            <button
              onClick={() => toggle(groupIdx)}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                textAlign: "left",
                fontFamily: F.franklin,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: hasActive ? F.copy : F.faint,
                background: "none",
                border: "none",
                borderBottom: `1px solid ${F.border}`,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = F.copy; }}
              onMouseLeave={(e) => { if (!hasActive) (e.currentTarget as HTMLButtonElement).style.color = F.faint; }}
              aria-expanded={isExpanded}
            >
              <span>{group.label}</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  flexShrink: 0,
                  transition: "transform 0.15s",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                }}
              >
                <polyline points="3,1 7,5 3,9" />
              </svg>
            </button>

            {/* Section links */}
            {isExpanded && (
              <ul style={{ listStyle: "none", margin: 0, padding: "4px 0", borderBottom: `1px solid ${F.border}` }}>
                {group.sectionIds.map((sectionId) => {
                  const isActive = sectionId === activeSection || sectionId === effectiveActiveSection;
                  const label = sectionLabelMap.get(sectionId) ?? sectionId;
                  const showSubLinks = isActive && isBrandSection(sectionId);

                  return (
                    <li key={sectionId}>
                      <Link
                        href={buildDesignDocsPath(sectionId)}
                        onClick={onNavigate}
                        style={{
                          display: "block",
                          padding: "8px 16px 8px 24px",
                          fontFamily: F.franklin,
                          fontSize: 14,
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? F.copy : F.secondary,
                          textDecoration: "none",
                          background: isActive ? F.activeBg : "transparent",
                          transition: "background 0.12s, color 0.12s",
                          borderLeft: isActive ? `3px solid ${F.copy}` : "3px solid transparent",
                        }}
                        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = F.hoverBg; e.currentTarget.style.color = F.copy; } }}
                        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = F.secondary; } }}
                      >
                        {label}
                      </Link>

                      {/* Game sub-links */}
                      {sectionId === "nyt-games-articles" && isActive && (
                        <ul style={{ listStyle: "none", margin: 0, padding: "2px 0 2px 36px" }}>
                          {getGameArticleSubLinks().map((game) => {
                            const gamePath = buildDesignDocsPath(`nyt-games-articles/${game.slug}`);
                            const isGameActive = pathname === gamePath;
                            return (
                              <li key={game.slug}>
                                <Link
                                  href={gamePath}
                                  onClick={onNavigate}
                                  style={{
                                    display: "block",
                                    padding: "4px 8px",
                                    fontFamily: F.franklin,
                                    fontSize: 12,
                                    fontWeight: isGameActive ? 600 : 400,
                                    color: isGameActive ? F.copy : F.faint,
                                    textDecoration: "none",
                                    transition: "color 0.12s",
                                  }}
                                >
                                  {game.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Brand sub-section links */}
                      {showSubLinks && (
                        <ul style={{ listStyle: "none", margin: 0, padding: "2px 0 2px 36px" }}>
                          {getBrandSubSections(sectionId).map((sub) => {
                            const isSubActive = sub.href ? pathname.startsWith(sub.href) : false;
                            return (
                              <li key={sub.anchor}>
                                {sub.href ? (
                                  <Link
                                    href={sub.href as Route}
                                    onClick={onNavigate}
                                    style={{
                                      display: "block",
                                      padding: "5px 8px",
                                      fontFamily: F.franklin,
                                      fontSize: 12,
                                      fontWeight: isSubActive ? 600 : 400,
                                      color: isSubActive ? F.copy : F.faint,
                                      textDecoration: "none",
                                      transition: "color 0.12s",
                                    }}
                                  >
                                    {sub.label}
                                  </Link>
                                ) : (
                                  <a
                                    href={`#${sub.anchor}`}
                                    onClick={onNavigate}
                                    style={{
                                      display: "block",
                                      padding: "5px 8px",
                                      fontFamily: F.franklin,
                                      fontSize: 12,
                                      fontWeight: 400,
                                      color: F.faint,
                                      textDecoration: "none",
                                    }}
                                  >
                                    {sub.label}
                                  </a>
                                )}

                                {/* NYT article sub-links under Pages */}
                                {sub.href === buildDesignDocsPath("nyt-articles") && isSubActive && (
                                  <ul style={{ listStyle: "none", margin: 0, padding: "2px 0 2px 12px", borderLeft: `1px solid ${F.border}` }}>
                                    {getArticleSubLinks().map((article) => {
                                      const articlePath = buildDesignDocsPath(`nyt-articles/${article.slug}`);
                                      const isArticleActive = pathname === articlePath;
                                      return (
                                        <li key={article.slug}>
                                          <Link
                                            href={articlePath}
                                            onClick={onNavigate}
                                            style={{
                                              display: "block",
                                              padding: "3px 6px",
                                              fontFamily: F.franklin,
                                              fontSize: 11,
                                              fontWeight: isArticleActive ? 600 : 400,
                                              color: isArticleActive ? F.copy : F.faint,
                                              textDecoration: "none",
                                            }}
                                          >
                                            {article.label.length > 42 ? `${article.label.slice(0, 42)}…` : article.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                {/* Athletic article sub-links */}
                                {sub.href === buildDesignDocsPath("athletic-articles") && isSubActive && (
                                  <ul style={{ listStyle: "none", margin: 0, padding: "2px 0 2px 12px", borderLeft: `1px solid ${F.border}` }}>
                                    {getAthleticArticleSubLinks().map((article) => {
                                      const articlePath = buildDesignDocsPath(`athletic-articles/${article.slug}`);
                                      const isArticleActive = pathname === articlePath;
                                      return (
                                        <li key={article.slug}>
                                          <Link
                                            href={articlePath}
                                            onClick={onNavigate}
                                            style={{
                                              display: "block",
                                              padding: "3px 6px",
                                              fontFamily: F.franklin,
                                              fontSize: 11,
                                              fontWeight: isArticleActive ? 600 : 400,
                                              color: isArticleActive ? F.copy : F.faint,
                                              textDecoration: "none",
                                            }}
                                          >
                                            {article.label.length > 42 ? `${article.label.slice(0, 42)}…` : article.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Sidebar Component ──────────────────────────────────────── */

export default function DesignDocsSidebar({
  activeSection,
  isOpen,
  onClose,
}: DesignDocsSidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap + escape
  useEffect(() => {
    if (!isOpen) return;
    const menu = drawerRef.current;
    if (!menu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = getFocusableElements(menu);
      if (focusables.length === 0) { e.preventDefault(); return; }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first || !menu.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const focusables = getFocusableElements(menu);
    if (focusables.length > 0) focusables[0].focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  /* ── Shared nav panel style ─────────────────────────────────────── */
  const navPanelContent = (isMobile: boolean) => (
    <>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: `1px solid ${F.border}`,
        }}
      >
        <span
          style={{
            fontFamily: F.chelt,
            fontSize: 18,
            fontWeight: 700,
            color: F.copy,
            letterSpacing: "-0.01em",
          }}
        >
          Design Docs
        </span>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: F.faint,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = F.copy; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = F.faint; }}
            aria-label="Close navigation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="14" y1="4" x2="4" y2="14" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation body */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        <AccordionNav
          activeSection={activeSection}
          onNavigate={isMobile ? onClose : undefined}
        />
      </div>
    </>
  );

  return (
    <>
      {/* ── Drawer overlay — slides from left on all screen sizes ── */}
      <div>
        {/* Backdrop */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.3)",
            transition: "opacity 0.2s",
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? "auto" : "none",
          }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Design docs sections"
          style={{
            position: "fixed",
            top: 0,
            bottom: 0,
            left: 0,
            zIndex: 50,
            width: "min(320px, 88vw)",
            backgroundColor: "#fff",
            borderRight: `1px solid ${F.border}`,
            boxShadow: "4px 0 16px rgba(0,0,0,0.08)",
            transform: isOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.2s ease",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {navPanelContent(true)}
        </div>
      </div>
    </>
  );
}

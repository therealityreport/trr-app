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

function AccordionNav({
  activeSection,
  onNavigate,
}: {
  activeSection: DesignDocSectionId;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // If the active section has a parent (e.g. nyt-tech-stack → brand-nyt),
  // use the parent for group expansion and section highlighting
  const effectiveActiveSection = getParentSection(activeSection) ?? activeSection;

  // Auto-expand the group that contains the active (or parent) section
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

  // Keep active group expanded when section changes
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
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {DESIGN_DOC_GROUPS.map((group, groupIdx) => {
        const isExpanded = expanded.has(groupIdx);
        const hasActive = group.sectionIds.includes(effectiveActiveSection);

        return (
          <div key={group.label}>
            {/* Group header — accordion toggle */}
            <button
              onClick={() => toggle(groupIdx)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                hasActive
                  ? "text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
              aria-expanded={isExpanded}
            >
              <span>{group.label}</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`shrink-0 transition-transform duration-150 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              >
                <polyline points="4,2 8,6 4,10" />
              </svg>
            </button>

            {/* Section links */}
            {isExpanded && (
              <ul className="mb-1 ml-1 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
                {group.sectionIds.map((sectionId) => {
                  const isActive = sectionId === activeSection || sectionId === effectiveActiveSection;
                  const label =
                    sectionLabelMap.get(sectionId) ?? sectionId;
                  const showSubLinks =
                    isActive && isBrandSection(sectionId);

                  return (
                    <li key={sectionId}>
                      <Link
                        href={
                          `/admin/design-docs/${sectionId}` as Route
                        }
                        onClick={onNavigate}
                        className={
                          isActive
                            ? "block rounded-lg bg-zinc-900 px-3 py-1.5 text-[13px] font-semibold text-white"
                            : "block rounded-lg px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        }
                      >
                        {label}
                      </Link>

                      {/* Game sub-links directly under "Games" section */}
                      {sectionId === "nyt-games-articles" && isActive && (
                        <ul className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-300 pl-2">
                          {getGameArticleSubLinks().map((game) => {
                            const isGameActive = pathname === `/admin/design-docs/nyt-games-articles/${game.slug}`;
                            return (
                              <li key={game.slug}>
                                <Link
                                  href={`/admin/design-docs/nyt-games-articles/${game.slug}` as Route}
                                  onClick={onNavigate}
                                  className={`block rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                    isGameActive
                                      ? "bg-zinc-100 text-zinc-900"
                                      : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                  }`}
                                >
                                  {game.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Brand sub-section links (anchors or page links) */}
                      {showSubLinks && (
                        <ul className="mb-1 ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-300 pl-2">
                          {getBrandSubSections(sectionId).map((sub) => {
                            const isSubActive = sub.href
                              ? pathname.startsWith(sub.href)
                              : false;

                            return (
                              <li key={sub.anchor}>
                                {sub.href ? (
                                  <Link
                                    href={sub.href as Route}
                                    onClick={onNavigate}
                                    className={`block rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                                      isSubActive
                                        ? "bg-zinc-100 text-zinc-900"
                                        : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                    }`}
                                  >
                                    {sub.label}
                                  </Link>
                                ) : (
                                  <a
                                    href={`#${sub.anchor}`}
                                    onClick={onNavigate}
                                    className="block rounded px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                                  >
                                    {sub.label}
                                  </a>
                                )}

                                {/* Nested article sub-links under "Pages" */}
                                {sub.href === "/admin/design-docs/nyt-articles" && isSubActive && (
                                  <ul className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
                                    {getArticleSubLinks().map((article) => {
                                      const isArticleActive = pathname === `/admin/design-docs/nyt-articles/${article.slug}`;
                                      return (
                                        <li key={article.slug}>
                                          <Link
                                            href={`/admin/design-docs/nyt-articles/${article.slug}` as Route}
                                            onClick={onNavigate}
                                            className={`block rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                              isArticleActive
                                                ? "bg-zinc-100 text-zinc-900"
                                                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                            }`}
                                          >
                                            {article.label.length > 45 ? `${article.label.slice(0, 45)}…` : article.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                {/* Nested Athletic article sub-links under "Pages" */}
                                {sub.href === "/admin/design-docs/athletic-articles" && isSubActive && (
                                  <ul className="ml-2 mt-0.5 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
                                    {getAthleticArticleSubLinks().map((article) => {
                                      const isArticleActive = pathname === `/admin/design-docs/athletic-articles/${article.slug}`;
                                      return (
                                        <li key={article.slug}>
                                          <Link
                                            href={`/admin/design-docs/athletic-articles/${article.slug}` as Route}
                                            onClick={onNavigate}
                                            className={`block rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                              isArticleActive
                                                ? "bg-zinc-100 text-zinc-900"
                                                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                            }`}
                                          >
                                            {article.label.length > 45 ? `${article.label.slice(0, 45)}…` : article.label}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                {/* Game article sub-links moved to top-level "Games" section */}
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

export default function DesignDocsSidebar({
  activeSection,
  isOpen,
  onClose,
}: DesignDocsSidebarProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Focus trap + escape for mobile drawer
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
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
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
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Desktop sidebar — persistent left column */}
      <nav
        className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:block"
        aria-label="Design docs navigation"
      >
        <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto px-2 py-4">
          <AccordionNav activeSection={activeSection} />
        </div>
      </nav>

      {/* Mobile drawer — slides from left */}
      <div className="lg:hidden">
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
            isOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Design docs sections"
          className={`fixed inset-y-0 left-0 z-50 w-[min(320px,88vw)] transform border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <span className="text-sm font-semibold text-zinc-900">
              Design Docs
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="Close navigation"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="14" y2="14" />
                <line x1="14" y1="4" x2="4" y2="14" />
              </svg>
            </button>
          </div>

          {/* Drawer body */}
          <div
            className="overflow-y-auto px-2 py-3"
            style={{ maxHeight: "calc(100vh - 57px)" }}
          >
            <AccordionNav
              activeSection={activeSection}
              onNavigate={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}

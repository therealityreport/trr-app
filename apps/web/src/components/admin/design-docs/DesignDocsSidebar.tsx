"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import type {
  DesignDocSection,
  DesignDocSectionId,
} from "@/lib/admin/design-docs-config";

interface DesignDocsSidebarProps {
  activeSection: DesignDocSectionId;
  sections: readonly DesignDocSection[];
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

function SectionLinks({
  sections,
  activeSection,
  onNavigate,
}: {
  sections: readonly DesignDocSection[];
  activeSection: DesignDocSectionId;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {sections.map((section) => {
        const isActive = section.id === activeSection;
        return (
          <li key={section.id}>
            <Link
              href={`/admin/design-docs/${section.id}` as Route}
              onClick={onNavigate}
              className={
                isActive
                  ? "block rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white"
                  : "block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              }
            >
              {section.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function DesignDocsSidebar({
  activeSection,
  sections,
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
    // Auto-focus first link
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
        className="hidden lg:block w-64 shrink-0 border-r border-zinc-200 bg-white"
        aria-label="Design docs navigation"
      >
        <div className="sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto px-3 py-6">
          <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Sections
          </div>
          <SectionLinks sections={sections} activeSection={activeSection} />
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
              Sections
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
          <div className="overflow-y-auto px-3 py-4" style={{ maxHeight: "calc(100vh - 57px)" }}>
            <SectionLinks
              sections={sections}
              activeSection={activeSection}
              onNavigate={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
}

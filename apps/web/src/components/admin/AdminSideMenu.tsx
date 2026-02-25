"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type RefObject } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { AdminNavItem } from "@/lib/admin/admin-navigation";
import type { AdminRecentShowEntry } from "@/lib/admin/admin-recent-shows";

interface AdminSideMenuProps {
  isOpen: boolean;
  pathname: string;
  navItems: readonly AdminNavItem[];
  recentShows: readonly AdminRecentShowEntry[];
  onClose: () => void;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const isActivePath = (
  pathname: string,
  href: string,
  activeMatchPrefixes?: readonly string[],
): boolean => {
  if (href === "/admin") return pathname === "/admin";
  if (pathname === href || pathname.startsWith(`${href}/`)) {
    return true;
  }
  if (!activeMatchPrefixes || activeMatchPrefixes.length === 0) {
    return false;
  }
  return activeMatchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const cx = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(" ");

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
};

function useFocusTrap(isOpen: boolean, menuRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const menu = menuRef.current;
    if (!menu) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = getFocusableElements(menu);
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !menu.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, menuRef, onClose]);
}

export default function AdminSideMenu({ isOpen, pathname, navItems, recentShows, onClose }: AdminSideMenuProps) {
  const [showsExpanded, setShowsExpanded] = useState(true);
  const menuRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("side-menu-open");
      return;
    }
    document.body.classList.remove("side-menu-open");
  }, [isOpen]);

  useFocusTrap(isOpen, menuRef, onClose);

  useEffect(() => {
    if (!isOpen) {
      const target = lastFocusedRef.current;
      if (target && typeof target.focus === "function") {
        window.setTimeout(() => target.focus(), 0);
      }
      return;
    }

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusables = getFocusableElements(menuRef.current);
    window.setTimeout(() => {
      const target = focusables[0] ?? menuRef.current;
      target?.focus();
    }, 0);
  }, [isOpen]);

  const showItem = useMemo(() => navItems.find((item) => item.hasShowsSubmenu), [navItems]);

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    onClose();
  };

  return (
    <>
      <nav
        id="admin-side-menu"
        ref={menuRef}
        aria-label="Admin navigation"
        aria-hidden={!isOpen}
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-[min(380px,92vw)] transform border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">Admin</span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-zinc-700 transition hover:bg-zinc-100"
              aria-label="Close menu"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1" role="list">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href, item.activeMatchPrefixes);

                if (!item.hasShowsSubmenu) {
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cx(
                          "flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition",
                          active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.key} className="rounded-lg border border-zinc-200 bg-zinc-50/70">
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cx(
                          "flex-1 rounded-l-lg px-3 py-2 text-sm font-semibold transition",
                          active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setShowsExpanded((prev) => !prev)}
                        className="rounded-r-lg px-3 py-2 text-zinc-700 transition hover:bg-zinc-100"
                        aria-expanded={showsExpanded}
                        aria-controls="admin-shows-submenu"
                        aria-label="Toggle shows submenu"
                      >
                        <span className={cx("inline-block transform transition", showsExpanded ? "rotate-180" : "")}>⌄</span>
                      </button>
                    </div>

                    <div id="admin-shows-submenu" className="border-t border-zinc-200 px-2 py-2" hidden={!showsExpanded}>
                      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Recent Shows</p>
                      {recentShows.length === 0 ? (
                        <p className="px-2 pb-2 text-xs text-zinc-500">No recent shows yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {recentShows.map((show) => (
                            <li key={show.slug}>
                              <Link
                                href={show.href as Route}
                                onClick={onClose}
                                className={cx(
                                  "block truncate rounded-md px-2 py-1.5 text-sm transition",
                                  isActivePath(pathname, show.href)
                                    ? "bg-zinc-900 text-white"
                                    : "text-zinc-700 hover:bg-zinc-100",
                                )}
                                title={show.label}
                              >
                                {show.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}

                      <Link
                        href={showItem?.href ?? "/shows"}
                        onClick={onClose}
                        className="mt-2 block rounded-md px-2 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                      >
                        View All Shows
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </nav>

      <div
        className={cx(
          "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!isOpen}
        onClick={handleBackdropClick}
      />
    </>
  );
}

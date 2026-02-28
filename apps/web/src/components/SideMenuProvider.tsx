"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { logout } from "@/lib/firebase";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type SideMenuContextValue = {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
};

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

const SideMenuContext = createContext<SideMenuContextValue | null>(null);

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function useFocusTrap(isOpen: boolean, menuRef: RefObject<HTMLElement | null>, closeMenu: () => void) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const menu = menuRef.current;
    if (!menu) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

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
  }, [isOpen, menuRef, closeMenu]);
}

const GAMES = [
  {
    id: "realitease",
    label: "Realitease",
    icon: "/icons/Realitease-Icon.svg",
    description: "Timing trivia for Bravo obsessives.",
    links: [
      { label: "Overview", href: "/realitease/cover" },
      { label: "Play now", href: "/realitease/play" },
    ],
  },
  {
    id: "bravodle",
    label: "Bravodle",
    icon: "/icons/Bravodle-Icon.svg",
    description: "Guess the Bravo-lebrity in six tries.",
    links: [
      { label: "Overview", href: "/bravodle/cover" },
      { label: "Play now", href: "/bravodle/play" },
    ],
  },
  {
    id: "realations",
    label: "Realations",
    icon: "/icons/realations-icon.svg",
    description: "Match the reality TV relationships.",
    links: [{ label: "Explore", href: "/realations" }],
  },
  {
    id: "realtime",
    label: "RealTime",
    icon: "/assets/icons/side-menu/spelling-bee.svg",
    description: "Daily reality TV news briefs.",
    links: [{ label: "Coming Soon", href: "/hub" }],
  },
] as const;

const SURVEY_LINKS = [
  { id: "rhobh", label: "RHOBH", href: "/hub/surveys?show=rhobh" },
  { id: "rhoslc", label: "RHOSLC", href: "/hub/surveys?show=rhoslc" },
  { id: "rhoa", label: "RHOA", href: "/hub/surveys?show=rhoa" },
  { id: "rhop", label: "RHOP", href: "/hub/surveys?show=rhop" },
] as const;

export function useSideMenu(): SideMenuContextValue {
  return useContext(SideMenuContext) ?? { isOpen: false, openMenu: () => undefined, closeMenu: () => undefined };
}

interface SideMenuProviderProps {
  children: ReactNode;
}

export default function SideMenuProvider({ children }: SideMenuProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GAMES.map((game) => [game.id, false] as const)),
  );
  const menuRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);
  const openMenu = useCallback(() => setIsOpen(true), []);

  useFocusTrap(isOpen, menuRef, closeMenu);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("side-menu-open");
    } else {
      document.body.classList.remove("side-menu-open");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      const last = lastFocusedRef.current;
      if (last && typeof last.focus === "function") {
        window.setTimeout(() => last.focus(), 0);
      }
      return;
    }

    const menu = menuRef.current;
    if (!menu) return;

    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const focusables = getFocusableElements(menu);
    const target = focusables[0] ?? menu;
    window.setTimeout(() => target.focus(), 0);
  }, [isOpen]);

  const value = useMemo<SideMenuContextValue>(() => ({ isOpen, openMenu, closeMenu }), [isOpen, openMenu, closeMenu]);

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      closeMenu();
    },
    [closeMenu],
  );

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedSections((prev) => {
      const shouldExpand = GAMES.some((game) => !prev[game.id]);
      return Object.fromEntries(GAMES.map((game) => [game.id, shouldExpand] as const));
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      closeMenu();
      window.location.href = "/";
    }
  }, [closeMenu]);

  return (
    <SideMenuContext.Provider value={value}>
      {children}
      <nav
        id="side-menu"
        ref={menuRef}
        className={cx("side-menu", isOpen && "is-open")}
        aria-hidden={!isOpen}
        aria-label="Site navigation"
      >
        <div className="side-menu__content">
          <header className="side-menu__header">
            <button type="button" className="side-menu__close" onClick={closeMenu} aria-label="Close menu">
              <span aria-hidden="true">&times;</span>
            </button>
            <div className="side-menu__brand" aria-hidden="true">
              <Image
                className="side-menu__brand-icon"
                src="/assets/icons/side-menu/nyt-icon-normalized.svg"
                alt=""
                width={32}
                height={32}
              />
              <span className="side-menu__brand-text">Games</span>
            </div>
            <button type="button" className="side-menu__expand-all" onClick={handleExpandAll}>
              + Expand All
            </button>
          </header>

          <div className="side-menu__body" role="list">
            <section className="side-menu__section" aria-labelledby="side-menu-news-heading">
              <div className="side-menu__section-heading" id="side-menu-news-heading">
                News
              </div>
              <a className="side-menu__primary-link" href="https://www.nytimes.com/">
                <span className="side-menu__icon" aria-hidden="true">
                  <Image src="/assets/icons/side-menu/nyt-icon-normalized.svg" alt="" width={20} height={20} />
                </span>
                <span className="side-menu__link-text">The New York Times</span>
              </a>
            </section>

            <section className="side-menu__section" aria-labelledby="side-menu-games-heading">
              <div className="side-menu__section-heading" id="side-menu-games-heading">
                New York Times Games
              </div>
              <div className="side-menu__game-list">
                {GAMES.map((game) => {
                  const expanded = Boolean(expandedSections[game.id]);
                  const panelId = `side-menu-panel-${game.id}`;
                  return (
                    <div key={game.id} className="side-menu__game">
                      <div className="side-menu__game-row">
                        <Link className="side-menu__primary-link" href={game.links[0]?.href ?? "#"} onClick={closeMenu}>
                          <span className="side-menu__icon" aria-hidden="true">
                            <Image src={game.icon} alt="" width={20} height={20} />
                          </span>
                          <span className="side-menu__link-text">{game.label}</span>
                        </Link>
                        <button
                          type="button"
                          className={cx("side-menu__toggle", expanded && "is-open")}
                          aria-expanded={expanded}
                          aria-controls={panelId}
                          onClick={() => toggleSection(game.id)}
                        >
                          <Image src="/assets/icons/side-menu/arrow-down.svg" alt="" width={18} height={18} />
                        </button>
                      </div>
                      <div
                        id={panelId}
                        className={cx("side-menu__game-panel", expanded && "is-open")}
                        hidden={!expanded}
                      >
                        <p className="side-menu__game-description">{game.description}</p>
                        <ul className="side-menu__secondary-links">
                          {game.links.map((link) => (
                            <li key={link.href}>
                              <Link href={link.href} onClick={closeMenu}>
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link className="side-menu__view-all" href="/hub" onClick={closeMenu}>
                View all Games
              </Link>
            </section>

            <section className="side-menu__section" aria-labelledby="side-menu-surveys-heading">
              <div className="side-menu__section-heading" id="side-menu-surveys-heading">
                Surveys
              </div>
              <div className="side-menu__game">
                <div className="side-menu__game-row">
                  <Link className="side-menu__primary-link" href="/hub/surveys" onClick={closeMenu}>
                    <span className="side-menu__icon" aria-hidden="true">
                      <Image src="/assets/icons/side-menu/daily.svg" alt="" width={20} height={20} />
                    </span>
                    <span className="side-menu__link-text">Weekly Check-Ins</span>
                  </Link>
                </div>
                <div className="side-menu__game-panel is-open">
                  <p className="side-menu__game-description">Jump into surveys for your favorite Housewives cities.</p>
                  <ul className="side-menu__secondary-links">
                    {SURVEY_LINKS.map((survey) => (
                      <li key={survey.id}>
                        <Link href={survey.href} onClick={closeMenu}>
                          {survey.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="side-menu__section" aria-labelledby="side-menu-profile-heading">
              <div className="side-menu__section-heading" id="side-menu-profile-heading">
                Profile
              </div>
              <Link className="side-menu__primary-link" href="/profile" onClick={closeMenu}>
                <span className="side-menu__link-text">Account details</span>
              </Link>
              <button type="button" className="side-menu__logout" onClick={handleLogout}>
                Log Out
              </button>
            </section>

            <section className="side-menu__section" aria-labelledby="side-menu-privacy-heading">
              <div className="side-menu__section-heading" id="side-menu-privacy-heading">
                Privacy Settings
              </div>
              <ul className="side-menu__secondary-links">
                <li><Link href="/privacy-policy" onClick={closeMenu}>Privacy Policy</Link></li>
                <li><Link href="/privacy-policy#cookies" onClick={closeMenu}>Cookie Policy</Link></li>
                <li><Link href="/privacy-policy#faq" onClick={closeMenu}>Privacy FAQ</Link></li>
                <li><Link href="/privacy-policy#delete" onClick={closeMenu}>Delete My Account</Link></li>
                <li><Link href="/privacy-policy#choices" onClick={closeMenu}>Your Privacy Choices</Link></li>
              </ul>
            </section>
          </div>
        </div>
      </nav>
      <div
        id="side-menu-backdrop"
        className={cx("side-menu-backdrop", isOpen && "is-visible")}
        hidden={!isOpen}
        onClick={handleBackdropClick}
      />
    </SideMenuContext.Provider>
  );
}

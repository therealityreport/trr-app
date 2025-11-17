"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSideMenu } from "@/components/SideMenuProvider";
import { logout } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";

export default function HubShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { openMenu, isOpen: isSideMenuOpen } = useSideMenu();
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement | null>(null);
  const settingsToggleRef = useRef<HTMLButtonElement | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Close settings menu on outside click/escape
  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!settingsMenuRef.current || settingsMenuRef.current.contains(target)) return;
      if (settingsToggleRef.current && settingsToggleRef.current.contains(target)) return;
      setIsSettingsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsSettingsOpen(false);
        settingsToggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSettingsOpen]);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 md:px-6 lg:px-8">
        <header className="mb-8 flex h-20 w-full items-center justify-between border-b border-black px-3 pr-6">
          <div className="flex flex-1 items-center gap-1">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-controls="side-menu"
              aria-expanded={isSideMenuOpen}
              onClick={openMenu}
              className="rounded-full p-2 transition hover:bg-zinc-100"
            >
              <svg width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.93156 22.3358C7.61245 22.3358 7.34316 22.226 7.12367 22.0066C6.90418 21.7871 6.79443 21.5178 6.79443 21.1987C6.79443 20.8796 6.90418 20.6103 7.12367 20.3909C7.34316 20.1714 7.61245 20.0616 7.93156 20.0616H24.0573C24.3764 20.0616 24.6457 20.1714 24.8652 20.3909C25.0847 20.6103 25.1944 20.8796 25.1944 21.1987C25.1944 21.5178 25.0847 21.7871 24.8652 22.0066C24.6457 22.226 24.3764 22.3358 24.0573 22.3358H7.93156ZM7.93156 17.1822C7.61245 17.1822 7.34316 17.0725 7.12367 16.8529C6.90418 16.6335 6.79443 16.3642 6.79443 16.0451C6.79443 15.726 6.90418 15.4567 7.12367 15.2372C7.34316 15.0178 7.61245 14.908 7.93156 14.908H24.0573C24.3764 14.908 24.6457 15.0178 24.8652 15.2372C25.0847 15.4567 25.1944 15.726 25.1944 16.0451C25.1944 16.3642 25.0847 16.6335 24.8652 16.8529C24.6457 17.0725 24.3764 17.1822 24.0573 17.1822H7.93156ZM7.93156 12.0286C7.61245 12.0286 7.34316 11.9189 7.12367 11.6994C6.90418 11.4799 6.79443 11.2106 6.79443 10.8915C6.79443 10.5724 6.90418 10.3031 7.12367 10.0836C7.34316 9.86414 7.61245 9.75439 7.93156 9.75439H24.0573C24.3764 9.75439 24.6457 9.86414 24.8652 10.0836C25.0847 10.3031 25.1944 10.5724 25.1944 10.8915C25.1944 11.2106 25.0847 11.4799 24.8652 11.6994C24.6457 11.9189 24.3764 12.0286 24.0573 12.0286H7.93156Z" fill="currentColor" />
              </svg>
            </button>
          </div>

          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={() => router.push("/hub")}
              className="transition hover:opacity-80"
              aria-label="Go to home"
            >
              <Image
                src="/images/logos/FullName-Black.png"
                alt="The Reality Report"
                width={320}
                height={70}
                priority
                className="w-80 h-[70.2px]"
              />
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-3">
            {user && (
              <>
                <button
                  type="button"
                  aria-label="Go to profile"
                  onClick={() => router.push("/profile")}
                  className="rounded-full p-2 transition hover:bg-zinc-100"
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 16C18.21 16 20.21 15.21 21.66 13.66C23.21 12.21 24 10.21 24 8C24 5.79 23.21 3.79 21.66 2.34C20.21 0.79 18.21 0 16 0C13.79 0 11.79 0.79 10.34 2.34C8.79 3.79 8 5.79 8 8C8 10.21 8.79 12.21 10.34 13.66C11.79 15.21 13.79 16 16 16ZM16 20C10.67 20 0 22.67 0 28V32H32V28C32 22.67 21.33 20 16 20Z" fill="currentColor" />
                  </svg>
                </button>

                <div className="relative" ref={settingsMenuRef}>
                  <button
                    type="button"
                    ref={settingsToggleRef}
                    onClick={() => setIsSettingsOpen((prev) => !prev)}
                    className="rounded-full p-2 transition hover:bg-zinc-100"
                    aria-label="Settings"
                    aria-haspopup="menu"
                    aria-expanded={isSettingsOpen}
                  >
                    <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M27.5292 17.3316C27.5806 16.9032 27.6148 16.4576 27.6148 15.9949C27.6148 15.5321 27.5806 15.0865 27.512 14.6581L30.4083 12.3959C30.6654 12.1902 30.734 11.8133 30.5797 11.5219L27.8377 6.77467C27.6662 6.4662 27.3063 6.36337 26.9978 6.4662L23.5874 7.83723C22.8676 7.28881 22.1136 6.84323 21.2738 6.50047L20.7597 2.86723C20.7083 2.52448 20.4169 2.28455 20.0742 2.28455H14.59C14.2473 2.28455 13.9731 2.52448 13.9216 2.86723L13.4075 6.50047C12.5677 6.84323 11.7966 7.30596 11.0939 7.83723L7.68346 6.4662C7.37498 6.34623 7.01508 6.4662 6.8437 6.77467L4.10164 11.5219C3.93026 11.8304 3.99881 12.1902 4.27302 12.3959L7.16932 14.6581C7.10077 15.0865 7.04936 15.5493 7.04936 15.9949C7.04936 16.4404 7.08363 16.9032 7.15219 17.3316L4.25587 19.5938C3.99881 19.7995 3.93026 20.1766 4.0845 20.4679L6.82656 25.2151C6.99795 25.5236 7.35783 25.6263 7.66632 25.5236L11.0768 24.1525C11.7966 24.7009 12.5507 25.1465 13.3904 25.4893L13.9045 29.1225C13.9731 29.4653 14.2473 29.7052 14.59 29.7052H20.0742C20.4169 29.7052 20.7083 29.4653 20.7426 29.1225L21.2566 25.4893C22.0965 25.1465 22.8676 24.6837 23.5703 24.1525L26.9807 25.5236C27.2892 25.6435 27.6491 25.5236 27.8205 25.2151L30.5625 20.4679C30.734 20.1594 30.6654 19.7995 30.3912 19.5938L27.5292 17.3316ZM17.3321 21.1363C14.5043 21.1363 12.1908 18.8226 12.1908 15.9949C12.1908 13.1671 14.5043 10.8535 17.3321 10.8535C20.1599 10.8535 22.4734 13.1671 22.4734 15.9949C22.4734 18.8226 20.1599 21.1363 17.3321 21.1363Z" fill="currentColor" />
                    </svg>
                  </button>
                  {isSettingsOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white py-2 shadow-xl"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setIsSettingsOpen(false);
                          try {
                            await logout();
                          } finally {
                            window.location.href = "/";
                          }
                        }}
                        className="flex w-full items-center justify-start px-4 py-2 text-left text-sm font-medium text-gray-800 transition hover:bg-black/5"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        <div className="rounded-3xl bg-white p-4 md:p-6">{children}</div>
      </div>
    </main>
  );
}

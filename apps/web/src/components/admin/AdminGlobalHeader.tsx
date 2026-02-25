"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminSideMenu from "@/components/admin/AdminSideMenu";
import { ADMIN_NAV_ITEMS } from "@/lib/admin/admin-navigation";
import {
  readAdminRecentShows,
  subscribeAdminRecentShows,
  type AdminRecentShowEntry,
} from "@/lib/admin/admin-recent-shows";

const usePathnameSafe =
  (typeof usePathname === "function" ? usePathname : (() => "/")) as () => string;

interface AdminGlobalHeaderProps {
  children?: ReactNode;
  bodyClassName?: string;
}

export default function AdminGlobalHeader({ children, bodyClassName = "px-6 py-6" }: AdminGlobalHeaderProps) {
  const rawPathname = usePathnameSafe();
  const pathname =
    typeof rawPathname === "string" && rawPathname.startsWith("/") ? rawPathname : "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentShows, setRecentShows] = useState<AdminRecentShowEntry[]>([]);

  useEffect(() => {
    setRecentShows(readAdminRecentShows());
    const unsubscribe = subscribeAdminRecentShows(setRecentShows);
    return unsubscribe;
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setRecentShows(readAdminRecentShows());
  }, [pathname]);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="relative flex h-20 items-center justify-center border-b border-zinc-200 px-4">
          <button
            type="button"
            aria-label="Open admin navigation menu"
            aria-controls="admin-side-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="absolute left-4 rounded-full p-2 transition hover:bg-zinc-100"
          >
            <svg width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.93156 22.3358C7.61245 22.3358 7.34316 22.226 7.12367 22.0066C6.90418 21.7871 6.79443 21.5178 6.79443 21.1987C6.79443 20.8796 6.90418 20.6103 7.12367 20.3909C7.34316 20.1714 7.61245 20.0616 7.93156 20.0616H24.0573C24.3764 20.0616 24.6457 20.1714 24.8652 20.3909C25.0847 20.6103 25.1944 20.8796 25.1944 21.1987C25.1944 21.5178 25.0847 21.7871 24.8652 22.0066C24.6457 22.226 24.3764 22.3358 24.0573 22.3358H7.93156ZM7.93156 17.1822C7.61245 17.1822 7.34316 17.0725 7.12367 16.8529C6.90418 16.6335 6.79443 16.3642 6.79443 16.0451C6.79443 15.726 6.90418 15.4567 7.12367 15.2372C7.34316 15.0178 7.61245 14.908 7.93156 14.908H24.0573C24.3764 14.908 24.6457 15.0178 24.8652 15.2372C25.0847 15.4567 25.1944 15.726 25.1944 16.0451C25.1944 16.3642 25.0847 16.6335 24.8652 16.8529C24.6457 17.0725 24.3764 17.1822 24.0573 17.1822H7.93156ZM7.93156 12.0286C7.61245 12.0286 7.34316 11.9189 7.12367 11.6994C6.90418 11.4799 6.79443 11.2106 6.79443 10.8915C6.79443 10.5724 6.90418 10.3031 7.12367 10.0836C7.34316 9.86414 7.61245 9.75439 7.93156 9.75439H24.0573C24.3764 9.75439 24.6457 9.86414 24.8652 10.0836C25.0847 10.3031 25.1944 10.5724 25.1944 10.8915C25.1944 11.2106 25.0847 11.4799 24.8652 11.6994C24.6457 11.9189 24.3764 12.0286 24.0573 12.0286H7.93156Z" fill="currentColor" />
            </svg>
          </button>

          <Link href="/admin" className="transition hover:opacity-80" aria-label="Go to admin dashboard">
            <Image
              src="/images/logos/FullName-Black.png"
              alt="The Reality Report"
              width={320}
              height={70}
              priority
              className="h-[70.2px] w-80"
            />
          </Link>
        </div>

        {children ? <div className={bodyClassName}>{children}</div> : null}
      </header>

      <AdminSideMenu
        isOpen={menuOpen}
        pathname={pathname}
        navItems={ADMIN_NAV_ITEMS}
        recentShows={recentShows}
        onClose={() => setMenuOpen(false)}
      />
    </>
  );
}

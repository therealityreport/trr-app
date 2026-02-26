"use client";

import Link from "next/link";
import type { Route } from "next";

type BrandsTabId =
  | "brands"
  | "networks-streaming"
  | "production-companies"
  | "shows"
  | "news"
  | "other";

interface BrandsTab {
  id: BrandsTabId;
  label: string;
  href: Route;
}

const BRANDS_TABS: readonly BrandsTab[] = [
  { id: "brands", label: "Brands", href: "/brands" },
  { id: "networks-streaming", label: "Networks & Streaming Services", href: "/brands/networks-and-streaming" },
  { id: "production-companies", label: "Production Companies", href: "/brands/production-companies" },
  { id: "shows", label: "Shows & Franchises", href: "/brands/shows-and-franchises" },
  { id: "news", label: "Publications / News", href: "/brands/news" },
  { id: "other", label: "Other", href: "/brands/other" },
];

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

interface BrandsTabsProps {
  activeTab: BrandsTabId;
  className?: string;
}

export default function BrandsTabs({ activeTab, className }: BrandsTabsProps) {
  return (
    <nav className={cx("flex flex-wrap gap-2", className)} aria-label="Brands tabs">
      {BRANDS_TABS.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

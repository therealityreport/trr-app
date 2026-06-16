"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";

interface NavLink {
  key: string;
  label: string;
  href?: string | null;
  isActive?: boolean;
}

interface RedditAdminShellProps {
  breadcrumbs: Parameters<typeof AdminBreadcrumbs>[0]["items"];
  title: string;
  backHref: string;
  backLabel?: string;
  seasonLinks: NavLink[];
  socialLinks: NavLink[];
  hero?: ReactNode;
  children: ReactNode;
}

const navLinkClass = (isActive: boolean, kind: "season" | "social"): string => {
  if (kind === "season") {
    return `rounded-full border px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
    }`;
  }
  return `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
    isActive
      ? "border-zinc-800 bg-zinc-800 text-white"
      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
  }`;
};

const renderLink = (item: NavLink, kind: "season" | "social") => {
  const classes = navLinkClass(Boolean(item.isActive), kind);
  return item.href ? (
    <a key={item.key} href={item.href} className={classes}>
      {item.label}
    </a>
  ) : (
    <span key={item.key} className={classes}>
      {item.label}
    </span>
  );
};

export default function RedditAdminShell({
  breadcrumbs,
  title,
  backHref,
  backLabel = "Back",
  seasonLinks,
  socialLinks,
  hero,
  children,
}: RedditAdminShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminGlobalHeader bodyClassName="px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <AdminBreadcrumbs items={breadcrumbs} className="mb-1" />
            <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
          </div>
          <Link
            href={backHref as Route}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            {backLabel}
          </Link>
        </div>
      </AdminGlobalHeader>

      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <nav className="flex flex-wrap gap-2 py-4" aria-label="Season tabs">
            {seasonLinks.map((item) => renderLink(item, "season"))}
          </nav>
          <nav className="flex flex-wrap gap-2 pb-4" aria-label="Social analytics tabs">
            {socialLinks.map((item) => renderLink(item, "social"))}
          </nav>
          {hero && <div className="pb-6">{hero}</div>}
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">{children}</main>
    </div>
  );
}

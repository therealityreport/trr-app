"use client";

import { Suspense, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  resolveDesignDocSection,
  type DesignDocSectionId,
} from "@/lib/admin/design-docs-config";
import DesignDocsSidebar from "./DesignDocsSidebar";
import "./design-docs.css";

const LoadingFallback = () => (
  <div className="py-16 text-center text-sm text-zinc-400">Loading section...</div>
);

const load = (path: string) =>
  dynamic(() => import(`./sections/${path}`), { loading: LoadingFallback });

const sectionComponents: Record<DesignDocSectionId, ComponentType> = {
  overview: load("OverviewSection"),
  "app-styles": load("AppStylesSection"),
  heroes: load("HeroesSection"),
  typography: load("TypographySection"),
  "fonts-showcase": load("FontsShowcaseSection"),
  colors: load("ColorsSection"),
  shapes: load("ShapesSection"),
  icons: load("IconsSection"),
  illustrations: load("IllustrationsSection"),
  galleries: load("GalleriesSection"),
  carousels: load("CarouselsSection"),
  charts: load("ChartsSection"),
  maps: load("MapsSection"),
  cards: load("CardsSection"),
  "tables-data": load("TablesDataSection"),
  forms: load("FormsSection"),
  navigation: load("NavigationSection"),
  "interactive-elements": load("InteractiveElementsSection"),
  animations: load("AnimationsSection"),
  components: load("ComponentsSection"),
  layout: load("LayoutSection"),
  "grids-deep": load("GridsDeepSection"),
  responsive: load("ResponsiveSection"),
  newsletters: load("NewslettersSection"),
  patterns: load("PatternsSection"),
  "brand-nyt-games": load("BrandNYTGamesSection"),
  "brand-nyt-magazine": load("BrandNYTMagazineSection"),
  "brand-wirecutter": load("BrandWirecutterSection"),
  "brand-the-athletic": load("BrandTheAthleticSection"),
  "brand-nyt-opinion": load("BrandNYTOpinionSection"),
  "brand-nyt-cooking": load("BrandNYTCookingSection"),
  "brand-nyt-style": load("BrandNYTStyleSection"),
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "nyt-articles": load("NYTArticlesSection"),
};

interface Props {
  activeSection: DesignDocSectionId;
}

export default function DesignDocsPageClient({ activeSection }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const section = resolveDesignDocSection(activeSection);
  const ActiveComponent = sectionComponents[activeSection];
  const breadcrumbs = buildAdminSectionBreadcrumb(
    "Design Docs",
    "/admin/design-docs",
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-400">Checking access...</div>
      </div>
    );
  }

  if (!user || !hasAccess) return null;

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-4">
          <AdminBreadcrumbs items={breadcrumbs} />
          <div className="mt-2 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Design Docs
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Data visualization and editorial design system reference
              </p>
            </div>
            <Link
              href={"/admin" as Route}
              className="shrink-0 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900"
            >
              Back to Admin
            </Link>
          </div>

          {/* Mobile hamburger for section nav */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-900 lg:hidden"
            aria-label="Open section navigation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
            {section.label}
          </button>
        </AdminGlobalHeader>

        <div className="flex">
          <DesignDocsSidebar
            activeSection={activeSection}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="min-w-0 flex-1 px-6 py-8">
            <div className="design-docs mx-auto max-w-4xl">
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </ClientOnly>
  );
}

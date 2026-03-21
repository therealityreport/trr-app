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
  DESIGN_DOC_SECTIONS,
  resolveDesignDocSection,
  type DesignDocSectionId,
} from "@/lib/admin/design-docs-config";
import DesignDocsSidebar from "./DesignDocsSidebar";
import "./design-docs.css";

const LoadingFallback = () => (
  <div className="py-16 text-center text-sm text-zinc-400">Loading section...</div>
);

const sectionComponents: Record<DesignDocSectionId, ComponentType> = {
  overview: dynamic(() => import("./sections/OverviewSection"), {
    loading: LoadingFallback,
  }),
  typography: dynamic(() => import("./sections/TypographySection"), {
    loading: LoadingFallback,
  }),
  colors: dynamic(() => import("./sections/ColorsSection"), {
    loading: LoadingFallback,
  }),
  shapes: dynamic(() => import("./sections/ShapesSection"), {
    loading: LoadingFallback,
  }),
  charts: dynamic(() => import("./sections/ChartsSection"), {
    loading: LoadingFallback,
  }),
  maps: dynamic(() => import("./sections/MapsSection"), {
    loading: LoadingFallback,
  }),
  cards: dynamic(() => import("./sections/CardsSection"), {
    loading: LoadingFallback,
  }),
  components: dynamic(() => import("./sections/ComponentsSection"), {
    loading: LoadingFallback,
  }),
  layout: dynamic(() => import("./sections/LayoutSection"), {
    loading: LoadingFallback,
  }),
  responsive: dynamic(() => import("./sections/ResponsiveSection"), {
    loading: LoadingFallback,
  }),
  newsletters: dynamic(() => import("./sections/NewslettersSection"), {
    loading: LoadingFallback,
  }),
  patterns: dynamic(() => import("./sections/PatternsSection"), {
    loading: LoadingFallback,
  }),
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
            sections={DESIGN_DOC_SECTIONS}
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

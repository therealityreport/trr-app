"use client";

import { Suspense, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
// AdminGlobalHeader and AdminBreadcrumbs removed — using NYT-styled slim top bar
// import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
// import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
// import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_DESIGN_DOCS_PATH, ADMIN_ROOT_PATH } from "@/lib/admin/admin-route-paths";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  getBrandScopeClass,
  resolveDesignDocSection,
  type DesignDocSectionId,
} from "@/lib/admin/design-docs-config";
import DesignDocsSidebar from "./DesignDocsSidebar";
import ArticleDetailPage from "./ArticleDetailPage";
import "./design-docs.css";

const LoadingFallback = () => (
  <div className="py-16 text-center text-sm text-zinc-400">Loading section...</div>
);

const GameArticleDetailPage = dynamic(() => import("./GameArticleDetailPage"), {
  loading: LoadingFallback,
});

const VotingDeadlinesArticle = dynamic(() => import("./VotingDeadlinesArticle"), {
  loading: LoadingFallback,
});

const load = (path: string) =>
  dynamic(() => import(`./sections/${path}`), { loading: LoadingFallback });

/* Brand tab components — dynamically imported per tab */
const nytTabComponents: Record<string, ComponentType> = {
  typography: load("brand-nyt/BrandNYTTypography"),
  colors: load("brand-nyt/BrandNYTColors"),
  layout: load("brand-nyt/BrandNYTLayout"),
  architecture: load("brand-nyt/BrandNYTArchitecture"),
  charts: load("brand-nyt/BrandNYTCharts"),
  components: load("brand-nyt/BrandNYTComponents"),
  resources: load("brand-nyt/BrandNYTResources"),
};

const athleticTabComponents: Record<string, ComponentType> = {
  typography: load("brand-athletic/BrandAthleticTypography"),
  colors: load("brand-athletic/BrandAthleticColors"),
  components: load("brand-athletic/BrandAthleticComponents"),
  icons: load("brand-athletic/BrandAthleticIcons"),
  layouts: load("brand-athletic/BrandAthleticLayouts"),
  layout: load("brand-athletic/BrandAthleticLayout"),
  shapes: load("brand-athletic/BrandAthleticShapes"),
  resources: load("brand-athletic/BrandAthleticResources"),
};

const nymagTabComponents: Record<string, ComponentType> = {
  typography: load("brand-nymag/BrandNYMagTypography"),
  colors: load("brand-nymag/BrandNYMagColors"),
  components: load("brand-nymag/BrandNYMagComponents"),
  layout: load("brand-nymag/BrandNYMagLayout"),
  shapes: load("brand-nymag/BrandNYMagShapes"),
  resources: load("brand-nymag/BrandNYMagResources"),
};

const sectionComponents: Record<DesignDocSectionId, ComponentType> = {
  overview: load("OverviewSection"),
  "app-styles": load("AppStylesSection"),
  "gpt54-delightful-frontends": load("Gpt54DelightfulFrontendsSection"),
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
  "brand-nyt": load("BrandNYTSection"),
  "brand-nyt-games": load("BrandNYTGamesSection"),
  "brand-nyt-magazine": load("BrandNYTMagazineSection"),
  "brand-wirecutter": load("BrandWirecutterSection"),
  "brand-the-athletic": load("BrandTheAthleticSection"),
  "brand-nyt-opinion": load("BrandNYTOpinionSection"),
  "brand-nyt-cooking": load("BrandNYTCookingSection"),
  "brand-nyt-style": load("BrandNYTStyleSection"),
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "brand-nymag": load("BrandNYMagSection"),
  "athletic-articles": load("AthleticArticlesSection"),
  "nyt-articles": load("NYTArticlesSection"),
  "nyt-tech-stack": load("NytTechStackSection"),
  "nyt-games-articles": load("NYTGamesArticlesSection"),
};

interface Props {
  activeSection: DesignDocSectionId;
  /** When set, renders ArticleDetailPage inside the shell instead of the section component */
  articleSlug?: string;
  /** When set, renders a specific brand tab page instead of the full brand section */
  brandTab?: string;
}

export default function DesignDocsPageClient({ activeSection, articleSlug, brandTab }: Props) {
  const { user, checking, hasAccess } = useAdminGuard();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const section = resolveDesignDocSection(activeSection);
  const ActiveComponent = sectionComponents[activeSection];
  const brandScope = getBrandScopeClass(activeSection);
  const brandScopeClassName = brandScope
    ? `dd-brand-scoped ${brandScope}`
    : "";
  // breadcrumbs removed — using NYT-styled slim top bar

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-sm text-zinc-400">Checking access...</div>
      </div>
    );
  }

  if (!user || !hasAccess) return null;

  /* Full-page article reproduction: bypass the design docs shell entirely */
  if (articleSlug === "voting-deadlines-state") {
    return (
      <ClientOnly>
        <Suspense fallback={<LoadingFallback />}>
          <VotingDeadlinesArticle />
        </Suspense>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      {/* NYT web fonts */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="https://g1.nyt.com/fonts/css/web-fonts.c851560786173ad206e1f76c1901be7e096e8f8b.css"
        crossOrigin="anonymous"
      />

      <div className="min-h-screen bg-white">
        {/* ── Slim top bar — hamburger + title + admin link ── */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 48,
            padding: "0 16px",
            borderBottom: "1px solid #e2e2e2",
            backgroundColor: "#fff",
            fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "#121212",
                display: "flex",
                alignItems: "center",
              }}
              aria-label="Open navigation"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="2" y1="4.5" x2="16" y2="4.5" />
                <line x1="2" y1="9" x2="16" y2="9" />
                <line x1="2" y1="13.5" x2="16" y2="13.5" />
              </svg>
            </button>

            {/* Title */}
            <span
              style={{
                fontFamily: '"nyt-cheltenham", georgia, "times new roman", times, serif',
                fontSize: 17,
                fontWeight: 700,
                color: "#121212",
                letterSpacing: "-0.01em",
              }}
            >
              Design Docs
            </span>

            {/* Section label */}
            <span
              style={{
                fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: "#727272",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {section.label}
            </span>
          </div>

          {/* Admin link */}
          <Link
            href={ADMIN_ROOT_PATH}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: "#363636",
              textDecoration: "none",
              padding: "4px 8px",
              borderRadius: 3,
              transition: "color 0.15s",
            }}
          >
            ← Admin
          </Link>
        </header>

        {/* Drawer sidebar */}
        <DesignDocsSidebar
          activeSection={activeSection}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* ── Main content — full width ── */}
        <main
          className={`${brandScopeClassName}`}
          style={{
            padding: "32px 24px",
            ...(brandScope ? { backgroundColor: "var(--dd-brand-bg)" } : {}),
          }}
        >
          <div className={`design-docs mx-auto max-w-4xl ${brandScope ?? ""}`}>
            {articleSlug && activeSection === "nyt-games-articles" ? (
              <GameArticleDetailPage gameId={articleSlug} />
            ) : articleSlug ? (
              <ArticleDetailPage articleId={articleSlug} />
            ) : brandTab ? (
              <Suspense fallback={<LoadingFallback />}>
                {(() => {
                  // --- Brand tab routing ---
                  // To add tabs for a new brand:
                  // 1. Create tab component map: const newBrandTabComponents: Record<string, ComponentType> = { ... }
                  // 2. Add a case here: case "brand-{slug}": return newBrandTabComponents;
                  // 3. Create the tab page files in sections/brand-{slug}/
                  const tabMap =
                    activeSection === "brand-nyt"
                      ? nytTabComponents
                      : activeSection === "brand-the-athletic"
                        ? athleticTabComponents
                        : activeSection === "brand-nymag"
                          ? nymagTabComponents
                          : null;
                  const TabComponent = tabMap?.[brandTab];
                  return TabComponent ? <TabComponent /> : <ActiveComponent />;
                })()}
              </Suspense>
            ) : (
              <Suspense fallback={<LoadingFallback />}>
                <ActiveComponent />
              </Suspense>
            )}
          </div>
        </main>
      </div>
    </ClientOnly>
  );
}

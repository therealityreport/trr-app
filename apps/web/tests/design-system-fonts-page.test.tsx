import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import DesignSystemPageClient from "@/components/admin/design-system/DesignSystemPageClient";
import { getGeneratedBrandFontMatchesApiResponse } from "@/lib/fonts/brand-fonts";

const navigationState = vi.hoisted(() => ({
  push: vi.fn(),
}));

const guardState = {
  user: { email: "admin@example.com", uid: "admin-1" },
  checking: false,
  hasAccess: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => navigationState,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => guardState,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div>Breadcrumbs</div>,
}));

const hostedFontsCss = `
@font-face {
  font-family: "Hamburg Serial";
  src: url("/fonts/trr/Hamburg%20Serial/regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "NYTKarnak_Condensed";
  src: url("/fonts/reference%20fonts/NYTimes/NYTKarnak_Condensed") format("woff2");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Rude Slab Condensed";
  src: url("/fonts/reference%20fonts/NYTimes/Rude%20Slab%20Condensed") format("woff2");
  font-weight: 700;
  font-style: normal;
}
`;

const typographyState = {
  sets: [
    {
      id: "set-1",
      slug: "frontend-base",
      name: "Frontend Base",
      area: "user-frontend",
      seedSource: "manual",
      createdAt: "",
      updatedAt: "",
      roles: {
        body: {
          mobile: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
        },
      },
    },
    {
      id: "set-2",
      slug: "survey-hero",
      name: "Survey Hero",
      area: "surveys",
      seedSource: "manual",
      createdAt: "",
      updatedAt: "",
      roles: {
        heading: {
          mobile: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "28px",
            fontWeight: "700",
            lineHeight: "32px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "40px",
            fontWeight: "700",
            lineHeight: "42px",
            letterSpacing: "0px",
          },
        },
      },
    },
  ],
  assignments: [],
};

const refreshedBrandMatchesResponse = {
  ...getGeneratedBrandFontMatchesApiResponse(),
  source: "live-regenerated" as const,
  generatedAt: "2026-03-22T16:30:00.000Z",
  inputHash: "live-refresh-hash",
  refreshMode: "local-rerank" as const,
  scoringMode: "visual+metadata" as const,
};

describe("design system fonts page", () => {
  beforeEach(() => {
    navigationState.push.mockReset();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/hosted-fonts.css") {
          return new Response(hostedFontsCss, { status: 200 });
        }
        if (url === "/api/admin/design-system/typography") {
          return new Response(JSON.stringify(typographyState), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url === "/api/admin/design-system/brand-font-matches?refresh=1") {
          return new Response(JSON.stringify(refreshedBrandMatchesResponse), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("", { status: 404 });
      }),
    );
  });

  it("supports search, compare, previews, and typography-set cross-links", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();
    expect(screen.getByText("Browse hosted, Google, stack, and reference families used across the app.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search fonts"), {
      target: { value: "Hamburg" },
    });

    const hamburgCard = await screen.findByTestId("font-card-Hamburg Serial");
    expect(hamburgCard).toBeInTheDocument();
    expect(screen.queryByTestId("font-card-Gloucester")).not.toBeInTheDocument();

    fireEvent.click(within(hamburgCard).getByRole("button", { name: "Compare" }));
    const comparisonTray = await screen.findByText("Comparison tray");
    expect(comparisonTray).toBeInTheDocument();
    expect(within(comparisonTray.closest("section")!).getAllByText("Hamburg Serial").length).toBeGreaterThan(0);

    fireEvent.click(within(hamburgCard).getByRole("button", { name: /Hamburg Serial/i }));
    fireEvent.click((await within(hamburgCard).findAllByRole("button", { name: "Home" }))[0]!);

    const modal = await screen.findByTestId("font-usage-preview-modal");
    expect(within(modal).getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(within(modal).getByRole("link", { name: "Open actual page" })).toHaveAttribute("href", "/");

    fireEvent.click(within(hamburgCard).getByRole("button", { name: "Frontend Base" }));
    expect(navigationState.push).toHaveBeenCalledWith("/design-system/fonts/typography?set=set-1");
  });

  it("applies source filters and sort controls", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    await screen.findByText("Fonts Library");

    fireEvent.click(screen.getByRole("button", { name: "Reference" }));
    expect(await screen.findByTestId("font-card-NYTKarnak Condensed")).toBeInTheDocument();
    expect(await screen.findByTestId("font-card-Rude Slab Condensed")).toBeInTheDocument();
    expect(screen.queryByTestId("font-card-Hamburg Serial")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Font sort"), {
      target: { value: "most-used" },
    });
    expect(screen.getByLabelText("Font sort")).toHaveValue("most-used");
  });

  it("shows generated multi-style coverage for additional TRR families", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search fonts"), {
      target: { value: "Rude Slab" },
    });

    const rudeSlabCard = await screen.findByTestId("font-card-Rude Slab");
    expect(rudeSlabCard).toBeInTheDocument();
    expect(within(rudeSlabCard).getByText("24 styles")).toBeInTheDocument();
  });

  it("supports the brand matches mode and jumps back into the catalog", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Brand Matches" }));

    expect(await screen.findByText("Brand Font Matches")).toBeInTheDocument();
    const panel = await screen.findByTestId("brand-font-matches-panel");
    expect(panel).toBeInTheDocument();

    const ingredientListRow = await screen.findByTestId("brand-match-brand-nyt-cooking-Ingredient-List");
    expect(within(ingredientListRow).getAllByText("Franklin Gothic").length).toBeGreaterThan(0);
    expect(within(ingredientListRow).getByText("Weighted score breakdown")).toBeInTheDocument();
    expect(within(ingredientListRow).getByText(/balanced-visual|explicit-mapping-visual|metadata-only/i)).toBeInTheDocument();

    fireEvent.click(within(ingredientListRow).getByRole("button", { name: "Compare" }));

    const comparisonTray = await screen.findByText("Comparison tray");
    expect(within(comparisonTray.closest("section")!).getAllByText("Franklin Gothic").length).toBeGreaterThan(0);

    fireEvent.click(within(ingredientListRow).getByRole("button", { name: "Catalog" }));

    const searchInput = await screen.findByLabelText("Search fonts");
    expect(searchInput).toHaveValue("Franklin Gothic");
    expect(await screen.findByTestId("font-card-Franklin Gothic")).toBeInTheDocument();
  });

  it("renders NYT Games secondary display specimens in the source font family", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Brand Matches" }));

    const row = await screen.findByTestId("brand-match-brand-nyt-games-Secondary-Display");
    const specimen = within(row).getByTestId("brand-specimen-brand-nyt-games-Secondary-Display");

    expect(specimen).toHaveTextContent("Stymie Bold");
    expect(specimen.getAttribute("style")).toContain("font-family: Stymie, Georgia, serif;");
    expect(specimen).toHaveStyle({ fontWeight: "700" });
  });

  it("runs a live brand-match refresh from the top container", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Brand Matches" }));
    expect(await screen.findByTestId("brand-font-matches-panel")).toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: "Rebuild Rankings" });
    fireEvent.click(refreshButton);

    expect(await within(screen.getByTestId("brand-font-matches-panel")).findByText("local-rerank")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/admin/design-system/brand-font-matches?refresh=1",
      expect.objectContaining({ cache: "no-store" }),
    );
  }, 10000);
});

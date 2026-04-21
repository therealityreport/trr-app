import { render, screen } from "@testing-library/react";

import BrandNYTSection from "@/components/admin/design-docs/sections/BrandNYTSection";
import BrandNYTComponents from "@/components/admin/design-docs/sections/brand-nyt/BrandNYTComponents";
import BrandNYTHomepage from "@/components/admin/design-docs/sections/brand-nyt/BrandNYTHomepage";
import { NYT_HOMEPAGE_RENDER_SECTIONS } from "@/lib/admin/nyt-homepage-preview-config";
import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

describe("NYT homepage design docs surfaces", () => {
  it("keeps a stable homepage snapshot contract", () => {
    expect(NYT_HOMEPAGE_SNAPSHOT.capturedAt).toBe("2026-04-21");
    expect(NYT_HOMEPAGE_RENDER_SECTIONS.map((section) => section.id)).toEqual([
      "edition-rail",
      "masthead",
      "nested-nav",
      "lead-programming",
      "inline-interactives",
      "watch-todays-videos",
      "more-news",
      "product-rails",
      "site-index",
      "footer",
    ]);
    expect(
      NYT_HOMEPAGE_SNAPSHOT.productRails.find((rail) => rail.label === "Games Daily puzzles")
        ?.items,
    ).toContain("Wordle");
    expect(
      NYT_HOMEPAGE_SNAPSHOT.scripts.some((asset) => asset.href.includes("nestedNav")),
    ).toBe(true);
    expect(NYT_HOMEPAGE_SNAPSHOT.sourceBundle.html.rendered).toContain("nyt-homepage-2026-04-21");
  });

  it("renders the NYT homepage source-order overview", () => {
    render(<BrandNYTHomepage />);

    expect(screen.getByRole("heading", { level: 2, name: "NYT Homepage" })).toBeInTheDocument();
    expect(screen.getByText("Scrapling Export")).toBeInTheDocument();
    expect(screen.getAllByText("Homepage Page").length).toBeGreaterThan(0);
    expect(screen.getByText("Shell Sequence")).toBeInTheDocument();
    expect(screen.getAllByText("Edition Rail").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Floating / Desktop Nested Nav").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Watch Today’s Videos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("More News").length).toBeGreaterThan(0);
    expect(screen.getByText("Bundle Split")).toBeInTheDocument();
  });

  it("renders homepage components as stacked live-derived specimens", () => {
    render(<BrandNYTComponents />);

    expect(screen.getByText("Homepage Components")).toBeInTheDocument();
    expect(screen.getByText("Nested nav menu")).toBeInTheDocument();
    expect(screen.getByText("Programming node")).toBeInTheDocument();
    expect(screen.getByText("Video feed")).toBeInTheDocument();
    expect(screen.getAllByText("Scrapling HTML export").length).toBeGreaterThan(0);
    expect(screen.getByText("Homepage Package Containers")).toBeInTheDocument();
    expect(screen.getByText("Culture and Lifestyle")).toBeInTheDocument();
  });

  it("promotes the homepage as a first-class card on the NYT landing page", () => {
    render(<BrandNYTSection />);

    expect(screen.getByRole("link", { name: /Homepage/i })).toHaveAttribute(
      "href",
      "/design-docs/brand-nyt/homepage",
    );
    expect(screen.getByText(/The NYT homepage is its own product surface/i)).toBeInTheDocument();
  });
});

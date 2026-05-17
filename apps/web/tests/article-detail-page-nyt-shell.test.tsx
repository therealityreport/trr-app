import { fireEvent, render, screen } from "@testing-library/react";

import ArticleDetailPage from "@/components/admin/design-docs/ArticleDetailPage";
import { ARTICLES, getPreferredArticleShareImage } from "@/lib/admin/design-docs-config";

describe("NYT shell facsimile for trump tariffs reaction", () => {
  const article = ARTICLES.find((entry) => entry.id === "trump-tariffs-reaction");

  it("prefers the 16:9 social image for the article featured image", () => {
    expect(article).toBeDefined();

    const image = getPreferredArticleShareImage(article!);

    expect(image).toMatchObject({
      name: "video16x9-3000",
      url: expect.stringContaining("videoSixteenByNine3000"),
    });
  });

  it("renders the shell and storyline sections before the article header and shows all social images", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    const shellHeading = screen.getByRole("heading", { level: 2, name: "Site Header Shell" });
    const storylineHeading = screen.getByRole("heading", { level: 2, name: "Tariffs and Trade" });
    const headerHeading = screen.getByRole("heading", { level: 2, name: "Header" });

    expect(shellHeading.compareDocumentPosition(storylineHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(storylineHeading.compareDocumentPosition(headerHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(screen.getByTestId("interactive-masthead-spacer")).toBeInTheDocument();
    expect(screen.getByText("Social & OG Images")).toBeInTheDocument();
    expect(screen.getByText(/facebookJumbo/)).toBeInTheDocument();
    expect(screen.getByText(/video16x9-3000/)).toBeInTheDocument();
    expect(screen.getByText(/video16x9-1600/)).toBeInTheDocument();
    expect(screen.getByText(/google4x3/)).toBeInTheDocument();
    expect(screen.getByText(/square3x/)).toBeInTheDocument();
  });

  it("opens and dismisses the menu, search panel, and account drawer", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    fireEvent.click(screen.getByTestId("nyt-shell-menu-button"));
    expect(screen.getByRole("dialog", { name: "Section Navigation" })).toBeInTheDocument();

    const usToggle = screen.getByTestId("menu-toggle-U.S.");
    fireEvent.click(usToggle);
    expect(screen.queryByTestId("hamburger-pane-U.S.")).not.toBeInTheDocument();
    fireEvent.click(usToggle);
    expect(screen.getByTestId("hamburger-pane-U.S.")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Section Navigation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("nyt-shell-search-button"));
    expect(screen.getByRole("dialog", { name: "Search The New York Times" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Search The New York Times" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("nyt-shell-account-button"));
    const drawer = screen.getByRole("dialog", { name: "Account Information" });
    expect(drawer).toBeInTheDocument();
    const overlay = drawer.parentElement;
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(screen.queryByRole("dialog", { name: "Account Information" })).not.toBeInTheDocument();
  });
});

describe("NYT standard article inventory", () => {
  const article = ARTICLES.find((entry) => entry.id === "fertility-rates-decline");
  const upshotArticle = ARTICLES.find((entry) => entry.id === "births-decline-older-mothers");

  it("documents the article shell, action chrome, icon assets, and explicit no-chart state", () => {
    expect(article).toBeDefined();

    const fertilityArticle = article as NonNullable<typeof article> & {
      tools: Record<string, string>;
      chartTypes: readonly unknown[];
      contentBlocks: readonly { type: string }[];
      architecture: { publicAssets: { icons: readonly unknown[] } };
    };
    expect(fertilityArticle.tools).toMatchObject({
      topper: "lead news photo",
      charts: "none",
      framework: "NYT standard article shell",
    });
    expect(fertilityArticle.tools.components).toContain("article header");
    expect(fertilityArticle.chartTypes).toHaveLength(0);
    expect(fertilityArticle.contentBlocks.map((block: { type: string }) => block.type)).toEqual([
      "component-inventory",
      "body-section-outline",
      "header",
      "byline",
      "sharetools-bar",
      "featured-image",
      "author-bio",
    ]);
    expect(fertilityArticle.architecture.publicAssets.icons).toHaveLength(5);
  });

  it("renders the icon inventory and Graphs / Charts empty state", () => {
    render(<ArticleDetailPage articleId="fertility-rates-decline" />);

    expect(screen.getByRole("heading", { level: 3, name: "Icons & SVGs" })).toBeInTheDocument();
    expect(screen.getAllByText("listen-play").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 3, name: "Graphs / Charts" })).toBeInTheDocument();
    expect(screen.getByText(/No graph or chart components are documented for this page/)).toBeInTheDocument();
  });

  it("documents the Upshot births article with complete shell, sticky header, footer, and chart inventory", () => {
    expect(upshotArticle).toBeDefined();

    const birthsArticle = upshotArticle as NonNullable<typeof upshotArticle> & {
      tools: Record<string, string>;
      chartTypes: readonly unknown[];
      contentBlocks: readonly { type: string }[];
      cssInfo: { styleRules: string };
      architecture: {
        dataArchitecture: {
          chromeExtensionInventory: {
            blueButtonPrompt: {
              openGraph: number;
              scripts: number;
              article: number;
            };
          };
        };
      };
    };

    expect(birthsArticle.tools).toMatchObject({
      topper: "none",
      framework:
        "NYT vi-story standard article shell + Datawrapper source charts recreated as editable React/SVG chart primitives; Datadog RUM is analytics/observability, not the chart renderer",
    });
    expect(birthsArticle.tools.components).toContain("sticky site header");
    expect(birthsArticle.tools.components).toContain("comment/more actions");
    expect(birthsArticle.chartTypes).toHaveLength(4);
    expect(birthsArticle.contentBlocks.map((block) => block.type)).toEqual(
      expect.arrayContaining([
        "site-header-shell",
        "sticky-header",
        "component-inventory",
        "datawrapper-chart",
        "ad-container",
        "related-link",
        "site-footer",
      ]),
    );
    expect(birthsArticle.cssInfo.styleRules).toContain("Open Graph 6");
    expect(birthsArticle.architecture.dataArchitecture.chromeExtensionInventory.blueButtonPrompt).toMatchObject({
      openGraph: 6,
      scripts: 42,
      article: 12,
    });
  });

  it("renders the Upshot article title, sticky header, component checklist, and all documented chart slots", () => {
    render(<ArticleDetailPage articleId="births-decline-older-mothers" />);

    expect(
      screen.getAllByText("Women in Their 20s May Not Be Having Babies, but by 45 Most Probably Will").length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2, name: "Site Header Shell" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Sticky Article Header" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2, name: "Complete Article Component Inventory" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Women are postponing pregnancy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Datawrapper IWlRs v12").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Change in the U.S. birth rate by age group since 2007").length).toBeGreaterThan(0);
    expect(screen.getByText("-72%")).toBeInTheDocument();
    expect(screen.getAllByText("... most women eventually have two children, on average").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fewer women give birth by 30, but most catch up").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2, name: "The New York Times" })).toBeInTheDocument();
  });
});

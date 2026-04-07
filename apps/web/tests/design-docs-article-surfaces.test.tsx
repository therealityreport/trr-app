import { render, screen, within } from "@testing-library/react";

import ArticleDetailPage from "@/components/admin/design-docs/ArticleDetailPage";
import NYTArticlesSection from "@/components/admin/design-docs/sections/NYTArticlesSection";

describe("Design docs article surfaces", () => {
  it("keeps Athletic articles out of the NYT article list and shows NYT featured images", () => {
    render(<NYTArticlesSection />);

    const trumpHeading = screen.getByRole("heading", {
      name: "Trump Said He'd Unleash the Economy in Year 1. Here's How He Did.View Design Breakdown →",
    });
    const trumpCard = trumpHeading.closest("div[style*='margin-bottom: 32px']");

    expect(trumpHeading).toBeInTheDocument();
    expect(trumpCard).not.toBeNull();
    expect(
      screen.queryByRole("heading", {
        name: /Ranking NFL playoff coaches by who gives their team biggest edge on fourth down/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      within(trumpCard as HTMLElement).getByAltText("Trump Said He'd Unleash the Economy in Year 1. Here's How He Did."),
    ).toBeInTheDocument();
    expect(trumpCard).toHaveTextContent("Featured image: video16x9-3000 · 16:9 · 3000px · PNG");
    expect(
      within(trumpCard as HTMLElement).getByAltText("Trump Said He'd Unleash the Economy in Year 1. Here's How He Did.").parentElement,
    ).toHaveStyle({ aspectRatio: "16 / 9" });
    expect(screen.getAllByText("Promise Tracker Sections")).toHaveLength(1);
  });

  it("falls back to the article og image in the detail page Images section", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    expect(screen.getByRole("heading", { name: "Images" })).toBeInTheDocument();
    expect(screen.getByText("Social & OG Images")).toBeInTheDocument();
    expect(screen.getByAltText(/featuredImage/i)).toBeInTheDocument();
  });

  it("uses the trade-treemap ai2html overlays and source dimensions for trump tariffs reaction", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    expect(
      screen.getAllByText((_, node) => node?.textContent?.includes("A few of the biggest economies") ?? false).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Switz.")).toBeInTheDocument();
    expect(screen.queryByText("Start with dollars")).not.toBeInTheDocument();
    expect(screen.getByText(/Mobile · 700×880px · PNG \+ HTML overlays/i)).toBeInTheDocument();
    expect(screen.getByText(/Desktop · 1200×900px · PNG \+ HTML overlays/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Note: Boxes sized by value of exports to the United States\. Only the 20 largest exporters to the U\.S\. are shown\./i),
    ).toBeInTheDocument();
  });

  it("matches the NYT tariff response table statuses and note copy", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    const indiaRow = screen
      .getAllByText("India")
      .map((element) => element.closest("tr"))
      .find((row) => row);

    expect(indiaRow).not.toBeNull();
    expect(within(indiaRow as HTMLElement).getByText("Offered")).toBeInTheDocument();
    expect(within(indiaRow as HTMLElement).getByText("concessions")).toBeInTheDocument();
    expect(
      within(indiaRow as HTMLElement).getByText(
        /Approved a few concessions in March, like reducing tariffs on bourbon, but has since been relatively silent\./i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Note: Goods from Canada and Mexico that fall under the U\.S\.M\.C\.A\. trade pact/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses NYT article typography for the treemap metadata and tariff table", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);
    const tariffTable = screen
      .getAllByRole("table")
      .find((element) => element.textContent?.includes("Tradingpartner"));
    const statusHeader = screen
      .getAllByText("Status")
      .find((element) => element.tagName.toLowerCase() === "th");

    expect(tariffTable).toBeDefined();
    expect(tariffTable as HTMLElement).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
    });
    expect(statusHeader).toBeDefined();
    expect(statusHeader as HTMLElement).toHaveStyle({
      fontSize: "11px",
      fontWeight: "400",
      lineHeight: "11px",
      color: "rgb(153, 153, 153)",
      textTransform: "uppercase",
    });
    expect(
      screen.getByText(
        /Note: Goods from Canada and Mexico that fall under the U\.S\.M\.C\.A\. trade pact/i,
      ),
    ).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
      fontSize: "13px",
      fontWeight: "500",
      lineHeight: "17px",
      color: "rgb(114, 114, 114)",
    });
    expect(
      screen.getByText(/Note: Boxes sized by value of exports to the United States\. Only the 20 largest exporters to the U\.S\. are shown\./i),
    ).toBeInTheDocument();
  });

  it("matches the NYT Birdkit tariff-rate arrow chart structure and typography", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-us-imports" />);

    const chart = screen.getByTestId("tariff-rate-arrow-chart");
    const title = within(chart).getByRole("heading", {
      name: "Change in trade-weighted average tariff rate",
    });
    const chinaLabel = within(chart).getByRole("heading", { name: "China" });
    const priorValue = within(chart).getByText("11.4%");
    const afterValue = within(chart).getByText("105.7%");

    expect(title).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "17px",
      fontWeight: "700",
      lineHeight: "22px",
      letterSpacing: "normal",
      color: "rgb(54, 54, 54)",
    });
    expect(within(chart).getByText("Among the 10 largest U.S. import partners")).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "15px",
      fontWeight: "400",
      lineHeight: "19px",
      letterSpacing: "normal",
      color: "rgb(119, 119, 119)",
    });
    expect(chinaLabel).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "16px",
      color: "rgb(54, 54, 54)",
    });
    expect(priorValue).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "14px",
      fontWeight: "400",
      lineHeight: "14px",
      letterSpacing: "normal",
      color: "rgb(188, 108, 20)",
    });
    expect(afterValue).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "14px",
      letterSpacing: "normal",
      color: "rgb(188, 108, 20)",
    });
    expect(within(chart).queryByText("Country")).not.toBeInTheDocument();
    expect(within(chart).queryByText("+94.3%")).not.toBeInTheDocument();
    expect(
      within(chart).getByText("Source: Trade Partnership Worldwide analysis of Census Bureau trade data"),
    ).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "13px",
      fontWeight: "500",
      lineHeight: "17px",
      color: "rgb(114, 114, 114)",
    });
    expect(within(chart).getByText("The New York Times")).toBeInTheDocument();
  });

  it("uses source NYT typography across the trump tariffs imports article page", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-us-imports" />);

    const storylineRail = screen.getByTestId("imports-storyline-rail");
    const storylineTitle = screen.getByTestId("imports-storyline-title");

    expect(storylineRail).toHaveStyle({
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgb(255, 255, 255)",
      minHeight: "55px",
      position: "relative",
      borderBottom: "1px solid rgb(223, 223, 223)",
    });
    expect(storylineTitle).toHaveTextContent("Tariffs and Trade");
    expect(storylineTitle).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
      fontSize: "15px",
      fontWeight: "700",
      lineHeight: "15px",
      color: "rgb(18, 18, 18)",
    });
    expect(screen.getByText("Metals and Pharmaceuticals")).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "14px",
      color: "rgb(18, 18, 18)",
    });

    const headerSection = screen.getByRole("heading", {
      name: "How Much Will Trump’s Tariffs Cost U.S. Importers?",
    }).closest("section");

    expect(
      screen.getByRole("heading", { name: "How Much Will Trump’s Tariffs Cost U.S. Importers?" }),
    ).toHaveStyle({
      fontFamily:
        'nyt-cheltenham, cheltenham-fallback-georgia, cheltenham-fallback-noto, georgia, "times new roman", times, serif',
      fontSize: "48px",
      fontWeight: "700",
      fontStyle: "italic",
      lineHeight: "58.08px",
      letterSpacing: "normal",
      color: "rgb(18, 18, 18)",
      textAlign: "left",
    });
    expect(headerSection).not.toBeNull();
    expect(
      within(headerSection as HTMLElement).queryByText(/It will cost an extra nearly \$900 billion/i),
    ).not.toBeInTheDocument();
    const lazaroLink = screen.getByRole("link", { name: "Lazaro Gamio" });
    expect(lazaroLink.parentElement).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
      fontSize: "15px",
      fontWeight: "600",
      lineHeight: "19.995px",
      color: "rgb(54, 54, 54)",
    });
    expect(lazaroLink).toHaveStyle({
      fontWeight: "600",
      color: "rgb(54, 54, 54)",
      textDecoration: "underline",
    });
    const updatedDate = screen.getByText("April 9, 2025");
    expect(updatedDate).toHaveStyle({
      fontFamily: '"nyt-franklin", helvetica, arial, sans-serif',
      fontSize: "13px",
      fontWeight: "500",
      lineHeight: "18px",
      color: "rgb(204, 0, 0)",
    });
    expect(within(headerSection as HTMLElement).getByRole("button", { name: "Share full article" })).toBeInTheDocument();

    const tariffRateTable = screen.getByTestId("tariff-rate-table");
    const tableTitle = within(tariffRateTable).getByText(
      "See how the average tariff rate has changed across countries",
    );
    const increaseHeader = within(tariffRateTable).getByText("Increase");
    const chinaIncrease = within(tariffRateTable).getByText("+94.3");

    expect(tableTitle).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "17px",
      fontWeight: "700",
      lineHeight: "22px",
      color: "rgb(54, 54, 54)",
    });
    expect(increaseHeader.parentElement).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "11px",
      fontWeight: "400",
      lineHeight: "11px",
      color: "rgb(153, 153, 153)",
      textTransform: "uppercase",
    });
    expect(chinaIncrease).toHaveStyle({
      fontFamily: '"nyt-franklin", arial, helvetica, sans-serif',
      fontSize: "16px",
      fontWeight: "700",
      lineHeight: "16px",
      color: "rgb(188, 108, 20)",
    });
    expect(within(tariffRateTable).queryByText("+94.3%")).not.toBeInTheDocument();
  });

  it("truncates body-copy paragraphs to the first sentence on article pages", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-us-imports" />);

    expect(
      screen.getByText(
        "Since entering office in January, Mr. Trump has placed a growing number of import taxes on products from Canada, Mexico, China and other nations, in addition to a range of goods that come from anywhere in the world.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/On Wednesday, expansive tariffs on most nations went into effect/i),
    ).not.toBeInTheDocument();

    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    expect(
      screen.getByText(
        "For now, most world leaders are trying to bargain their way out of the sweeping new American tariffs.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Just two of the 20 largest exporters to the United States have countered them/i),
    ).not.toBeInTheDocument();
  });
});

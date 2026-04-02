import { fireEvent, render, screen, within } from "@testing-library/react";

import BrandNYTGamesSection from "@/components/admin/design-docs/sections/BrandNYTGamesSection";
import GameArticleDetailPage from "@/components/admin/design-docs/GameArticleDetailPage";

describe("NYT Games preview shell", () => {
  it("renders a page-level mobile and desktop toggle on the brand page", () => {
    render(<BrandNYTGamesSection />);

    expect(screen.getByRole("button", { name: "Desktop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mobile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open table of contents" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));

    expect(screen.getByText("9:41")).toBeInTheDocument();
  });

  it("reuses the same toggle on child game pages", () => {
    render(<GameArticleDetailPage gameId="connections" />);

    expect(screen.getByRole("button", { name: "Desktop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mobile" })).toBeInTheDocument();
  });

  it("opens a TOC popup with anchored sections on the brand page", () => {
    render(<BrandNYTGamesSection />);

    fireEvent.click(screen.getByRole("button", { name: "Open table of contents" }));

    expect(screen.getByRole("dialog", { name: "Page table of contents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Brand Overview" })).toHaveAttribute("href", "#brand-overview");
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "#hub-guide-promo" && /GuidePromo/i.test(link.textContent ?? "")),
    ).toBe(true);
  });

  it("collects child-game section labels into the TOC", () => {
    render(<GameArticleDetailPage gameId="connections" />);

    fireEvent.click(screen.getByRole("button", { name: "Open table of contents" }));

    expect(screen.getByRole("link", { name: "4×4 Word Grid" })).toHaveAttribute(
      "href",
      "#4-4-word-grid",
    );
  });

  it("switches the featured article specimen to the source mobile guide-promo sizing inside the phone preview", () => {
    render(<BrandNYTGamesSection />);

    fireEvent.click(screen.getByRole("button", { name: "Mobile" }));

    const featuredSection = screen.getByTestId("nyt-games-featured-article-section");
    const featuredLink = screen.getByTestId("nyt-games-featured-article-card");

    expect(featuredSection).toHaveStyle({
      maxWidth: "378px",
    });
    expect(featuredLink).toHaveStyle({
      width: "calc(100% - 28px)",
    });
  });

  it("routes typography specimens through the scoped NYT Games font variables while keeping source-family metadata", () => {
    render(<BrandNYTGamesSection />);

    const navButtonCard = screen.getByText("Header subscribe CTA and shell controls").parentElement;
    expect(navButtonCard).not.toBeNull();
    expect(within(navButtonCard as HTMLElement).getByText("Subscribe")).toHaveStyle({
      fontFamily: "var(--dd-font-ui)",
    });
    expect(within(navButtonCard as HTMLElement).getByText("nyt-franklin")).toBeInTheDocument();

    const hubCardTitleCard = screen.getByText("Game portfolio titles on the non-specific games page").parentElement;
    expect(hubCardTitleCard).not.toBeNull();
    expect(within(hubCardTitleCard as HTMLElement).getByText("Connections")).toHaveStyle({
      fontFamily: "var(--dd-font-headline)",
    });
    expect(within(hubCardTitleCard as HTMLElement).getByText("nyt-karnakcondensed")).toBeInTheDocument();
  });

  it("uses the same scoped font variables in the featured hub preview chrome", () => {
    render(<BrandNYTGamesSection />);

    const featuredCard = screen.getByTestId("nyt-games-featured-article-card");
    expect(
      within(featuredCard).getByRole("heading", { name: /How to Solve The New York Times Crossword/i }),
    ).toHaveStyle({
      fontFamily: "var(--dd-font-headline)",
    });
    expect(within(featuredCard).getByText("Featured Article")).toHaveStyle({
      fontFamily: "var(--dd-font-ui)",
    });
  });
});

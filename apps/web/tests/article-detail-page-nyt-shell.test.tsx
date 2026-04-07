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

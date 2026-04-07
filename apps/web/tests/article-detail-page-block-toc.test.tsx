import { fireEvent, render, screen } from "@testing-library/react";

import ArticleDetailPage from "@/components/admin/design-docs/ArticleDetailPage";

describe("Article detail page block table of contents", () => {
  it("lists every configured block for the Trump tariffs reaction page and renders a heading for each block", () => {
    render(<ArticleDetailPage articleId="trump-tariffs-reaction" />);

    fireEvent.click(screen.getByRole("button", { name: "Open table of contents" }));

    expect(screen.getByRole("dialog", { name: "Page table of contents" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Header" })).toHaveAttribute("href", "#header");
    expect(screen.getByRole("link", { name: "Byline" })).toHaveAttribute("href", "#byline");
    expect(screen.getByRole("link", { name: "Share Tools" })).toHaveAttribute("href", "#share-tools");
    expect(
      screen.getByRole("link", { name: "The 20 Largest Exporters to the United States" }),
    ).toHaveAttribute("href", "#the-20-largest-exporters-to-the-united-states");
    expect(screen.getByRole("link", { name: "Body Copy 1" })).toHaveAttribute(
      "href",
      "#body-copy-1",
    );
    expect(screen.getByRole("link", { name: "Body Copy 5" })).toHaveAttribute(
      "href",
      "#body-copy-5",
    );
    expect(
      screen.getByRole("link", { name: "How major trade partners are responding" }),
    ).toHaveAttribute("href", "#how-major-trade-partners-are-responding");
    expect(
      screen.getByRole("link", { name: "Tariff Responses by Trading Partner" }),
    ).toHaveAttribute("href", "#tariff-responses-by-trading-partner");
    expect(screen.getByRole("link", { name: "Author Bio" })).toHaveAttribute("href", "#author-bio");

    expect(
      screen.getByRole("heading", { level: 2, name: "Header" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Byline" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Share Tools" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "The 20 Largest Exporters to the United States" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Body Copy 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Body Copy 5" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "How major trade partners are responding" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Tariff Responses by Trading Partner" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Author Bio" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/For now, most world leaders are trying to bargain their way out of the sweeping new American tariffs/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/President Trump wants to negotiate/i),
    ).toBeInTheDocument();
  });
});

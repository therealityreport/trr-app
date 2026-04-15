import { render, screen, within } from "@testing-library/react";

import ArticleDetailPage from "@/components/admin/design-docs/ArticleDetailPage";

describe("NYT debate speaking time article detail page", () => {
  it("renders the saved debate graphics and narrative blocks for the 2020 Democratic debate page", () => {
    const { container } = render(
      <ArticleDetailPage articleId="debate-speaking-time" />,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Which Candidates Got the Most Speaking Time in the Democratic Debate",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Sanders, Bloomberg and Klobuchar led the seven candidates onstage."),
    ).not.toBeInTheDocument();
    expect(container.textContent).toContain(
      "ByWeiyi Cai, Keith Collins and Lauren Leatherby",
    );
    expect(container.textContent).toContain("Feb. 25, 2020");
    expect(
      screen.getByRole("heading", { level: 2, name: "How Long Each Candidate Spoke" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("debate-speaking-time-chart")).getByText(
        /each bar segment represents the approximate length of a candidate’s response/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Speaking Time by Topic" }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("debate-topic-bubble-chart")).getByText(
        /the size of each circle represents the total length of a candidate’s responses to a topic/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /the increasing threat of the spread of the coronavirus became a topic of debate for the first time/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 3, name: "Icons & SVGs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Images" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Article Assets")).toBeInTheDocument();
    expect(screen.getByText("Social & OG Images")).toBeInTheDocument();
    expect(screen.getByText("Headings")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("2 weights · 54 text styles")).toBeInTheDocument();
    expect(screen.getByText(/1 weight[s]? · 652 text styles/)).toBeInTheDocument();
    expect(screen.getByText("CSS Information")).toBeInTheDocument();
    expect(screen.getByText("5,954")).toBeInTheDocument();
    expect(screen.getByText("417kb")).toBeInTheDocument();
    expect(screen.getByText("0.7s")).toBeInTheDocument();
    expect(screen.getByText("Text colors")).toBeInTheDocument();
    expect(screen.getByText("Shadow colors")).toBeInTheDocument();
    expect(screen.getByText("Border colors")).toBeInTheDocument();
    expect(screen.getByText("Background colors")).toBeInTheDocument();
    expect(screen.getByText("Shape/Circle colors")).toBeInTheDocument();
    expect(screen.getByText("legendlabel")).toBeInTheDocument();
    expect(screen.getByText("chart-note")).toBeInTheDocument();

    const sandersPortrait = container.querySelector(
      'img[src="/design-docs/nyt/debate-speaking-time/candidates/color/sanders.png"]',
    );
    const giftIcon = container.querySelector(
      'img[src="/design-docs/nyt/debate-speaking-time/icons/gift.svg"]',
    );
    const featuredImage = container.querySelector(
      'img[src="/design-docs/nyt/debate-speaking-time/social/facebookJumbo.jpg"]',
    );
    expect(sandersPortrait).not.toBeNull();
    expect(giftIcon).not.toBeNull();
    expect(featuredImage).not.toBeNull();
  });
});

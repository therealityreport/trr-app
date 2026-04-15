import { render, screen } from "@testing-library/react";

import InteractiveDebateTopicBubbleChart from "@/components/admin/design-docs/InteractiveDebateTopicBubbleChart";

describe("InteractiveDebateTopicBubbleChart", () => {
  it("renders topic labels, candidate labels, grayscale face bubbles, and note styling hooks", () => {
    render(
      <InteractiveDebateTopicBubbleChart
        title="Speaking Time by Topic"
        note="Note: The size of each circle represents the total length of a candidate’s responses to a topic."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Speaking Time by Topic" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sanders")).toBeInTheDocument();
    expect(screen.getByText("Foreign")).toBeInTheDocument();
    expect(screen.getByText("policy")).toBeInTheDocument();
    expect(screen.getByText("Criminal")).toBeInTheDocument();
    expect(screen.getAllByText("justice").length).toBeGreaterThan(1);

    const bubble = screen.getByLabelText(
      "Speaking time by topic: Sanders on Foreign policy",
    );
    const frame = screen.getByTestId("debate-topic-bubble-chart-frame");
    expect(frame.querySelector("svg")).toHaveAttribute("viewBox", "0 0 1150 680");
    expect(frame.querySelector('[style*="overflow"]')).toBeNull();
    expect(bubble).toHaveStyle({
      backgroundImage:
        'url(/design-docs/nyt/debate-speaking-time/candidates/grayscale/sanders.png)',
    });
    expect(
      screen.getByText(/candidate’s responses to a topic/i),
    ).toHaveStyle({ color: "rgb(102, 102, 102)" });
  });
});

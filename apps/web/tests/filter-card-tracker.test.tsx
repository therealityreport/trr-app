import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FilterCardTracker from "@/components/admin/design-docs/FilterCardTracker";
import { NFL_FREE_AGENTS_2026 } from "@/components/admin/design-docs/free-agent-data";

describe("FilterCardTracker", () => {
  it("renders source-faithful expanded copy with the restored how he fits section", () => {
    render(
      <FilterCardTracker
        data={{
          title: "Top 150 NFL Free Agents",
          colorScheme: "green",
          players: [NFL_FREE_AGENTS_2026[0]],
          positionBreakdown: { Edge: 1 },
          statusBreakdown: { Agreed: 1 },
        }}
        colorScheme="green"
        filters={[
          { label: "Position", options: ["Edge"] },
          { label: "Availability", options: ["Agreed"] },
          { label: "Previous team", options: ["Bengals"] },
          { label: "New team", options: ["Ravens"] },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /trey hendrickson/i }));

    expect(screen.getByText("How he fits")).toBeInTheDocument();
    expect(screen.getByText(/the ravens badly needed an edge rusher/i)).toBeInTheDocument();
    expect(screen.queryByText(/showing 1 of 1 players/i)).not.toBeInTheDocument();
  });

  it("decodes HTML entities in player names before rendering", () => {
    render(
      <FilterCardTracker
        data={{
          title: "Top 150 NFL Free Agents",
          colorScheme: "green",
          players: [
            {
              ...NFL_FREE_AGENTS_2026[0],
              rank: 99,
              name: "K&#39;Lavon Chaisson",
            },
          ],
          positionBreakdown: { Edge: 1 },
          statusBreakdown: { Agreed: 1 },
        }}
        colorScheme="green"
        filters={[
          { label: "Position", options: ["Edge"] },
          { label: "Availability", options: ["Agreed"] },
          { label: "Previous team", options: ["Bengals"] },
          { label: "New team", options: ["Ravens"] },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: /K'Lavon Chaisson/i })).toBeInTheDocument();
    expect(screen.queryByText(/K&#39;Lavon Chaisson/i)).not.toBeInTheDocument();
  });
});

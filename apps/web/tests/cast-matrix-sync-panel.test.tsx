import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  CastMatrixSyncPanel,
  type CastMatrixSyncResult,
} from "@/components/admin/CastMatrixSyncPanel";

describe("CastMatrixSyncPanel", () => {
  it("renders loading state for sync button", () => {
    render(
      <CastMatrixSyncPanel
        loading={true}
        error={null}
        result={null}
        scopeLabel="Season scope: all show seasons"
        onSync={() => {}}
      />
    );

    expect(screen.getByRole("button", { name: "Syncing..." })).toBeDisabled();
  });

  it("renders sync result counts and unmatched sections", () => {
    const result: CastMatrixSyncResult = {
      show_id: "show-1",
      source_urls: {
        wikipedia: "https://en.wikipedia.org/wiki/The_Real_Housewives_of_Salt_Lake_City",
        fandom: "https://real-housewives.fandom.com/wiki/The_Real_Housewives_of_Salt_Lake_City",
      },
      counts: {
        season_role_assignments_upserted: 20,
        relationship_role_assignments_upserted: 5,
        global_kid_assignments_upserted: 3,
        auto_assignments_replaced: 11,
        bravo_links_upserted: 7,
        bravo_images_imported: 4,
        bravo_images_skipped: 2,
      },
      unmatched: {
        cast_names: ["Unknown Cast"],
        relationship_names: ["Unknown Partner"],
        missing_season_evidence: ["Mary: spouse has no season labels"],
      },
    };

    render(
      <CastMatrixSyncPanel
        loading={false}
        error={null}
        result={result}
        scopeLabel="Season scope: 1, 2, 3 (plus global season 0 roles)."
        onSync={() => {}}
      />
    );

    expect(screen.getByText("Season Roles")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("Unmatched Cast Names")).toBeInTheDocument();
    expect(screen.getByText("Unknown Cast")).toBeInTheDocument();
    expect(screen.getByText("Unmatched Relationship Names")).toBeInTheDocument();
    expect(screen.getByText("Unknown Partner")).toBeInTheDocument();
    expect(screen.getByText("Missing Season Evidence")).toBeInTheDocument();
    expect(screen.getByText(/Mary: spouse has no season labels/)).toBeInTheDocument();
  });

  it("fires onSync when button is clicked", () => {
    const onSync = vi.fn();
    render(
      <CastMatrixSyncPanel
        loading={false}
        error={null}
        result={null}
        scopeLabel="Season scope: all show seasons"
        onSync={onSync}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Sync Cast Roles (Wiki/Fandom)" }));
    expect(onSync).toHaveBeenCalledTimes(1);
  });
});

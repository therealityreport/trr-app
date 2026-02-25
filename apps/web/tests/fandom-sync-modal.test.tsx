import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import FandomSyncModal from "@/components/admin/FandomSyncModal";

describe("FandomSyncModal", () => {
  it("renders canonical sections and bio card groups in preview", async () => {
    render(
      <FandomSyncModal
        isOpen
        onClose={vi.fn()}
        onPreview={vi.fn(async () => undefined)}
        onCommit={vi.fn(async () => undefined)}
        previewData={{
          selected_pages: [{ url: "https://real-housewives.fandom.com/wiki/Lisa_Barlow" }],
          profile: {
            casting_summary: "Main cast member.",
            bio_card: {
              general: { full_name: "Lisa Barlow" },
              appearance: { hair_color: "Brown" },
            },
            dynamic_sections: [
              { title: "Biography", canonical_title: "Biography", paragraphs: ["Bio paragraph"] },
              { title: "Taglines", canonical_title: "Taglines", bullets: ["Tagline text"] },
              { title: "Reunion Seating", canonical_title: "Reunion Seating", bullets: ["First seat"] },
              { title: "Legacy Notes", canonical_title: "Legacy Notes", bullets: ["Unknown section"] },
            ],
          },
          warnings: [],
        }}
        previewLoading={false}
        commitLoading={false}
        entityLabel="Lisa Barlow"
      />
    );

    expect(screen.getByText("Casting Summary")).toBeInTheDocument();
    expect(screen.getByText("Main cast member.")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Biography")).toBeInTheDocument();
    expect(screen.getByText("Taglines")).toBeInTheDocument();
    expect(screen.getByText("Reunion Seating")).toBeInTheDocument();
    expect(screen.getByText("Other Sections")).toBeInTheDocument();
    expect(screen.getByText("Legacy Notes")).toBeInTheDocument();
  });
});

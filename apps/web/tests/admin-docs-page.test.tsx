import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminDocsCatalogContent } from "@/components/admin/AdminDocsCatalogContent";

describe("admin docs page", () => {
  it("renders grouped job docs with exact trigger labels", () => {
    render(<AdminDocsCatalogContent />);

    expect(screen.getByRole("heading", { name: "Scraping & Discovery" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Show / Person Sync & Import" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image Intelligence & Identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Brand Assets & Logos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Social Runs & Queue Operations" })).toBeInTheDocument();

    expect(screen.getAllByText("Sync All Brand Logos").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scrape").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Import Images").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Save Crop").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refresh Auto Crop").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Refresh Jobs").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Current Runtime").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Target Runtime").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Migration Status").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Modal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Local").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cutover Complete").length).toBeGreaterThan(0);
    expect(screen.queryByText("EC2")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Admin / Shows / Show Name / Season # / Social Media / Official Analytics").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/dedicated Modal vision worker/i).length).toBeGreaterThan(0);
  });

  it("filters the catalog by migration status, page, and current runtime", () => {
    render(<AdminDocsCatalogContent />);

    fireEvent.click(screen.getByRole("button", { name: /^Cutover Complete \(/ }));
    fireEvent.click(screen.getByRole("button", { name: /^People \(/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Modal \(/ }));

    expect(
      screen.getByText((_, element) => {
        const content = element?.textContent?.trim() ?? "";
        return /^Showing \d+ of \d+ documented job flows$/.test(content);
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "People Count Tools" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Person Image Refresh / Reprocess" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Week Sync / Refresh Operations" })).not.toBeInTheDocument();
  });
});

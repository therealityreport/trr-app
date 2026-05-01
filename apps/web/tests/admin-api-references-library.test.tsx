import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminApiReferencesLibraryContent } from "@/components/admin/AdminApiReferencesLibraryContent";

describe("admin api references library", () => {
  it("renders the generated inventory sections and metadata", () => {
    const { container } = render(<AdminApiReferencesLibraryContent />);

    expect(
      screen.getByRole("heading", {
        name: "Best-effort admin request path inventory with explicit manual augmentation.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin Pages" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Request-Originating Components" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin API Routes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin Routes & URL Slugs" })).toBeInTheDocument();
    expect(screen.getByText("URL slug")).toBeInTheDocument();
    expect(screen.getByText(/Generated .* Commit .* Override digest/i)).toBeInTheDocument();
    expect(screen.getAllByText("/admin/api-references").length).toBeGreaterThan(0);
    expect(screen.getAllByText("api-references").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/admin/networks-and-streaming/[entityType]/[entitySlug]").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="/admin/api-references"]')).toBeInTheDocument();
    expect(container.querySelector('a[href="/admin/networks-and-streaming/[entityType]/[entitySlug]"]')).toBeNull();
  });

  it("filters down to backend endpoints and exposes source links in expanded detail", () => {
    render(<AdminApiReferencesLibraryContent />);

    fireEvent.click(screen.getByRole("button", { name: /^Backend \(/ }));
    fireEvent.click(screen.getByText("GET /api/v1/admin/operations/health"));

    expect(
      screen.getByText((content, element) => {
        const text = element?.textContent?.trim() ?? content;
        return /^Showing \d+ of \d+ catalog nodes$/.test(text);
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("/api/v1/admin/operations/health").length).toBeGreaterThan(0);
    const sourceLinks = screen.getAllByRole("link", { name: "Open in editor" });
    expect(sourceLinks.length).toBeGreaterThan(0);
    expect(sourceLinks.some((link) => link.getAttribute("href")?.includes("operations/health/route.ts"))).toBe(true);
  });
});

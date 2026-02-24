import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

describe("AdminBreadcrumbs component", () => {
  it("renders clickable ancestors and a non-link current crumb", () => {
    render(
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Networks & Streaming", href: "/admin/networks" },
          { label: "ABC" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();

    expect(within(nav).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: "Networks & Streaming" })).toHaveAttribute(
      "href",
      "/admin/networks",
    );
    expect(within(nav).queryByRole("link", { name: "ABC" })).not.toBeInTheDocument();
    expect(within(nav).getByText("ABC")).toBeInTheDocument();
  });
});

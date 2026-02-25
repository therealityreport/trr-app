import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { axe } from "vitest-axe";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";

describe("AdminBreadcrumbs component", () => {
  it("renders clickable ancestors and clickable current crumb", () => {
    render(
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Brands", href: "/admin/brands" },
          { label: "ABC", href: "/admin/networks-and-streaming/network/abc" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();

    expect(within(nav).getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: "Brands" })).toHaveAttribute(
      "href",
      "/admin/brands",
    );
    const current = within(nav).getByRole("link", { name: "ABC" });
    expect(current).toHaveAttribute("href", "/admin/networks-and-streaming/network/abc");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("has no basic axe violations", async () => {
    const { container } = render(
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Shows", href: "/shows" },
          { label: "Sample Show", href: "/shows/sample-show" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

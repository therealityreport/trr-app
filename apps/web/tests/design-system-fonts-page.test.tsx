import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import DesignSystemPageClient from "@/components/admin/design-system/DesignSystemPageClient";

const navigationState = vi.hoisted(() => ({
  push: vi.fn(),
}));

const guardState = {
  user: { email: "admin@example.com", uid: "admin-1" },
  checking: false,
  hasAccess: true,
};

vi.mock("next/navigation", () => ({
  useRouter: () => navigationState,
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => guardState,
}));

vi.mock("@/components/ClientOnly", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div>Breadcrumbs</div>,
}));

const hostedFontsCss = `
@font-face {
  font-family: "Hamburg Serial";
  src: url("/fonts/monotype/Hamburg%20Serial/regular.woff2") format("woff2");
}
`;

const typographyState = {
  sets: [
    {
      id: "set-1",
      slug: "frontend-base",
      name: "Frontend Base",
      area: "user-frontend",
      seedSource: "manual",
      createdAt: "",
      updatedAt: "",
      roles: {
        body: {
          mobile: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
        },
      },
    },
    {
      id: "set-2",
      slug: "survey-hero",
      name: "Survey Hero",
      area: "surveys",
      seedSource: "manual",
      createdAt: "",
      updatedAt: "",
      roles: {
        heading: {
          mobile: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "28px",
            fontWeight: "700",
            lineHeight: "32px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-rude-slab)",
            fontSize: "40px",
            fontWeight: "700",
            lineHeight: "42px",
            letterSpacing: "0px",
          },
        },
      },
    },
  ],
  assignments: [],
};

describe("design system fonts page", () => {
  beforeEach(() => {
    navigationState.push.mockReset();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/hosted-fonts.css") {
          return new Response(hostedFontsCss, { status: 200 });
        }
        if (url === "/api/admin/design-system/typography") {
          return new Response(JSON.stringify(typographyState), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("", { status: 404 });
      }),
    );
  });

  it("supports search, compare, previews, and typography-set cross-links", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    expect(await screen.findByText("Fonts Library")).toBeInTheDocument();
    expect(screen.getByText("Browse every family used by the app")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search fonts"), {
      target: { value: "Hamburg" },
    });

    const hamburgCard = await screen.findByTestId("font-card-Hamburg Serial");
    expect(hamburgCard).toBeInTheDocument();
    expect(screen.queryByTestId("font-card-Gloucester")).not.toBeInTheDocument();

    fireEvent.click(within(hamburgCard).getByRole("button", { name: "Compare" }));
    const comparisonTray = await screen.findByText("Compare pinned fonts");
    expect(comparisonTray).toBeInTheDocument();
    expect(within(comparisonTray.closest("section")!).getAllByText("Hamburg Serial").length).toBeGreaterThan(0);

    fireEvent.click(within(hamburgCard).getByRole("button", { name: /Hamburg Serial/i }));
    fireEvent.click((await within(hamburgCard).findAllByRole("button", { name: "Home" }))[0]!);

    const modal = await screen.findByTestId("font-usage-preview-modal");
    expect(within(modal).getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(within(modal).getByRole("link", { name: "Open actual page" })).toHaveAttribute("href", "/");

    fireEvent.click(within(hamburgCard).getByRole("button", { name: "Frontend Base" }));
    expect(navigationState.push).toHaveBeenCalledWith("/design-system/fonts/typography?set=set-1");
  });

  it("applies source filters and sort controls", async () => {
    render(<DesignSystemPageClient activeTab="fonts" activeSubtab={null} />);

    await screen.findByText("Fonts Library");

    fireEvent.click(screen.getByRole("button", { name: "Realitease" }));
    expect(await screen.findByTestId("font-card-NYTKarnak Condensed")).toBeInTheDocument();
    expect(screen.queryByTestId("font-card-Hamburg Serial")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Font sort"), {
      target: { value: "most-used" },
    });
    expect(screen.getByLabelText("Font sort")).toHaveValue("most-used");
  });
});

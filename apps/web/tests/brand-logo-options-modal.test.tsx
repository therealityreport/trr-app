/* eslint-disable @next/next/no-img-element */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, unoptimized, ...rest } = props;
    void fill;
    void unoptimized;
    return <img {...rest} alt={props.alt ?? ""} />;
  },
}));

vi.mock("@/components/admin/AdminModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    title,
    children,
  }: {
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
  }) => (isOpen ? <div><h2>{title}</h2>{children}</div> : null),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

import BrandLogoOptionsModal from "@/components/admin/BrandLogoOptionsModal";

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sourceRows = [
  {
    source_provider: "related_network_streaming",
    total_count: 0,
    has_more: false,
    editable: false,
    refreshable: false,
    query_kind: "readonly",
    default_query_value: "peacocktv.com",
    effective_query_value: "peacocktv.com",
    query_values: ["peacocktv.com"],
    query_links: ["host match: peacocktv.com"],
    logo_role: "wordmark",
  },
  {
    source_provider: "logos1000",
    total_count: 0,
    has_more: true,
    editable: true,
    refreshable: true,
    query_kind: "slug",
    default_query_value: "peacocktv-logo",
    effective_query_value: "peacocktv-logo",
    query_values: ["peacocktv-logo"],
    query_links: ["https://1000logos.net/peacocktv-logo/"],
    logo_role: "wordmark",
  },
  {
    source_provider: "official_site",
    total_count: 0,
    has_more: true,
    editable: true,
    refreshable: true,
    query_kind: "host_or_url",
    default_query_value: "https://peacocktv.com",
    effective_query_value: "https://peacocktv.com",
    query_values: ["https://peacocktv.com"],
    query_links: ["https://peacocktv.com"],
    logo_role: "wordmark",
  },
  {
    source_provider: "logosearch",
    total_count: 0,
    has_more: true,
    editable: true,
    refreshable: true,
    query_kind: "search_term",
    default_query_value: "peacocktv",
    effective_query_value: "peacocktv",
    query_values: ["peacocktv"],
    query_links: ["https://logosear.ch/search.html?q=peacocktv"],
    logo_role: "wordmark",
  },
] as const;

function createDefaultFetchMock() {
  const sourceQueryCalls: Array<{ query_values?: string[]; source_provider?: string }> = [];
  const discoverCalls: Array<{ query_override?: string; query_overrides?: string[]; source_provider?: string }> = [];
  const selectCalls: Array<Record<string, unknown>> = [];

  mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/brands/logos/options/source-query")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as { query_value?: string; query_values?: string[]; source_provider?: string };
      sourceQueryCalls.push(body);
      const nextQueryValues = Array.isArray(body.query_values)
        ? body.query_values.filter((value) => String(value || "").trim().length > 0)
        : body.query_value
          ? [body.query_value]
          : [];
      return Promise.resolve(
        jsonResponse(200, {
          source: {
            ...sourceRows.find((row) => row.source_provider === body.source_provider),
            effective_query_value: nextQueryValues[0] ?? null,
            query_values: nextQueryValues,
            query_links:
              body.source_provider === "logos1000"
                ? nextQueryValues.map((value) => `https://1000logos.net/${value}/`)
                : body.source_provider === "logosearch"
                  ? nextQueryValues.map((value) => `https://logosear.ch/search.html?q=${encodeURIComponent(value)}`)
                  : body.source_provider === "official_site"
                    ? nextQueryValues
                    : nextQueryValues.map((value) => `https://example.com/${value}`)
                ,
          },
        }),
      );
    }

    if (url.includes("/brands/logos/options/discover")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        query_override?: string;
        query_overrides?: string[];
        source_provider?: string;
      };
      discoverCalls.push(body);
      if (body.source_provider === "logos1000") {
        const queryValue = body.query_overrides?.[0] || body.query_override;
        const isEdited = queryValue === "peacock-logo";
        return Promise.resolve(
          jsonResponse(200, {
            total_count: 2,
            next_offset: 2,
            has_more: false,
            candidates: [
              {
                id: isEdited ? "candidate-logos1000-edited" : "candidate-logos1000",
                source_url: `https://1000logos.net/wp-content/uploads/${isEdited ? "edited" : "default"}.svg`,
                source_provider: "logos1000",
                discovered_from: `https://1000logos.net/${queryValue || "peacocktv-logo"}/`,
                logo_role: "wordmark",
                option_kind: "candidate",
              },
            ],
          }),
        );
      }
      if (body.source_provider === "official_site") {
        return Promise.resolve(
          jsonResponse(200, {
            total_count: 20,
            next_offset: 10,
            has_more: true,
            candidates: [
              {
                id: "candidate-official-site",
                source_url: "https://peacocktv.com/logo.svg",
                source_provider: "official_site",
                discovered_from: "https://peacocktv.com",
                logo_role: "wordmark",
                option_kind: "candidate",
              },
            ],
          }),
        );
      }
      if (body.source_provider === "logosearch") {
        return Promise.resolve(
          jsonResponse(200, {
            total_count: 2,
            next_offset: 2,
            has_more: false,
            candidates: [
              {
                id: "candidate-logosearch",
                source_url: "https://logosear.ch/peacocktv.svg",
                source_provider: "logosearch",
                discovered_from: "https://logosear.ch/search.html?q=peacocktv",
                logo_role: "wordmark",
                option_kind: "candidate",
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse(200, { total_count: 0, next_offset: 0, has_more: false, candidates: [] }));
    }

    if (url.includes("/brands/logos/options/sources")) {
      return Promise.resolve(jsonResponse(200, { sources: sourceRows }));
    }

    if (url.includes("/brands/logos?")) {
      return Promise.resolve(
        jsonResponse(200, {
          rows: [
            {
              id: "asset-logos1000",
              source_url: "https://1000logos.net/wp-content/uploads/2021/10/Peacock-Logo.png",
              source_provider: "logos1000",
              hosted_logo_url: "https://cdn.example.com/peacock.svg",
              is_selected_for_role: true,
            },
          ],
        }),
      );
    }

    if (url.includes("/brands/logos/options/select")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      selectCalls.push(body);
      return Promise.resolve(jsonResponse(200, { selected: { id: "asset-logos1000" } }));
    }

    return Promise.resolve(jsonResponse(200, {}));
  });

  return { discoverCalls, selectCalls, sourceQueryCalls };
}

describe("BrandLogoOptionsModal", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
  });

  it("auto-scrapes refreshable sources and shows actual source counts", async () => {
    const { discoverCalls } = createDefaultFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-1", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Filter options by official_site (20)" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Filter options by saved (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filter options by related_network_streaming (0)" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter options by logos1000 (2)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter options by logosearch (2)" })).toBeInTheDocument();
    expect(screen.getByAltText("peacocktv.com featured wordmark")).toBeInTheDocument();
    expect(screen.getByText("Current Featured")).toBeInTheDocument();
    const sourceFilterButtons = screen.getAllByRole("button", { name: /Filter options by/ }).map((button) => button.textContent || "");
    expect(sourceFilterButtons.indexOf("official_site (20)")).toBeLessThan(sourceFilterButtons.indexOf("logos1000 (2)"));
    expect(screen.getByRole("button", { name: "Add Manual Import" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Slugs" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Manual image URL")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filter options by logos1000 (2)" }));
    expect(screen.getByRole("button", { name: "Edit logos1000" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Query" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Filter options by official_site (20)" }));
    expect(screen.getByRole("button", { name: "Refresh official_site" })).toBeInTheDocument();
    expect(discoverCalls.some((call) => call.source_provider === "logos1000" && call.query_overrides?.[0] === "peacocktv-logo")).toBe(true);
    expect(discoverCalls.some((call) => call.source_provider === "official_site" && call.query_overrides?.[0] === "https://peacocktv.com")).toBe(
      true,
    );
  });

  it("persists a provider-specific query edit and refreshes only that source", async () => {
    const { discoverCalls } = createDefaultFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-2", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Filter options by logos1000 (2)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Filter options by logos1000 (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit logos1000" }));
    const sourceInput = screen.getByDisplayValue("peacocktv-logo");
    fireEvent.change(sourceInput, { target: { value: "peacock-logo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(discoverCalls.some((call) => call.source_provider === "logos1000" && call.query_overrides?.[0] === "peacock-logo")).toBe(true);
    });

    expect(
      discoverCalls.filter((call) => call.source_provider === "official_site" && call.query_overrides?.[0] === "https://peacocktv.com").length,
    ).toBe(1);
    expect(screen.getAllByText("https://1000logos.net/peacock-logo/").length).toBeGreaterThan(0);
  }, 10000);

  it("adds a second query for the active source and refreshes automatically", async () => {
    const { discoverCalls } = createDefaultFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-5", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Filter options by logos1000 (2)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Filter options by logos1000 (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Query" }));
    fireEvent.change(screen.getByLabelText("New Query"), { target: { value: "peacock-symbol" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(
        discoverCalls.some(
          (call) =>
            call.source_provider === "logos1000"
            && Array.isArray(call.query_overrides)
            && call.query_overrides.includes("peacocktv-logo")
            && call.query_overrides.includes("peacock-symbol"),
        ),
      ).toBe(true);
    });

    expect(screen.getAllByText("https://1000logos.net/peacock-symbol/").length).toBeGreaterThan(0);
  });

  it("applies shared slugs across slug and search providers", async () => {
    const { discoverCalls, sourceQueryCalls } = createDefaultFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-6", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Slugs" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Slugs" }));
    expect(screen.getByText("Shared Slugs")).toBeInTheDocument();
    expect(screen.getAllByText("peacocktv-logo").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add Slug" }));
    fireEvent.change(screen.getByLabelText("New Slug"), { target: { value: "peacock-symbol" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(
        sourceQueryCalls.some(
          (call) => call.source_provider === "logos1000" && call.query_values?.includes("peacock-symbol"),
        ),
      ).toBe(true);
    });

    expect(
      sourceQueryCalls.some(
        (call) =>
          call.source_provider === "logosearch"
          && call.query_values?.includes("peacocktv logo")
          && call.query_values?.includes("peacock symbol"),
      ),
    ).toBe(true);
    expect(
      sourceQueryCalls.some((call) => call.source_provider === "official_site"),
    ).toBe(false);

    await waitFor(() => {
      expect(
        discoverCalls.some(
          (call) =>
            call.source_provider === "logos1000"
            && Array.isArray(call.query_overrides)
            && call.query_overrides.includes("peacocktv-logo")
            && call.query_overrides.includes("peacock-symbol"),
        ),
      ).toBe(true);
    });
  });

  it("opens manual import from the header action and adds a manual source option", async () => {
    createDefaultFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-3", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Manual Import" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Manual Import" }));
    const input = screen.getByLabelText("Manual image URL");
    fireEvent.change(input, { target: { value: "https://cdn.example.com/custom-logo.svg" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Image URL" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Filter options by manual_import_url (1)" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Save Featured (1)" })).toBeEnabled();
  });

  it("treats the modal as a single featured selection and only saves the newly chosen option", async () => {
    const { selectCalls } = createDefaultFetchMock();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={onClose}
        preferredUser={{ uid: "admin-7", email: "admin@example.com" }}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        logoRole="wordmark"
        onSaved={onSaved}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save Featured (0)" })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Filter options by official_site (20)" }));
    await waitFor(() => {
      expect(
        screen.getAllByRole("button").some((button) =>
          (button.textContent || "").includes("official_site") && (button.textContent || "").includes("https://peacocktv.com"),
        ),
      ).toBe(true);
    });

    const officialSiteOption = screen
      .getAllByRole("button")
      .find((button) => (button.textContent || "").includes("official_site") && (button.textContent || "").includes("https://peacocktv.com"));
    expect(officialSiteOption).toBeDefined();
    fireEvent.click(officialSiteOption!);

    expect(screen.getByText("Pending Featured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Featured (1)" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Save Featured (1)" }));

    await waitFor(() => {
      expect(selectCalls).toHaveLength(1);
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("falls back to placeholder preview when remote image fails to load", async () => {
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/brands/logos/options/discover")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { source_provider?: string };
        if (body.source_provider === "logos1000") {
          return Promise.resolve(
            jsonResponse(200, {
              total_count: 1,
              next_offset: 1,
              has_more: false,
              candidates: [
                {
                  id: "candidate-broken",
                  source_url: "https://1000logos.net/booking-com-logo/",
                  source_provider: "logos1000",
                  discovered_from: "https://1000logos.net/booking-com-logo/",
                  logo_role: "wordmark",
                  option_kind: "candidate",
                },
              ],
            }),
          );
        }
        return Promise.resolve(jsonResponse(200, { total_count: 0, next_offset: 0, has_more: false, candidates: [] }));
      }
      if (url.includes("/brands/logos/options/sources")) {
        return Promise.resolve(
          jsonResponse(200, {
            sources: [
              {
                source_provider: "logos1000",
                total_count: 0,
                has_more: false,
                editable: true,
                refreshable: true,
                query_kind: "slug",
                default_query_value: "bravotv-logo",
                effective_query_value: "bravotv-logo",
                query_values: ["bravotv-logo"],
                query_links: ["https://1000logos.net/bravotv-logo/"],
              },
            ],
          }),
        );
      }
      if (url.includes("/brands/logos?")) {
        return Promise.resolve(
          jsonResponse(200, {
            rows: [
              {
                id: "asset-broken",
                source_url: "https://1000logos.net/hotels-com-logo/",
                source_provider: "logos1000",
                hosted_logo_url: null,
                is_selected_for_role: true,
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse(200, {}));
    });

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-4", email: "admin@example.com" }}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="bravotv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    const [image] = await screen.findAllByAltText("bravotv.com wordmark");
    expect(image.getAttribute("src")).toMatch(/1000logos\.net\/(hotels|booking)-com-logo\//);

    fireEvent.error(image);

    await waitFor(() => {
      expect(image.getAttribute("src")).toContain("/icons/brand-placeholder.svg");
    });
  });
});

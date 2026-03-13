/* eslint-disable @next/next/no-img-element */
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

function createFetchMock() {
  const sourceQueryCalls: Array<Record<string, unknown>> = [];
  const discoverCalls: Array<Record<string, unknown>> = [];
  const selectCalls: Array<Record<string, unknown>> = [];
  const assignCalls: Array<Record<string, unknown>> = [];
  const deleteCalls: string[] = [];

  mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/brands/logos/options/modal")) {
      return Promise.resolve(
        jsonResponse(200, {
          saved_assets: [
            {
              id: "saved-wordmark",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/wordmark.svg",
              hosted_logo_url: "https://stored.example/wordmark.svg",
              selected_roles: ["wordmark"],
              file_type: "svg",
              width: 400,
              height: 120,
            },
            {
              id: "saved-icon",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/icon.svg",
              hosted_logo_url: "https://stored.example/icon.svg",
              selected_roles: ["icon"],
              file_type: "svg",
              width: 128,
              height: 128,
            },
          ],
          featured_assets: {
            wordmark: {
              id: "saved-wordmark",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/wordmark.svg",
              hosted_logo_url: "https://stored.example/wordmark.svg",
              selected_roles: ["wordmark"],
            },
            icon: {
              id: "saved-icon",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/icon.svg",
              hosted_logo_url: "https://stored.example/icon.svg",
              selected_roles: ["icon"],
            },
          },
          sources: [
            {
              source_provider: "logos1000",
              total_count: 0,
              has_more: true,
              editable: true,
              refreshable: true,
              query_kind: "slug",
              effective_query_value: "peacocktv-logo",
              query_values: ["peacocktv-logo"],
              query_links: ["https://1000logos.net/peacocktv-logo/"],
            },
            {
              source_provider: "logosearch",
              total_count: 0,
              has_more: true,
              editable: true,
              refreshable: true,
              query_kind: "search_term",
              effective_query_value: "peacock",
              query_values: ["peacock"],
              query_links: ["https://logosear.ch/search.html?q=peacock"],
            },
            {
              source_provider: "logos_fandom",
              total_count: 0,
              has_more: true,
              editable: true,
              refreshable: true,
              query_kind: "search_term",
              effective_query_value: "IMDb",
              query_values: ["IMDb", "IMDb/Special_Logos"],
              query_links: ["https://logos.fandom.com/wiki/IMDb"],
            },
          ],
        }),
      );
    }

    if (url.includes("/brands/logos/options/discover")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      discoverCalls.push(body);
      const provider = String(body.source_provider || "");
      if (provider === "logos1000") {
        const values = Array.isArray(body.query_overrides) ? body.query_overrides : [];
        const isEdited = values.includes("peacock-logo");
        return Promise.resolve(
          jsonResponse(200, {
            total_count: 2,
            next_offset: 2,
            has_more: false,
            candidates: [
              {
                id: isEdited ? "logos1000-edited-1" : "logos1000-1",
                source_url: "https://1000logos.net/wp-content/uploads/2024/peacock-logo.svg",
                source_provider: "logos1000",
                discovered_from: isEdited ? "https://1000logos.net/peacock-logo/" : "https://1000logos.net/peacocktv-logo/",
                option_kind: "candidate",
                file_type: "svg",
                width: 640,
                height: 320,
                detected_logo_role: "wordmark",
              },
              {
                id: isEdited ? "logos1000-edited-2" : "logos1000-2",
                source_url: "https://1000logos.net/wp-content/uploads/2024/peacock-mark.svg",
                source_provider: "logos1000",
                discovered_from: isEdited ? "https://1000logos.net/peacock-logo/" : "https://1000logos.net/peacocktv-logo/",
                option_kind: "candidate",
                file_type: "svg",
                width: 256,
                height: 256,
                detected_logo_role: "icon",
              },
            ],
          }),
        );
      }
      if (provider === "logosearch") {
        return Promise.resolve(
          jsonResponse(200, {
            total_count: 1,
            next_offset: 1,
            has_more: false,
            candidates: [
              {
                id: "logosearch-1",
                source_url: "https://logosear.ch/peacock.svg",
                source_provider: "logosearch",
                discovered_from: "https://logosear.ch/search.html?q=peacock",
                option_kind: "candidate",
                file_type: "svg",
                width: 512,
                height: 128,
                detected_logo_role: "wordmark",
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse(200, { total_count: 0, next_offset: 0, has_more: false, candidates: [] }));
    }

    if (url.includes("/brands/logos/options/source-query")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      sourceQueryCalls.push(body);
      return Promise.resolve(
        jsonResponse(200, {
          source: {
            source_provider: body.source_provider,
            total_count: 0,
            has_more: true,
            editable: true,
            refreshable: true,
            query_kind: "slug",
            effective_query_value: Array.isArray(body.query_values) ? body.query_values[0] : null,
            query_values: body.query_values,
            query_links: [`https://1000logos.net/${Array.isArray(body.query_values) ? body.query_values[0] : ""}/`],
          },
        }),
      );
    }

    if (url.includes("/brands/logos/options/source-suggestions")) {
      return Promise.resolve(
        jsonResponse(200, {
          suggestions: [
            {
              query_value: "Peacock/Other",
              query_link: "https://logos.fandom.com/wiki/Peacock/Other",
              reason: "Linked page",
            },
          ],
        }),
      );
    }

    if (url.includes("/brands/logos/options/select")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      selectCalls.push(body);
      return Promise.resolve(jsonResponse(200, { selected: { id: "saved-new" }, summary: {} }));
    }

    if (url.includes("/brands/logos/options/assign")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      assignCalls.push(body);
      return Promise.resolve(jsonResponse(200, { selected: { id: "saved-wordmark" }, summary: {} }));
    }

    if (url.includes("/brands/logos/options/saved/")) {
      deleteCalls.push(url);
      return Promise.resolve(
        jsonResponse(200, {
          saved_assets: [
            {
              id: "saved-icon",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/icon.svg",
              hosted_logo_url: "https://stored.example/icon.svg",
              selected_roles: ["icon"],
              file_type: "svg",
              width: 128,
              height: 128,
            },
          ],
          featured_assets: {
            wordmark: null,
            icon: {
              id: "saved-icon",
              source_provider: "manual_import_url",
              discovered_from: "https://stored.example/icon.svg",
              hosted_logo_url: "https://stored.example/icon.svg",
              selected_roles: ["icon"],
            },
          },
          sources: [
            {
              source_provider: "logos1000",
              total_count: 0,
              has_more: true,
              editable: true,
              refreshable: true,
              query_kind: "slug",
              effective_query_value: "peacocktv-logo",
              query_values: ["peacocktv-logo"],
              query_links: ["https://1000logos.net/peacocktv-logo/"],
            },
          ],
        }),
      );
    }

    return Promise.resolve(jsonResponse(404, { error: `Unhandled request: ${url}` }));
  });

  return { sourceQueryCalls, discoverCalls, selectCalls, assignCalls, deleteCalls };
}

describe("BrandLogoOptionsModal", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
  });

  it("loads the combined picker, prefetches source tabs, and renders metadata without helper copy", async () => {
    createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        onSaved={() => {}}
      />,
    );

    expect(await screen.findByText("Featured Wordmark")).toBeTruthy();
    expect(await screen.findByRole("button", { name: "logos1000 (2)" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "logos1000 (2)" }));
    expect(await screen.findByText("SVG · 640x320")).toBeTruthy();
    expect(screen.queryByText("Click to add this option")).toBeNull();
    expect(screen.queryByText("Discovered option")).toBeNull();
  });

  it("persists provider-specific query edits to both roles and refreshes only the edited source", async () => {
    const { sourceQueryCalls, discoverCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        onSaved={() => {}}
      />,
    );

    await screen.findByRole("button", { name: "logos1000 (2)" });
    const initialLogos1000DiscoverCount = discoverCalls.filter((call) => call.source_provider === "logos1000").length;
    const initialLogosearchDiscoverCount = discoverCalls.filter((call) => call.source_provider === "logosearch").length;

    fireEvent.click(screen.getByRole("button", { name: "logos1000 (2)" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit query" }));

    const input = await screen.findByDisplayValue("peacocktv-logo");
    fireEvent.change(input, { target: { value: "peacock-logo" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(sourceQueryCalls).toHaveLength(2);
    });
    expect(sourceQueryCalls.map((call) => call.logo_role)).toEqual(["wordmark", "icon"]);

    await waitFor(() => {
      expect(discoverCalls.filter((call) => call.source_provider === "logos1000").length).toBeGreaterThan(initialLogos1000DiscoverCount);
    });
    expect(discoverCalls.filter((call) => call.source_provider === "logosearch").length).toBe(initialLogosearchDiscoverCount);
  });

  it("batch-saves multiple discovered assets and marks only the last one featured", async () => {
    const { selectCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        onSaved={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "logos1000 (2)" }));

    const resultsPanel = await screen.findByTestId("brand-logo-results-panel");
    const cards = within(resultsPanel).getAllByRole("button", {
      name: /peacocktv\.com option/i,
    });
    fireEvent.click(cards[0]);
    fireEvent.click(cards[1]);
    fireEvent.click(screen.getByRole("button", { name: "Save Selected (2)" }));

    await waitFor(() => {
      expect(selectCalls).toHaveLength(2);
    });
    expect(selectCalls[0]?.set_featured).toBe(false);
    expect(selectCalls[1]?.set_featured).toBe(true);
  });

  it("deletes saved assets from the shared saved tab", async () => {
    const { deleteCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        onSaved={() => {}}
      />,
    );

    expect(await screen.findByRole("button", { name: "saved (2)" })).toBeTruthy();
    const deleteButtons = await screen.findAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(await screen.findByRole("button", { name: "Delete Permanently" }));

    await waitFor(() => {
      expect(deleteCalls).toHaveLength(1);
    });
    expect(screen.getAllByRole("button", { name: "Delete" })).toHaveLength(1);
  });

  it("does not duplicate manual imports or inflate the manual source count", async () => {
    createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="peacocktv.com"
        targetLabel="peacocktv.com"
        onSaved={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add Manual Import" }));

    const input = screen.getByLabelText("Manual image URL");
    fireEvent.change(input, { target: { value: "https://cdn.example.com/custom-logo.svg" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Image URL" }));

    expect(await screen.findByRole("button", { name: "manual_import_url (1)" })).toBeTruthy();

    fireEvent.change(input, { target: { value: "https://cdn.example.com/custom-logo.svg" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Image URL" }));

    expect(screen.getByRole("button", { name: "manual_import_url (1)" })).toBeTruthy();
  });
});

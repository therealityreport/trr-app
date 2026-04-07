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
  const discoverCalls: Array<Record<string, unknown>> = [];
  const selectCalls: Array<Record<string, unknown>> = [];
  const assignCalls: Array<Record<string, unknown>> = [];

  mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/brands/logos/options/modal")) {
      return Promise.resolve(
        jsonResponse(200, {
          saved_assets: [
            {
              id: "saved-wordmark",
              source_provider: "manual_import_url",
              source_url: "https://stored.example/wordmark.svg",
              discovered_from: "https://stored.example/wordmark.svg",
              hosted_logo_url: "https://stored.example/wordmark.svg",
              selected_roles: ["wordmark"],
              file_type: "svg",
              width: 400,
              height: 120,
            },
            {
              id: "saved-icon",
              source_provider: "wikimedia_commons",
              source_url: "https://static.wikia.nocookie.net/logopedia/images/a/a1/test.png",
              discovered_from: "https://static.wikia.nocookie.net/logopedia/images/a/a1/test.png",
              hosted_logo_url: null,
              selected_roles: [],
              file_type: "png",
              width: 128,
              height: 128,
            },
          ],
          featured_assets: {
            wordmark: {
              id: "saved-wordmark",
              source_provider: "manual_import_url",
              source_url: "https://stored.example/wordmark.svg",
              discovered_from: "https://stored.example/wordmark.svg",
              hosted_logo_url: "https://stored.example/wordmark.svg",
              selected_roles: ["wordmark"],
              file_type: "svg",
              width: 400,
              height: 120,
            },
            icon: null,
          },
          sources: [
            {
              source_provider: "logos1000",
              total_count: 40,
              has_more: true,
              editable: true,
              refreshable: true,
              query_kind: "slug",
              effective_query_value: "bravo-logo",
              query_values: ["bravo-logo"],
              query_links: ["https://1000logos.net/bravo-logo/"],
            },
          ],
        }),
      );
    }

    if (url.includes("/brands/logos/options/discover")) {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      discoverCalls.push(body);
      const offset = Number(body.offset ?? 0);
      const limit = Number(body.limit ?? 0);
      return Promise.resolve(
        jsonResponse(200, {
          total_count: 40,
          next_offset: offset + limit,
          has_more: offset + limit < 40,
          candidates: Array.from({ length: Math.min(limit, 40 - offset) }, (_, index) => ({
            id: `logos1000-${offset + index + 1}`,
            source_url: `https://1000logos.net/wp-content/uploads/${offset + index + 1}.svg`,
            source_provider: "logos1000",
            discovered_from: "https://1000logos.net/bravo-logo/",
            option_kind: "candidate",
            file_type: "svg",
            width: 640,
            height: 320,
            detected_logo_role: "wordmark",
          })),
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
      return Promise.resolve(jsonResponse(200, { selected: { id: "saved-icon", logo_role: body.logo_role }, summary: {} }));
    }

    if (url.includes("/brands/logos/options/source-query")) {
      return Promise.resolve(
        jsonResponse(200, {
          source: {
            source_provider: "logos1000",
            total_count: 40,
            has_more: true,
            editable: true,
            refreshable: true,
            query_kind: "slug",
            effective_query_value: "bravo-logo",
            query_values: ["bravo-logo"],
            query_links: ["https://1000logos.net/bravo-logo/"],
          },
        }),
      );
    }

    if (url.includes("/brands/logos/options/source-suggestions")) {
      return Promise.resolve(jsonResponse(200, { suggestions: [] }));
    }

    return Promise.resolve(jsonResponse(404, { error: `Unhandled request: ${url}` }));
  });

  return { assignCalls, discoverCalls, selectCalls };
}

describe("BrandLogoOptionsModal", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
  });

  it("prefetches 20 candidates per source and renders featured assignment targets again", async () => {
    const { discoverCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="Bravo"
        defaultIconUrl="/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fbravotv.com%2Ffavicon.ico"
        onSaved={() => {}}
      />,
    );

    expect(await screen.findByText("Logo Library")).toBeInTheDocument();

    await waitFor(() => {
      expect(discoverCalls.length).toBeGreaterThan(0);
    });
    expect(discoverCalls[0]?.limit).toBe(20);
    expect(screen.getByText("Featured Wordmark")).toBeInTheDocument();
    expect(screen.getByText("Featured Icon")).toBeInTheDocument();
    expect(screen.getByText(/Drag a result card into either frame/i)).toBeInTheDocument();
    expect(screen.getByAltText("Bravo featured wordmark")).toHaveAttribute("src", "https://stored.example/wordmark.svg");
    expect(screen.getByAltText("Bravo featured icon")).toHaveAttribute(
      "src",
      "/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fbravotv.com%2Ffavicon.ico",
    );
  });

  it("loads 20 more candidates when load more is pressed", async () => {
    const { discoverCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="Bravo"
        onSaved={() => {}}
      />,
    );

    expect(await screen.findByRole("button", { name: "logos1000 (40)" })).toBeInTheDocument();
    await waitFor(() => {
      expect(discoverCalls).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "logos1000 (40)" }));
    fireEvent.click(screen.getByRole("button", { name: "Load More" }));

    await waitFor(() => {
      expect(discoverCalls).toHaveLength(2);
    });
    expect(discoverCalls[1]?.offset).toBe(20);
    expect(discoverCalls[1]?.limit).toBe(20);
  });

  it("shows every saved asset in the saved tab", async () => {
    createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="Bravo"
        defaultIconUrl="/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fbravotv.com%2Ffavicon.ico"
        onSaved={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "saved (2)" }));

    const resultsPanel = await screen.findByTestId("brand-logo-results-panel");
    expect(within(resultsPanel).getAllByText("Saved library asset")).toHaveLength(2);
    expect(within(resultsPanel).getAllByAltText("Bravo option")).toHaveLength(2);
    const savedImages = within(resultsPanel).getAllByAltText("Bravo option");
    expect(savedImages[1]).toHaveAttribute(
      "src",
      "/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fstatic.wikia.nocookie.net%2Flogopedia%2Fimages%2Fa%2Fa1%2Ftest.png",
    );
  });

  it("persists only selected candidates when save selected is pressed", async () => {
    const { selectCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="Bravo"
        defaultIconUrl="/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fbravotv.com%2Ffavicon.ico"
        onSaved={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "logos1000 (40)" }));

    const resultsPanel = await screen.findByTestId("brand-logo-results-panel");
    const candidateButtons = within(resultsPanel).getAllByRole("button", { name: /Bravo option/i });
    fireEvent.click(candidateButtons[0]);
    fireEvent.click(candidateButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: "Save Selected (2)" }));

    await waitFor(() => {
      expect(selectCalls).toHaveLength(2);
    });
    expect(selectCalls[0]?.set_featured).toBe(false);
    expect(selectCalls[1]?.set_featured).toBe(true);
  });

  it("assigns a dragged candidate into the featured icon frame", async () => {
    const { assignCalls } = createFetchMock();

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => {}}
        preferredUser={null}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="Bravo"
        defaultIconUrl="/api/admin/trr-api/brands/logos/options/preview?url=https%3A%2F%2Fbravotv.com%2Ffavicon.ico"
        onSaved={() => {}}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "logos1000 (40)" }));

    const resultsPanel = await screen.findByTestId("brand-logo-results-panel");
    const candidateCard = within(resultsPanel).getAllByRole("button", { name: /Bravo option/i })[0];
    const iconFrame = screen.getByTestId("featured-dropzone-icon");
    const transfer = {
      data: {} as Record<string, string>,
      setData(type: string, value: string) {
        this.data[type] = value;
      },
      getData(type: string) {
        return this.data[type] ?? "";
      },
      clearData() {
        this.data = {};
      },
      dropEffect: "move",
      effectAllowed: "move",
    };

    fireEvent.dragStart(candidateCard, { dataTransfer: transfer });
    fireEvent.dragOver(iconFrame, { dataTransfer: transfer });
    fireEvent.drop(iconFrame, { dataTransfer: transfer });

    await waitFor(() => {
      expect(assignCalls).toHaveLength(1);
    });
    expect(assignCalls[0]).toMatchObject({
      target_type: "publication",
      target_key: "bravotv.com",
      target_label: "Bravo",
      logo_role: "icon",
      candidate: {
        source_provider: "logos1000",
      },
    });
  });
});

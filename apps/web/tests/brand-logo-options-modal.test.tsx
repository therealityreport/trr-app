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

describe("BrandLogoOptionsModal", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const hasIncludeRelated = url.includes("include_related=true");
      if (url.includes("/brands/logos/options/discover")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { source_provider?: string };
        if (body.source_provider === "wikimedia_commons") {
          return Promise.resolve(
            jsonResponse(200, {
              candidates: [
                {
                  id: "candidate-1",
                  source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/IMDb_alt_logo.svg",
                  source_provider: "wikimedia_commons",
                  discovered_from: "https://commons.wikimedia.org/wiki/File:IMDb_alt_logo.svg",
                  logo_role: "wordmark",
                  option_kind: "candidate",
                },
              ],
              next_offset: 1,
              has_more: false,
            }),
          );
        }
        return Promise.resolve(jsonResponse(200, { candidates: [], next_offset: 0, has_more: false }));
      }
      if (url.includes("/brands/logos/options/sources")) {
        if (hasIncludeRelated) {
          return Promise.resolve(
            jsonResponse(500, {
              error: 'column "hosted_logo_black_url" does not exist',
            }),
          );
        }
        return Promise.resolve(
          jsonResponse(200, {
            sources: [{ source_provider: "wikimedia_commons", total_count: 0, has_more: false }],
          }),
        );
      }
      if (url.includes("/brands/logos?")) {
        if (hasIncludeRelated) {
          return Promise.resolve(
            jsonResponse(500, {
              error: 'column "hosted_logo_black_url" does not exist',
            }),
          );
        }
        return Promise.resolve(
          jsonResponse(200, {
            rows: [
              {
                id: "asset-1",
                source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/IMDb_logo.svg",
                source_provider: "wikimedia_commons",
                hosted_logo_url: "https://cdn.example.com/imdb.svg",
                is_selected_for_role: true,
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse(200, {}));
    });
  });

  it("retries without related pairing and keeps source counts visible", async () => {
    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-1", email: "admin@example.com" }}
        targetType="publication"
        targetKey="imdb.com"
        targetLabel="imdb.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("wikimedia_commons (1)")).toBeInTheDocument();
    });
    expect(screen.getByText("worldvectorlogo (0)")).toBeInTheDocument();
    expect(screen.getByText("logowik (0)")).toBeInTheDocument();
    expect(screen.getByText("logo_wine (0)")).toBeInTheDocument();
    expect(screen.getByText("logosearch (0)")).toBeInTheDocument();
    expect(screen.queryByText("brands_of_the_world (0)")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /commons\.wikimedia\.org\/w\/index\.php\?search=imdb%20logo&title=Special%3AMediaSearch&type=image&filemime=svg/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /commons\.wikimedia\.org\/w\/index\.php\?search=imdb%20icon&title=Special%3AMediaSearch&type=image&filemime=svg/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText("Related logo pairing temporarily unavailable; discovery sources are still usable.")).toBeInTheDocument();
    expect(screen.queryByText("No sources")).not.toBeInTheDocument();

    const calls = mocks.fetchAdminWithAuth.mock.calls.map((call) => String(call[0]));
    expect(calls.some((url) => url.includes("/brands/logos?") && url.includes("include_related=true"))).toBe(true);
    expect(calls.some((url) => url.includes("/brands/logos?") && url.includes("include_related=false"))).toBe(true);
    expect(calls.some((url) => url.includes("/brands/logos/options/sources") && url.includes("include_related=true"))).toBe(
      true,
    );
    expect(calls.some((url) => url.includes("/brands/logos/options/sources") && url.includes("include_related=false"))).toBe(
      true,
    );
    const discoverCalls = mocks.fetchAdminWithAuth.mock.calls.filter((call) =>
      String(call[0]).includes("/brands/logos/options/discover"),
    );
    expect(discoverCalls.length).toBeGreaterThan(0);
    for (const call of discoverCalls) {
      const init = (call[1] ?? {}) as RequestInit;
      const body = JSON.parse(String(init.body ?? "{}")) as { limit?: number };
      expect(body.limit).toBe(10);
    }
  });

  it("supports manual image URL import as a selectable candidate", async () => {
    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-2", email: "admin@example.com" }}
        targetType="other"
        targetKey="example.com"
        targetLabel="example.com"
        logoRole="icon"
        onSaved={() => undefined}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("wikimedia_commons (1)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Manual Import" }));
    const input = screen.getByLabelText("Manual image URL");
    fireEvent.change(input, { target: { value: "https://cdn.example.com/custom-icon.svg" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Image URL" }));

    await waitFor(() => {
      expect(screen.getByText("manual_import_url (1)")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Save Selected (2)" })).toBeEnabled();
  });

  it("falls back to placeholder preview when remote image fails to load", async () => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/brands/logos/options/sources")) {
        return Promise.resolve(
          jsonResponse(200, {
            sources: [{ source_provider: "logos1000", total_count: 1, has_more: false }],
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
      if (url.includes("/brands/logos/options/discover")) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { source_provider?: string };
        if (body.source_provider === "logos1000") {
          return Promise.resolve(
            jsonResponse(200, {
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
              next_offset: 1,
              has_more: false,
            }),
          );
        }
        return Promise.resolve(jsonResponse(200, { candidates: [], next_offset: 0, has_more: false }));
      }
      return Promise.resolve(jsonResponse(200, {}));
    });

    render(
      <BrandLogoOptionsModal
        isOpen
        onClose={() => undefined}
        preferredUser={{ uid: "admin-3", email: "admin@example.com" }}
        targetType="publication"
        targetKey="bravotv.com"
        targetLabel="bravotv.com"
        logoRole="wordmark"
        onSaved={() => undefined}
      />,
    );

    const images = await screen.findAllByAltText("bravotv.com wordmark");
    const image = images[0];
    expect(image.getAttribute("src")).toMatch(/1000logos\.net\/(hotels|booking)-com-logo\//);

    fireEvent.error(image);

    await waitFor(() => {
      expect(image.getAttribute("src")).toContain("/icons/brand-placeholder.svg");
    });
  });
});

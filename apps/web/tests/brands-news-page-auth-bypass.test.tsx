/* eslint-disable @next/next/no-img-element */
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, unoptimized, ...rest } = props;
    void fill;
    void unoptimized;
    return <img {...rest} alt={props.alt ?? ""} />;
  },
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  guardState: {
    user: { uid: "admin-1", email: "admin@example.com" },
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
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
  default: () => <nav aria-label="Breadcrumb" />,
}));

vi.mock("@/components/admin/BrandsTabs", () => ({
  __esModule: true,
  default: () => <div data-testid="brands-tabs" />,
}));

import AdminNewsPage from "@/app/admin/news/page";

const jsonResponse = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("admin news page auth bypass", () => {
  beforeEach(() => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((_input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
      if (!options?.allowDevAdminBypass) {
        return Promise.reject(new Error("Not authenticated"));
      }
      return Promise.resolve(jsonResponse({ rows: [] }));
    });
  });

  it("passes allowDevAdminBypass=true to all admin requests", async () => {
    render(<AdminNewsPage />);

    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth.mock.calls.length).toBeGreaterThan(0);
    });

    for (const call of mocks.fetchAdminWithAuth.mock.calls) {
      expect(call[2]).toMatchObject({
        allowDevAdminBypass: true,
        preferredUser: mocks.guardState.user,
      });
    }
  });

  it("renders brand stats, filters missing rows, and humanizes source labels", async () => {
    mocks.fetchAdminWithAuth.mockReset();
    mocks.fetchAdminWithAuth.mockImplementation((input: RequestInfo | URL, _init?: RequestInit, options?: { allowDevAdminBypass?: boolean }) => {
      if (!options?.allowDevAdminBypass) {
        return Promise.reject(new Error("Not authenticated"));
      }
      const url = String(input);
      if (url.includes("target_type=publication")) {
        return Promise.resolve(
          jsonResponse({
            rows: [
              {
                id: "pub-complete",
                target_type: "publication",
                target_key: "trakt.tv",
                target_label: "trakt.tv",
                source_provider: "official_site",
                discovered_from: "https://trakt.tv",
                hosted_logo_url: "https://cdn.example.com/trakt-wordmark.svg",
                hosted_logo_white_url: "https://cdn.example.com/trakt-icon.svg",
                logo_role: "wordmark",
                is_primary: true,
                updated_at: "2026-03-07T12:00:00Z",
              },
              {
                id: "pub-complete-icon",
                target_type: "publication",
                target_key: "trakt.tv",
                target_label: "trakt.tv",
                source_provider: "official_site",
                hosted_logo_url: "https://cdn.example.com/trakt-icon.svg",
                logo_role: "icon",
                is_primary: false,
                updated_at: "2026-03-07T12:00:00Z",
              },
              {
                id: "pub-missing",
                target_type: "publication",
                target_key: "bravotv.com",
                target_label: "bravotv.com",
                source_provider: "wikimedia_commons",
                discovered_from: "https://commons.wikimedia.org",
                hosted_logo_url: "https://cdn.example.com/bravo-wordmark.svg",
                logo_role: "wordmark",
                is_primary: true,
                updated_at: "2026-03-07T11:00:00Z",
              },
            ],
          }),
        );
      }
      if (url.includes("target_type=social")) {
        return Promise.resolve(
          jsonResponse({
            rows: [
              {
                id: "social-missing",
                target_type: "social",
                target_key: "youtube.com",
                target_label: "youtube.com",
                source_provider: "brand_guidelines",
                hosted_logo_url: "https://cdn.example.com/youtube-wordmark.svg",
                logo_role: "wordmark",
                is_primary: true,
                updated_at: "2026-03-07T10:00:00Z",
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse({ rows: [] }));
    });

    render(<AdminNewsPage />);

    await waitFor(() => {
      expect(screen.getByText("Tracked Brands")).toBeInTheDocument();
    });

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Missing Icons")).toBeInTheDocument();
    expect(screen.getByText("Official Site")).toBeInTheDocument();
    expect(screen.getByText("Brand Guidelines")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Needs Attention (2)" }));

    expect(screen.queryAllByText("trakt.tv")).toHaveLength(0);
    expect(screen.getAllByText("bravotv.com").length).toBeGreaterThan(0);
    expect(screen.getAllByText("youtube.com").length).toBeGreaterThan(0);
  });
});

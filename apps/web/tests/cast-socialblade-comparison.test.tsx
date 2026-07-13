import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CastSocialBladeComparison from "@/components/admin/cast-socialblade-comparison";

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) => (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("CastSocialBladeComparison", () => {
  it("normalizes partial cookie health payloads without nested cookie metadata", async () => {
    mocks.fetchAdminWithAuth.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/social-growth/cookies/health")) {
        return jsonResponse({
          healthy: true,
          status: "ready",
          reason: null,
          retryable: false,
          cookieNames: ["sessionid"],
          checkedAt: "2026-06-19T12:00:00.000Z",
        });
      }
      if (url.includes("/social-growth/history")) {
        return jsonResponse({ items: [] });
      }
      if (url.includes("/social-growth")) {
        return jsonResponse({ error: "No SocialBlade data found" }, 404);
      }
      return jsonResponse({});
    });

    render(
      <CastSocialBladeComparison
        seasonNumber={6}
        comparisonWindow={null}
        castMembers={[
          {
            person_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            person_name: "Lisa Barlow",
            display_name: "Lisa Barlow",
            instagram_handle: "lisabarlow",
            roles: ["Housewife"],
          },
        ]}
      />,
    );

    expect(await screen.findByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Authenticated SocialBlade session is usable")).toBeInTheDocument();
    expect(screen.getByText("Cookie file not written")).toBeInTheDocument();
  });
});

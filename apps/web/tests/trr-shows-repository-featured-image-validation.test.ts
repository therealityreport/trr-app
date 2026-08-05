import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, MockAdminReadProxyError } = vi.hoisted(() => {
  class TestAdminReadProxyError extends Error {
    status: number;
    retryable?: boolean;

    constructor(message: string, status: number, options?: { retryable?: boolean }) {
      super(message);
      this.status = status;
      this.retryable = options?.retryable;
    }
  }
  return {
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: TestAdminReadProxyError,
  };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: ({
    status,
    fallbackMessage,
  }: {
    status: number;
    fallbackMessage: string;
  }) => new MockAdminReadProxyError(fallbackMessage, status, { retryable: status >= 500 }),
}));

import { validateShowImageForField } from "@/lib/server/trr-api/trr-shows-repository";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";
const IMAGE_ID = "22222222-2222-2222-2222-222222222222";
const adminContext = {
  uid: "admin-user",
  email: "admin@example.test",
  verifiedAt: 42,
};

describe("validateShowImageForField", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("uses the strict v2 validation contract with verified admin context", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { valid: true } });

    await expect(
      validateShowImageForField(SHOW_ID, IMAGE_ID, "poster", { adminContext }),
    ).resolves.toBe(true);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      `/admin/shows/${SHOW_ID}/featured-image-validation`,
      {
        adminContext,
        apiVersion: "v2",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_id: IMAGE_ID, expected_kind: "poster" }),
        timeoutMs: 5_000,
        routeName: "admin-show-featured-image-validation",
        requestRole: "primary",
      },
    );
  });

  it("preserves a false validation result", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { valid: false } });

    await expect(
      validateShowImageForField(SHOW_ID, IMAGE_ID, "backdrop", { adminContext }),
    ).resolves.toBe(false);
  });

  it("throws a typed retryable proxy error for an upstream failure", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 503, data: {} });

    await expect(
      validateShowImageForField(SHOW_ID, IMAGE_ID, "poster", { adminContext }),
    ).rejects.toMatchObject({ status: 503, retryable: true });
  });
});

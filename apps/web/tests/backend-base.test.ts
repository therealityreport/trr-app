import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getBackendApiBase, getBackendApiUrl } from "@/lib/server/trr-api/backend";

const originalNodeEnv = process.env.NODE_ENV;

describe("backend base normalization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

afterEach(() => {
  delete process.env.TRR_API_URL;
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

  it("returns null for blank TRR_API_URL values", () => {
    process.env.TRR_API_URL = "   ";

    expect(getBackendApiBase()).toBeNull();
    expect(getBackendApiUrl("/admin/socials/ingest/queue-status")).toBeNull();
  });

  it("trims whitespace and normalizes localhost to 127.0.0.1", () => {
    process.env.TRR_API_URL = "  http://localhost:8000/  ";

    expect(getBackendApiBase()).toBe("http://127.0.0.1:8000/api/v1");
    expect(getBackendApiUrl("admin/socials/ingest/queue-status")).toBe(
      "http://127.0.0.1:8000/api/v1/admin/socials/ingest/queue-status",
    );
  });

  it("warns once when TRR_API_URL points at a remote host in development", () => {
    process.env.NODE_ENV = "development";
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    process.env.TRR_API_URL = "https://backend.example.com";

    expect(getBackendApiBase()).toBe("https://backend.example.com/api/v1");
    expect(getBackendApiBase()).toBe("https://backend.example.com/api/v1");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain("TRR_API_URL points to a remote host");
  });
});

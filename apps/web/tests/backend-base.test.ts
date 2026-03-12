import { afterEach, describe, expect, it } from "vitest";

import { getBackendApiBase, getBackendApiUrl } from "@/lib/server/trr-api/backend";

describe("backend base normalization", () => {
  afterEach(() => {
    delete process.env.TRR_API_URL;
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
});

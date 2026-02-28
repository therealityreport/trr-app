import { afterEach, describe, expect, it } from "vitest";
import { getBackendApiBase, getBackendApiUrl } from "@/lib/server/trr-api/backend";

const originalBackendUrl = process.env.TRR_API_URL;

afterEach(() => {
  if (originalBackendUrl === undefined) {
    delete process.env.TRR_API_URL;
  } else {
    process.env.TRR_API_URL = originalBackendUrl;
  }
});

describe("trr backend base normalization", () => {
  it("normalizes localhost hostnames to 127.0.0.1 and appends /api/v1", () => {
    process.env.TRR_API_URL = "http://localhost:8000";
    expect(getBackendApiBase()).toBe("http://127.0.0.1:8000/api/v1");
    expect(getBackendApiUrl("/admin/socials")).toBe("http://127.0.0.1:8000/api/v1/admin/socials");
  });

  it("keeps explicit /api/v1 suffix without duplication", () => {
    process.env.TRR_API_URL = "http://localhost:8000/api/v1/";
    expect(getBackendApiBase()).toBe("http://127.0.0.1:8000/api/v1");
  });
});

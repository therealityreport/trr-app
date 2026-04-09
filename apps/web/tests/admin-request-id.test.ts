import { describe, expect, it } from "vitest";
import { buildScopedAdminRequestId, resolveRequestIdFromPayload } from "@/lib/admin/request-id";

describe("admin request id helpers", () => {
  it("builds scoped request ids with sanitized tokens and monotonic suffix", () => {
    const requestId = buildScopedAdminRequestId({
      prefix: "season-refresh",
      counter: 7,
      now: 1234567890,
      parts: [
        { value: "Show Name!" },
        { prefix: "s", value: 12 },
      ],
    });

    expect(requestId).toBe("season-refresh-show-name-s12-kf12oi-7");
  });

  it("falls back when payload does not include a request id", () => {
    expect(resolveRequestIdFromPayload({ request_id: "req-123" }, "fallback")).toBe("req-123");
    expect(resolveRequestIdFromPayload({ detail: "missing" }, "fallback")).toBe("fallback");
  });
});

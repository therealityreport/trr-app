import { afterEach, describe, expect, it } from "vitest";
import { isDevAdminBypassEnabledClient } from "@/lib/admin/dev-admin-bypass";

const originalNodeEnv = process.env.NODE_ENV;
const originalBypass = process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (typeof originalBypass === "undefined") {
    delete process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS;
  } else {
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS = originalBypass;
  }
});

describe("isDevAdminBypassEnabledClient", () => {
  it("defaults to enabled on localhost during development", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS;
    expect(isDevAdminBypassEnabledClient("localhost")).toBe(true);
  });

  it("allows explicit enable on localhost outside development", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS = "true";
    expect(isDevAdminBypassEnabledClient("127.0.0.1")).toBe(true);
  });

  it("respects explicit disable", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS = "false";
    expect(isDevAdminBypassEnabledClient("localhost")).toBe(false);
  });

  it("stays disabled for non-local hosts", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS = "true";
    expect(isDevAdminBypassEnabledClient("example.com")).toBe(false);
  });
});

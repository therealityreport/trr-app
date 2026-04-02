import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("browser supabase env contract", () => {
  it("returns null when NEXT_PUBLIC supabase envs are missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const clientModule = await import("@/lib/supabase/client");

    expect(clientModule.createClient()).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  });

  it("does not fall back to server-side supabase envs", async () => {
    vi.stubEnv("SUPABASE_URL", "https://server.example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "server-anon-key");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const clientModule = await import("@/lib/supabase/client");

    expect(clientModule.createClient()).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("builds a client when both NEXT_PUBLIC_SUPABASE_* vars are present", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const clientModule = await import("@/lib/supabase/client");

    const client = clientModule.createClient();
    expect(client).not.toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("flashback bootstrap failure messaging", () => {
  it("throws with descriptive error when browser supabase is unconfigured", async () => {
    // Ensure NEXT_PUBLIC vars are missing so createClient returns null
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { getTodaysQuiz } = await import("@/lib/flashback/supabase");

    await expect(getTodaysQuiz()).rejects.toThrow(
      "Supabase is not configured",
    );
  });
});

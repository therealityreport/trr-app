import { afterEach, describe, expect, it, vi } from "vitest";

const resetSupabaseClientModule = async () => {
  vi.resetModules();
  return import("@/lib/supabase/client");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createClient", () => {
  it("requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_URL", "https://server-only.example.supabase.co");
    vi.stubEnv("SUPABASE_ANON_KEY", "server-only-anon");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const { createClient } = await resetSupabaseClientModule();

    expect(createClient()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    );
  });
});

import { describe, expect, it, vi } from "vitest";
import { getCachedStableRead } from "@/lib/server/trr-api/reddit-stable-route-cache";
describe("Reddit lifecycle content freshness", () => {
  it("reads canonical content again after a lifecycle redaction", async () => {
    const loader = vi.fn().mockResolvedValueOnce({ body: "old content" }).mockResolvedValueOnce({ body: null, deleted: true });
    const options = { namespace: "admin-reddit-stable-detail", cacheKey: "same-post", ttlMs: 60_000, loader };
    await getCachedStableRead(options);
    expect(await getCachedStableRead(options)).toEqual({ payload: { body: null, deleted: true }, cacheHit: false });
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it("does not share an earlier in-flight content request after lifecycle changes", async () => {
    let release!: (value: string) => void;
    const loader = vi.fn().mockImplementationOnce(() => new Promise<string>(resolve => { release = resolve; })).mockResolvedValueOnce("redacted");
    const options = { namespace: "admin-reddit-stable-detail", cacheKey: "same-post-concurrent", ttlMs: 60_000, loader };
    const earlier = getCachedStableRead(options);
    expect((await getCachedStableRead(options)).payload).toBe("redacted");
    release("earlier content");
    await earlier;
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

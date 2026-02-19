import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { fetchSubredditPostFlares } from "@/lib/server/admin/reddit-flairs-service";

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe("reddit-flairs-service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns API flares when flair endpoint succeeds", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link_flair_v2.json")) {
        return jsonResponse([{ text: "Episode Discussion" }, { text: "Live Thread" }]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchSubredditPostFlares("BravoRealHousewives");

    expect(result).toEqual({
      flares: ["Episode Discussion", "Live Thread"],
      source: "api",
      warning: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to listing extraction when flair API fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link_flair_v2.json")) return jsonResponse({}, 500);
      if (url.includes("/new.json")) {
        return jsonResponse({
          data: {
            children: [{ data: { link_flair_text: "Episode Discussion" } }, { data: { link_flair_text: "" } }],
          },
        });
      }
      if (url.includes("/hot.json")) {
        return jsonResponse({
          data: {
            children: [{ data: { link_flair_text: "Live Thread" } }, { data: { link_flair_text: "episode discussion" } }],
          },
        });
      }
      if (url.includes("/top.json")) {
        return jsonResponse({
          data: {
            children: [{ data: { link_flair_text: "Rewatch" } }],
          },
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchSubredditPostFlares("BravoRealHousewives");

    expect(result.source).toBe("listing_fallback");
    expect(result.flares).toEqual(["Episode Discussion", "Live Thread", "Rewatch"]);
    expect(result.warning).toContain("Reddit request failed");
  });

  it("normalizes and alphabetizes RHOSLC flairs while removing Whitney token flairs", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link_flair_v2.json")) {
        return jsonResponse([
          { text: "Chat/Discussion 👄" },
          { text: ":Meredith: Meredith Marksss 🛀" },
          { text: ":Whitney: It's Whitney, B*tch 🙎🏼‍♀️" },
          { text: "S7🧊" },
          { text: "❄️General❄️" },
        ]);
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchSubredditPostFlares("realhousewivesofSLC");

    expect(result.flares).toEqual([
      "Chat/Discussion",
      "General",
      "Meredith Marksss",
      "S7",
    ]);
    expect(result.flares.some((flair) => flair.toLowerCase().includes("whitney"))).toBe(false);
  });

  it("returns empty flares when both API and fallback have none", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/link_flair_v2.json")) return jsonResponse([]);
      if (url.includes(".json")) {
        return jsonResponse({
          data: {
            children: [{ data: { link_flair_text: null } }, { data: {} }],
          },
        });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    const result = await fetchSubredditPostFlares("BravoRealHousewives");

    expect(result).toEqual({
      flares: [],
      source: "none",
      warning: null,
    });
  });

  it("validates subreddit input before requesting Reddit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);

    await expect(fetchSubredditPostFlares("not valid!!")).rejects.toThrow("Invalid subreddit");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const makeChain = (result: { data?: unknown; error?: unknown; count?: number }) => {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(async () => result);
  chain.in = vi.fn(async () => result);
  chain.eq = vi.fn(async () => result);
  chain.delete = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  return chain;
};

const { schemaMock } = vi.hoisted(() => ({
  schemaMock: vi.fn(),
}));

vi.mock("@/lib/server/supabase-trr-admin", () => ({
  supabaseTrrAdmin: {
    get client() {
      return {
        schema: schemaMock,
      };
    },
  },
}));

import { getCoveredShows } from "@/lib/server/admin/covered-shows-repository";

describe("covered shows repository slug query safety", () => {
  beforeEach(() => {
    schemaMock.mockReset();
  });

  it("disambiguates colliding computed slugs with the show id prefix", async () => {
    const coveredShowsChain = makeChain({
      data: [
        {
          id: "covered-1",
          trr_show_id: "show-1",
          show_name: "Vanderpump Rules",
          created_at: "2026-03-13T00:00:00Z",
          created_by_firebase_uid: "user-1",
        },
        {
          id: "covered-2",
          trr_show_id: "show-2",
          show_name: "Vanderpump Rules",
          created_at: "2026-03-13T00:00:00Z",
          created_by_firebase_uid: "user-1",
        },
      ],
      error: null,
    });
    const coreShowsChain = makeChain({
      data: [
        {
          id: "show-1",
          name: "Vanderpump Rules",
          slug: null,
          alternative_names: null,
          show_total_episodes: 10,
          primary_poster_image_id: null,
        },
        {
          id: "show-2",
          name: "Vanderpump Rules",
          slug: null,
          alternative_names: null,
          show_total_episodes: 12,
          primary_poster_image_id: null,
        },
      ],
      error: null,
    });

    schemaMock.mockImplementation((schemaName: string) => ({
      from: vi.fn((tableName: string) => {
        if (schemaName === "admin" && tableName === "covered_shows") return coveredShowsChain;
        if (schemaName === "core" && tableName === "shows") return coreShowsChain;
        if (schemaName === "core" && tableName === "show_images") {
          return makeChain({ data: [], error: null });
        }
        throw new Error(`Unexpected query ${schemaName}.${tableName}`);
      }),
    }));

    const shows = await getCoveredShows();

    expect(shows).toHaveLength(2);
    expect(shows.map((show) => show.canonical_slug)).toEqual([
      "vanderpump-rules--show-1",
      "vanderpump-rules--show-2",
    ]);
  });
});

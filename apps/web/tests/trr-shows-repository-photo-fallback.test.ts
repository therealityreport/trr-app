import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { getCastByShowId } from "@/lib/server/trr-api/trr-shows-repository";

const buildShowCastRow = () => ({
  id: "cast-1",
  show_id: "show-1",
  person_id: "person-1",
  show_name: "Test Show",
  cast_member_name: "Person One",
  role: "Self",
  billing_order: 1,
  credit_category: "cast",
  source_type: "imdb_show_membership",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

describe("trr shows repository cast photo fallback mode", () => {
  beforeEach(() => {
    queryMock.mockReset();
    vi.restoreAllMocks();
  });

  it("does not call external Bravo profile fetch when fallback mode is none", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      text: async () => "",
    } as Response);
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("FROM core.v_show_cast")) {
        return { rows: [buildShowCastRow()] };
      }
      if (text.includes("FROM core.people") && text.includes("known_for")) {
        return { rows: [{ id: "person-1", full_name: "Person One", known_for: null }] };
      }
      if (text.includes("FROM core.media_links ml")) {
        return { rows: [] };
      }
      if (text.includes("FROM core.v_cast_photos")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const result = await getCastByShowId("show-1", {
      limit: 10,
      offset: 0,
      photoFallbackMode: "none",
    });

    expect(result).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls external Bravo profile fetch when fallback mode is bravo", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("FROM core.v_show_cast")) {
        return { rows: [buildShowCastRow()] };
      }
      if (text.includes("FROM core.people") && text.includes("known_for")) {
        return { rows: [{ id: "person-1", full_name: "Person One", known_for: null }] };
      }
      if (text.includes("FROM core.media_links ml")) {
        return { rows: [] };
      }
      if (text.includes("FROM core.v_cast_photos")) {
        return { rows: [] };
      }
      if (text.includes("FROM core.entity_links")) {
        return { rows: [] };
      }
      if (text.includes("FROM core.people") && text.includes("profile_image_url")) {
        return {
          rows: [
            {
              id: "person-1",
              full_name: "Person One",
              profile_image_url: null,
              homepage: null,
            },
          ],
        };
      }
      return { rows: [] };
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><head><meta property="og:image" content="https://cdn.example.com/person-one.jpg"></head></html>',
    } as Response);

    const result = await getCastByShowId("show-1", {
      limit: 10,
      offset: 0,
      photoFallbackMode: "bravo",
    });

    expect(result).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalled();
    expect(String(fetchSpy.mock.calls[0]?.[0] ?? "")).toContain("https://www.bravotv.com/people/person-one");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  adminSelectOrderMock,
  adminSelectEqMock,
  adminDeleteEqMock,
  adminInsertMock,
  adminUpdateEqMock,
  coreShowsInMock,
  coreShowImagesInMock,
  schemaMock,
} = vi.hoisted(() => {
  const adminSelectOrderMock = vi.fn();
  const adminSelectEqMock = vi.fn();
  const adminDeleteEqMock = vi.fn();
  const adminInsertMock = vi.fn();
  const adminUpdateEqMock = vi.fn();
  const coreShowsInMock = vi.fn();
  const coreShowImagesInMock = vi.fn();

  const adminTable = {
    select: vi.fn((_columns: string, options?: unknown) => {
      if (typeof options === "object" && options !== null && "head" in (options as Record<string, unknown>)) {
        return { eq: adminSelectEqMock };
      }
      return { order: adminSelectOrderMock };
    }),
    insert: adminInsertMock,
    update: vi.fn(() => ({ eq: adminUpdateEqMock })),
    delete: vi.fn(() => ({ eq: adminDeleteEqMock })),
  };

  const coreShowsTable = {
    select: vi.fn(() => ({ in: coreShowsInMock })),
  };

  const coreShowImagesTable = {
    select: vi.fn(() => ({ in: coreShowImagesInMock })),
  };

  const schemaMock = vi.fn((schemaName: string) => {
    if (schemaName === "admin") {
      return {
        from: vi.fn(() => adminTable),
      };
    }
    if (schemaName === "core") {
      return {
        from: vi.fn((tableName: string) => {
          if (tableName === "shows") return coreShowsTable;
          if (tableName === "show_images") return coreShowImagesTable;
          throw new Error(`Unexpected core table: ${tableName}`);
        }),
      };
    }
    throw new Error(`Unexpected schema: ${schemaName}`);
  });

  return {
    adminSelectOrderMock,
    adminSelectEqMock,
    adminDeleteEqMock,
    adminInsertMock,
    adminUpdateEqMock,
    coreShowsInMock,
    coreShowImagesInMock,
    schemaMock,
  };
});

vi.mock("@/lib/server/supabase-trr-admin", () => ({
  supabaseTrrAdmin: {
    get client() {
      return {
        schema: schemaMock,
      };
    },
  },
}));

describe("covered-shows repository", () => {
  beforeEach(() => {
    adminSelectOrderMock.mockReset();
    adminSelectEqMock.mockReset();
    adminDeleteEqMock.mockReset();
    adminInsertMock.mockReset();
    adminUpdateEqMock.mockReset();
    coreShowsInMock.mockReset();
    coreShowImagesInMock.mockReset();
    schemaMock.mockClear();
  });

  it("builds covered show metadata through Supabase admin/core queries", async () => {
    adminSelectOrderMock.mockResolvedValue({
      data: [
        {
          id: "covered-1",
          trr_show_id: "show-1",
          show_name: "The Real Housewives",
          created_at: "2026-01-01T00:00:00.000Z",
          created_by_firebase_uid: "admin-1",
        },
        {
          id: "covered-2",
          trr_show_id: "show-2",
          show_name: "The Real Housewives Ultimate Girls Trip",
          created_at: "2026-01-02T00:00:00.000Z",
          created_by_firebase_uid: "admin-1",
        },
      ],
      error: null,
    });
    coreShowsInMock.mockResolvedValue({
      data: [
        {
          id: "show-1",
          name: "The Real Housewives",
          slug: "",
          alternative_names: ["TRH"],
          show_total_episodes: 200,
          primary_poster_image_id: "poster-1",
        },
        {
          id: "show-2",
          name: "The Real Housewives",
          slug: "",
          alternative_names: null,
          show_total_episodes: 10,
          primary_poster_image_id: null,
        },
      ],
      error: null,
    });
    coreShowImagesInMock.mockResolvedValue({
      data: [{ id: "poster-1", hosted_url: "https://cdn.example.com/poster-1.jpg" }],
      error: null,
    });

    const { getCoveredShows } = await import("@/lib/server/admin/covered-shows-repository");
    const shows = await getCoveredShows();

    expect(shows).toHaveLength(2);
    expect(shows[0]).toMatchObject({
      trr_show_id: "show-1",
      canonical_slug: "the-real-housewives--show-1",
      alternative_names: ["TRH"],
      show_total_episodes: 200,
      poster_url: "https://cdn.example.com/poster-1.jpg",
    });
    expect(shows[1]).toMatchObject({
      trr_show_id: "show-2",
      canonical_slug: "the-real-housewives--show-2",
      poster_url: null,
    });
  });

  it("inserts a new covered show without overwriting creator metadata on existing rows", async () => {
    adminSelectOrderMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            id: "covered-3",
            trr_show_id: "show-3",
            show_name: "Below Deck",
            created_at: "2026-01-03T00:00:00.000Z",
            created_by_firebase_uid: "admin-2",
          },
        ],
        error: null,
      });
    adminInsertMock.mockResolvedValue({ error: null });
    coreShowsInMock.mockResolvedValue({
      data: [
        {
          id: "show-3",
          name: "Below Deck",
          slug: "below-deck",
          alternative_names: null,
          show_total_episodes: 50,
          primary_poster_image_id: null,
        },
      ],
      error: null,
    });
    coreShowImagesInMock.mockResolvedValue({ data: [], error: null });

    const { addCoveredShow } = await import("@/lib/server/admin/covered-shows-repository");
    const show = await addCoveredShow(
      { firebaseUid: "admin-2", isAdmin: true },
      { trr_show_id: "show-3", show_name: "Below Deck" },
    );

    expect(adminInsertMock).toHaveBeenCalledWith({
      trr_show_id: "show-3",
      show_name: "Below Deck",
      created_by_firebase_uid: "admin-2",
    });
    expect(adminUpdateEqMock).not.toHaveBeenCalled();
    expect(show).toMatchObject({
      trr_show_id: "show-3",
      canonical_slug: "below-deck",
    });
  });

  it("removes covered shows through the admin schema client", async () => {
    adminDeleteEqMock.mockResolvedValue({ count: 1, error: null });

    const { removeCoveredShow } = await import("@/lib/server/admin/covered-shows-repository");
    const deleted = await removeCoveredShow({ firebaseUid: "admin-1", isAdmin: true }, "show-1");

    expect(deleted).toBe(true);
    expect(adminDeleteEqMock).toHaveBeenCalledWith("trr_show_id", "show-1");
  });
});

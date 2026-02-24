import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { validateShowImageForField } from "@/lib/server/trr-api/trr-shows-repository";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";
const IMAGE_ID = "22222222-2222-2222-2222-222222222222";

describe("validateShowImageForField", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("returns true for same-show poster rows", async () => {
    queryMock.mockResolvedValue({ rows: [{ kind: "poster", image_type: null }] });

    const result = await validateShowImageForField(SHOW_ID, IMAGE_ID, "poster");

    expect(result).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining("show_id = $2::uuid"), [IMAGE_ID, SHOW_ID]);
  });

  it("returns true for same-show backdrop rows with background alias", async () => {
    queryMock.mockResolvedValue({ rows: [{ kind: null, image_type: "background" }] });

    const result = await validateShowImageForField(SHOW_ID, IMAGE_ID, "backdrop");

    expect(result).toBe(true);
  });

  it("returns false when no row exists for show/image combination", async () => {
    queryMock.mockResolvedValue({ rows: [] });

    const result = await validateShowImageForField(SHOW_ID, IMAGE_ID, "poster");

    expect(result).toBe(false);
  });

  it("returns false when kind does not match expected field", async () => {
    queryMock.mockResolvedValue({ rows: [{ kind: "poster", image_type: "poster" }] });

    const result = await validateShowImageForField(SHOW_ID, IMAGE_ID, "backdrop");

    expect(result).toBe(false);
  });
});

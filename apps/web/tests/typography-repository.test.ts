import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, buildAdminBackendStatusErrorMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  buildAdminBackendStatusErrorMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: class AdminReadProxyError extends Error {},
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
}));

import {
  createTypographySet,
  deleteTypographySet,
  updateTypographySet,
  upsertTypographyAssignment,
} from "@/lib/server/admin/typography-repository";

const roles = {
  body: {
    mobile: {
      fontFamily: "var(--font-hamburg)",
      fontSize: "16px",
      fontWeight: "400",
      lineHeight: "24px",
      letterSpacing: "0px",
    },
    desktop: {
      fontFamily: "var(--font-hamburg)",
      fontSize: "18px",
      fontWeight: "400",
      lineHeight: "28px",
      letterSpacing: "0px",
    },
  },
};
const set = {
  id: "real-set-1",
  slug: "admin-home",
  name: "Admin Home",
  area: "admin",
  seed_source: "src/app/admin/page.tsx",
  roles,
  created_at: "",
  updated_at: "",
};
const assignment = {
  id: "assignment-1",
  area: "admin",
  page_key: "home",
  instance_key: null,
  set_id: "real-set-1",
  source_path: "src/app/admin/page.tsx",
  notes: null,
  created_at: "",
  updated_at: "",
};

describe("typography repository", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
  });

  it("creates a set through the v2 endpoint with backend field names", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 201, data: { set } });

    const created = await createTypographySet({
      name: " Admin Home ",
      area: "admin",
      seedSource: " src/app/admin/page.tsx ",
      roles,
    });

    expect(created.id).toBe("real-set-1");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/admin/site-typography/sets", expect.objectContaining({
      apiVersion: "v2",
      method: "POST",
      body: JSON.stringify({
        name: "Admin Home",
        area: "admin",
        seed_source: "src/app/admin/page.tsx",
        roles,
      }),
    }));
  });

  it("retains 404 and assigned-set 409 outcomes", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: {} })
      .mockResolvedValueOnce({ status: 409, data: {} });

    expect(await updateTypographySet("missing", { name: "Missing" })).toBeNull();
    expect(await deleteTypographySet("in-use")).toBe("in-use");
  });

  it("upserts nullable assignment scope through the v2 endpoint", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: { assignment } });

    const updated = await upsertTypographyAssignment({
      area: "admin",
      pageKey: "home",
      instanceKey: null,
      setId: "real-set-1",
      sourcePath: " src/app/admin/page.tsx ",
      notes: null,
    });

    expect(updated.setId).toBe("real-set-1");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/admin/site-typography/assignments", expect.objectContaining({
      apiVersion: "v2",
      method: "PUT",
      body: JSON.stringify({
        area: "admin",
        page_key: "home",
        instance_key: null,
        set_id: "real-set-1",
        source_path: "src/app/admin/page.tsx",
        notes: null,
      }),
    }));
  });
});

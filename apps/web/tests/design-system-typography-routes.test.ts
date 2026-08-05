import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { invalidateTypographyRouteCaches } from "@/lib/server/admin/typography-route-cache";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  getTypographyStateMock,
  createTypographySetMock,
  updateTypographySetMock,
  deleteTypographySetMock,
  upsertTypographyAssignmentMock,
  resolvePostgresConnectionCandidatesMock,
  buildTypographyStateSnapshotMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  getTypographyStateMock: vi.fn(),
  createTypographySetMock: vi.fn(),
  updateTypographySetMock: vi.fn(),
  deleteTypographySetMock: vi.fn(),
  upsertTypographyAssignmentMock: vi.fn(),
  resolvePostgresConnectionCandidatesMock: vi.fn(),
  buildTypographyStateSnapshotMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/typography-repository", () => ({
  getTypographyState: getTypographyStateMock,
  createTypographySet: createTypographySetMock,
  updateTypographySet: updateTypographySetMock,
  deleteTypographySet: deleteTypographySetMock,
  upsertTypographyAssignment: upsertTypographyAssignmentMock,
}));

vi.mock("@/lib/server/postgres", () => ({
  resolvePostgresConnectionCandidates: resolvePostgresConnectionCandidatesMock,
}));

vi.mock("@/lib/server/admin/typography-seed", () => ({
  buildTypographyStateSnapshot: buildTypographyStateSnapshotMock,
}));

import { GET as getTypography } from "@/app/api/admin/design-system/typography/route";
import { GET as getPublicTypography } from "@/app/api/design-system/typography/route";
import { POST as createTypography } from "@/app/api/admin/design-system/typography/sets/route";
import {
  DELETE as deleteTypography,
  PUT as updateTypography,
} from "@/app/api/admin/design-system/typography/sets/[setId]/route";
import { PUT as updateAssignment } from "@/app/api/admin/design-system/typography/assignments/route";

describe("design system typography routes", () => {
  beforeEach(() => {
    invalidateTypographyRouteCaches();
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    getTypographyStateMock.mockReset();
    createTypographySetMock.mockReset();
    updateTypographySetMock.mockReset();
    deleteTypographySetMock.mockReset();
    upsertTypographyAssignmentMock.mockReset();
    resolvePostgresConnectionCandidatesMock.mockReset();
    buildTypographyStateSnapshotMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    toVerifiedAdminContextMock.mockReturnValue({ uid: "admin-user", email: null, verifiedAt: 1 });
    resolvePostgresConnectionCandidatesMock.mockReturnValue(["configured"]);
    buildTypographyStateSnapshotMock.mockReturnValue({ sets: [], assignments: [] });
  });

  it("returns typography state", async () => {
    getTypographyStateMock.mockResolvedValue({ sets: [], assignments: [] });

    const response = await getTypography(new NextRequest("http://localhost/api/admin/design-system/typography"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ sets: [], assignments: [] });
    expect(getTypographyStateMock).toHaveBeenCalledWith({
      adminContext: { uid: "admin-user", email: null, verifiedAt: 1 },
    });
  });

  it("returns public typography state without admin auth", async () => {
    getTypographyStateMock.mockResolvedValue({ sets: [], assignments: [] });

    const response = await getPublicTypography();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ sets: [], assignments: [] });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(getTypographyStateMock).toHaveBeenCalledTimes(1);
  });

  it("returns seeded public typography without the repository when no runtime database is configured", async () => {
    resolvePostgresConnectionCandidatesMock.mockReturnValue([]);
    buildTypographyStateSnapshotMock.mockReturnValue({
      sets: [{ id: "seeded-set" }],
      assignments: [{ id: "seeded-assignment" }],
    });

    const response = await getPublicTypography();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      sets: [{ id: "seeded-set" }],
      assignments: [{ id: "seeded-assignment" }],
    });
    expect(requireAdminMock).not.toHaveBeenCalled();
    expect(getTypographyStateMock).not.toHaveBeenCalled();
  });

  it("caches admin and public typography GET responses", async () => {
    getTypographyStateMock.mockResolvedValue({ sets: [], assignments: [] });

    const firstAdmin = await getTypography(new NextRequest("http://localhost/api/admin/design-system/typography"));
    const secondAdmin = await getTypography(new NextRequest("http://localhost/api/admin/design-system/typography"));
    const firstPublic = await getPublicTypography();
    const secondPublic = await getPublicTypography();

    expect(firstAdmin.status).toBe(200);
    expect(secondAdmin.headers.get("x-trr-cache")).toBe("hit");
    expect(firstPublic.status).toBe(200);
    expect(secondPublic.headers.get("x-trr-cache")).toBe("hit");
    expect(getTypographyStateMock).toHaveBeenCalledTimes(2);
  });

  it("creates a typography set", async () => {
    createTypographySetMock.mockResolvedValue({
      id: "set-1",
      slug: "user-home",
      name: "User Home",
      area: "user-frontend",
      seedSource: "test",
      roles: {},
      createdAt: "",
      updatedAt: "",
    });

    const response = await createTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets", {
        method: "POST",
        body: JSON.stringify({
          name: "User Home",
          area: "user-frontend",
          seedSource: "test",
          roles: {
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
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(createTypographySetMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "User Home" }),
      { adminContext: { uid: "admin-user", email: null, verifiedAt: 1 } },
    );
    expect(payload.set.id).toBe("set-1");
  });

  it("invalidates cached typography GET responses after writes", async () => {
    getTypographyStateMock
      .mockResolvedValueOnce({ sets: [], assignments: [] })
      .mockResolvedValueOnce({ sets: [], assignments: [] })
      .mockResolvedValueOnce({ sets: [{ id: "set-1" }], assignments: [] })
      .mockResolvedValueOnce({ sets: [{ id: "set-1" }], assignments: [] });
    createTypographySetMock.mockResolvedValue({
      id: "set-1",
      slug: "user-home",
      name: "User Home",
      area: "user-frontend",
      seedSource: "test",
      roles: {},
      createdAt: "",
      updatedAt: "",
    });

    await getTypography(new NextRequest("http://localhost/api/admin/design-system/typography"));
    await getPublicTypography();

    await createTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets", {
        method: "POST",
        body: JSON.stringify({
          name: "User Home",
          area: "user-frontend",
          seedSource: "test",
          roles: {
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
          },
        }),
      }),
    );

    const refreshedAdmin = await getTypography(new NextRequest("http://localhost/api/admin/design-system/typography"));
    const refreshedPublic = await getPublicTypography();

    expect(refreshedAdmin.headers.get("x-trr-cache")).not.toBe("hit");
    expect(refreshedPublic.headers.get("x-trr-cache")).not.toBe("hit");
    expect(getTypographyStateMock).toHaveBeenCalledTimes(4);
  });

  it("validates create payloads", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to create typography set .*Invalid role config/);
    const response = await createTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets", {
        method: "POST",
        body: JSON.stringify({
          name: "Broken",
          area: "user-frontend",
          seedSource: "test",
          roles: {
            body: {
              mobile: {
                fontFamily: "var(--font-hamburg)",
                fontSize: "16px",
                fontWeight: "400",
                lineHeight: "24px",
                letterSpacing: "0px",
              },
            },
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid role config");
    expect(createTypographySetMock).not.toHaveBeenCalled();
    expectedError.expectCalled();
  });

  it("updates and deletes typography sets", async () => {
    updateTypographySetMock.mockResolvedValue({
      id: "set-1",
      slug: "user-home",
      name: "User Home Updated",
      area: "user-frontend",
      seedSource: "test",
      roles: {},
      createdAt: "",
      updatedAt: "",
    });
    deleteTypographySetMock.mockResolvedValueOnce("in-use").mockResolvedValueOnce("deleted");

    const updateResponse = await updateTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets/set-1", {
        method: "PUT",
        body: JSON.stringify({ name: "User Home Updated" }),
      }),
      { params: Promise.resolve({ setId: "set-1" }) },
    );
    const updatePayload = await updateResponse.json();
    expect(updateResponse.status).toBe(200);
    expect(updatePayload.set.name).toBe("User Home Updated");
    expect(updateTypographySetMock).toHaveBeenCalledWith(
      "set-1",
      { name: "User Home Updated" },
      { adminContext: { uid: "admin-user", email: null, verifiedAt: 1 } },
    );

    const blockedDelete = await deleteTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets/set-1", { method: "DELETE" }),
      { params: Promise.resolve({ setId: "set-1" }) },
    );
    expect(blockedDelete.status).toBe(409);
    expect(deleteTypographySetMock).toHaveBeenCalledWith(
      "set-1",
      { adminContext: { uid: "admin-user", email: null, verifiedAt: 1 } },
    );

    const deleted = await deleteTypography(
      new NextRequest("http://localhost/api/admin/design-system/typography/sets/set-1", { method: "DELETE" }),
      { params: Promise.resolve({ setId: "set-1" }) },
    );
    expect(deleted.status).toBe(200);
  });

  it("upserts typography assignments", async () => {
    upsertTypographyAssignmentMock.mockResolvedValue({
      id: "assignment-1",
      area: "surveys",
      pageKey: "single-select",
      instanceKey: "text-multiple-choice",
      setId: "set-1",
      sourcePath: "src/components/survey/SingleSelectInput.tsx",
      notes: null,
      createdAt: "",
      updatedAt: "",
    });

    const response = await updateAssignment(
      new NextRequest("http://localhost/api/admin/design-system/typography/assignments", {
        method: "PUT",
        body: JSON.stringify({
          area: "surveys",
          pageKey: "single-select",
          instanceKey: "text-multiple-choice",
          setId: "set-1",
          sourcePath: "src/components/survey/SingleSelectInput.tsx",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(upsertTypographyAssignmentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: "surveys",
        pageKey: "single-select",
        instanceKey: "text-multiple-choice",
      }),
      { adminContext: { uid: "admin-user", email: null, verifiedAt: 1 } },
    );
    expect(payload.assignment.id).toBe("assignment-1");
  });
});

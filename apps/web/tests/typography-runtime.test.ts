import { describe, expect, it } from "vitest";
import { buildSeededTypographyRuntimeState, buildSeededTypographyState } from "@/lib/server/admin/typography-seed";
import {
  normalizeRoleConfig,
  resolveTypographyStyleForBreakpoint,
} from "@/lib/typography/runtime";
import type { TypographyRoleConfig, TypographyState } from "@/lib/typography/types";

function makeRole(
  mobileFontSize: string,
  desktopFontSize: string,
  fontFamily = "var(--font-hamburg)",
): TypographyRoleConfig {
  return {
    mobile: {
      fontFamily,
      fontSize: mobileFontSize,
      fontWeight: "400",
      lineHeight: "24px",
      letterSpacing: "0px",
    },
    desktop: {
      fontFamily,
      fontSize: desktopFontSize,
      fontWeight: "700",
      lineHeight: "32px",
      letterSpacing: "0.02em",
    },
  };
}

describe("typography runtime", () => {
  it("resolves exact assignment before page and area defaults", () => {
    const state: TypographyState = {
      sets: [
        {
          id: "set-area",
          slug: "user-area",
          name: "Area",
          area: "user-frontend",
          seedSource: "test",
          roles: { heading: makeRole("16px", "18px") },
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "set-page",
          slug: "user-page",
          name: "Page",
          area: "user-frontend",
          seedSource: "test",
          roles: { heading: makeRole("20px", "24px") },
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "set-instance",
          slug: "user-instance",
          name: "Instance",
          area: "user-frontend",
          seedSource: "test",
          roles: { heading: makeRole("28px", "36px") },
          createdAt: "",
          updatedAt: "",
        },
      ],
      assignments: [
        {
          id: "a1",
          area: "user-frontend",
          pageKey: null,
          instanceKey: null,
          setId: "set-area",
          sourcePath: "area.tsx",
          notes: null,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "a2",
          area: "user-frontend",
          pageKey: "home",
          instanceKey: null,
          setId: "set-page",
          sourcePath: "home.tsx",
          notes: null,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "a3",
          area: "user-frontend",
          pageKey: "home",
          instanceKey: "hero",
          setId: "set-instance",
          sourcePath: "home.tsx",
          notes: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    };

    const exact = resolveTypographyStyleForBreakpoint(
      state,
      { area: "user-frontend", pageKey: "home", instanceKey: "hero", role: "heading" },
      "desktop",
      undefined,
    );
    const page = resolveTypographyStyleForBreakpoint(
      state,
      { area: "user-frontend", pageKey: "home", instanceKey: "other", role: "heading" },
      "desktop",
      undefined,
    );
    const area = resolveTypographyStyleForBreakpoint(
      state,
      { area: "user-frontend", pageKey: "other", instanceKey: "hero", role: "heading" },
      "mobile",
      undefined,
    );

    expect(exact?.fontSize).toBe("36px");
    expect(page?.fontSize).toBe("24px");
    expect(area?.fontSize).toBe("16px");
  });

  it("falls back when no assignment exists", () => {
    const resolved = resolveTypographyStyleForBreakpoint(
      { sets: [], assignments: [] },
      { area: "surveys", pageKey: "missing", instanceKey: "missing", role: "body" },
      "mobile",
      {
        fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
        fontSize: "19px",
        fontWeight: "700",
        lineHeight: "28px",
        letterSpacing: "0.01em",
      },
    );

    expect(resolved).toEqual({
      fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
      fontSize: "19px",
      fontWeight: "700",
      lineHeight: "28px",
      letterSpacing: "0.01em",
    });
  });

  it("normalizes partial role configs", () => {
    const role = normalizeRoleConfig({
      mobile: {
        fontFamily: "var(--font-rude-slab)",
        fontSize: "32px",
        fontWeight: "700",
        lineHeight: "40px",
        letterSpacing: "0.02em",
      },
      desktop: {
        fontFamily: "",
        fontSize: "48px",
        fontWeight: "",
        lineHeight: "",
        letterSpacing: "",
      },
    });

    expect(role?.desktop).toEqual({
      fontFamily: "var(--font-rude-slab)",
      fontSize: "48px",
      fontWeight: "700",
      lineHeight: "40px",
      letterSpacing: "0.02em",
    });
  });

  it("dedupes seeded sets with identical role profiles", () => {
    const sharedRoles = {
      body: makeRole("16px", "18px"),
    };

    const seeded = buildSeededTypographyState([
      {
        area: "admin",
        pageKey: null,
        instanceKey: null,
        name: "Admin Base",
        sourcePath: "admin/base.tsx",
        roles: sharedRoles,
      },
      {
        area: "admin",
        pageKey: "social-week",
        instanceKey: "detail",
        name: "Social Week",
        sourcePath: "admin/social-week.tsx",
        roles: sharedRoles,
      },
    ]);

    expect(seeded.sets).toHaveLength(1);
    expect(seeded.assignments).toHaveLength(2);
    expect(seeded.assignments[0]?.setSlug).toBe(seeded.assignments[1]?.setSlug);
  });

  it("builds a seeded runtime state with assignments wired to concrete set ids", () => {
    const runtimeState = buildSeededTypographyRuntimeState();

    expect(runtimeState.sets.length).toBeGreaterThan(0);
    expect(runtimeState.assignments.length).toBeGreaterThan(0);
    expect(runtimeState.assignments.every((assignment) => assignment.setId.length > 0)).toBe(true);
    expect(
      runtimeState.assignments.every((assignment) =>
        runtimeState.sets.some((set) => set.id === assignment.setId),
      ),
    ).toBe(true);
  });
});

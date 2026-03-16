import { normalizeRoleConfig } from "@/lib/typography/runtime";
import type { TypographyArea, TypographyRoleConfig } from "@/lib/typography/types";

const VALID_AREAS = new Set<TypographyArea>(["user-frontend", "surveys", "admin"]);

export function parseTypographyArea(value: unknown): TypographyArea {
  if (typeof value === "string" && VALID_AREAS.has(value as TypographyArea)) {
    return value as TypographyArea;
  }
  throw new Error("Invalid typography area");
}

export function parseRequiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

export function parseOptionalString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new Error("Expected string value");
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseTypographyRoles(value: unknown): Record<string, TypographyRoleConfig> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("roles must be an object");
  }

  const roles = value as Record<string, unknown>;
  const next: Record<string, TypographyRoleConfig> = {};

  for (const [key, roleConfig] of Object.entries(roles)) {
    const normalized = normalizeRoleConfig(roleConfig as Partial<TypographyRoleConfig>);
    if (!normalized) {
      throw new Error(`Invalid role config for ${key}`);
    }
    next[key] = normalized;
  }

  if (Object.keys(next).length === 0) {
    throw new Error("At least one role is required");
  }

  return next;
}

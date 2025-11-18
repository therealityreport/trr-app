import type { User } from "firebase/auth";
import { DEFAULT_ADMIN_DISPLAY_NAMES, DEFAULT_ADMIN_UIDS } from "./constants";
import { normalizeDisplayName, normalizeDisplayNameKey } from "./display-names";

const parseAllowlist = (raw?: string | null, lowercase = false): string[] => {
  const entries = (raw ?? "")
    .split(",")
    .map((entry) => (lowercase ? entry.trim().toLowerCase() : entry.trim()))
    .filter(Boolean);
  return entries;
};

const allowedAdminEmails = new Set(
  parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_EMAILS, true),
);

const allowedAdminUids = new Set<string>([
  ...DEFAULT_ADMIN_UIDS,
  ...parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_UIDS, false),
]);

const allowedAdminDisplayNames = new Set<string>(
  [
    ...DEFAULT_ADMIN_DISPLAY_NAMES,
    ...parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAMES, false),
  ]
    .map((value) => normalizeDisplayName(value))
    .filter((value): value is string => Boolean(value)),
);
const allowedAdminDisplayNameKeys = new Set<string>(
  Array.from(allowedAdminDisplayNames)
    .map((value) => normalizeDisplayNameKey(value))
    .filter((value): value is string => Boolean(value)),
);

export function isClientAdmin(user: User | null): boolean {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  const emailAllowed = email ? allowedAdminEmails.has(email) : false;
  const uidAllowed = user.uid ? allowedAdminUids.has(user.uid) : false;
  const normalizedName = normalizeDisplayName(user.displayName ?? undefined);
  const normalizedKey = normalizeDisplayNameKey(normalizedName);
  const displayNameAllowed =
    (normalizedName ? allowedAdminDisplayNames.has(normalizedName) : false) ||
    (normalizedKey ? allowedAdminDisplayNameKeys.has(normalizedKey) : false);
  return emailAllowed || displayNameAllowed || uidAllowed;
}

export function getAllowedAdminDisplayNames(): string[] {
  return Array.from(allowedAdminDisplayNames);
}

export function getAllowedAdminEmails(): string[] {
  return Array.from(allowedAdminEmails);
}

export function getAllowedAdminUids(): string[] {
  return Array.from(allowedAdminUids);
}

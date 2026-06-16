import type { User } from "firebase/auth";
import { DEFAULT_ADMIN_UIDS } from "./constants";

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

export function isClientAdmin(user: User | null): boolean {
  if (!user) return false;
  const email = user.email?.toLowerCase();
  const emailAllowed = Boolean(email && user.emailVerified && allowedAdminEmails.has(email));
  const uidAllowed = user.uid ? allowedAdminUids.has(user.uid) : false;
  return emailAllowed || uidAllowed;
}

export function getAllowedAdminEmails(): string[] {
  return Array.from(allowedAdminEmails);
}

export function getAllowedAdminUids(): string[] {
  return Array.from(allowedAdminUids);
}

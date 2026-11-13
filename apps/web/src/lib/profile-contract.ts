import { parseShows, validateBirthday, validateUsername } from "@/lib/validation/user";

export const EDITABLE_PROFILE_FIELDS = [
  "name", "username", "birthday", "shows", "showRequests", "gender", "livesInUS", "state", "country",
] as const;
export type ProfilePatch = Partial<{
  name: string; username: string; birthday: string; shows: string[]; showRequests: string[];
  gender: string; livesInUS: boolean; state: string; country: string;
}>;

export class ProfileError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) {
    super(message);
    this.name = "ProfileError";
  }
}

export function parseProfilePatch(value: unknown): ProfilePatch {
  const invalid = (message: string): never => { throw new ProfileError(message, 400, "profile/invalid-argument"); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid("Profile fields must be an object.");
  const input = value as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(input)) {
    if (!(EDITABLE_PROFILE_FIELDS as readonly string[]).includes(key)) return invalid(`Unsupported profile field: ${key}`);
    if (key === "livesInUS") {
      if (typeof field !== "boolean") return invalid("livesInUS must be a boolean.");
      patch[key] = field;
    } else if (key === "shows" || key === "showRequests") {
      if (!Array.isArray(field) || field.length > 50 || field.some(item => typeof item !== "string" || item.length > 200)) {
        return invalid(`${key} must contain at most 50 show names.`);
      }
      patch[key] = parseShows(field);
    } else {
      if (typeof field !== "string" || field.length > (key === "name" ? 200 : 100)) return invalid(`Invalid ${key}.`);
      patch[key] = key === "username" ? field.trim().toLowerCase() : field.trim();
    }
  }
  if (typeof patch.username === "string") {
    const error = validateUsername(patch.username);
    if (error) return invalid(error);
  }
  if (typeof patch.birthday === "string" && patch.birthday) {
    const error = validateBirthday(patch.birthday);
    if (error) return invalid(error);
  }
  return patch as ProfilePatch;
}

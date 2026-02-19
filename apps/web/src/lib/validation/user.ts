import { Timestamp, FieldValue } from "firebase/firestore";

export type SurveyXResponses = {
  view_live_tv_household: string; // Yes / No
  view_platforms_subscriptions: string[]; // Multi-select platforms
  primaryPlatform: string; // Primary platform for watching
  watchFrequency: string; // How often they watch
  watchMode: string; // Live / next-day / binge / mix
  view_reality_cowatch: string; // Who they watch with
  view_live_chats_social: string; // Yes / Sometimes / No
  view_devices_reality: string[]; // Multi-select devices
};

export type SurveyXState = {
  completed: boolean;
  completedAt?: Timestamp | FieldValue;
  responses?: SurveyXResponses;
};

// Types
export type UserProfile = {
  uid: string;
  email: string | null;
  name?: string; // optional display name from email flow
  username: string; // lowercase, 3-20, [a-z0-9_]
  birthday: string; // ISO date YYYY-MM-DD
  shows: string[];
  showRequests?: string[];
  gender?: string; // optional gender
  livesInUS?: boolean; // optional US residency
  state?: string; // optional US state (if livesInUS is true)
  country?: string; // optional country (if livesInUS is false)
  provider: "password" | "apple" | string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  surveyX?: SurveyXState;
};

// Validation helpers return `null` when valid, or an error message string
export function validateEmail(email: string): string | null {
  const e = email.trim();
  if (!e) return "Email is required.";
  // Simple email regex adequate for client-side checks
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(e) ? null : "Enter a valid email address.";
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  // Require at least one digit or symbol for basic strength
  if (!/[0-9\W]/.test(password)) return "Include at least one number or symbol.";
  return null;
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (!u) return "Username is required.";
  if (u.length < 3 || u.length > 20) return "Username must be 3–20 characters.";
  if (u !== u.toLowerCase()) return "Username must be lowercase.";
  if (!/^[a-z0-9_]+$/.test(u)) return "Only lowercase letters, digits, and underscores.";
  return null;
}

export function validateBirthday(birthday: string): string | null {
  const b = birthday.trim();
  if (!b) return "Birthday is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b)) return "Use YYYY-MM-DD format.";
  const dt = new Date(b + "T00:00:00Z");
  if (Number.isNaN(dt.getTime())) return "Enter a valid date.";
  const today = new Date();
  const year = dt.getUTCFullYear();
  if (year < 1900) return "Birthday year seems too early.";
  if (dt > today) return "Birthday cannot be in the future.";
  // Must be 13+ years old
  const age = today.getUTCFullYear() - dt.getUTCFullYear() - (
    today.getUTCMonth() < dt.getUTCMonth() || (today.getUTCMonth() === dt.getUTCMonth() && today.getUTCDate() < dt.getUTCDate()) ? 1 : 0
  );
  if (age < 13) return "You must be at least 13 years old.";
  return null;
}

export function parseShows(input: string | string[]): string[] {
  const items = Array.isArray(input) ? input : input.split(",");
  const normalized = items
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // Deduplicate while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of normalized) {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

// Ensure at least `min` shows are selected
export function validateShowsMin(shows: string[], min = 3): string | null {
  return shows.length >= min ? null : `Select at least ${min} shows.`;
}

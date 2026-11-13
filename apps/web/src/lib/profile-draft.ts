export type ProfileDraft = {
  username: string;
  birthday: string;
  gender: string;
  country: string;
  state: string;
  shows: string[];
  showRequests: string[];
  showRequestInput: string;
};

function draftKey(uid: string): string {
  return `finish_profile_draft:${uid}`;
}

export function readProfileDraft(uid: string): ProfileDraft | null {
  try {
    const draft: unknown = JSON.parse(sessionStorage.getItem(draftKey(uid)) ?? "null");
    if (!draft || typeof draft !== "object") return null;
    const candidate = draft as Partial<ProfileDraft>;
    if (
      typeof candidate.username === "string" &&
      typeof candidate.birthday === "string" &&
      typeof candidate.gender === "string" &&
      typeof candidate.country === "string" &&
      typeof candidate.state === "string" &&
      typeof candidate.showRequestInput === "string" &&
      Array.isArray(candidate.shows) && candidate.shows.every((show) => typeof show === "string") &&
      Array.isArray(candidate.showRequests) && candidate.showRequests.every((show) => typeof show === "string")
    ) {
      return candidate as ProfileDraft;
    }
  } catch {
    // Storage can be unavailable, and old session data can be invalid.
  }
  return null;
}

export function writeProfileDraft(uid: string, draft: ProfileDraft): void {
  try {
    sessionStorage.setItem(draftKey(uid), JSON.stringify(draft));
  } catch {
    // Keep the form usable when storage is unavailable.
  }
}

export function clearProfileDraft(uid: string, savedDraft: ProfileDraft): void {
  try {
    const key = draftKey(uid);
    // A different editor may have changed the draft while this save was pending.
    if (sessionStorage.getItem(key) === JSON.stringify(savedDraft)) sessionStorage.removeItem(key);
  } catch {
    // Saving the profile does not depend on storage access.
  }
}

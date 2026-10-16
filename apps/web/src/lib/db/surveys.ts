import { requireDb } from "@/lib/firebase-db";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { SurveyXResponses, SurveyXState } from "@/lib/validation/user";

export async function getSurveyXState(uid: string): Promise<SurveyXState | null> {
  const ref = doc(requireDb(), "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as { surveyX?: SurveyXState };
  if (!data?.surveyX) return null;

  const { completed = false, completedAt, responses } = data.surveyX;
  return {
    completed: Boolean(completed),
    completedAt,
    responses,
  };
}

const surveyXSaves = new Map<string, { tail: Promise<void>; latest: Promise<void> }>();

export async function saveSurveyXResponses(user: User, responses: SurveyXResponses): Promise<void> {
  const savedResponses = {
    ...responses,
    view_platforms_subscriptions: [...responses.view_platforms_subscriptions],
    view_devices_reality: [...responses.view_devices_reality],
  };
  const queue = surveyXSaves.get(user.uid) ?? { tail: Promise.resolve(), latest: Promise.resolve() };
  const operation = queue.tail.then(() => persistSurveyXResponses(user, savedResponses));
  queue.latest = operation;
  queue.tail = operation.then(() => undefined, () => undefined);
  surveyXSaves.set(user.uid, queue);
  let observed = operation;
  for (;;) {
    let failed = false;
    let error: unknown;
    try { await observed; } catch (caught) { failed = true; error = caught; }
    if (queue.latest !== observed) { observed = queue.latest; continue; }
    if (surveyXSaves.get(user.uid) === queue) surveyXSaves.delete(user.uid);
    if (failed) throw error;
    return;
  }
}

async function persistSurveyXResponses(user: User, responses: SurveyXResponses): Promise<void> {
  const uid = user.uid;
  const ref = doc(requireDb(), "users", uid);
  const existing = await getDoc(ref);
  const existingData = existing.exists() ? (existing.data() as { username?: string | null }) : null;
  const username = typeof existingData?.username === "string" ? existingData.username : null;
  await setDoc(
    ref,
    {
      surveyX: {
        completed: false,
        syncState: "pending",
        completedAt: serverTimestamp(),
        responses,
      },
      surveyXLastUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await syncSurveyXResponses(user, responses, username);
    await syncGlobalProfileSurvey(user, responses, username);
    await setDoc(ref, { surveyX: { completed: true, syncState: "synced" }, surveyXLastUpdatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    await setDoc(ref, { surveyX: { completed: false, syncState: "error" }, surveyXLastUpdatedAt: serverTimestamp() }, { merge: true });
    throw new Error("Your answers are saved, but syncing failed. Please submit again to retry.", { cause: error });
  }
}

async function syncSurveyXResponses(user: User, responses: SurveyXResponses, username: string | null): Promise<void> {
  const idToken = await user.getIdToken();
  const payload = {
    view_live_tv_household: responses.view_live_tv_household ?? null,
    view_platforms_subscriptions: responses.view_platforms_subscriptions ?? [],
    primaryPlatform: responses.primaryPlatform ?? null,
    watchFrequency: responses.watchFrequency ?? null,
    watchMode: responses.watchMode ?? null,
    view_reality_cowatch: responses.view_reality_cowatch ?? null,
    view_live_chats_social: responses.view_live_chats_social ?? null,
    view_devices_reality: responses.view_devices_reality ?? [],
    username,
  };
  const res = await fetch("/api/surveys/x", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to persist Survey X responses: ${res.status} ${text}`);
  }
}

async function syncGlobalProfileSurvey(user: User, responses: SurveyXResponses, username: string | null): Promise<void> {
  const idToken = await user.getIdToken();
  const payload = {
    responses,
    profileEmail: user.email ?? null,
    username,
  };
  const res = await fetch("/api/surveys/global-profile", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to persist survey in Postgres: ${res.status} ${text}`);
  }
}

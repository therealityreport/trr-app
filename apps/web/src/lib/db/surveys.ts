import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { SurveyXResponses, SurveyXState } from "@/lib/validation/user";

export async function getSurveyXState(uid: string): Promise<SurveyXState | null> {
  const ref = doc(db, "users", uid);
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

export async function saveSurveyXResponses(uid: string, responses: SurveyXResponses): Promise<void> {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);
  const existingData = existing.exists() ? (existing.data() as { username?: string | null }) : null;
  const username = typeof existingData?.username === "string" ? existingData.username : null;
  await setDoc(
    ref,
    {
      surveyX: {
        completed: true,
        completedAt: serverTimestamp(),
        responses,
      },
      surveyXLastUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await syncSurveyXResponses(responses, username);
  await syncGlobalProfileSurvey(responses, username);
}

async function syncSurveyXResponses(responses: SurveyXResponses, username: string | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
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

async function syncGlobalProfileSurvey(responses: SurveyXResponses, username: string | null): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
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

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

  await syncGlobalProfileSurvey(responses);
}

async function syncGlobalProfileSurvey(responses: SurveyXResponses): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User is not authenticated");
  }
  const idToken = await user.getIdToken();
  const payload = {
    responses,
    profileEmail: user.email ?? null,
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

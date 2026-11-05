import { auth } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import type { SurveyXResponses, SurveyXState } from "@/lib/validation/user";

export async function getSurveyXState(uid: string): Promise<SurveyXState | null> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw new Error("Sign in as the survey owner.");
  const res = await fetch("/api/surveys/x", { headers: { authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
  if (!res.ok) throw new Error("Unable to load your submitted survey.");
  const { state } = await res.json() as { state: (Omit<SurveyXState, "completedAt"> & { completedAt?: string }) | null };
  if (!state) return null;
  return { ...state, completedAt: state.completedAt ? Timestamp.fromDate(new Date(state.completedAt)) : undefined };
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
  if (auth.currentUser?.uid !== user.uid) throw new Error("Sign in as the survey owner.");
  const res = await fetch("/api/surveys/x", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ responses }),
  });
  if (!res.ok) throw new Error("Your survey was not submitted. Please retry.");
}

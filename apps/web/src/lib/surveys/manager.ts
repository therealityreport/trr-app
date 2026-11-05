import {
  Timestamp,
  doc,
  runTransaction,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { getDb } from "@/lib/firebase-db";
import type {
  SurveyEpisodeMeta,
  SurveyResponse,
  SurveyResponseDraft,
  SurveyIdentifiers,
  SurveyCtaState,
  SurveySaveOutcome,
} from "./types";

const SURVEY_COLLECTION = "surveyResults";

class SurveyManager {
  private static instance: SurveyManager;
  private firestore: Firestore | null = null;
  private responseSaves = new Map<string, { tail: Promise<void>; latest: Promise<SurveySaveOutcome> | null }>();

  private responseReaders = new Map<string, Set<() => Promise<void>>>();

  private constructor() {}

  static getInstance(): SurveyManager {
    if (!SurveyManager.instance) {
      SurveyManager.instance = new SurveyManager();
    }
    return SurveyManager.instance;
  }

  private getFirestore(): Firestore {
    if (!this.firestore) {
      const db = getDb();
      if (!db) {
        throw new Error("Firestore is not available — Surveys require Firebase Firestore.");
      }
      this.firestore = db;
    }
    return this.firestore;
  }

  async getEpisodeMeta(ids: SurveyIdentifiers, defaults?: Partial<SurveyEpisodeMeta>): Promise<SurveyEpisodeMeta> {
    const metaRef = this.getEpisodeMetaRef(ids);
    const snapshot = await getDoc(metaRef);

    if (!snapshot.exists()) {
      const defaultMeta: SurveyEpisodeMeta = {
        ...ids,
        episodeLabel: `${ids.seasonId}${ids.episodeId}`,
        opensAt: null,
        closesAt: null,
        isClosed: false,
        ...(defaults ?? {}),
      };
      return defaultMeta;
    }

    return {
      ...({} as SurveyEpisodeMeta),
      ...snapshot.data(),
    } as SurveyEpisodeMeta;
  }

  subscribeToResponse(
    ids: SurveyIdentifiers,
    uid: string,
    onChange: (response: SurveyResponse | null) => void,
    options?: { mode?: "submitted" | "editable" },
  ): Unsubscribe {
    const editableMode = options?.mode === "editable";
    let active = true;
    let submitted: SurveyResponse | null = null;
    let draft: SurveyResponse | null = null;
    let legacy: SurveyResponse | null = null;
    const emit = () => {
      if (!active) return;
      // Results/CTA see only submitted PostgreSQL answers. Editors can resume a
      // separate draft, whose content never inherits the submission's completion.
      const editable = editableMode ? draft ?? (!submitted ? legacy : null) : null;
      onChange(editable ? { ...editable, completed: false, syncState: "synced" } : submitted);
    };
    const refresh = async () => {
      try {
        const user = auth.currentUser;
        if (!user || user.uid !== uid) throw new Error("Sign in as the response owner.");
        const query = new URLSearchParams({ surveyKey: deriveSurveyKey(ids), seasonId: ids.seasonId, episodeId: ids.episodeId });
        const res = await fetch(`/api/surveys/show-responses?${query}`, {
          headers: { authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store",
        });
        if (!res.ok) throw new Error("Unable to load submitted survey.");
        const { response } = await res.json() as { response: Record<string, unknown> | null };
        if (!active) return;
        submitted = response ? {
          uid, ...ids, ranking: (response.ranking ?? []) as SurveyResponse["ranking"],
          completionPct: Number(response.completion_pct ?? 100), completed: response.completed === true,
          seasonRating: response.season_rating == null ? null : Number(response.season_rating), syncState: "synced",
          createdAt: Timestamp.fromDate(new Date(String(response.created_at))),
          updatedAt: Timestamp.fromDate(new Date(String(response.updated_at))),
        } : null;
        emit();
      } catch (error) {
        if (active) { submitted = null; emit(); console.error("Failed to load submitted survey", error); }
      }
    };
    const key = this.responseKey(ids, uid);
    const readers = this.responseReaders.get(key) ?? new Set<() => Promise<void>>();
    readers.add(refresh);
    this.responseReaders.set(key, readers);
    let unsubscribe: Unsubscribe = () => {};
    if (editableMode) {
      unsubscribe = onSnapshot(this.getDraftDocRef(ids, uid), (snapshot) => {
        draft = snapshot.exists() ? { ...snapshot.data(), uid, ...ids, completed: false } as SurveyResponse : null;
        emit();
      });
      // Recover old local answers only for editing, never for submitted results.
      void getDoc(this.getResponseDocRef(ids, uid)).then((snapshot) => {
        if (!active) return;
        legacy = snapshot.exists() ? { ...snapshot.data(), completed: false } as SurveyResponse : null;
        emit();
      }).catch((error) => console.error("Failed to load legacy survey draft", error));
    }
    void refresh();
    return () => {
      active = false;
      unsubscribe();
      readers.delete(refresh);
      if (!readers.size) this.responseReaders.delete(key);
    };
  }

  async saveResponse(
    ids: SurveyIdentifiers,
    uid: string,
    draft: SurveyResponseDraft,
    options?: { surveyKey?: string },
  ): Promise<SurveySaveOutcome> {
    if (auth.currentUser?.uid !== uid) throw new Error("Sign in as the response owner before saving.");
    if (!Array.isArray(draft.ranking) || draft.ranking.length > 20) {
      throw new Error("This survey supports up to 20 ranked choices. Please reduce your selection and retry.");
    }
    // Snapshot mutable UI inputs, then serialize draft saves and submissions per stable response.
    const savedIds = { ...ids };
    const savedDraft = { ...draft, ranking: draft.ranking.map((item) => ({ ...item })) };
    const savedOptions = options ? { ...options } : undefined;
    const key = JSON.stringify([uid, ids.showId, ids.seasonId, ids.episodeId]);
    const queue = this.responseSaves.get(key) ?? { tail: Promise.resolve(), latest: null };
    const operation = queue.tail.then(() => this.persistResponse(savedIds, uid, savedDraft, savedOptions));
    queue.latest = operation;
    queue.tail = operation.then(() => undefined, () => undefined);
    this.responseSaves.set(key, queue);

    // Overlapping callers settle with the newest queued result, so stale UI callbacks
    // cannot report saved/error while a newer persistence operation is still running.
    let observed = operation;
    for (;;) {
      const settled = await observed.then(
        (outcome) => ({ ok: true as const, outcome }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      if (queue.latest && queue.latest !== observed) { observed = queue.latest; continue; }
      if (this.responseSaves.get(key) === queue) this.responseSaves.delete(key);
      if (!settled.ok) throw settled.error;
      return settled.outcome;
    }
  }

  private async persistResponse(
    ids: SurveyIdentifiers,
    uid: string,
    draft: SurveyResponseDraft,
    options?: { surveyKey?: string },
  ): Promise<SurveySaveOutcome> {
    if (auth.currentUser?.uid !== uid) throw new Error("Sign in as the response owner before saving.");
    const draftRef = this.getDraftDocRef(ids, uid);
    const existing = await getDoc(draftRef);
    const payload = {
      uid, ...ids, ranking: draft.ranking, completionPct: draft.completionPct,
      seasonRating: draft.seasonRating ?? null,
      createdAt: existing.exists() ? existing.data().createdAt ?? serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    // Draft writes contain no submitted/completed state and survive a failed submission.
    await setDoc(draftRef, payload);
    if (!draft.completed) return { completed: false, syncState: "synced" };
    await this.syncResponseToPostgres(ids, uid, draft, options);
    await Promise.all([...this.responseReaders.get(this.responseKey(ids, uid)) ?? []].map((refresh) => refresh()));
    // PostgreSQL has accepted the submission; draft cleanup is best effort.
    try {
      await runTransaction(this.getFirestore(), async (transaction) => {
        const current = await transaction.get(draftRef);
        const data = current.exists() ? current.data() : null;
        // Another tab can save a newer draft while this submission is in flight.
        if (data && JSON.stringify(data.ranking) === JSON.stringify(draft.ranking)
          && (data.seasonRating ?? null) === (draft.seasonRating ?? null)
          && data.completionPct === draft.completionPct) transaction.delete(draftRef);
      });
    } catch (error) { console.warn("Submitted survey draft cleanup failed", error); }
    return { completed: true, syncState: "synced" };
  }

  resolveCta(response: SurveyResponse | null): SurveyCtaState {
    if (!response) return "start";
    if (response.completed && response.syncState === "synced") return "results";
    return "continue";
  }

  private async syncResponseToPostgres(
    ids: SurveyIdentifiers,
    uid: string,
    draft: SurveyResponseDraft,
    options?: { surveyKey?: string },
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Cannot sync survey response without an authenticated user.");
    }
    if (user.uid !== uid) {
      throw new Error("Authenticated user mismatch while saving survey response.");
    }
    const token = await user.getIdToken();
    const responses: Record<string, unknown> = {
      ranking: draft.ranking ?? [],
      completion_pct: draft.completionPct,
      completed: draft.completed,
    };
    if (Object.prototype.hasOwnProperty.call(draft, "seasonRating")) {
      responses.season_rating = draft.seasonRating ?? null;
    }
    const payload = {
      surveyKey: options?.surveyKey ?? deriveSurveyKey(ids),
      appUserId: uid,
      showId: ids.showId,
      seasonNumber: parseOrdinal(ids.seasonId),
      episodeNumber: parseOrdinal(ids.episodeId),
      seasonId: ids.seasonId,
      episodeId: ids.episodeId,
      responses,
    };

    const res = await fetch("/api/surveys/show-responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to sync survey response (${res.status}): ${text}`);
    }
  }

  private getEpisodeMetaRef(ids: SurveyIdentifiers) {
    return doc(
      this.getFirestore(),
      SURVEY_COLLECTION,
      ids.showId,
      "seasons",
      ids.seasonId,
      "episodes",
      ids.episodeId,
      "episodeMeta",
      "meta",
    );
  }

  private responseKey(ids: SurveyIdentifiers, uid: string): string {
    return JSON.stringify([uid, ids.showId, ids.seasonId, ids.episodeId]);
  }

  private getDraftDocRef(ids: SurveyIdentifiers, uid: string) {
    return doc(this.getFirestore(), SURVEY_COLLECTION, ids.showId, "seasons", ids.seasonId, "episodes", ids.episodeId, "drafts", uid);
  }

  private getResponseDocRef(ids: SurveyIdentifiers, uid: string) {
    return doc(
      this.getFirestore(),
      SURVEY_COLLECTION,
      ids.showId,
      "seasons",
      ids.seasonId,
      "episodes",
      ids.episodeId,
      "responses",
      uid,
    );
  }
}

export function useSurveyManager(): SurveyManager {
  return SurveyManager.getInstance();
}

const deriveSurveyKey = (ids: SurveyIdentifiers): string => {
  if (ids.showId === "tt12623782" && parseOrdinal(ids.seasonId) === 6) return "rhoslc_s6";
  if (ids.showId === "rhop" && parseOrdinal(ids.seasonId) === 10) return "rhop_s10";
  return `${ids.showId}_${ids.seasonId}`.toLowerCase();
};

const parseOrdinal = (value?: string): number | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

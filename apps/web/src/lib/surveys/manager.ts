import {
  Timestamp,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type {
  SurveyEpisodeMeta,
  SurveyResponse,
  SurveyResponseDraft,
  SurveyIdentifiers,
  SurveyCtaState,
} from "./types";

const SURVEY_COLLECTION = "surveyResults";

class SurveyManager {
  private static instance: SurveyManager;

  private constructor(private readonly firestore: Firestore) {}

  static getInstance(): SurveyManager {
    if (!SurveyManager.instance) {
      SurveyManager.instance = new SurveyManager(db);
    }
    return SurveyManager.instance;
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
      await setDoc(metaRef, defaultMeta, { merge: true });
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
  ): Unsubscribe {
    const responseRef = this.getResponseDocRef(ids, uid);
    return onSnapshot(responseRef, (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data() as SurveyResponse;
      onChange(data);
    });
  }

  async saveResponse(
    ids: SurveyIdentifiers,
    uid: string,
    draft: SurveyResponseDraft,
    options?: { surveyKey?: string },
  ): Promise<void> {
    const responseRef = this.getResponseDocRef(ids, uid);
    const existing = await getDoc(responseRef);
    const createdAt = existing.exists()
      ? (existing.data()?.createdAt as Timestamp | undefined) ?? serverTimestamp()
      : serverTimestamp();
    const payload: Partial<SurveyResponse> = {
      uid,
      ...ids,
      ranking: draft.ranking,
      completionPct: draft.completionPct,
      completed: draft.completed,
      updatedAt: serverTimestamp(),
      createdAt,
    };
    if (Object.prototype.hasOwnProperty.call(draft, "seasonRating")) {
      payload.seasonRating = draft.seasonRating ?? null;
    }

    await setDoc(responseRef, payload, { merge: true });
    await this.syncResponseToPostgres(ids, uid, draft, options);
  }

  resolveCta(response: SurveyResponse | null): SurveyCtaState {
    if (!response) return "start";
    if (response.completed) return "results";
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
      this.firestore,
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

  private getResponseDocRef(ids: SurveyIdentifiers, uid: string) {
    return doc(
      this.firestore,
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
  const season = ids.seasonId ?? "season";
  return `${ids.showId}_${season}`.toLowerCase();
};

const parseOrdinal = (value?: string): number | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  REALITEASE_BOARD_COLUMNS,
  REALITEASE_DEFAULT_USER_ANALYTICS,
  type RawRealiteaseGuess,
  type RealiteaseAnalyticsDoc,
  type RealiteaseBoardColumnKey,
  type RealiteaseDailyDoc,
  type RealiteaseGameSnapshot,
  type RealiteaseGuess,
  type RealiteaseGuessDerived,
  type RealiteaseGuessField,
  type RealiteaseGuessVerdict,
  type RealiteaseStatsSummary,
  type RealiteaseTalentRecord,
  type RealiteaseTalentShow,
  type RealiteaseAnswerKeyRecord,
  type RealiteaseWwhlAppearance,
} from "./types";
import { getRealiteaseDateKey } from "./utils";

const USER_ANALYTICS_COLLECTION = "user_analytics";
const USER_STATS_SUBCOLLECTION = "realitease_userstats";
const GLOBAL_ANALYTICS_COLLECTION = "realitease_analytics";
const TALENT_COLLECTION = "realitease_talent";
const ANSWERKEY_COLLECTION = "realitease_answerkey";
const MAX_GUESSES = 8;

type AnswerContext = {
  talent: RealiteaseTalentRecord | null;
  derived: RealiteaseGuessDerived | null;
};

type ShowMatchDetail = {
  guessShow: RealiteaseTalentShow;
  answerShow: RealiteaseTalentShow;
  display: string;
  shareSeason: boolean;
  networkKey: string | null;
  networkLabel: string | null;
  sharedSeasonCount: number;
  maxSeasonCount: number;
  sharedEpisodeCount: number;
  maxEpisodeCount: number;
};

interface StartGameParams {
  uid: string;
  gameDate?: string;
}

interface SubmitGuessParams {
  uid: string;
  talent: RealiteaseTalentRecord;
  gameDate?: string;
}

interface SubscribeParams {
  uid: string;
  gameDate?: string;
  onChange: (snapshot: RealiteaseGameSnapshot | null) => void;
}

export class RealiteaseManager {
  private static instance: RealiteaseManager;
  private static talentCache: RealiteaseTalentRecord[] | null = null;
  private static talentCachePromise: Promise<RealiteaseTalentRecord[]> | null = null;
  private static talentCacheMap: Map<string, RealiteaseTalentRecord> | null = null;

  private constructor(private readonly firestore: Firestore) {}

  static getInstance(): RealiteaseManager {
    if (!RealiteaseManager.instance) {
      RealiteaseManager.instance = new RealiteaseManager(db);
    }
    return RealiteaseManager.instance;
  }

  async startGame({ uid, gameDate = getRealiteaseDateKey() }: StartGameParams): Promise<RealiteaseGameSnapshot> {
    if (!uid) throw new Error("RealiteaseManager.startGame requires a user id");

    const puzzleDate = gameDate;

    await this.ensureUserAnalyticsDoc(uid);
    await this.ensureGlobalAnalyticsDoc(puzzleDate);

    const dailyRef = this.getDailyDocRef(uid, puzzleDate);
    const dailySnap = await getDoc(dailyRef);

    const hasExistingDoc = dailySnap.exists();

    const puzzleContext = await this.getPuzzleContext(puzzleDate);

    if (!hasExistingDoc) {
      await setDoc(dailyRef, {
        puzzleDate,
        gameCompleted: false,
        guessNumberSolved: null,
        guesses: [],
        gameStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const freshSnap = hasExistingDoc ? dailySnap : await getDoc(dailyRef);
    const data = this.parseDailyDoc(
      freshSnap.data() ?? {},
      puzzleDate,
      hasExistingDoc,
      puzzleContext.answerKey,
      puzzleContext.talent,
    );
    return data;
  }

  async getTalentIndex(forceRefresh = false): Promise<RealiteaseTalentRecord[]> {
    if (!forceRefresh && RealiteaseManager.talentCache) {
      return RealiteaseManager.talentCache;
    }

    if (!forceRefresh && RealiteaseManager.talentCachePromise) {
      return RealiteaseManager.talentCachePromise;
    }

    const fetchPromise = (async () => {
      const talentSnap = await getDocs(collection(this.firestore, TALENT_COLLECTION));
      const talents: RealiteaseTalentRecord[] = [];

      talentSnap.forEach((docSnap) => {
        const raw = docSnap.data() ?? {};

        const name = this.extractStringField(raw.name, raw.Name, raw.displayName);
        if (!name) return;

        const alternativeNamesSource = Array.isArray(raw.alternativeNames)
          ? raw.alternativeNames.filter((value): value is string => typeof value === "string")
          : [];
        const alternativeNames = Array.from(
          new Set(
            [name, ...alternativeNamesSource]
              .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
              .filter((entry) => entry.length > 0),
          ),
        );

        const gender = this.extractStringField(raw.gender, raw.Gender);
        const zodiac = this.extractStringField(raw.zodiac, raw.Zodiac);
        const birthday = this.extractStringField(raw.birthday, raw.Birthday);
        const imdbId = this.extractStringField(raw.imdbCastId, raw.imdbCastID, raw.imdbID, raw.imdbId);
        const tmdbId = this.extractStringField(raw.tmdbID, raw.tmdbId);
        const imageUrl = this.extractStringField(raw.imageUrl, raw.imageURL, raw.photoUrl, raw.photo, raw.image);

        const shows = this.normalizeTalentShows(raw.shows);
        const { appearances, totalAppearances } = this.normalizeWwhlAppearances(raw.wwhlEpisodes);

        talents.push({
          id: docSnap.id,
          name,
          alternativeNames,
          gender: gender ?? undefined,
          zodiac: zodiac ?? undefined,
          birthday: birthday ?? undefined,
          imdbId: imdbId ?? undefined,
          tmdbId: tmdbId ?? undefined,
          imageUrl: imageUrl ?? undefined,
          shows,
          wwhlAppearances: appearances,
          wwhlTotalAppearances: totalAppearances ?? undefined,
          metadata: raw,
        });
      });

      talents.sort((a, b) => a.name.localeCompare(b.name));
      const map = new Map<string, RealiteaseTalentRecord>();
      talents.forEach((talent) => {
        const id = talent.id.toLowerCase();
        map.set(id, talent);
        if (talent.imdbId) {
          map.set(talent.imdbId.toLowerCase(), talent);
        }
        map.set(talent.name.toLowerCase(), talent);
        talent.alternativeNames.forEach((alt) => {
          map.set(alt.toLowerCase(), talent);
        });
      });
      RealiteaseManager.talentCacheMap = map;
      RealiteaseManager.talentCache = talents;
      RealiteaseManager.talentCachePromise = null;
      return talents;
    })();

    RealiteaseManager.talentCachePromise = fetchPromise;
    return fetchPromise;
  }

  private async getAnswerKey(puzzleDate: string): Promise<RealiteaseAnswerKeyRecord | null> {
    const answerRef = doc(this.firestore, ANSWERKEY_COLLECTION, puzzleDate);
    const snapshot = await getDoc(answerRef);
    if (!snapshot.exists()) {
      return null;
    }

    const rawData = snapshot.data() ?? {};

    const { record, sourceKey } = this.extractAnswerRecord(rawData);

    const castId = this.extractStringField(
      record.castId,
      record.castID,
      record.CastID,
      record.imdbCastId,
      record.imdbCastID,
      record.imdbID,
      record.talentId,
      record.talentID,
      record.id,
      sourceKey,
      snapshot.id,
    );

    const castName = this.extractStringField(
      record.castName,
      record.CastName,
      record.name,
      record.Name,
      record.displayName,
      record.talentName,
      record.fullName,
      sourceKey,
    );

    const clue = this.extractStringField(
      record.clue,
      record.Clue,
      record.dailyClue,
      record.daily_clue,
      record.prompt,
      record.question,
      record.hint,
      record.Hint,
    );

    const imageUrl = this.extractStringField(
      record.imageUrl,
      record.imageURL,
      record.talentImage,
      record.photo,
      record.photoUrl,
    );

    if (!castId) {
      return null;
    }

    return {
      id: snapshot.id,
      castId,
      castName: castName ?? "",
      clue: clue ?? undefined,
      imageUrl: imageUrl ?? undefined,
      metadata: record,
    };
  }

  private async getPuzzleContext(puzzleDate: string): Promise<{
    answerKey: RealiteaseAnswerKeyRecord | null;
    talent: RealiteaseTalentRecord | null;
  }> {
    const answerKey = await this.getAnswerKey(puzzleDate);
    if (!answerKey) {
      return { answerKey: null, talent: null };
    }

    const talents = await this.getTalentIndex();
    const normalizedCastId = answerKey.castId.toLowerCase();
    const normalizedName = answerKey.castName?.toLowerCase() ?? "";

    const talentMatch =
      talents.find((talent) => talent.id.toLowerCase() === normalizedCastId) ??
      talents.find((talent) => (talent.imdbId ?? "").toLowerCase() === normalizedCastId) ??
      talents.find((talent) => talent.name.toLowerCase() === normalizedName) ??
      talents.find((talent) => talent.alternativeNames.some((alt) => alt.toLowerCase() === normalizedName));

    const resolvedAnswerKey: RealiteaseAnswerKeyRecord = {
      ...answerKey,
      castName:
        answerKey.castName && answerKey.castName.trim().length > 0
          ? answerKey.castName
          : talentMatch?.name ?? answerKey.castId,
      imageUrl: answerKey.imageUrl ?? talentMatch?.imageUrl,
    };

    return { answerKey: resolvedAnswerKey, talent: talentMatch ?? null };
  }

  async updateGameStatus({ uid, gameDate = getRealiteaseDateKey() }: StartGameParams): Promise<RealiteaseGameSnapshot | null> {
    if (!uid) throw new Error("RealiteaseManager.updateGameStatus requires a user id");

    const dailyRef = this.getDailyDocRef(uid, gameDate);
    const dailySnap = await getDoc(dailyRef);
    if (!dailySnap.exists()) return null;

    const puzzleContext = await this.getPuzzleContext(gameDate);
    return this.parseDailyDoc(
      dailySnap.data() ?? {},
      gameDate,
      true,
      puzzleContext.answerKey,
      puzzleContext.talent,
    );
  }

  subscribeToGame({ uid, gameDate = getRealiteaseDateKey(), onChange }: SubscribeParams): Unsubscribe {
    if (!uid) throw new Error("RealiteaseManager.subscribeToGame requires a user id");
    const dailyRef = this.getDailyDocRef(uid, gameDate);

    let cachedContextPromise: Promise<{ answerKey: RealiteaseAnswerKeyRecord | null; talent: RealiteaseTalentRecord | null }> | null = null;

    const getContext = () => {
      if (!cachedContextPromise) {
        cachedContextPromise = this.getPuzzleContext(gameDate);
      }
      return cachedContextPromise;
    };

    return onSnapshot(dailyRef, (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data() ?? {};
      getContext().then(({ answerKey, talent }) => {
        onChange(this.parseDailyDoc(data, gameDate, true, answerKey, talent));
      });
    });
  }

  async markGameStarted(uid: string, gameDate = getRealiteaseDateKey()): Promise<void> {
    const dailyRef = this.getDailyDocRef(uid, gameDate);
    await updateDoc(dailyRef, { updatedAt: serverTimestamp() });
  }

  async submitGuess({ uid, talent, gameDate = getRealiteaseDateKey() }: SubmitGuessParams): Promise<void> {
    if (!uid) throw new Error("RealiteaseManager.submitGuess requires a user id");
    if (!talent) throw new Error("RealiteaseManager.submitGuess requires a talent record");

    const puzzleDate = gameDate;
    const dailyRef = this.getDailyDocRef(uid, puzzleDate);
    const { answerKey, talent: answerTalent } = await this.getPuzzleContext(puzzleDate);

    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(dailyRef);
      const existingData = snapshot.exists() ? ((snapshot.data() ?? {}) as Partial<RealiteaseDailyDoc>) : null;
      const guesses: RawRealiteaseGuess[] = Array.isArray(existingData?.guesses)
        ? [...(existingData?.guesses as RawRealiteaseGuess[])]
        : [];

      if (existingData?.gameCompleted) {
        return;
      }
      if (guesses.length >= MAX_GUESSES) {
        return;
      }

      const guessNumber = guesses.length + 1;
      const derived = this.buildDerivedFromTalent(talent, talent.metadata ?? {}, talent.id, puzzleDate);
      const isCorrect = this.isWinningGuess(talent, answerKey, answerTalent ?? null);
      const submittedAt = Timestamp.now();

      const guessPayload = this.buildRawGuessPayload({
        puzzleDate,
        guessNumber,
        talent,
        derived,
        isCorrect,
        answerTalent: answerTalent ?? null,
        submittedAt,
      });

      guesses.push(guessPayload);

      const nextGuessCount = guesses.length;
      const completed = isCorrect || nextGuessCount >= MAX_GUESSES;
      const solvedGuessNumber = isCorrect
        ? guessNumber
        : existingData?.guessNumberSolved ?? null;

      const serverTimestampValue = serverTimestamp();

      if (snapshot.exists()) {
        const update: Record<string, unknown> = {
          guesses,
          updatedAt: serverTimestampValue,
        };
        if (completed) {
          update.gameCompleted = true;
          update.guessNumberSolved = solvedGuessNumber;
        }
        transaction.update(dailyRef, update);
      } else {
        transaction.set(dailyRef, {
          puzzleDate,
          gameCompleted: completed,
          guessNumberSolved: solvedGuessNumber,
          guesses,
          gameStartedAt: existingData?.gameStartedAt ?? serverTimestampValue,
          updatedAt: serverTimestampValue,
        });
      }
    });
  }

  async getUserStatsSummary(uid: string): Promise<RealiteaseStatsSummary> {
    if (!uid) throw new Error("RealiteaseManager.getUserStatsSummary requires a user id");

    const statsRef = collection(this.firestore, USER_ANALYTICS_COLLECTION, uid, USER_STATS_SUBCOLLECTION);
    const snapshot = await getDocs(statsRef);

    const entries: Array<{
      puzzleDate: string;
      guesses: RawRealiteaseGuess[];
      guessNumberSolved: number | null;
      gameCompleted: boolean;
    }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() ?? {};
      const puzzleDateRaw = typeof data.puzzleDate === "string" ? data.puzzleDate : null;
      const puzzleDate = puzzleDateRaw && puzzleDateRaw.trim().length > 0 ? puzzleDateRaw : docSnap.id;
      if (!puzzleDate || typeof puzzleDate !== "string") return;

      const guessesRaw = Array.isArray(data.guesses) ? data.guesses : [];
      const guesses = guessesRaw.filter((guess): guess is RawRealiteaseGuess => Boolean(guess));
      const guessNumberSolved =
        typeof data.guessNumberSolved === "number" && Number.isFinite(data.guessNumberSolved)
          ? data.guessNumberSolved
          : null;
      const gameCompleted = Boolean(data.gameCompleted);

      entries.push({ puzzleDate, guesses, guessNumberSolved, gameCompleted });
    });

    entries.sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate));

    const guessDistribution: Record<number, number> = {};
    for (let guessNumber = 1; guessNumber <= MAX_GUESSES; guessNumber += 1) {
      guessDistribution[guessNumber] = 0;
    }

    let played = 0;
    let wins = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let lastCompletedDate: Date | null = null;
    let lastWinDate: Date | null = null;

    entries.forEach((entry) => {
      const attemptCount = entry.guesses.length;
      const attempted = attemptCount > 0 || entry.gameCompleted || entry.guessNumberSolved !== null;
      if (!attempted) {
        return;
      }

      const entryDate = this.parsePuzzleDate(entry.puzzleDate);
      if (entryDate && lastCompletedDate) {
        const gap = this.differenceInDays(entryDate, lastCompletedDate);
        if (gap > 1) {
          currentStreak = 0;
          lastWinDate = null;
        }
      }
      if (entryDate) {
        lastCompletedDate = entryDate;
      }

      played += 1;

      if (
        entry.guessNumberSolved !== null &&
        entry.guessNumberSolved >= 1 &&
        entry.guessNumberSolved <= MAX_GUESSES
      ) {
        wins += 1;
        guessDistribution[entry.guessNumberSolved] = (guessDistribution[entry.guessNumberSolved] ?? 0) + 1;

        if (entryDate) {
          if (lastWinDate) {
            const winGap = this.differenceInDays(entryDate, lastWinDate);
            currentStreak = winGap === 1 ? currentStreak + 1 : 1;
          } else {
            currentStreak = 1;
          }
          lastWinDate = entryDate;
        } else {
          currentStreak = lastWinDate ? currentStreak + 1 : 1;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
        lastWinDate = null;
      }
    });

    const winPercent = played > 0 ? Math.round((wins / played) * 100) : 0;

    return {
      played,
      wins,
      winPercent,
      currentStreak,
      longestStreak,
      guessDistribution,
    };
  }

  private getUserAnalyticsDocRef(uid: string) {
    return doc(this.firestore, USER_ANALYTICS_COLLECTION, uid);
  }

  private getDailyDocRef(uid: string, date: string) {
    return doc(this.firestore, USER_ANALYTICS_COLLECTION, uid, USER_STATS_SUBCOLLECTION, date);
  }

  private getGlobalAnalyticsDocRef(date: string) {
    return doc(this.firestore, GLOBAL_ANALYTICS_COLLECTION, date);
  }

  private async ensureUserAnalyticsDoc(uid: string) {
    const userDocRef = this.getUserAnalyticsDocRef(uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) return;

    await setDoc(userDocRef, {
      realitease_currentStreak: REALITEASE_DEFAULT_USER_ANALYTICS.currentStreak,
      realitease_longestStreak: REALITEASE_DEFAULT_USER_ANALYTICS.longestStreak,
      realitease_puzzlesWon: REALITEASE_DEFAULT_USER_ANALYTICS.puzzlesWon,
      realitease_puzzlesAttempted: REALITEASE_DEFAULT_USER_ANALYTICS.puzzlesAttempted,
      realitease_averageGuesses: REALITEASE_DEFAULT_USER_ANALYTICS.averageGuesses,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private async ensureGlobalAnalyticsDoc(date: string) {
    const analyticsRef = this.getGlobalAnalyticsDocRef(date);
    const snap = await getDoc(analyticsRef);
    if (snap.exists()) return;

    const defaultDoc: RealiteaseAnalyticsDoc = {
      puzzleDate: date,
      totalWins: 0,
      totalAttempts: 0,
      averageGuesses: 0,
      guessDistribution: {},
    };

    await setDoc(analyticsRef, {
      ...defaultDoc,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private parseDailyDoc(
    raw: Record<string, unknown>,
    puzzleDate: string,
    hasExistingDoc: boolean,
    answerKey: RealiteaseAnswerKeyRecord | null,
    talent: RealiteaseTalentRecord | null,
  ): RealiteaseGameSnapshot {
    const data = raw as Partial<RealiteaseDailyDoc>;

    const answerDerived =
      talent || answerKey
        ? this.buildDerivedFromTalent(
            talent,
            (answerKey?.metadata as Record<string, unknown>) ?? {},
            answerKey?.castId,
            puzzleDate,
          )
        : null;

    const answerContext: AnswerContext = {
      talent,
      derived: answerDerived,
    };

    const guesses = Array.isArray(data.guesses)
      ? data.guesses.map((guess, index) => this.normalizeGuess(guess, index, answerContext))
      : [];

    return {
      puzzleDate,
      gameCompleted: Boolean(data.gameCompleted),
      guessNumberSolved: typeof data.guessNumberSolved === "number" ? data.guessNumberSolved : null,
      guesses,
      hasExistingDoc,
      answerKey,
      talent,
    };
  }

  private normalizeGuess(
    rawGuess: RawRealiteaseGuess,
    index: number,
    answerContext: AnswerContext,
  ): RealiteaseGuess {
    const guessNumber = Number(
      rawGuess?.guessNumber ?? (rawGuess as { GuessNumber?: number }).GuessNumber ?? index + 1,
    );

    const baseInfo =
      (rawGuess?.guessInfo as Record<string, unknown>) ??
      (rawGuess?.guessedInfo as Record<string, unknown>) ??
      (rawGuess as Record<string, unknown>);

    const castId = this.extractStringField(
      baseInfo?.CastID,
      baseInfo?.castId,
      baseInfo?.imdbCastId,
      baseInfo?.imdbID,
      baseInfo?.IMDbCastID,
      baseInfo?.castID,
    );

    const guessTalent = this.lookupTalent(castId ?? null);
    const derived = this.buildDerivedFromTalent(guessTalent, baseInfo, castId ?? undefined);

    const guessName =
      guessTalent?.name ??
      this.extractStringField(baseInfo?.CastName, baseInfo?.castName, baseInfo?.name, baseInfo?.Name) ??
      (typeof rawGuess.castName === "string" ? rawGuess.castName : "");

    const fields: RealiteaseGuessField[] = REALITEASE_BOARD_COLUMNS.map(({ key, label }) =>
      this.buildFieldForColumn(key, label, guessName, derived, answerContext),
    );

    return {
      guessNumber,
      castName: guessName,
      submittedAt: rawGuess.submittedAt ?? rawGuess.createdAt ?? null,
      fields,
      derived,
    };
  }

  private buildFieldForColumn(
    key: RealiteaseBoardColumnKey,
    label: string,
    guessName: string,
    guessDerived: RealiteaseGuessDerived,
    answerContext: AnswerContext,
  ): RealiteaseGuessField {
    const answerDerived = answerContext.derived;

    switch (key) {
      case "guess":
        return {
          key,
          label,
          value: guessName,
          verdict: "guess",
        };
      case "gender":
        return this.evaluateGenderField(label, guessDerived, answerDerived);
      case "age":
        return this.evaluateAgeField(label, guessDerived, answerDerived);
      case "network":
        return this.evaluateNetworkField(label, guessDerived, answerContext);
      case "shows":
        return this.evaluateShowsField(label, guessDerived, answerContext);
      case "wwhl":
        return this.evaluateWwhlField(label, guessDerived, answerContext);
      default:
        return { key, label, value: "—", verdict: "unknown" };
    }
  }

  private evaluateGenderField(
    label: string,
    guessDerived: RealiteaseGuessDerived,
    answerDerived: RealiteaseGuessDerived | null,
  ): RealiteaseGuessField {
    const guessGender = this.normalizeGender(guessDerived.gender);
    const answerGender = this.normalizeGender(answerDerived?.gender);

    if (!guessGender) {
      return { key: "gender", label, value: "—", verdict: "unknown" };
    }

    if (!answerGender) {
      return { key: "gender", label, value: guessGender, verdict: "unknown" };
    }

    return {
      key: "gender",
      label,
      value: guessGender,
      verdict: guessGender === answerGender ? "correct" : "incorrect",
    };
  }

  private evaluateAgeField(
    label: string,
    guessDerived: RealiteaseGuessDerived,
    answerDerived: RealiteaseGuessDerived | null,
  ): RealiteaseGuessField {
    const guessAge = guessDerived.age;
    const answerAge = answerDerived?.age;

    if (guessAge === undefined || guessAge === null) {
      return { key: "age", label, value: "—", verdict: "unknown" };
    }

    if (answerAge === undefined || answerAge === null) {
      return { key: "age", label, value: Math.round(guessAge).toString(), verdict: "unknown" };
    }

    const roundedGuess = Math.round(guessAge);
    const roundedAnswer = Math.round(answerAge);
    const diff = roundedGuess - roundedAnswer;

    if (diff === 0) {
      return { key: "age", label, value: String(roundedGuess), verdict: "correct" };
    }

    if (Math.abs(diff) <= 5) {
      return { key: "age", label, value: String(roundedGuess), verdict: "partial" };
    }

    return { key: "age", label, value: String(roundedGuess), verdict: "incorrect" };
  }

  private evaluateNetworkField(
    label: string,
    guessDerived: RealiteaseGuessDerived,
    answerContext: AnswerContext,
  ): RealiteaseGuessField {
    const guessNetworksRaw = guessDerived.networks ?? [];
    const guessMap = this.buildNetworkMap(guessNetworksRaw);
    const guessValues = Array.from(guessMap.values());

    if (!guessValues.length) {
      return { key: "network", label, value: "—", verdict: "unknown" };
    }

    const answerShows = answerContext.talent?.shows ?? answerContext.derived?.shows ?? [];
    const answerNetworksRaw =
      answerContext.derived?.networks ?? this.collectNetworks({}, answerShows);
    const answerMap = this.buildNetworkMap(answerNetworksRaw);
    const answerValues = Array.from(answerMap.values());

    if (!answerValues.length) {
      const field: RealiteaseGuessField = {
        key: "network",
        label,
        value: guessValues[0],
        verdict: "unknown",
      };
      if (guessValues.length > 1) {
        field.variants = guessValues;
      }
      return field;
    }

    const sharedKeys: string[] = [];
    guessMap.forEach((_, key) => {
      if (answerMap.has(key)) sharedKeys.push(key);
    });

    if (sharedKeys.length === 0) {
      return {
        key: "network",
        label,
        value: "",
        verdict: "incorrect",
      };
    }

    const guessShows = guessDerived.shows ?? [];
    const { prioritized } = this.buildShowMatchPriority(guessShows, answerShows);

    const networkMatchMap = new Map<string, ShowMatchDetail[]>();
    const prioritizedNetworkLabels: string[] = [];
    const seenKeys = new Set<string>();

    prioritized.forEach((match) => {
      if (!match.networkKey) return;
      if (!sharedKeys.includes(match.networkKey)) return;
      const existing = networkMatchMap.get(match.networkKey);
      if (existing) {
        existing.push(match);
      } else {
        networkMatchMap.set(match.networkKey, [match]);
      }
      if (seenKeys.has(match.networkKey)) return;
      const labelValue =
        answerMap.get(match.networkKey) ?? guessMap.get(match.networkKey) ?? match.networkLabel;
      if (!labelValue) return;
      seenKeys.add(match.networkKey);
      prioritizedNetworkLabels.push(labelValue);
    });

    sharedKeys.forEach((key) => {
      if (seenKeys.has(key)) return;
      const labelValue = answerMap.get(key) ?? guessMap.get(key);
      if (!labelValue) return;
      seenKeys.add(key);
      prioritizedNetworkLabels.push(labelValue);
    });

    type NetworkStat = {
      key: string;
      label: string;
      sharedShows: number;
      sharedSeasonCount: number;
      sharedEpisodeCount: number;
      maxSeasonCount: number;
      maxEpisodeCount: number;
      priorityIndex: number;
    };

    const stats: NetworkStat[] = sharedKeys.map((key) => {
      const matches = networkMatchMap.get(key) ?? [];
      const relevantMatches = matches.some((detail) => detail.shareSeason)
        ? matches.filter((detail) => detail.shareSeason)
        : matches;
      const labelValue =
        answerMap.get(key) ??
        guessMap.get(key) ??
        matches.find((detail) => detail.networkLabel)?.networkLabel ??
        "";
      const sharedShows = relevantMatches.length;
      const sharedSeasonCount = relevantMatches.reduce((sum, detail) => sum + detail.sharedSeasonCount, 0);
      const sharedEpisodeCount = relevantMatches.reduce((sum, detail) => sum + detail.sharedEpisodeCount, 0);
      const maxSeasonCount = relevantMatches.reduce((max, detail) => Math.max(max, detail.maxSeasonCount), 0);
      const maxEpisodeCount = relevantMatches.reduce((max, detail) => Math.max(max, detail.maxEpisodeCount), 0);
      const priorityIndex = labelValue ? prioritizedNetworkLabels.indexOf(labelValue) : -1;
      return {
        key,
        label: labelValue,
        sharedShows,
        sharedSeasonCount,
        sharedEpisodeCount,
        maxSeasonCount,
        maxEpisodeCount,
        priorityIndex,
      };
    });

    const resolveLabel = (key: string): string | undefined => {
      const direct = answerMap.get(key) ?? guessMap.get(key);
      if (direct) return direct;
      const matchLabel = (networkMatchMap.get(key) ?? []).find((detail) => detail.networkLabel)?.networkLabel;
      if (matchLabel) return matchLabel;
      const fromPrioritized = prioritizedNetworkLabels.find(
        (entry) => this.normalizeNetworkName(entry) === key,
      );
      return fromPrioritized ?? undefined;
    };

    const selectStat = (): NetworkStat | undefined => {
      if (!stats.length) return undefined;
      if (stats.length === 1) return stats[0];
      const sorted = [...stats].sort((a, b) => {
        if (b.sharedSeasonCount !== a.sharedSeasonCount) {
          return b.sharedSeasonCount - a.sharedSeasonCount;
        }
        if (b.sharedEpisodeCount !== a.sharedEpisodeCount) {
          return b.sharedEpisodeCount - a.sharedEpisodeCount;
        }
        if (b.sharedShows !== a.sharedShows) return b.sharedShows - a.sharedShows;
        if (b.maxSeasonCount !== a.maxSeasonCount) {
          return b.maxSeasonCount - a.maxSeasonCount;
        }
        if (b.maxEpisodeCount !== a.maxEpisodeCount) {
          return b.maxEpisodeCount - a.maxEpisodeCount;
        }
        const aIndex = a.priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : a.priorityIndex;
        const bIndex = b.priorityIndex === -1 ? Number.MAX_SAFE_INTEGER : b.priorityIndex;
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
      });
      return sorted[0];
    };

    const selectedStat = selectStat();
    const resolvedLabel = selectedStat ? resolveLabel(selectedStat.key) : undefined;

    if (resolvedLabel) {
      return {
        key: "network",
        label,
        value: resolvedLabel,
        verdict: "correct",
      };
    }

    const fallbackValue = prioritizedNetworkLabels[0] ?? guessValues[0] ?? answerValues[0];
    if (fallbackValue) {
      return {
        key: "network",
        label,
        value: fallbackValue,
        verdict: "correct",
      };
    }

    return {
      key: "network",
      label,
      value: "",
      verdict: "incorrect",
    };
  }

  private evaluateShowsField(
    label: string,
    guessDerived: RealiteaseGuessDerived,
    answerContext: AnswerContext,
  ): RealiteaseGuessField {
    const guessShows = guessDerived.shows ?? [];
    const answerShows = answerContext.talent?.shows ?? answerContext.derived?.shows ?? [];

    if (!guessShows.length) {
      return { key: "shows", label, value: "—", verdict: "unknown" };
    }

    if (!answerShows.length) {
      const field: RealiteaseGuessField = {
        key: "shows",
        label,
        value: this.formatShowDisplay(guessShows[0]),
        verdict: "unknown",
      };
      if (guessShows.length > 1) {
        field.variants = this.buildShowVariantList(guessShows);
      }
      return field;
    }

    const { sameSeason, sameShowOnly } = this.buildShowMatchPriority(guessShows, answerShows);

    if (sameSeason.length > 0) {
      const topMatch = sameSeason[0];
      const bestMatches = sameSeason.filter(
        (match) =>
          match.sharedSeasonCount === topMatch.sharedSeasonCount &&
          match.sharedEpisodeCount === topMatch.sharedEpisodeCount,
      );
      const displays = this.uniqueList(bestMatches.map((match) => match.display));
      const fallbackDisplay = this.formatShowDisplay(topMatch.answerShow ?? topMatch.guessShow);
      const resolvedDisplay = displays[0] ?? fallbackDisplay;

      const field: RealiteaseGuessField = {
        key: "shows",
        label,
        value: resolvedDisplay,
        verdict: displays.length > 1 ? "multi" : "correct",
      };
      if (displays.length > 1) {
        field.variants = displays;
      }
      return field;
    }

    if (sameShowOnly.length > 0) {
      const topMatch = sameShowOnly[0];
      const bestMatches = sameShowOnly.filter(
        (match) =>
          match.sharedSeasonCount === topMatch.sharedSeasonCount &&
          match.sharedEpisodeCount === topMatch.sharedEpisodeCount &&
          match.maxSeasonCount === topMatch.maxSeasonCount &&
          match.maxEpisodeCount === topMatch.maxEpisodeCount,
      );
      const displays = this.uniqueList(bestMatches.map((match) => match.display));
      const fallbackDisplay = this.formatShowDisplay(topMatch.answerShow ?? topMatch.guessShow);
      const resolvedDisplay = displays[0] ?? fallbackDisplay;

      const field: RealiteaseGuessField = {
        key: "shows",
        label,
        value: resolvedDisplay,
        verdict: displays.length > 1 ? "multi" : "partial",
      };
      if (displays.length > 1) {
        field.variants = displays;
      }
      return field;
    }

    return {
      key: "shows",
      label,
      value: "",
      verdict: "incorrect",
    };
  }

  private evaluateWwhlField(
    label: string,
    guessDerived: RealiteaseGuessDerived,
    answerContext: AnswerContext,
  ): RealiteaseGuessField {
    const guessEpisodes = guessDerived.wwhlEpisodes ?? [];
    const answerEpisodes = answerContext.derived?.wwhlEpisodes ?? [];
    if (guessEpisodes.length && answerEpisodes.length) {
      const intersection = this.findWwhlIntersection(guessEpisodes, answerEpisodes);
      if (intersection.length > 0) {
        return {
          key: "wwhl",
          label,
          value: "SAME EPISODE",
          verdict: "multi",
        };
      }
    }

    const guessCount = this.resolveWwhlCount(guessDerived);
    const answerCount = this.resolveWwhlCount(answerContext.derived);

    if (guessCount !== null) {
      if (answerCount === null) {
        return { key: "wwhl", label, value: this.formatWwhlCount(guessCount), verdict: "unknown" };
      }

      const diff = guessCount - answerCount;
      if (diff === 0) {
        return { key: "wwhl", label, value: this.formatWwhlCount(guessCount), verdict: "correct" };
      }

      if (Math.abs(diff) <= 2) {
        return {
          key: "wwhl",
          label,
          value: this.formatWwhlCount(guessCount),
          verdict: "partial",
        };
      }

      return { key: "wwhl", label, value: this.formatWwhlCount(guessCount), verdict: "incorrect" };
    }

    if (guessEpisodes.length) {
      return {
        key: "wwhl",
        label,
        value: String(guessEpisodes.length),
        verdict: answerEpisodes.length ? "incorrect" : "unknown",
      };
    }

    return {
      key: "wwhl",
      label,
      value: answerEpisodes.length ? "0" : "—",
      verdict: answerEpisodes.length ? "incorrect" : "unknown",
    };
  }

  private lookupTalent(identifier: string | null): RealiteaseTalentRecord | null {
    if (!identifier) return null;
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return null;

    if (!RealiteaseManager.talentCacheMap) {
      const map = new Map<string, RealiteaseTalentRecord>();
      (RealiteaseManager.talentCache ?? []).forEach((talent) => {
        map.set(talent.id.toLowerCase(), talent);
        if (talent.imdbId) {
          map.set(talent.imdbId.toLowerCase(), talent);
        }
        map.set(talent.name.toLowerCase(), talent);
        talent.alternativeNames.forEach((alt) => {
          map.set(alt.toLowerCase(), talent);
        });
      });
      RealiteaseManager.talentCacheMap = map;
    }

    const cacheMap = RealiteaseManager.talentCacheMap;
    if (!cacheMap) return null;

    return cacheMap.get(normalized) ?? null;
  }

  private buildDerivedFromTalent(
    talent: RealiteaseTalentRecord | null,
    baseInfo: Record<string, unknown> = {},
    fallbackCastId?: string,
    referenceDate?: string,
  ): RealiteaseGuessDerived {
    const castIdFromBase = this.extractStringField(
      baseInfo.CastID,
      baseInfo.castId,
      baseInfo.imdbCastId,
      baseInfo.imdbID,
      baseInfo.imdbCastID,
      baseInfo.talentId,
      baseInfo.talentID,
    );

    const castId = castIdFromBase ?? fallbackCastId ?? talent?.imdbId ?? talent?.id;

    const gender =
      talent?.gender ?? this.extractStringField(baseInfo.gender, baseInfo.Gender, baseInfo.sex, baseInfo.Sex) ?? undefined;

    const zodiac = this.extractStringField(talent?.zodiac, baseInfo.zodiac, baseInfo.Zodiac) ?? undefined;

    const birthdayFromBase = this.extractStringField(baseInfo.birthday, baseInfo.Birthday, baseInfo.dateOfBirth);
    const birthday = talent?.birthday ?? birthdayFromBase ?? undefined;

    const explicitAge = this.extractNumberField(
      baseInfo.age,
      baseInfo.Age,
      baseInfo.guessedAge,
      baseInfo.GuessedAge,
      baseInfo.playerAge,
    );

    const age = ((): number | undefined => {
      if (typeof explicitAge === "number") {
        return explicitAge;
      }

      const calculated = this.computeAgeFromBirthday(birthday, referenceDate);
      return calculated ?? undefined;
    })();

    const talentShows = talent?.shows ?? [];
    const guessShows = this.collectGuessShows(baseInfo);
    const shows = this.mergeShowLists([...talentShows, ...guessShows]);

    const baseShowCount = this.extractNumberField(
      baseInfo.showCount,
      baseInfo.ShowCount,
      baseInfo.showsCount,
      baseInfo.ShowsCount,
      baseInfo.totalShows,
      baseInfo.TotalShows,
    );
    const showCount = baseShowCount ?? shows.length;

    const networks = this.collectNetworks(baseInfo, shows);

    const baseWwhl = this.normalizeWwhlFromGuess(baseInfo);
    const talentWwhl = talent?.wwhlAppearances ?? [];
    const wwhlEpisodes = this.mergeWwhlAppearances([...baseWwhl, ...talentWwhl]);

    const wwhlCountRaw = this.extractNumberField(
      baseInfo.wwhlAppearancesCount,
      baseInfo.WwhlAppearancesCount,
      baseInfo.wwhlCount,
      baseInfo.WwhlCount,
      baseInfo.WWHLCount,
      baseInfo.wwhlAppearances,
      baseInfo.wwhlTotal,
      baseInfo.wwhlTotalAppearances,
    );
    let wwhlAppearancesCount: number | undefined;
    if (wwhlCountRaw !== null && wwhlCountRaw !== undefined) {
      wwhlAppearancesCount = wwhlCountRaw;
    } else if (typeof talent?.wwhlTotalAppearances === "number") {
      wwhlAppearancesCount = talent.wwhlTotalAppearances;
    } else if (typeof wwhlEpisodes.length === "number") {
      wwhlAppearancesCount = wwhlEpisodes.length;
    }

    const normalizedZodiac = this.normalizeZodiac(zodiac);

    return {
      castId: castId ?? undefined,
      gender,
      age,
      zodiac: normalizedZodiac ?? zodiac ?? undefined,
      networks,
      shows,
      showCount,
      wwhlEpisodes,
      wwhlAppearancesCount,
    };
  }

  private normalizeGender(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;

    if (["f", "female", "woman", "w"].includes(normalized)) return "Female";
    if (["m", "male", "man"].includes(normalized)) return "Male";
    if (["nb", "nonbinary", "non-binary", "non binary"].includes(normalized)) return "Non-Binary";
    return value.trim();
  }

  private normalizeZodiac(value?: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  private computeAgeFromBirthday(birthday?: string, referenceDate?: string): number | null {
    if (!birthday) return null;
    const normalized = birthday.trim();
    if (!normalized) return null;

    const birthDate = new Date(normalized);
    if (Number.isNaN(birthDate.getTime())) return null;

    let compareDate: Date;
    if (referenceDate) {
      const ref = new Date(referenceDate);
      compareDate = Number.isNaN(ref.getTime()) ? new Date() : ref;
    } else {
      compareDate = new Date();
    }

    let age = compareDate.getFullYear() - birthDate.getFullYear();
    const hasHadBirthdayThisYear =
      compareDate.getMonth() > birthDate.getMonth() ||
      (compareDate.getMonth() === birthDate.getMonth() && compareDate.getDate() >= birthDate.getDate());

    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }

    return Number.isFinite(age) ? age : null;
  }

  private parsePuzzleDate(value: string | null | undefined): Date | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(trimmed);
    if (!match) return null;
    const [, year, month, day] = match;
    const numericYear = Number.parseInt(year, 10);
    const numericMonth = Number.parseInt(month, 10) - 1;
    const numericDay = Number.parseInt(day, 10);
    const date = new Date(numericYear, numericMonth, numericDay);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private differenceInDays(current: Date, previous: Date): number {
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const currentUtc = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
    const previousUtc = Date.UTC(previous.getFullYear(), previous.getMonth(), previous.getDate());
    return Math.round((currentUtc - previousUtc) / MS_PER_DAY);
  }

  private collectNetworks(baseInfo: Record<string, unknown>, shows: RealiteaseTalentShow[]): string[] {
    const networks: string[] = [];
    const seen = new Set<string>();

    const register = (value: unknown) => {
      if (typeof value !== "string") return;
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = this.normalizeNetworkName(trimmed);
      if (seen.has(key)) return;
      seen.add(key);
      networks.push(this.formatNetworkLabel(trimmed));
    };

    shows.forEach((show) => {
      if (show.network) register(show.network);
    });

    [
      baseInfo.network,
      baseInfo.Network,
      baseInfo.networks,
      baseInfo.Networks,
      baseInfo.primaryNetwork,
      baseInfo.PrimaryNetwork,
      baseInfo.networkList,
    ].forEach((source) => {
      this.normalizeStringArray(source).forEach(register);
    });

    return networks;
  }

  private normalizeNetworkName(value: string): string {
    return value.trim().toLowerCase();
  }

  private formatNetworkLabel(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return trimmed;
    const alphanumericLength = trimmed.replace(/[^a-zA-Z0-9]/g, "").length;
    if (alphanumericLength > 0 && alphanumericLength <= 4) {
      return trimmed.toUpperCase();
    }
    if (trimmed === trimmed.toUpperCase()) {
      return trimmed;
    }
    return trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  }

  private uniqueList(values: string[]): string[] {
    return Array.from(
      new Set(
        values
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value) => value.length > 0),
      ),
    );
  }

  private buildNetworkMap(networks: string[]): Map<string, string> {
    const map = new Map<string, string>();
    networks.forEach((network) => {
      if (typeof network !== "string") return;
      const trimmed = network.trim();
      if (!trimmed) return;
      const key = this.normalizeNetworkName(trimmed);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, this.formatNetworkLabel(trimmed));
      }
    });
    return map;
  }

  private findNetworkOverlap(guessNetworks: string[], answerNetworks: string[]): string[] {
    if (!guessNetworks.length || !answerNetworks.length) {
      return [];
    }

    const answerLookup = new Map<string, string>();
    answerNetworks.forEach((network) => {
      const key = this.normalizeNetworkName(network);
      if (!answerLookup.has(key)) {
        answerLookup.set(key, network);
      }
    });

    const matches: string[] = [];
    guessNetworks.forEach((network) => {
      const key = this.normalizeNetworkName(network);
      const match = answerLookup.get(key);
      if (match && !matches.some((entry) => this.normalizeNetworkName(entry) === key)) {
        matches.push(match);
      }
    });

    return matches;
  }

  private collectGuessShows(baseInfo: Record<string, unknown>): RealiteaseTalentShow[] {
    const sources: unknown[] = [
      baseInfo.shows,
      baseInfo.Shows,
      baseInfo.show,
      baseInfo.Show,
      baseInfo.appearances,
      baseInfo.Appearances,
    ];

    const shows: RealiteaseTalentShow[] = [];
    sources.forEach((source) => {
      if (!source) return;
      shows.push(...this.normalizeGuessShows(source));
    });
    return shows;
  }

  private mergeShowLists(shows: RealiteaseTalentShow[]): RealiteaseTalentShow[] {
    const merged: RealiteaseTalentShow[] = [];
    const seen = new Set<string>();

    shows.forEach((show) => {
      const key = this.showKey(show);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(show);
    });

    return merged;
  }

  private showKey(show: RealiteaseTalentShow): string {
    const parts = [
      show.imdbSeriesId?.toLowerCase() ?? "",
      show.tmdbId?.toLowerCase() ?? "",
      this.normalizeShowName(show.nickname ?? show.showName ?? ""),
    ];
    return parts.join("|");
  }

  private normalizeShowName(value: string): string {
    return value.trim().toLowerCase();
  }

  private findSeasonOverlap(guessSeasons: number[] = [], answerSeasons: number[] = []): number[] {
    if (!guessSeasons.length || !answerSeasons.length) return [];
    const answerSet = new Set(answerSeasons);
    return guessSeasons.filter((season) => answerSet.has(season));
  }

  private normalizeEpisodeCount(value: number | null | undefined): number | null {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
    return null;
  }

  private formatShowDisplay(show: RealiteaseTalentShow | null | undefined): string {
    if (!show) return "—";
    if (show.nickname && show.nickname.trim().length > 0) return show.nickname.trim();
    if (show.showName && show.showName.trim().length > 0) return show.showName.trim();
    return "—";
  }

  private findShowMatches(
    guessShows: RealiteaseTalentShow[],
    answerShows: RealiteaseTalentShow[],
  ): ShowMatchDetail[] {
    const matches: ShowMatchDetail[] = [];
    const seen = new Set<string>();

    guessShows.forEach((guessShow) => {
      if (!guessShow) return;
      answerShows.forEach((answerShow) => {
        if (!answerShow) return;
        if (!this.showsAreSame(guessShow, answerShow)) {
          return;
        }

        const guessSeasons = Array.isArray(guessShow.seasons) ? guessShow.seasons : [];
        const answerSeasons = Array.isArray(answerShow.seasons) ? answerShow.seasons : [];
        const overlappingSeasons = this.findSeasonOverlap(guessSeasons, answerSeasons);
        const shareSeason =
          overlappingSeasons.length > 0 ||
          (!guessSeasons.length && !answerSeasons.length);
        const sharedSeasonCount = overlappingSeasons.length;
        const maxSeasonCount = Math.max(guessSeasons.length, answerSeasons.length);
        const guessEpisodeCount = this.normalizeEpisodeCount(guessShow.episodeCount);
        const answerEpisodeCount = this.normalizeEpisodeCount(answerShow.episodeCount);
        const sharedEpisodeCount =
          shareSeason && guessEpisodeCount !== null && answerEpisodeCount !== null
            ? Math.min(guessEpisodeCount, answerEpisodeCount)
            : 0;
        const maxEpisodeCount = Math.max(guessEpisodeCount ?? 0, answerEpisodeCount ?? 0);

        const display = this.formatShowDisplay(answerShow ?? guessShow);
        const networkSource = answerShow.network ?? guessShow.network ?? null;
        const networkKey =
          typeof networkSource === "string" && networkSource.trim().length > 0
            ? this.normalizeNetworkName(networkSource)
            : null;
        const networkLabel =
          networkKey && typeof networkSource === "string"
            ? this.formatNetworkLabel(networkSource)
            : null;

        const detail: ShowMatchDetail = {
          guessShow,
          answerShow,
          display,
          shareSeason,
          networkKey,
          networkLabel,
          sharedSeasonCount,
          maxSeasonCount,
          sharedEpisodeCount,
          maxEpisodeCount,
        };

        const identifier = this.buildShowMatchIdentifier(detail);
        if (seen.has(identifier)) return;
        seen.add(identifier);
        matches.push(detail);
      });
    });

    return matches;
  }

  private buildShowVariantList(shows: RealiteaseTalentShow[]): string[] {
    const variants = shows
      .map((show) => this.formatShowDisplay(show))
      .filter((value) => value !== "—");
    return this.uniqueList(variants);
  }

  private buildShowMatchPriority(
    guessShows: RealiteaseTalentShow[],
    answerShows: RealiteaseTalentShow[],
  ): {
    prioritized: ShowMatchDetail[];
    sameSeason: ShowMatchDetail[];
    sameShowOnly: ShowMatchDetail[];
  } {
    const details = this.findShowMatches(guessShows, answerShows);
    if (!details.length) {
      return { prioritized: [], sameSeason: [], sameShowOnly: [] };
    }

    const sameSeasonMatches = this.sortShowMatches(details.filter((detail) => detail.shareSeason));
    const sameSeason = this.deduplicateShowMatches(sameSeasonMatches);

    const sameShowMatches = this.sortShowMatches(details.filter((detail) => !detail.shareSeason));
    const sameShowDeduped = this.deduplicateShowMatches(sameShowMatches);

    const sameShowOnly = sameSeason.length > 0 ? [] : sameShowDeduped;
    const prioritized = sameSeason.length > 0 ? sameSeason : sameShowDeduped;

    return { prioritized, sameSeason, sameShowOnly };
  }

  private sortShowMatches(matches: ShowMatchDetail[]): ShowMatchDetail[] {
    return [...matches].sort((a, b) => {
      if (b.sharedSeasonCount !== a.sharedSeasonCount) {
        return b.sharedSeasonCount - a.sharedSeasonCount;
      }
      if (b.sharedEpisodeCount !== a.sharedEpisodeCount) {
        return b.sharedEpisodeCount - a.sharedEpisodeCount;
      }
      if (b.maxSeasonCount !== a.maxSeasonCount) {
        return b.maxSeasonCount - a.maxSeasonCount;
      }
      if (b.maxEpisodeCount !== a.maxEpisodeCount) {
        return b.maxEpisodeCount - a.maxEpisodeCount;
      }
      return a.display.localeCompare(b.display, undefined, { sensitivity: "base" });
    });
  }

  private deduplicateShowMatches(matches: ShowMatchDetail[]): ShowMatchDetail[] {
    const seen = new Set<string>();
    const result: ShowMatchDetail[] = [];

    matches.forEach((match) => {
      const key = this.buildShowMatchIdentifier(match);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(match);
    });

    return result;
  }

  private buildShowMatchIdentifier(detail: ShowMatchDetail): string {
    const answerKey = detail.answerShow ? this.showKey(detail.answerShow) : "";
    const guessKey = detail.guessShow ? this.showKey(detail.guessShow) : "";
    return `${answerKey}|${guessKey}|${detail.shareSeason ? "season" : "show"}`;
  }

  private showsAreSame(a: RealiteaseTalentShow, b: RealiteaseTalentShow): boolean {
    const imdbMatch = a.imdbSeriesId && b.imdbSeriesId && a.imdbSeriesId === b.imdbSeriesId;
    const tmdbMatch = a.tmdbId && b.tmdbId && a.tmdbId === b.tmdbId;
    const nameMatch =
      (a.nickname && b.nickname && this.normalizeShowName(a.nickname) === this.normalizeShowName(b.nickname)) ||
      (a.showName && b.showName && this.normalizeShowName(a.showName) === this.normalizeShowName(b.showName));

    return Boolean(imdbMatch || tmdbMatch || nameMatch);
  }

  private resolveWwhlCount(derived?: RealiteaseGuessDerived | null): number | null {
    if (derived) {
      if (typeof derived.wwhlAppearancesCount === "number" && Number.isFinite(derived.wwhlAppearancesCount)) {
        return derived.wwhlAppearancesCount;
      }
      if (Array.isArray(derived.wwhlEpisodes)) {
        return derived.wwhlEpisodes.length;
      }
    }
    return null;
  }

  private isWinningGuess(
    guessTalent: RealiteaseTalentRecord,
    answerKey: RealiteaseAnswerKeyRecord | null,
    answerTalent: RealiteaseTalentRecord | null,
  ): boolean {
    if (!answerKey && !answerTalent) {
      return false;
    }

    const guessTokens = this.buildTalentTokenSet(guessTalent);
    const answerTokens = this.buildAnswerTokenSet(answerKey, answerTalent);

    for (const token of guessTokens) {
      if (answerTokens.has(token)) {
        return true;
      }
    }
    return false;
  }

  private buildTalentTokenSet(talent: RealiteaseTalentRecord): Set<string> {
    const tokens = new Set<string>();
    this.collectToken(tokens, talent.id);
    this.collectToken(tokens, talent.imdbId);
    this.collectToken(tokens, talent.name);
    talent.alternativeNames.forEach((alt) => this.collectToken(tokens, alt));
    return tokens;
  }

  private buildAnswerTokenSet(
    answerKey: RealiteaseAnswerKeyRecord | null,
    answerTalent: RealiteaseTalentRecord | null,
  ): Set<string> {
    const tokens = new Set<string>();

    if (answerKey) {
      this.collectToken(tokens, answerKey.castId);
      this.collectToken(tokens, answerKey.castName);

      const metadataRecord = (answerKey.metadata ?? {}) as Record<string, unknown>;
      const metadataCastId = this.extractStringField(
        metadataRecord.castId,
        metadataRecord.CastID,
        metadataRecord.imdbCastId,
        metadataRecord.imdbCastID,
        metadataRecord.imdbID,
        metadataRecord.talentId,
        metadataRecord.talentID,
      );
      this.collectToken(tokens, metadataCastId);

      const altNamesSource = metadataRecord.alternativeNames;
      if (Array.isArray(altNamesSource)) {
        altNamesSource.forEach((entry) => {
          if (typeof entry === "string") this.collectToken(tokens, entry);
        });
      }
    }

    if (answerTalent) {
      this.buildTalentTokenSet(answerTalent).forEach((token) => tokens.add(token));
    }

    return tokens;
  }

  private collectToken(target: Set<string>, value: unknown): void {
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized) target.add(normalized);
      return;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      target.add(String(value));
    }
  }

  private buildRawGuessPayload(params: {
    puzzleDate: string;
    guessNumber: number;
    talent: RealiteaseTalentRecord;
    derived: RealiteaseGuessDerived;
    isCorrect: boolean;
    answerTalent: RealiteaseTalentRecord | null;
    submittedAt: Timestamp;
  }): RawRealiteaseGuess {
    const { puzzleDate, guessNumber, talent, derived, isCorrect, answerTalent, submittedAt } = params;

    const showsPayload = Array.isArray(derived.shows)
      ? derived.shows.map((show) => this.serializeShowForStorage(show))
      : [];

    const answerDerived = answerTalent
      ? this.buildDerivedFromTalent(answerTalent, answerTalent.metadata ?? {}, answerTalent.id)
      : null;

    const fields = REALITEASE_BOARD_COLUMNS.map(({ key, label }) =>
      this.buildFieldForColumn(key, label, talent.name, derived, {
        talent: answerTalent,
        derived: answerDerived,
      }),
    );

    const guessInfo: Record<string, unknown> = {
      puzzleDate,
      castId: derived.castId ?? talent.id,
      CastID: derived.castId ?? talent.id,
      imdbCastId: derived.castId ?? talent.imdbId ?? talent.id,
      imdbID: talent.imdbId,
      castName: talent.name,
      CastName: talent.name,
      Gender: derived.gender,
      gender: derived.gender,
      Zodiac: derived.zodiac,
      zodiac: derived.zodiac,
      Networks: derived.networks,
      Shows: showsPayload,
      ShowCount: derived.showCount ?? (Array.isArray(derived.shows) ? derived.shows.length : undefined),
      WWHLCount:
        derived.wwhlAppearancesCount ?? (Array.isArray(derived.wwhlEpisodes) ? derived.wwhlEpisodes.length : undefined),
      win: isCorrect,
    };

    if (Array.isArray(derived.wwhlEpisodes) && derived.wwhlEpisodes.length) {
      guessInfo.WWHLEpisodes = derived.wwhlEpisodes.map((episode) => this.cleanGuessInfo({ ...episode }));
    }

    const cleanedInfo = this.cleanGuessInfo(guessInfo);

    const payload: RawRealiteaseGuess = {
      guessNumber,
      castName: talent.name,
      CastName: talent.name,
      guessInfo: cleanedInfo,
      guessedInfo: cleanedInfo,
      submittedAt,
      win: isCorrect,
      fields: fields.reduce((acc, field, index) => ({ ...acc, [index]: field }), {} as Record<string, unknown>),
    };

    return this.removeUndefinedDeep(payload);
  }

  private mergeWwhlAppearances(appearances: RealiteaseWwhlAppearance[]): RealiteaseWwhlAppearance[] {
    const merged: RealiteaseWwhlAppearance[] = [];
    const seen = new Set<string>();

    appearances.forEach((appearance) => {
      const key = this.serializeWwhlAppearance(appearance);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(appearance);
    });

    return merged;
  }

  private serializeWwhlAppearance(appearance: RealiteaseWwhlAppearance): string {
    const keys = this.wwhlKeys(appearance);
    if (keys.length > 0) {
      return keys[0];
    }
    return JSON.stringify(appearance);
  }

  private wwhlKeys(appearance: RealiteaseWwhlAppearance): string[] {
    const keys: string[] = [];
    if (appearance.episodeId) {
      keys.push(`episode:${appearance.episodeId.trim().toLowerCase()}`);
    }
    if (appearance.airDate) {
      keys.push(`date:${appearance.airDate.trim().toLowerCase()}`);
    }
    return keys;
  }

  private normalizeWwhlFromGuess(baseInfo: Record<string, unknown>): RealiteaseWwhlAppearance[] {
    const sources: unknown[] = [
      baseInfo.wwhlAppearances,
      baseInfo.WwhlAppearances,
      baseInfo.wwhlEpisodes,
      baseInfo.WwhlEpisodes,
      baseInfo.wwhl,
      baseInfo.WWHL,
    ];

    const appearances: RealiteaseWwhlAppearance[] = [];

    sources.forEach((source) => {
      if (!source) return;
      if (Array.isArray(source)) {
        source.forEach((entry) => {
          if (typeof entry === "string") {
            const trimmed = entry.trim();
            if (trimmed) {
              appearances.push({ airDate: trimmed });
            }
            return;
          }
          if (entry && typeof entry === "object") {
            const normalized = this.normalizeWwhlAppearances({ appearances: [entry] }).appearances;
            appearances.push(...normalized);
          }
        });
        return;
      }

      if (typeof source === "string") {
        const trimmed = source.trim();
        if (trimmed) appearances.push({ airDate: trimmed });
        return;
      }

      if (typeof source === "object") {
        const normalized = this.normalizeWwhlAppearances(source).appearances;
        appearances.push(...normalized);
      }
    });

    return this.mergeWwhlAppearances(appearances);
  }

  private findWwhlIntersection(
    guessEpisodes: RealiteaseWwhlAppearance[],
    answerEpisodes: RealiteaseWwhlAppearance[],
  ): RealiteaseWwhlAppearance[] {
    if (!guessEpisodes.length || !answerEpisodes.length) return [];

    const answerMap = new Map<string, RealiteaseWwhlAppearance>();
    answerEpisodes.forEach((appearance) => {
      this.wwhlKeys(appearance).forEach((key) => {
        if (!answerMap.has(key)) {
          answerMap.set(key, appearance);
        }
      });
    });

    const matches: RealiteaseWwhlAppearance[] = [];

    guessEpisodes.forEach((guessAppearance) => {
      for (const key of this.wwhlKeys(guessAppearance)) {
        const answerMatch = answerMap.get(key);
        if (answerMatch) {
          matches.push(this.mergeWwhlAppearance(guessAppearance, answerMatch));
          break;
        }
      }
    });

    return matches;
  }

  private mergeWwhlAppearance(
    guess: RealiteaseWwhlAppearance,
    answer: RealiteaseWwhlAppearance,
  ): RealiteaseWwhlAppearance {
    return {
      airDate: guess.airDate ?? answer.airDate,
      episodeId: guess.episodeId ?? answer.episodeId,
      otherGuests: guess.otherGuests ?? answer.otherGuests,
      otherGuestsIMDbIds: guess.otherGuestsIMDbIds ?? answer.otherGuestsIMDbIds,
    };
  }

  private formatWwhlCount(count: number): string {
    return String(count);
  }

  private formatWwhlDisplay(appearance: RealiteaseWwhlAppearance): string {
    if (appearance.airDate && appearance.airDate.trim().length > 0) {
      return appearance.airDate.trim();
    }
    if (appearance.episodeId && appearance.episodeId.trim().length > 0) {
      return appearance.episodeId.trim();
    }
    return "YES";
  }

  private extractVerdicts(rawGuess: RawRealiteaseGuess): Record<RealiteaseBoardColumnKey, RealiteaseGuessVerdict> {
    const source =
      rawGuess?.evaluations ?? rawGuess?.verdicts ?? rawGuess?.fields ?? (rawGuess as { verdictMap?: unknown }).verdictMap;

    if (!source || typeof source !== "object") {
      return {} as Record<RealiteaseBoardColumnKey, RealiteaseGuessVerdict>;
    }

    const verdictMap: Partial<Record<RealiteaseBoardColumnKey, RealiteaseGuessVerdict>> = {};

    REALITEASE_BOARD_COLUMNS.forEach(({ key }) => {
      const rawVerdict = (source as Record<string, unknown>)[key];
      if (typeof rawVerdict === "string") {
        verdictMap[key] = this.normalizeVerdict(rawVerdict);
        return;
      }

      if (typeof rawVerdict === "boolean") {
        verdictMap[key] = rawVerdict ? "correct" : "incorrect";
      }
    });

    return verdictMap as Record<RealiteaseBoardColumnKey, RealiteaseGuessVerdict>;
  }

  private normalizeVerdict(value: string): RealiteaseGuessVerdict {
    const normalized = value.toLowerCase();
    if (["correct", "match", "exact", "right"].includes(normalized)) return "correct";
    if (["partial", "close", "present", "offbyone"].includes(normalized)) return "partial";
    if (["incorrect", "wrong", "miss", "no"].includes(normalized)) return "incorrect";
    return "unknown";
  }

  private normalizeTalentShows(source: unknown): RealiteaseTalentRecord["shows"] {
    if (!Array.isArray(source)) return [];
    return source
      .map((item) => (item && typeof item === "object" ? this.buildShowObject(item as Record<string, unknown>) : null))
      .filter((value): value is RealiteaseTalentRecord["shows"][number] => value !== null);
  }

  private normalizeGuessShows(source: unknown): RealiteaseTalentRecord["shows"] {
    if (!source) return [];
    if (Array.isArray(source)) {
      return source
        .map((item) => {
          if (item && typeof item === "object") {
            return this.buildShowObject(item as Record<string, unknown>);
          }
          if (typeof item === "string") {
            return this.buildShowFromString(item);
          }
          return null;
        })
        .filter((value): value is RealiteaseTalentRecord["shows"][number] => value !== null);
    }
    if (typeof source === "object") {
      return Object.values(source as Record<string, unknown>)
        .map((item) => {
          if (item && typeof item === "object") {
            return this.buildShowObject(item as Record<string, unknown>);
          }
          if (typeof item === "string") {
            return this.buildShowFromString(item);
          }
          return null;
        })
        .filter((value): value is RealiteaseTalentRecord["shows"][number] => value !== null);
    }
    return [];
  }

  private normalizeWwhlAppearances(source: unknown): {
    appearances: RealiteaseTalentRecord["wwhlAppearances"];
    totalAppearances?: number;
  } {
    if (!source || typeof source !== "object") {
      return { appearances: [] };
    }

    const record = source as Record<string, unknown>;
    const totalRaw = record.totalAppearances ?? record.total ?? record.count;
    let totalAppearances: number | undefined;
    if (typeof totalRaw === "number") {
      totalAppearances = totalRaw;
    } else if (typeof totalRaw === "string" && totalRaw.trim().length > 0) {
      const parsed = Number.parseInt(totalRaw, 10);
      if (Number.isFinite(parsed)) totalAppearances = parsed;
    }

    const appearancesSource = Array.isArray(record.appearances) ? record.appearances : [];
    const appearances = appearancesSource
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const rawAppearance = entry as Record<string, unknown>;

        const airDate = this.extractStringField(rawAppearance.airDate, rawAppearance.date, rawAppearance.AirDate);
        const episodeId = this.extractStringField(
          rawAppearance.episodeId,
          rawAppearance.episodeID,
          rawAppearance.EpisodeId,
          rawAppearance.id,
        );
        const otherGuests = Array.isArray(rawAppearance.otherGuests)
          ? rawAppearance.otherGuests.filter((guest): guest is string => typeof guest === "string")
          : undefined;
        const imdbIdSource = rawAppearance.otherGuestsIMDbIds ?? rawAppearance.otherGuestsImdbIds;
        const otherGuestsIMDbIds = Array.isArray(imdbIdSource)
          ? imdbIdSource.filter((guest): guest is string => typeof guest === "string")
          : undefined;

        if (!airDate && !episodeId && (!otherGuests || otherGuests.length === 0) && (!otherGuestsIMDbIds || otherGuestsIMDbIds.length === 0)) {
          return null;
        }

        const appearance: RealiteaseTalentRecord["wwhlAppearances"][number] = {};
        if (airDate) {
          appearance.airDate = airDate;
        }
        if (episodeId) {
          appearance.episodeId = episodeId;
        }
        if (otherGuests && otherGuests.length > 0) {
          appearance.otherGuests = otherGuests;
        }
        if (otherGuestsIMDbIds && otherGuestsIMDbIds.length > 0) {
          appearance.otherGuestsIMDbIds = otherGuestsIMDbIds;
        }
        return appearance;
      })
      .filter((value): value is RealiteaseTalentRecord["wwhlAppearances"][number] => value !== null);

    return { appearances, totalAppearances };
  }

  private buildShowObject(record: Record<string, unknown>): RealiteaseTalentShow | null {
    const showName = this.extractStringField(record.showName, record.ShowName, record.name, record.Name);
    const nickname = this.extractStringField(record.showNickname, record.ShowNickname, record.nickname, record.ShowNickName);
    const network = this.extractStringField(record.network, record.Network);
    const imdbSeriesId = this.extractStringField(record.imdbSeriesId, record.imdbSeriesID, record.imdbId, record.imdbID);
    const tmdbId = this.extractStringField(record.tmdbId, record.tmdbID);
    const seasons = this.toNumberArray(record.seasons);

    let episodeCount: number | null | undefined = undefined;
    const episodeCountRaw = record.episodeCount ?? record.EpisodeCount;
    if (typeof episodeCountRaw === "number" && Number.isFinite(episodeCountRaw)) {
      episodeCount = episodeCountRaw;
    } else if (typeof episodeCountRaw === "string" && episodeCountRaw.trim().length > 0) {
      const parsed = Number.parseInt(episodeCountRaw, 10);
      episodeCount = Number.isFinite(parsed) ? parsed : null;
    } else if (episodeCountRaw === null) {
      episodeCount = null;
    }

    if (!showName && !nickname) {
      return null;
    }

    return {
      showName: showName ?? undefined,
      nickname: nickname ?? undefined,
      network: network ?? undefined,
      imdbSeriesId: imdbSeriesId ?? undefined,
      tmdbId: tmdbId ?? undefined,
      seasons,
      episodeCount,
    };
  }

  private buildShowFromString(value: string): RealiteaseTalentShow | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return {
      showName: trimmed,
      nickname: trimmed,
      network: undefined,
      imdbSeriesId: undefined,
      tmdbId: undefined,
      seasons: [],
    };
  }

  private serializeShowForStorage(show: RealiteaseTalentShow): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    if (show.showName) payload.showName = show.showName;
    if (show.nickname) payload.showNickname = show.nickname;
    if (show.network) payload.network = show.network;
    if (show.imdbSeriesId) payload.imdbSeriesId = show.imdbSeriesId;
    if (show.tmdbId) payload.tmdbId = show.tmdbId;
    if (Array.isArray(show.seasons) && show.seasons.length) payload.seasons = show.seasons;
    if (show.episodeCount !== undefined) payload.episodeCount = show.episodeCount;
    return payload;
  }

  private cleanGuessInfo(info: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(info).filter(([, value]) => value !== undefined && value !== null),
    );
  }

  private removeUndefinedDeep<T>(value: T): T {
    if (value === undefined) {
      return value;
    }

    if (value === null) {
      return value;
    }

    if (value instanceof Timestamp || value instanceof Date) {
      return value;
    }

    if (Array.isArray(value)) {
      const sanitized = value
        .map((entry) => this.removeUndefinedDeep(entry))
        .filter((entry) => entry !== undefined);
      return sanitized as unknown as T;
    }

    if (typeof value === "object") {
      const prototype = Object.getPrototypeOf(value);
      const isPlainObject = prototype === Object.prototype || prototype === null;
      if (!isPlainObject) {
        return value;
      }

      const result: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
        const sanitizedEntry = this.removeUndefinedDeep(entry);
        if (sanitizedEntry !== undefined) {
          result[key] = sanitizedEntry;
        }
      });
      return result as unknown as T;
    }

    return value;
  }

  private normalizeStringArray(value: unknown): string[] {
    const results: string[] = [];
    const addValue = (entry: unknown) => {
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed.length > 0) {
          results.push(trimmed);
        }
      }
    };

    const iterate = (source: unknown) => {
      if (!source) return;
      if (Array.isArray(source)) {
        source.forEach((item) => {
          if (typeof item === "string") {
            addValue(item);
          } else if (item && typeof item === "object") {
            Object.values(item as Record<string, unknown>).forEach(addValue);
          }
        });
      } else if (typeof source === "object") {
        Object.values(source as Record<string, unknown>).forEach(addValue);
      } else {
        addValue(source);
      }
    };

    iterate(value);
    return Array.from(new Set(results));
  }

  private extractNumberField(...values: unknown[]): number | null {
    for (const value of values) {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const parsed = Number.parseFloat(trimmed);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private extractAnswerRecord(
    data: Record<string, unknown>,
  ): { record: Record<string, unknown>; sourceKey?: string } {
    const candidateEntries = Object.entries(data).filter(([, value]) =>
      value && typeof value === "object" && !Array.isArray(value),
    ) as Array<[string, Record<string, unknown>]>;

    for (const [key, value] of candidateEntries) {
      const potentialId = this.extractStringField(
        value.castId,
        value.castID,
        value.CastID,
        value.imdbCastId,
        value.imdbCastID,
        value.imdbID,
        value.talentId,
        value.talentID,
        value.id,
        key,
      );
      if (potentialId) {
        return { record: value, sourceKey: key };
      }
    }

    return { record: data };
  }

  private toNumberArray(source: unknown): number[] {
    if (!source) return [];
    const numbers: number[] = [];
    const handleValue = (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        numbers.push(value);
      } else if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) numbers.push(parsed);
      }
    };
    if (Array.isArray(source)) {
      source.forEach(handleValue);
    } else if (typeof source === "object") {
      Object.values(source as Record<string, unknown>).forEach(handleValue);
    } else {
      handleValue(source);
    }
    return Array.from(new Set(numbers));
  }

  private computeDerivedFields(baseInfo: Record<string, unknown>): RealiteaseGuessDerived {
    const castId = this.extractStringField(
      baseInfo?.CastID,
      baseInfo?.castId,
      baseInfo?.imdbCastId,
      baseInfo?.imdbID,
      baseInfo?.IMDbCastID,
      baseInfo?.castID,
    );
    const talent = this.lookupTalent(castId ?? null);
    return this.buildDerivedFromTalent(talent, baseInfo, castId ?? undefined);
  }

  private extractStringField(...values: unknown[]): string | null {
    for (const value of values) {
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
    return null;
  }
}

export function useRealiteaseManager() {
  return RealiteaseManager.getInstance();
}

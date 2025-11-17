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
  BRAVODLE_BOARD_COLUMNS,
  BRAVODLE_DEFAULT_USER_ANALYTICS,
  type RawBravodleGuess,
  type BravodleAnalyticsDoc,
  type BravodleBoardColumnKey,
  type BravodleDailyDoc,
  type BravodleGameSnapshot,
  type BravodleGuess,
  type BravodleGuessDerived,
  type BravodleGuessField,
  type BravodleGuessVerdict,
  type BravodleStatsSummary,
  type BravodleTalentRecord,
  type BravodleTalentShow,
  type BravodleAnswerKeyRecord,
  type BravodleWwhlAppearance,
} from "./types";
import { getBravodleDateKey } from "./utils";

const USER_ANALYTICS_COLLECTION = "user_analytics";
const USER_STATS_SUBCOLLECTION = "bravodle_userstats";
const GLOBAL_ANALYTICS_COLLECTION = "bravodle_analytics";
const TALENT_COLLECTION = "realitease_talent";
const ANSWERKEY_COLLECTION = "bravodle_answerkey";
const MAX_GUESSES = 8;

type AnswerContext = {
  talent: BravodleTalentRecord | null;
  derived: BravodleGuessDerived | null;
};

type ShowMatchDetail = {
  guessShow: BravodleTalentShow;
  answerShow: BravodleTalentShow;
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
  talent: BravodleTalentRecord;
  gameDate?: string;
}

interface SubscribeParams {
  uid: string;
  gameDate?: string;
  onChange: (snapshot: BravodleGameSnapshot | null) => void;
}

export class BravodleManager {
  private static instance: BravodleManager;
  private static talentCache: BravodleTalentRecord[] | null = null;
  private static talentCachePromise: Promise<BravodleTalentRecord[]> | null = null;
  private static talentCacheMap: Map<string, BravodleTalentRecord> | null = null;
  private static puzzleIndexMap: Map<string, number> | null = null;
  private static puzzleIndexPromise: Promise<Map<string, number>> | null = null;

  private constructor(private readonly firestore: Firestore) {}

  static getInstance(): BravodleManager {
    if (!BravodleManager.instance) {
      BravodleManager.instance = new BravodleManager(db);
    }
    return BravodleManager.instance;
  }

  async startGame({ uid, gameDate = getBravodleDateKey() }: StartGameParams): Promise<BravodleGameSnapshot> {
    if (!uid) throw new Error("BravodleManager.startGame requires a user id");

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

  async getTalentIndex(forceRefresh = false): Promise<BravodleTalentRecord[]> {
    if (!forceRefresh && BravodleManager.talentCache) {
      return BravodleManager.talentCache;
    }

    if (!forceRefresh && BravodleManager.talentCachePromise) {
      return BravodleManager.talentCachePromise;
    }

    const fetchPromise = (async () => {
      const talentSnap = await getDocs(collection(this.firestore, TALENT_COLLECTION));
      const talents: BravodleTalentRecord[] = [];

      talentSnap.forEach((docSnap) => {
        const raw = docSnap.data() ?? {};
        const bravodleEligible = this.isBravodleEligible(raw as Record<string, unknown>);
        const metadata = {
          ...raw,
          __bravodleEligible: bravodleEligible,
        } as Record<string, unknown>;

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
          metadata,
        });
      });

      talents.sort((a, b) => a.name.localeCompare(b.name));
      const map = new Map<string, BravodleTalentRecord>();
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
      BravodleManager.talentCacheMap = map;
      BravodleManager.talentCache = talents;
      BravodleManager.talentCachePromise = null;
      return talents;
    })();

    BravodleManager.talentCachePromise = fetchPromise;
    return fetchPromise;
  }

  async getPuzzleNumber(puzzleDate: string): Promise<string> {
    const index = await this.getPuzzleIndex(puzzleDate);
    return String(index).padStart(3, "0");
  }

  private async getAnswerKey(puzzleDate: string): Promise<BravodleAnswerKeyRecord | null> {
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
    answerKey: BravodleAnswerKeyRecord | null;
    talent: BravodleTalentRecord | null;
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

    const resolvedAnswerKey: BravodleAnswerKeyRecord = {
      ...answerKey,
      castName:
        answerKey.castName && answerKey.castName.trim().length > 0
          ? answerKey.castName
          : talentMatch?.name ?? answerKey.castId,
      imageUrl: answerKey.imageUrl ?? talentMatch?.imageUrl,
    };

    return { answerKey: resolvedAnswerKey, talent: talentMatch ?? null };
  }

  async updateGameStatus({ uid, gameDate = getBravodleDateKey() }: StartGameParams): Promise<BravodleGameSnapshot | null> {
    if (!uid) throw new Error("BravodleManager.updateGameStatus requires a user id");

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

  subscribeToGame({ uid, gameDate = getBravodleDateKey(), onChange }: SubscribeParams): Unsubscribe {
    if (!uid) throw new Error("BravodleManager.subscribeToGame requires a user id");
    const dailyRef = this.getDailyDocRef(uid, gameDate);

    let cachedContextPromise: Promise<{ answerKey: BravodleAnswerKeyRecord | null; talent: BravodleTalentRecord | null }> | null = null;

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

  async markGameStarted(uid: string, gameDate = getBravodleDateKey()): Promise<void> {
    const dailyRef = this.getDailyDocRef(uid, gameDate);
    await updateDoc(dailyRef, { updatedAt: serverTimestamp() });
  }

  async submitGuess({ uid, talent, gameDate = getBravodleDateKey() }: SubmitGuessParams): Promise<void> {
    if (!uid) throw new Error("BravodleManager.submitGuess requires a user id");
    if (!talent) throw new Error("BravodleManager.submitGuess requires a talent record");

    const puzzleDate = gameDate;
    const dailyRef = this.getDailyDocRef(uid, puzzleDate);
    const { answerKey, talent: answerTalent } = await this.getPuzzleContext(puzzleDate);

    await runTransaction(this.firestore, async (transaction) => {
      const snapshot = await transaction.get(dailyRef);
      const existingData = snapshot.exists() ? ((snapshot.data() ?? {}) as Partial<BravodleDailyDoc>) : null;
      const guesses: RawBravodleGuess[] = Array.isArray(existingData?.guesses)
        ? [...(existingData?.guesses as RawBravodleGuess[])]
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

  async getUserStatsSummary(
    uid: string,
    options: { excludePuzzleDate?: string } = {},
  ): Promise<BravodleStatsSummary> {
    if (!uid) throw new Error("BravodleManager.getUserStatsSummary requires a user id");

    const { excludePuzzleDate } = options;

    const statsRef = collection(this.firestore, USER_ANALYTICS_COLLECTION, uid, USER_STATS_SUBCOLLECTION);
    const snapshot = await getDocs(statsRef);

    const entries: Array<{
      puzzleDate: string;
      guesses: RawBravodleGuess[];
      guessNumberSolved: number | null;
      gameCompleted: boolean;
    }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() ?? {};
      const puzzleDateRaw = typeof data.puzzleDate === "string" ? data.puzzleDate : null;
      const puzzleDate = puzzleDateRaw && puzzleDateRaw.trim().length > 0 ? puzzleDateRaw : docSnap.id;
      if (!puzzleDate || typeof puzzleDate !== "string") return;

      const guessesRaw = Array.isArray(data.guesses) ? data.guesses : [];
      const guesses = guessesRaw.filter((guess): guess is RawBravodleGuess => Boolean(guess));
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
      if (excludePuzzleDate && entry.puzzleDate === excludePuzzleDate) {
        return;
      }
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

  private async getPuzzleIndex(puzzleDate: string): Promise<number> {
    const map = await this.getPuzzleIndexMap();
    if (map.has(puzzleDate)) {
      return map.get(puzzleDate)!;
    }
    const values = Array.from(map.values());
    return values.length ? Math.max(...values) + 1 : 1;
  }

  private async getPuzzleIndexMap(): Promise<Map<string, number>> {
    if (BravodleManager.puzzleIndexMap) {
      return BravodleManager.puzzleIndexMap;
    }

    if (BravodleManager.puzzleIndexPromise) {
      return BravodleManager.puzzleIndexPromise;
    }

    const promise = (async () => {
      const snapshot = await getDocs(collection(this.firestore, ANSWERKEY_COLLECTION));
      const entries = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data() ?? {};
        const asRecord = raw as Record<string, unknown>;
        const explicit = this.extractStringField(asRecord.puzzleDate);
        const normalized = explicit ?? docSnap.id;
        return { id: docSnap.id, key: normalized };
      });

      entries.sort((a, b) => a.key.localeCompare(b.key));

      const map = new Map<string, number>();
      entries.forEach((entry, index) => {
        const position = index + 1;
        map.set(entry.id, position);
        if (!map.has(entry.key)) {
          map.set(entry.key, position);
        }
      });

      BravodleManager.puzzleIndexMap = map;
      BravodleManager.puzzleIndexPromise = null;
      return map;
    })();

    BravodleManager.puzzleIndexPromise = promise;
    return promise;
  }

  private async ensureUserAnalyticsDoc(uid: string) {
    const userDocRef = this.getUserAnalyticsDocRef(uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) return;

    await setDoc(userDocRef, {
      bravodle_currentStreak: BRAVODLE_DEFAULT_USER_ANALYTICS.currentStreak,
      bravodle_longestStreak: BRAVODLE_DEFAULT_USER_ANALYTICS.longestStreak,
      bravodle_puzzlesWon: BRAVODLE_DEFAULT_USER_ANALYTICS.puzzlesWon,
      bravodle_puzzlesAttempted: BRAVODLE_DEFAULT_USER_ANALYTICS.puzzlesAttempted,
      bravodle_averageGuesses: BRAVODLE_DEFAULT_USER_ANALYTICS.averageGuesses,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  private async ensureGlobalAnalyticsDoc(date: string) {
    const analyticsRef = this.getGlobalAnalyticsDocRef(date);
    const snap = await getDoc(analyticsRef);
    if (snap.exists()) return;

    const defaultDoc: BravodleAnalyticsDoc = {
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
    answerKey: BravodleAnswerKeyRecord | null,
    talent: BravodleTalentRecord | null,
  ): BravodleGameSnapshot {
    const data = raw as Partial<BravodleDailyDoc>;

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
    rawGuess: RawBravodleGuess,
    index: number,
    answerContext: AnswerContext,
  ): BravodleGuess {
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

    const fields: BravodleGuessField[] = BRAVODLE_BOARD_COLUMNS.map(({ key, label }) =>
      this.buildFieldForColumn(key, label, guessName, derived, answerContext),
    );
    // Extra optional field for UI toggle
    fields.push(this.buildFieldForColumn("zodiac", "ZODIAC", guessName, derived, answerContext));

    return {
      guessNumber,
      castName: guessName,
      submittedAt: rawGuess.submittedAt ?? rawGuess.createdAt ?? null,
      fields,
      derived,
    };
  }

  private buildFieldForColumn(
    key: BravodleBoardColumnKey,
    label: string,
    guessName: string,
    guessDerived: BravodleGuessDerived,
    answerContext: AnswerContext,
  ): BravodleGuessField {
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
      case "zodiac":
        return this.evaluateZodiacField(label, guessDerived, answerDerived);
      case "shows":
        return this.evaluateShowsField(label, guessDerived, answerContext);
      case "episodes":
        return this.evaluateEpisodesField(label, guessDerived, answerContext);
      case "wwhl":
        return this.evaluateWwhlField(label, guessDerived, answerContext);
      default:
        return { key, label, value: "—", verdict: "unknown" };
    }
  }

  private evaluateGenderField(
    label: string,
    guessDerived: BravodleGuessDerived,
    answerDerived: BravodleGuessDerived | null,
  ): BravodleGuessField {
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
    guessDerived: BravodleGuessDerived,
    answerDerived: BravodleGuessDerived | null,
  ): BravodleGuessField {
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

  private evaluateZodiacField(
    label: string,
    guessDerived: BravodleGuessDerived,
    answerDerived: BravodleGuessDerived | null,
  ): BravodleGuessField {
    const guessZ = this.normalizeZodiac(guessDerived.zodiac ?? null);
    const answerZ = this.normalizeZodiac(answerDerived?.zodiac ?? null);
    if (!guessZ) return { key: "zodiac", label, value: "—", verdict: "unknown" };
    if (!answerZ) return { key: "zodiac", label, value: guessZ, verdict: "unknown" };
    return { key: "zodiac", label, value: guessZ, verdict: guessZ === answerZ ? "correct" : "incorrect" };
  }


  private evaluateShowsField(
    label: string,
    guessDerived: BravodleGuessDerived,
    answerContext: AnswerContext,
  ): BravodleGuessField {
    const guessShows = guessDerived.shows ?? [];
    const answerShows = answerContext.talent?.shows ?? answerContext.derived?.shows ?? [];

    if (!guessShows.length) {
      return { key: "shows", label, value: "—", verdict: "unknown" };
    }

    if (!answerShows.length) {
      return { key: "shows", label, value: "—", verdict: "unknown" };
    }

    const matches = this.findShowMatches(guessShows, answerShows);
    if (!matches.length) {
      return {
        key: "shows",
        label,
        value: "",
        verdict: "incorrect",
      };
    }

    const bestMatch = this.selectBestShowMatch(matches);
    const display = this.describeSharedShow(bestMatch) ?? this.formatShowDisplay(bestMatch.answerShow ?? bestMatch.guessShow);
    const isBravo = this.isBravoNetwork(this.resolveMatchNetwork(bestMatch));
    const verdict: BravodleGuessVerdict = bestMatch.shareSeason
      ? isBravo
        ? "correct"
        : "multi"
      : "partial";

    return {
      key: "shows",
      label,
      value: display ?? "—",
      verdict,
    };
  }

private evaluateEpisodesField(
  label: string,
  guessDerived: BravodleGuessDerived,
  answerContext: AnswerContext,
): BravodleGuessField {
  const guessCount = this.resolveBravoEpisodeCount(guessDerived);
  const answerCount = this.resolveBravoEpisodeCount(answerContext.derived);

  if (guessCount === null) {
    return {
      key: "episodes",
      label,
      value: answerCount === null ? "—" : "0",
      verdict: answerCount === null ? "unknown" : "incorrect",
    };
  }

  const value = String(Math.round(guessCount));

  if (answerCount === null) {
    return {
      key: "episodes",
      label,
      value,
      verdict: "unknown",
    };
  }

  const diff = Math.abs(guessCount - answerCount);
  if (diff === 0) {
    return { key: "episodes", label, value, verdict: "correct" };
  }

  if (diff <= 5) {
    return { key: "episodes", label, value, verdict: "partial" };
  }

  return { key: "episodes", label, value, verdict: "incorrect" };
}

  private evaluateWwhlField(
    label: string,
    guessDerived: BravodleGuessDerived,
    answerContext: AnswerContext,
  ): BravodleGuessField {
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

  private lookupTalent(identifier: string | null): BravodleTalentRecord | null {
    if (!identifier) return null;
    const normalized = identifier.trim().toLowerCase();
    if (!normalized) return null;

    if (!BravodleManager.talentCacheMap) {
      const map = new Map<string, BravodleTalentRecord>();
      (BravodleManager.talentCache ?? []).forEach((talent) => {
        map.set(talent.id.toLowerCase(), talent);
        if (talent.imdbId) {
          map.set(talent.imdbId.toLowerCase(), talent);
        }
        map.set(talent.name.toLowerCase(), talent);
        talent.alternativeNames.forEach((alt) => {
          map.set(alt.toLowerCase(), talent);
        });
      });
      BravodleManager.talentCacheMap = map;
    }

    const cacheMap = BravodleManager.talentCacheMap;
    if (!cacheMap) return null;

    return cacheMap.get(normalized) ?? null;
  }

  private buildDerivedFromTalent(
    talent: BravodleTalentRecord | null,
    baseInfo: Record<string, unknown> = {},
    fallbackCastId?: string,
    referenceDate?: string,
  ): BravodleGuessDerived {
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
    const bravoEpisodeCount = this.computeBravoEpisodeCount(shows);

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
      bravoEpisodeCount: bravoEpisodeCount ?? null,
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

  private collectNetworks(baseInfo: Record<string, unknown>, shows: BravodleTalentShow[]): string[] {
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

  private isBravodleEligible(record: Record<string, unknown>): boolean {
    const direct = record.bravodle ?? record.Bravodle ?? record.bravodleEligible ?? record.BravodleEligible;
    if (typeof direct === "boolean") {
      return direct;
    }
    if (typeof direct === "number") {
      return direct !== 0;
    }
    if (typeof direct === "string") {
      const normalized = direct.trim().toLowerCase();
      if (!normalized) return false;
      if (["true", "yes", "1"].includes(normalized)) return true;
      if (["false", "no", "0"].includes(normalized)) return false;
    }

    const gamesSources = [record.games, record.Games, record.gameModes, record.GameModes, record.availableGames];
    for (const source of gamesSources) {
      const list = this.normalizeStringArray(source);
      if (list.some((entry) => entry.toLowerCase() === "bravodle")) {
        return true;
      }
    }

    return false;
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

  private collectGuessShows(baseInfo: Record<string, unknown>): BravodleTalentShow[] {
    const sources: unknown[] = [
      baseInfo.shows,
      baseInfo.Shows,
      baseInfo.show,
      baseInfo.Show,
      baseInfo.appearances,
      baseInfo.Appearances,
    ];

    const shows: BravodleTalentShow[] = [];
    sources.forEach((source) => {
      if (!source) return;
      shows.push(...this.normalizeGuessShows(source));
    });
    return shows;
  }

  private mergeShowLists(shows: BravodleTalentShow[]): BravodleTalentShow[] {
    const merged: BravodleTalentShow[] = [];
    const seen = new Set<string>();

    shows.forEach((show) => {
      const key = this.showKey(show);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(show);
    });

    return merged;
  }

  private showKey(show: BravodleTalentShow): string {
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

  private computeBravoEpisodeCount(shows: BravodleTalentShow[]): number | null {
    let total = 0;
    let hasValue = false;
    shows.forEach((show) => {
      if (!show) return;
      if (!this.isBravoNetwork(show.network)) return;
      const count = this.normalizeEpisodeCount(show.episodeCount);
      if (count === null) return;
      total += count;
      hasValue = true;
    });
    return hasValue ? total : null;
  }

  private formatShowDisplay(show: BravodleTalentShow | null | undefined): string {
    if (!show) return "—";
    if (show.nickname && show.nickname.trim().length > 0) return show.nickname.trim();
    if (show.showName && show.showName.trim().length > 0) return show.showName.trim();
    return "—";
  }

  private findShowMatches(
    guessShows: BravodleTalentShow[],
    answerShows: BravodleTalentShow[],
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

  private describeSharedShow(match: ShowMatchDetail): string {
    return match.display ?? this.formatShowDisplay(match.answerShow ?? match.guessShow);
  }

  private resolveMatchNetwork(match: ShowMatchDetail): string | null {
    return match.answerShow?.network ?? match.guessShow?.network ?? match.networkLabel ?? null;
  }

  private isBravoNetwork(network: string | null | undefined): boolean {
    if (typeof network !== "string") return false;
    const normalized = network.trim().toLowerCase();
    if (!normalized) return false;
    return normalized.includes("bravo");
  }

  private selectBestShowMatch(matches: ShowMatchDetail[]): ShowMatchDetail {
    return matches.reduce((best, current) => {
      if (!best) return current;

      if (current.shareSeason !== best.shareSeason) {
        return current.shareSeason ? current : best;
      }

      if ((current.sharedEpisodeCount ?? 0) !== (best.sharedEpisodeCount ?? 0)) {
        return (current.sharedEpisodeCount ?? 0) > (best.sharedEpisodeCount ?? 0) ? current : best;
      }

      if ((current.sharedSeasonCount ?? 0) !== (best.sharedSeasonCount ?? 0)) {
        return (current.sharedSeasonCount ?? 0) > (best.sharedSeasonCount ?? 0) ? current : best;
      }

      if ((current.maxEpisodeCount ?? 0) !== (best.maxEpisodeCount ?? 0)) {
        return (current.maxEpisodeCount ?? 0) > (best.maxEpisodeCount ?? 0) ? current : best;
      }

      if ((current.maxSeasonCount ?? 0) !== (best.maxSeasonCount ?? 0)) {
        return (current.maxSeasonCount ?? 0) > (best.maxSeasonCount ?? 0) ? current : best;
      }

      const currentDisplay = current.display ?? this.describeSharedShow(current) ?? "";
      const bestDisplay = best.display ?? this.describeSharedShow(best) ?? "";
      return currentDisplay.localeCompare(bestDisplay, undefined, { sensitivity: "base" }) < 0 ? current : best;
    });
  }

  private buildShowMatchIdentifier(detail: ShowMatchDetail): string {
    const answerKey = detail.answerShow ? this.showKey(detail.answerShow) : "";
    const guessKey = detail.guessShow ? this.showKey(detail.guessShow) : "";
    return `${answerKey}|${guessKey}|${detail.shareSeason ? "season" : "show"}`;
  }

  private showsAreSame(a: BravodleTalentShow, b: BravodleTalentShow): boolean {
    const imdbMatch = a.imdbSeriesId && b.imdbSeriesId && a.imdbSeriesId === b.imdbSeriesId;
    const tmdbMatch = a.tmdbId && b.tmdbId && a.tmdbId === b.tmdbId;
    const nameMatch =
      (a.nickname && b.nickname && this.normalizeShowName(a.nickname) === this.normalizeShowName(b.nickname)) ||
      (a.showName && b.showName && this.normalizeShowName(a.showName) === this.normalizeShowName(b.showName));

    return Boolean(imdbMatch || tmdbMatch || nameMatch);
  }

  private resolveWwhlCount(derived?: BravodleGuessDerived | null): number | null {
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

  private resolveBravoEpisodeCount(derived?: BravodleGuessDerived | null): number | null {
    if (!derived) return null;
    const value = derived.bravoEpisodeCount;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (value === 0) {
      return 0;
    }
    return null;
  }

  private isWinningGuess(
    guessTalent: BravodleTalentRecord,
    answerKey: BravodleAnswerKeyRecord | null,
    answerTalent: BravodleTalentRecord | null,
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

  private buildTalentTokenSet(talent: BravodleTalentRecord): Set<string> {
    const tokens = new Set<string>();
    this.collectToken(tokens, talent.id);
    this.collectToken(tokens, talent.imdbId);
    this.collectToken(tokens, talent.name);
    talent.alternativeNames.forEach((alt) => this.collectToken(tokens, alt));
    return tokens;
  }

  private buildAnswerTokenSet(
    answerKey: BravodleAnswerKeyRecord | null,
    answerTalent: BravodleTalentRecord | null,
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
    talent: BravodleTalentRecord;
    derived: BravodleGuessDerived;
    isCorrect: boolean;
    answerTalent: BravodleTalentRecord | null;
    submittedAt: Timestamp;
  }): RawBravodleGuess {
    const { puzzleDate, guessNumber, talent, derived, isCorrect, answerTalent, submittedAt } = params;

    const showsPayload = Array.isArray(derived.shows)
      ? derived.shows.map((show) => this.serializeShowForStorage(show))
      : [];

    const answerDerived = answerTalent
      ? this.buildDerivedFromTalent(answerTalent, answerTalent.metadata ?? {}, answerTalent.id)
      : null;

    const fields = BRAVODLE_BOARD_COLUMNS.map(({ key, label }) =>
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

    const payload: RawBravodleGuess = {
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

  private mergeWwhlAppearances(appearances: BravodleWwhlAppearance[]): BravodleWwhlAppearance[] {
    const merged: BravodleWwhlAppearance[] = [];
    const seen = new Set<string>();

    appearances.forEach((appearance) => {
      const key = this.serializeWwhlAppearance(appearance);
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(appearance);
    });

    return merged;
  }

  private serializeWwhlAppearance(appearance: BravodleWwhlAppearance): string {
    const keys = this.wwhlKeys(appearance);
    if (keys.length > 0) {
      return keys[0];
    }
    return JSON.stringify(appearance);
  }

  private wwhlKeys(appearance: BravodleWwhlAppearance): string[] {
    const keys: string[] = [];
    if (appearance.episodeId) {
      keys.push(`episode:${appearance.episodeId.trim().toLowerCase()}`);
    }
    if (appearance.airDate) {
      keys.push(`date:${appearance.airDate.trim().toLowerCase()}`);
    }
    return keys;
  }

  private normalizeEpisodeId(value: string | null | undefined): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.toLowerCase();
  }

  private normalizeWwhlFromGuess(baseInfo: Record<string, unknown>): BravodleWwhlAppearance[] {
    const sources: unknown[] = [
      baseInfo.wwhlAppearances,
      baseInfo.WwhlAppearances,
      baseInfo.wwhlEpisodes,
      baseInfo.WwhlEpisodes,
      baseInfo.wwhl,
      baseInfo.WWHL,
    ];

    const appearances: BravodleWwhlAppearance[] = [];

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
    guessEpisodes: BravodleWwhlAppearance[],
    answerEpisodes: BravodleWwhlAppearance[],
  ): BravodleWwhlAppearance[] {
    if (!guessEpisodes.length || !answerEpisodes.length) return [];

    const answerMap = new Map<string, BravodleWwhlAppearance>();
    answerEpisodes.forEach((appearance) => {
      const episodeKey = this.normalizeEpisodeId(appearance.episodeId);
      if (episodeKey && !answerMap.has(episodeKey)) {
        answerMap.set(episodeKey, appearance);
      }
    });

    const matches: BravodleWwhlAppearance[] = [];

    guessEpisodes.forEach((guessAppearance) => {
      const episodeKey = this.normalizeEpisodeId(guessAppearance.episodeId);
      if (!episodeKey) return;
      const answerMatch = answerMap.get(episodeKey);
      if (answerMatch) {
        matches.push(this.mergeWwhlAppearance(guessAppearance, answerMatch));
      }
    });

    return matches;
  }

  private mergeWwhlAppearance(
    guess: BravodleWwhlAppearance,
    answer: BravodleWwhlAppearance,
  ): BravodleWwhlAppearance {
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

  private formatWwhlDisplay(appearance: BravodleWwhlAppearance): string {
    if (appearance.airDate && appearance.airDate.trim().length > 0) {
      return appearance.airDate.trim();
    }
    if (appearance.episodeId && appearance.episodeId.trim().length > 0) {
      return appearance.episodeId.trim();
    }
    return "YES";
  }

  private extractVerdicts(rawGuess: RawBravodleGuess): Record<BravodleBoardColumnKey, BravodleGuessVerdict> {
    const source =
      rawGuess?.evaluations ?? rawGuess?.verdicts ?? rawGuess?.fields ?? (rawGuess as { verdictMap?: unknown }).verdictMap;

    if (!source || typeof source !== "object") {
      return {} as Record<BravodleBoardColumnKey, BravodleGuessVerdict>;
    }

    const verdictMap: Partial<Record<BravodleBoardColumnKey, BravodleGuessVerdict>> = {};

    BRAVODLE_BOARD_COLUMNS.forEach(({ key }) => {
      const rawVerdict = (source as Record<string, unknown>)[key];
      if (typeof rawVerdict === "string") {
        verdictMap[key] = this.normalizeVerdict(rawVerdict);
        return;
      }

      if (typeof rawVerdict === "boolean") {
        verdictMap[key] = rawVerdict ? "correct" : "incorrect";
      }
    });

    return verdictMap as Record<BravodleBoardColumnKey, BravodleGuessVerdict>;
  }

  private normalizeVerdict(value: string): BravodleGuessVerdict {
    const normalized = value.toLowerCase();
    if (["correct", "match", "exact", "right"].includes(normalized)) return "correct";
    if (["partial", "close", "present", "offbyone"].includes(normalized)) return "partial";
    if (["incorrect", "wrong", "miss", "no"].includes(normalized)) return "incorrect";
    return "unknown";
  }

  private normalizeTalentShows(source: unknown): BravodleTalentRecord["shows"] {
    if (!Array.isArray(source)) return [];
    return source
      .map((item) => (item && typeof item === "object" ? this.buildShowObject(item as Record<string, unknown>) : null))
      .filter((value): value is BravodleTalentRecord["shows"][number] => value !== null);
  }

  private normalizeGuessShows(source: unknown): BravodleTalentRecord["shows"] {
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
        .filter((value): value is BravodleTalentRecord["shows"][number] => value !== null);
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
        .filter((value): value is BravodleTalentRecord["shows"][number] => value !== null);
    }
    return [];
  }

  private normalizeWwhlAppearances(source: unknown): {
    appearances: BravodleTalentRecord["wwhlAppearances"];
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

        const appearance: BravodleTalentRecord["wwhlAppearances"][number] = {};
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
      .filter((value): value is BravodleTalentRecord["wwhlAppearances"][number] => value !== null);

    return { appearances, totalAppearances };
  }

  private buildShowObject(record: Record<string, unknown>): BravodleTalentShow | null {
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

  private buildShowFromString(value: string): BravodleTalentShow | null {
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

  private serializeShowForStorage(show: BravodleTalentShow): Record<string, unknown> {
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

  private computeDerivedFields(baseInfo: Record<string, unknown>): BravodleGuessDerived {
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

export function useBravodleManager() {
  return BravodleManager.getInstance();
}

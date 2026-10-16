import "server-only";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { addIdentityToken, buildIdentityVariants } from "@/lib/games/identity";

export type GameCompletionEvent = { game: "bravodle" | "realitease"; puzzleDate: string; guessIds: string[] };
export class InvalidGameCompletion extends Error {}

export function parseGameCompletion(value: unknown): GameCompletionEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidGameCompletion("Invalid completion event");
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["game", "puzzleDate", "guessIds"].includes(key)) ||
      (body.game !== "bravodle" && body.game !== "realitease") ||
      typeof body.puzzleDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.puzzleDate) ||
      (!Number.isFinite(Date.parse(`${body.puzzleDate}T00:00:00Z`)) || new Date(`${body.puzzleDate}T00:00:00Z`).toISOString().slice(0, 10) !== body.puzzleDate) ||
      !Array.isArray(body.guessIds) || body.guessIds.length < 1 || body.guessIds.length > 8 ||
      body.guessIds.some((id) => typeof id !== "string" || id.length < 1 || id.length > 200 || id.includes("/"))) {
    throw new InvalidGameCompletion("Invalid completion event");
  }
  return body as GameCompletionEvent;
}

const idFields = ["castId", "castID", "CastID", "imdbCastId", "imdbCastID", "imdbID", "imdbId", "talentId", "talentID", "id"];
const nameFields = ["castName", "CastName", "name", "Name", "displayName", "talentName", "fullName"];
function tokens(record: Record<string, unknown>, extra?: string): Set<string> {
  const result = new Set<string>();
  [...idFields, ...nameFields].forEach((key) => {
    addIdentityToken(result, record[key]);
  });
  [record.alternativeNames, record.aliases].forEach((aliases) => {
    if (Array.isArray(aliases)) aliases.forEach((alias) => addIdentityToken(result, alias));
  });
  addIdentityToken(result, extra);
  result.delete("");
  return result;
}
function answerRecord(data: Record<string, unknown>): { record: Record<string, unknown>; key?: string } {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && !Array.isArray(value)) return { record: value as Record<string, unknown>, key };
  }
  return { record: data };
}
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;

export async function recordGameCompletion(db: Firestore, uid: string, event: GameCompletionEvent) {
  const aggregateRef = db.collection(`${event.game}_analytics`).doc(event.puzzleDate);
  const receiptRef = aggregateRef.collection("completion_receipts").doc(uid);
  const answerRef = db.collection(`${event.game}_answerkey`).doc(event.puzzleDate);
  const roster = db.collection("realitease_talent");
  return db.runTransaction(async (transaction) => {
    // Every read precedes every write; the receipt and aggregate commit together.
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return { ok: true, duplicate: true };
    const answer = await transaction.get(answerRef);
    const aggregate = await transaction.get(aggregateRef);
    const talent = await transaction.get(roster);
    if (!answer.exists) throw new InvalidGameCompletion("Puzzle answer unavailable");
    const { record, key } = answerRecord(answer.data() ?? {});
    const answerTokens = tokens(record, key);
    const rosterTokens = new Map(talent.docs.map((doc) => [doc.id, tokens(doc.data(), doc.id)]));
    // Resolve one answer talent, matching the client's id/IMDb/name lookup order.
    const answerTalent = talent.docs.find((doc) => buildIdentityVariants(doc.id).some((token) => answerTokens.has(token)))
      ?? talent.docs.find((doc) => idFields.some((field) => buildIdentityVariants(doc.data()[field]).some((token) => answerTokens.has(token))))
      ?? talent.docs.find((doc) => [...tokens(doc.data())].some((token) => answerTokens.has(token)));
    if (answerTalent) rosterTokens.get(answerTalent.id)?.forEach((token) => answerTokens.add(token));
    const guesses = event.guessIds.map((id) => {
      const values = rosterTokens.get(id) ?? [...rosterTokens.values()].find((entry) => buildIdentityVariants(id).some((token) => entry.has(token)));
      if (!values) throw new InvalidGameCompletion("Unknown guess");
      return values;
    });
    const winningIndex = guesses.findIndex((values) => [...values].some((token) => answerTokens.has(token)));
    if (winningIndex >= 0 && winningIndex !== guesses.length - 1) throw new InvalidGameCompletion("Guesses continue after a win");
    if (winningIndex < 0 && guesses.length !== 8) throw new InvalidGameCompletion("Game is incomplete");
    const won = winningIndex >= 0;
    const data = aggregate.data() ?? {};
    const attempts = finite(data.totalAttempts);
    const totalGuesses = typeof data.totalGuesses === "number" ? finite(data.totalGuesses) : finite(data.averageGuesses) * attempts;
    const distribution: Record<string, number> = {};
    for (let index = 1; index <= 8; index++) distribution[String(index)] = finite(data.guessDistribution?.[String(index)]);
    if (won) distribution[String(guesses.length)] += 1;
    transaction.set(aggregateRef, {
      puzzleDate: event.puzzleDate, totalAttempts: attempts + 1,
      totalWins: finite(data.totalWins) + (won ? 1 : 0), totalGuesses: totalGuesses + guesses.length,
      averageGuesses: Number(((totalGuesses + guesses.length) / (attempts + 1)).toFixed(2)),
      guessDistribution: distribution, updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.create(receiptRef, { uid, ...event, won, guessCount: guesses.length, createdAt: FieldValue.serverTimestamp() });
    return { ok: true, duplicate: false };
  });
}

import { createClient } from "@/lib/supabase/client";
import type {
  FlashbackQuiz,
  FlashbackEvent,
  FlashbackSession,
  FlashbackPlacement,
  FlashbackUserStats,
} from "./types";

// ---------------------------------------------------------------------------
// The Supabase client is untyped (no generated DB types). We cast through
// `any` at the query boundary to avoid `never` inference on `.from()`.
// This is the same pattern used by supabase-trr-admin.ts in this codebase.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  const client = createClient();
  if (!client) {
    throw new Error("Supabase is not configured. Games require NEXT_PUBLIC_SUPABASE_URL.");
  }
  return client;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToday(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

const FLASHBACK_QUIZ_SELECT =
  "id,title,publish_date,description,is_published,created_at,updated_at";
const FLASHBACK_EVENT_SELECT =
  "id,quiz_id,description,image_url,year,sort_order,point_value";
const FLASHBACK_USER_STATS_SELECT =
  "user_id,games_played,total_points,perfect_scores,current_streak,max_streak";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapRpcSingleRow<T extends Record<string, unknown>>(raw: any): T | null {
  if (Array.isArray(raw)) {
    return raw.length > 0 && raw[0] && typeof raw[0] === "object"
      ? (raw[0] as T)
      : null;
  }
  return raw && typeof raw === "object" ? (raw as T) : null;
}

/** Fetch today's published quiz (or the most recent published quiz <= today). */
export async function getTodaysQuiz(): Promise<FlashbackQuiz | null> {
  const { data, error } = await db()
    .from("flashback_quizzes")
    .select(FLASHBACK_QUIZ_SELECT)
    .eq("is_published", true)
    .lte("publish_date", getToday())
    .order("publish_date", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" — not a hard error
    if (error.code === "PGRST116") return null;
    console.error("[flashback] getTodaysQuiz error", error);
    return null;
  }

  return data as FlashbackQuiz;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Fetch all events for a quiz, sorted by sort_order (chronological). */
export async function getQuizEvents(
  quizId: string,
): Promise<FlashbackEvent[]> {
  const { data, error } = await db()
    .from("flashback_events")
    .select(FLASHBACK_EVENT_SELECT)
    .eq("quiz_id", quizId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[flashback] getQuizEvents error", error);
    return [];
  }

  return (data ?? []) as FlashbackEvent[];
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

/** Find an existing session or create a new one. */
export async function getOrCreateSession(
  userId: string,
  quizId: string,
): Promise<FlashbackSession> {
  const { data, error } = await db().rpc("flashback_get_or_create_session", {
    p_user_id: userId,
    p_quiz_id: quizId,
  });
  const session = unwrapRpcSingleRow<Record<string, unknown>>(data);

  if (error || !session) {
    console.error("[flashback] getOrCreateSession rpc error", error);
    throw new Error("Failed to create Flashback session");
  }

  return normalizeSession(session);
}

/** Persist a placement and advance the session. */
export async function savePlacement(
  sessionId: string,
  placement: FlashbackPlacement,
  newScore: number,
  newRound: number,
  completed: boolean,
): Promise<void> {
  const { data, error } = await db().rpc("flashback_save_placement", {
    p_session_id: sessionId,
    p_placement: placement,
    p_new_score: newScore,
    p_new_round: newRound,
    p_completed: completed,
  });
  const session = unwrapRpcSingleRow<Record<string, unknown>>(data);

  if (error || !session) {
    console.error("[flashback] savePlacement rpc error", error);
    throw new Error("Failed to save placement");
  }
}

// ---------------------------------------------------------------------------
// User Stats
// ---------------------------------------------------------------------------

/** Upsert user stats after a game completes. */
export async function updateUserStats(
  userId: string,
  pointsEarned: number,
  isPerfect: boolean,
): Promise<void> {
  const { data, error } = await db().rpc("flashback_update_user_stats", {
    p_user_id: userId,
    p_points_earned: pointsEarned,
    p_is_perfect: isPerfect,
  });
  const stats = unwrapRpcSingleRow<Record<string, unknown>>(data);

  if (error || !stats) {
    console.error("[flashback] updateUserStats rpc error", error);
  }
}

/** Fetch user stats (returns null if no record exists). */
export async function getUserStats(
  userId: string,
): Promise<FlashbackUserStats | null> {
  const { data, error } = await db()
    .from("flashback_user_stats")
    .select(FLASHBACK_USER_STATS_SELECT)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[flashback] getUserStats error", error);
    return null;
  }

  return data as FlashbackUserStats;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSession(raw: any): FlashbackSession {
  return {
    id: raw.id as string,
    user_id: raw.user_id as string,
    quiz_id: raw.quiz_id as string,
    current_round: (raw.current_round as number) ?? 0,
    score: (raw.score as number) ?? 0,
    placements: Array.isArray(raw.placements)
      ? (raw.placements as FlashbackPlacement[])
      : [],
    completed: (raw.completed as boolean) ?? false,
    started_at: (raw.started_at as string) ?? new Date().toISOString(),
    completed_at: (raw.completed_at as string) ?? null,
  };
}

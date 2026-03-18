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
  return createClient();
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

/** Fetch today's published quiz (or the most recent published quiz <= today). */
export async function getTodaysQuiz(): Promise<FlashbackQuiz | null> {
  const { data, error } = await db()
    .from("flashback_quizzes")
    .select("*")
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
    .select("*")
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
  // Try to find an existing session for this user + quiz
  const { data: existing, error: selectError } = await db()
    .from("flashback_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .limit(1)
    .single();

  if (existing && !selectError) {
    return normalizeSession(existing);
  }

  // Create a fresh session
  const newSession = {
    user_id: userId,
    quiz_id: quizId,
    current_round: 0,
    score: 0,
    placements: [] as FlashbackPlacement[],
    completed: false,
  };

  const { data: created, error: insertError } = await db()
    .from("flashback_sessions")
    .insert(newSession)
    .select("*")
    .single();

  if (insertError || !created) {
    console.error("[flashback] getOrCreateSession insert error", insertError);
    throw new Error("Failed to create Flashback session");
  }

  return normalizeSession(created);
}

/** Persist a placement and advance the session. */
export async function savePlacement(
  sessionId: string,
  placement: FlashbackPlacement,
  newScore: number,
  newRound: number,
  completed: boolean,
): Promise<void> {
  // Fetch current placements so we can append
  const { data: session, error: fetchError } = await db()
    .from("flashback_sessions")
    .select("placements")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    console.error("[flashback] savePlacement fetch error", fetchError);
    throw new Error("Failed to fetch session for placement save");
  }

  const existingPlacements = Array.isArray(session.placements)
    ? session.placements
    : [];

  const updatedPlacements = [...existingPlacements, placement];

  const updatePayload: Record<string, unknown> = {
    placements: updatedPlacements,
    score: newScore,
    current_round: newRound,
    completed,
  };

  if (completed) {
    updatePayload.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await db()
    .from("flashback_sessions")
    .update(updatePayload)
    .eq("id", sessionId);

  if (updateError) {
    console.error("[flashback] savePlacement update error", updateError);
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
  // Fetch existing stats
  const { data: existing } = await db()
    .from("flashback_user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    const updates: Record<string, unknown> = {
      games_played: (existing.games_played ?? 0) + 1,
      total_points: (existing.total_points ?? 0) + pointsEarned,
      current_streak: (existing.current_streak ?? 0) + 1,
      max_streak: Math.max(
        (existing.max_streak ?? 0),
        (existing.current_streak ?? 0) + 1,
      ),
    };

    if (isPerfect) {
      updates.perfect_scores = (existing.perfect_scores ?? 0) + 1;
    }

    const { error } = await db()
      .from("flashback_user_stats")
      .update(updates)
      .eq("user_id", userId);

    if (error) {
      console.error("[flashback] updateUserStats update error", error);
    }
  } else {
    // Insert new stats row
    const { error } = await db().from("flashback_user_stats").insert({
      user_id: userId,
      games_played: 1,
      total_points: pointsEarned,
      perfect_scores: isPerfect ? 1 : 0,
      current_streak: 1,
      max_streak: 1,
    });

    if (error) {
      console.error("[flashback] updateUserStats insert error", error);
    }
  }
}

/** Fetch user stats (returns null if no record exists). */
export async function getUserStats(
  userId: string,
): Promise<FlashbackUserStats | null> {
  const { data, error } = await db()
    .from("flashback_user_stats")
    .select("*")
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

"use client";

import { useCallback, useRef, useState } from "react";
import type {
  FlashbackEvent,
  FlashbackGameState,
  FlashbackPlacement,
  FlashbackSession,
  TimelineCard,
} from "./types";
import {
  getTodaysQuiz,
  getQuizEvents,
  getOrCreateSession,
  savePlacement,
  updateUserStats,
  getUserStats,
} from "./supabase";
import { generateDealOrder, type DealOrderResult } from "./deal-order";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GamePhase =
  | "loading"
  | "ready"
  | "playing"
  | "confirming"
  | "revealing"
  | "completed";

export interface RoundResult {
  round: number;
  event: FlashbackEvent;
  placedPosition: number;
  correctPosition: number;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface FlashbackManagerState {
  phase: GamePhase;
  gameState: FlashbackGameState | null;
  timeline: TimelineCard[];
  currentCard: FlashbackEvent | null;
  currentRound: number;
  score: number;
  roundResults: RoundResult[];
  pendingPosition: number | null;
  error: string | null;
}

export interface FlashbackManagerActions {
  bootstrap: (userId: string) => Promise<void>;
  startGame: () => void;
  placeCard: (position: number) => void;
  repositionCard: (newPosition: number) => void;
  confirmPlacement: () => Promise<void>;
}

export type FlashbackManager = FlashbackManagerState & FlashbackManagerActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_ROUNDS = 8;
const COMPLETED_ROUND = TOTAL_ROUNDS + 1; // 9

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFlashbackManager(): FlashbackManager {
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [gameState, setGameState] = useState<FlashbackGameState | null>(null);
  const [timeline, setTimeline] = useState<TimelineCard[]>([]);
  const [currentCard, setCurrentCard] = useState<FlashbackEvent | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for values the callbacks need without re-rendering
  const dealOrderRef = useRef<DealOrderResult | null>(null);
  const sessionRef = useRef<FlashbackSession | null>(null);
  const eventsRef = useRef<FlashbackEvent[]>([]);
  const userIdRef = useRef<string>("");

  // -----------------------------------------------------------------------
  // bootstrap — load quiz, events, session, stats; restore if in-progress
  // -----------------------------------------------------------------------
  const bootstrap = useCallback(async (userId: string) => {
    try {
      setPhase("loading");
      setError(null);
      userIdRef.current = userId;

      // 1. Fetch today's quiz
      const quiz = await getTodaysQuiz();
      if (!quiz) {
        setError("No quiz available today. Check back later!");
        setPhase("ready");
        return;
      }

      // 2. Fetch quiz events
      const events = await getQuizEvents(quiz.id);
      if (events.length < 2) {
        setError("Quiz has insufficient events.");
        setPhase("ready");
        return;
      }
      eventsRef.current = events;

      // 3. Get or create session
      const session = await getOrCreateSession(userId, quiz.id);
      sessionRef.current = session;

      // 4. Fetch user stats
      const stats = await getUserStats(userId);

      // 5. Generate deal order (deterministic per user + quiz)
      const dealSeed = quiz.id + userId;
      const dealOrder = generateDealOrder(events.length, dealSeed);
      dealOrderRef.current = dealOrder;

      // 6. Build game state
      const state: FlashbackGameState = { quiz, events, session, stats };
      setGameState(state);

      // 7. Restore in-progress game or prepare fresh start
      if (session.completed) {
        // Game already finished — restore full timeline and results
        restoreCompletedGame(events, session, dealOrder);
      } else if (session.current_round > 0) {
        // Game in progress — restore timeline to current state
        restoreInProgressGame(events, session, dealOrder);
      } else {
        // Fresh game — move to ready phase
        setPhase("ready");
      }
    } catch (err) {
      console.error("[flashback] bootstrap error", err);
      setError(
        err instanceof Error ? err.message : "Failed to load Flashback game",
      );
      setPhase("ready");
    }
  }, []);

  // -----------------------------------------------------------------------
  // Restore helpers
  // -----------------------------------------------------------------------

  function restoreCompletedGame(
    events: FlashbackEvent[],
    session: FlashbackSession,
    dealOrder: DealOrderResult,
  ) {
    const restoredTimeline: TimelineCard[] = [];
    const restoredResults: RoundResult[] = [];

    // Add anchor card
    const anchorEvent = events[dealOrder.anchorIndex];
    restoredTimeline.push({
      event: anchorEvent,
      yearRevealed: true,
      isCorrect: null, // anchor is always correct / not scored
    });

    // Replay each placement
    for (const placement of session.placements) {
      const event = events.find((e) => e.id === placement.event_id);
      if (!event) continue;

      restoredTimeline.push({
        event,
        yearRevealed: true,
        isCorrect: placement.is_correct,
      });

      restoredResults.push({
        round: placement.round,
        event,
        placedPosition: placement.placed_position,
        correctPosition: placement.correct_position,
        isCorrect: placement.is_correct,
        pointsEarned: placement.points_earned,
      });
    }

    // Sort timeline by chronological year for display
    restoredTimeline.sort((a, b) => a.event.year - b.event.year);

    setTimeline(restoredTimeline);
    setRoundResults(restoredResults);
    setScore(session.score);
    setCurrentRound(COMPLETED_ROUND);
    setPhase("completed");
  }

  function restoreInProgressGame(
    events: FlashbackEvent[],
    session: FlashbackSession,
    dealOrder: DealOrderResult,
  ) {
    const restoredTimeline: TimelineCard[] = [];
    const restoredResults: RoundResult[] = [];

    // Add anchor card
    const anchorEvent = events[dealOrder.anchorIndex];
    restoredTimeline.push({
      event: anchorEvent,
      yearRevealed: true,
      isCorrect: null,
    });

    // Replay completed placements
    for (const placement of session.placements) {
      const event = events.find((e) => e.id === placement.event_id);
      if (!event) continue;

      restoredTimeline.push({
        event,
        yearRevealed: true,
        isCorrect: placement.is_correct,
      });

      restoredResults.push({
        round: placement.round,
        event,
        placedPosition: placement.placed_position,
        correctPosition: placement.correct_position,
        isCorrect: placement.is_correct,
        pointsEarned: placement.points_earned,
      });
    }

    // Sort timeline chronologically
    restoredTimeline.sort((a, b) => a.event.year - b.event.year);

    setTimeline(restoredTimeline);
    setRoundResults(restoredResults);
    setScore(session.score);
    setCurrentRound(session.current_round);

    // Deal the next card
    const nextDealIndex = session.current_round - 1; // rounds are 1-based, dealOrder is 0-based
    if (nextDealIndex < dealOrder.dealOrder.length) {
      const nextEventIndex = dealOrder.dealOrder[nextDealIndex];
      setCurrentCard(events[nextEventIndex]);
      setPhase("playing");
    } else {
      setPhase("completed");
    }
  }

  // -----------------------------------------------------------------------
  // startGame — place anchor on timeline, deal round 1
  // -----------------------------------------------------------------------
  const startGame = useCallback(() => {
    const dealOrder = dealOrderRef.current;
    const events = eventsRef.current;
    if (!dealOrder || events.length === 0) return;

    // Place anchor card on the timeline with year revealed
    const anchorEvent = events[dealOrder.anchorIndex];
    const anchorCard: TimelineCard = {
      event: anchorEvent,
      yearRevealed: true,
      isCorrect: null,
    };
    setTimeline([anchorCard]);

    // Deal first card
    const firstEventIndex = dealOrder.dealOrder[0];
    setCurrentCard(events[firstEventIndex]);
    setCurrentRound(1);
    setScore(0);
    setRoundResults([]);
    setPendingPosition(null);
    setPhase("playing");
  }, []);

  // -----------------------------------------------------------------------
  // placeCard — set pending position, enter confirming phase
  // -----------------------------------------------------------------------
  const placeCard = useCallback((position: number) => {
    setPendingPosition(position);
    setPhase("confirming");
  }, []);

  // -----------------------------------------------------------------------
  // repositionCard — update pending position while in confirming phase
  // -----------------------------------------------------------------------
  const repositionCard = useCallback((newPosition: number) => {
    setPendingPosition(newPosition);
  }, []);

  // -----------------------------------------------------------------------
  // confirmPlacement — check correctness, update timeline, save, advance
  // -----------------------------------------------------------------------
  const confirmPlacement = useCallback(async () => {
    const dealOrder = dealOrderRef.current;
    const session = sessionRef.current;
    const events = eventsRef.current;
    const userId = userIdRef.current;

    if (!dealOrder || !session || !currentCard || pendingPosition === null) {
      return;
    }

    setPhase("revealing");

    try {
      // Determine correct position by sorting the current timeline + new card
      // chronologically and finding where this card belongs
      const correctPosition = currentCard.sort_order;
      const placedPosition = pendingPosition;

      // Check if the player placed the card in the correct chronological slot.
      // The timeline is sorted by year. We need to check if inserting at the
      // pending position maintains chronological order.
      const isCorrect = checkPlacementCorrectness(
        timeline,
        currentCard,
        placedPosition,
      );

      const pointsEarned = isCorrect ? currentCard.point_value : 0;
      const newScore = score + pointsEarned;
      const newRound = currentRound + 1;
      const isGameComplete = newRound > TOTAL_ROUNDS;

      // Build placement record
      const placement: FlashbackPlacement = {
        event_id: currentCard.id,
        placed_position: placedPosition,
        correct_position: correctPosition,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        round: currentRound,
      };

      // Build round result
      const result: RoundResult = {
        round: currentRound,
        event: currentCard,
        placedPosition,
        correctPosition,
        isCorrect,
        pointsEarned,
      };

      // Update timeline: add the card and sort chronologically
      const newTimelineCard: TimelineCard = {
        event: currentCard,
        yearRevealed: true,
        isCorrect,
      };

      const updatedTimeline = [...timeline, newTimelineCard].sort(
        (a, b) => a.event.year - b.event.year,
      );

      // Persist to Supabase
      await savePlacement(
        session.id,
        placement,
        newScore,
        isGameComplete ? COMPLETED_ROUND : newRound,
        isGameComplete,
      );

      // Update local session ref
      sessionRef.current = {
        ...session,
        current_round: isGameComplete ? COMPLETED_ROUND : newRound,
        score: newScore,
        placements: [...session.placements, placement],
        completed: isGameComplete,
        completed_at: isGameComplete ? new Date().toISOString() : null,
      };

      // Apply state updates
      setTimeline(updatedTimeline);
      setScore(newScore);
      setRoundResults((prev) => [...prev, result]);
      setCurrentRound(isGameComplete ? COMPLETED_ROUND : newRound);
      setPendingPosition(null);

      if (isGameComplete) {
        // Update user stats
        const maxPossible = events.reduce(
          (sum, e) => sum + e.point_value,
          0,
        );
        // Subtract anchor's points since it's not scored
        const anchorEvent = events[dealOrder.anchorIndex];
        const scorableMax = maxPossible - anchorEvent.point_value;
        const isPerfect = newScore >= scorableMax;

        await updateUserStats(userId, newScore, isPerfect).catch((err) => {
          console.error("[flashback] Failed to update user stats", err);
        });

        setCurrentCard(null);
        setPhase("completed");
      } else {
        // Deal next card
        const nextDealIndex = newRound - 1;
        if (nextDealIndex < dealOrder.dealOrder.length) {
          const nextEventIndex = dealOrder.dealOrder[nextDealIndex];
          setCurrentCard(events[nextEventIndex]);
          setPhase("playing");
        } else {
          setCurrentCard(null);
          setPhase("completed");
        }
      }
    } catch (err) {
      console.error("[flashback] confirmPlacement error", err);
      setError(
        err instanceof Error ? err.message : "Failed to save placement",
      );
      setPhase("playing");
    }
  }, [currentCard, pendingPosition, timeline, score, currentRound]);

  return {
    // State
    phase,
    gameState,
    timeline,
    currentCard,
    currentRound,
    score,
    roundResults,
    pendingPosition,
    error,
    // Actions
    bootstrap,
    startGame,
    placeCard,
    repositionCard,
    confirmPlacement,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether placing `card` at `position` in the current `timeline`
 * maintains chronological order.
 *
 * Position is a 0-based insertion index into the timeline array.
 * The timeline is already sorted chronologically.
 */
function checkPlacementCorrectness(
  timeline: TimelineCard[],
  card: FlashbackEvent,
  position: number,
): boolean {
  const cardYear = card.year;

  // The card before the insertion point (if any) must have year <= cardYear
  if (position > 0) {
    const before = timeline[position - 1];
    if (before.event.year > cardYear) return false;
  }

  // The card at/after the insertion point (if any) must have year >= cardYear
  if (position < timeline.length) {
    const after = timeline[position];
    if (after.event.year < cardYear) return false;
  }

  return true;
}

"use client";

import { useCallback } from "react";
import type { FlashbackEvent, FlashbackGameState, TimelineCard } from "./types";

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

const FLASHBACK_DISABLED_MESSAGE =
  "Flashback gameplay is currently unavailable while the app removes its browser Supabase dependency.";

export function useFlashbackManager(): FlashbackManager {
  const bootstrap = useCallback(async (_userId: string) => {
    void _userId;
    throw new Error(FLASHBACK_DISABLED_MESSAGE);
  }, []);

  const startGame = useCallback(() => {}, []);
  const placeCard = useCallback((_position: number) => {
    void _position;
  }, []);
  const repositionCard = useCallback((_newPosition: number) => {
    void _newPosition;
  }, []);
  const confirmPlacement = useCallback(async () => {}, []);

  return {
    phase: "ready",
    gameState: null,
    timeline: [],
    currentCard: null,
    currentRound: 0,
    score: 0,
    roundResults: [],
    pendingPosition: null,
    error: FLASHBACK_DISABLED_MESSAGE,
    bootstrap,
    startGame,
    placeCard,
    repositionCard,
    confirmPlacement,
  };
}

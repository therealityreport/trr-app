import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, rpcMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

import {
  getOrCreateSession,
  savePlacement,
  updateUserStats,
} from "@/lib/flashback/supabase";

describe("flashback supabase RPC helpers", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    createClientMock.mockReset();
    createClientMock.mockReturnValue({
      rpc: rpcMock,
    });
  });

  it("gets or creates a session through the atomic RPC", async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: "session-1",
        user_id: "firebase-user-1",
        quiz_id: "quiz-1",
        current_round: 0,
        score: 0,
        placements: [],
        completed: false,
        started_at: "2026-03-30T00:00:00.000Z",
        completed_at: null,
      },
      error: null,
    });

    const session = await getOrCreateSession("firebase-user-1", "quiz-1");

    expect(session).toMatchObject({
      id: "session-1",
      user_id: "firebase-user-1",
      quiz_id: "quiz-1",
      current_round: 0,
      score: 0,
      placements: [],
      completed: false,
    });
    expect(rpcMock).toHaveBeenCalledWith("flashback_get_or_create_session", {
      p_user_id: "firebase-user-1",
      p_quiz_id: "quiz-1",
    });
  });

  it("persists placements through the atomic RPC without a pre-read", async () => {
    rpcMock.mockResolvedValue({
      data: {
        id: "session-1",
        user_id: "firebase-user-1",
        quiz_id: "quiz-1",
        current_round: 3,
        score: 5,
        placements: [
          {
            event_id: "event-1",
            placed_position: 1,
            correct_position: 1,
            is_correct: true,
            points_earned: 5,
            round: 1,
          },
        ],
        completed: false,
        started_at: "2026-03-30T00:00:00.000Z",
        completed_at: null,
      },
      error: null,
    });

    await savePlacement(
      "session-1",
      {
        event_id: "event-1",
        placed_position: 1,
        correct_position: 1,
        is_correct: true,
        points_earned: 5,
        round: 1,
      },
      5,
      3,
      false,
    );

    expect(rpcMock).toHaveBeenCalledWith("flashback_save_placement", {
      p_session_id: "session-1",
      p_placement: {
        event_id: "event-1",
        placed_position: 1,
        correct_position: 1,
        is_correct: true,
        points_earned: 5,
        round: 1,
      },
      p_new_score: 5,
      p_new_round: 3,
      p_completed: false,
    });
  });

  it("updates user stats through the atomic upsert RPC", async () => {
    rpcMock.mockResolvedValue({
      data: {
        user_id: "firebase-user-1",
        games_played: 2,
        total_points: 10,
        perfect_scores: 1,
        current_streak: 2,
        max_streak: 2,
      },
      error: null,
    });

    await updateUserStats("firebase-user-1", 5, true);

    expect(rpcMock).toHaveBeenCalledWith("flashback_update_user_stats", {
      p_user_id: "firebase-user-1",
      p_points_earned: 5,
      p_is_perfect: true,
    });
  });
});

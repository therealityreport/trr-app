/** A weekly Flashback quiz */
export interface FlashbackQuiz {
  id: string;
  title: string;
  publish_date: string; // ISO date YYYY-MM-DD
  description: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/** A single event within a quiz */
export interface FlashbackEvent {
  id: string;
  quiz_id: string;
  description: string;
  image_url: string | null;
  year: number;
  sort_order: number; // 1-8, chronological (1=earliest)
  point_value: number; // 2-5
}

/** A single placement the player made */
export interface FlashbackPlacement {
  event_id: string;
  placed_position: number;
  correct_position: number;
  is_correct: boolean;
  points_earned: number;
  round: number; // 1-8
}

/** Player's active game session */
export interface FlashbackSession {
  id: string;
  user_id: string;
  quiz_id: string;
  current_round: number; // 0=not started, 1-8=active, 9=complete
  score: number;
  placements: FlashbackPlacement[];
  completed: boolean;
  started_at: string;
  completed_at: string | null;
}

/** Aggregated user stats */
export interface FlashbackUserStats {
  user_id: string;
  games_played: number;
  total_points: number;
  perfect_scores: number;
  current_streak: number;
  max_streak: number;
}

/** Runtime game state */
export interface FlashbackGameState {
  quiz: FlashbackQuiz;
  events: FlashbackEvent[];
  session: FlashbackSession;
  stats: FlashbackUserStats | null;
}

/** A placed card on the timeline (UI state) */
export interface TimelineCard {
  event: FlashbackEvent;
  yearRevealed: boolean;
  isCorrect: boolean | null; // null = unconfirmed
}

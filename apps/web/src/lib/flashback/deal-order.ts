/**
 * Deterministic deal-order generator for Flashback.
 *
 * Given an event count and a seed string, produces:
 * - `anchorIndex`: the event placed on the timeline before round 1 (near the middle)
 * - `dealOrder`: the shuffled indices of the remaining events (one per round)
 *
 * The same seed always produces the same output (seeded Fisher-Yates shuffle).
 */

export interface DealOrderResult {
  /** Index into the events array for the pre-placed anchor card. */
  anchorIndex: number;
  /** Indices into the events array, in the order they are dealt to the player. */
  dealOrder: number[];
}

// ---------------------------------------------------------------------------
// Seeded PRNG (Mulberry32 — fast, 32-bit, fully deterministic)
// ---------------------------------------------------------------------------

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
    h |= 0; // keep as 32-bit int
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic deal order for a Flashback quiz.
 *
 * @param eventCount  Total number of events in the quiz (typically 8).
 * @param seed        Deterministic seed string (e.g. `quizId + userId`).
 */
export function generateDealOrder(
  eventCount: number,
  seed: string,
): DealOrderResult {
  if (eventCount < 2) {
    throw new Error("generateDealOrder requires at least 2 events");
  }

  // Anchor is near the middle of the chronological order
  const anchorIndex = Math.floor(eventCount / 2);

  // Build the remaining indices (everything except the anchor)
  const remaining: number[] = [];
  for (let i = 0; i < eventCount; i++) {
    if (i !== anchorIndex) {
      remaining.push(i);
    }
  }

  // Seeded Fisher-Yates shuffle
  const rng = mulberry32(hashSeed(seed));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  return { anchorIndex, dealOrder: remaining };
}

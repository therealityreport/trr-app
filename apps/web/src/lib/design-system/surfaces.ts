export type SurfaceModeId = "editorial-landing" | "app-admin" | "game";

export type SurfaceMode = {
  id: SurfaceModeId;
  label: string;
  intent: string;
  cardPolicy: string;
  typefaces: readonly string[];
  notes: readonly string[];
};

export const SURFACE_MODES: readonly SurfaceMode[] = [
  {
    id: "editorial-landing",
    label: "Editorial / Landing",
    intent: "Brand-forward, composition-led, and sparse on copy.",
    cardPolicy: "Avoid cards by default. Use them only when an action or a content hierarchy needs explicit framing.",
    typefaces: ["display", "body"],
    notes: [
      "Default to one dominant visual anchor in the first viewport.",
      "Keep one primary CTA above the fold.",
      "Do not stack feature cards in the hero.",
    ],
  },
  {
    id: "app-admin",
    label: "App / Admin",
    intent: "Operational, scannable, and immediately useful.",
    cardPolicy: "Cards are permitted only when they group controls, summarize state, or make scanning easier than spacing alone.",
    typefaces: ["headline", "body"],
    notes: [
      "Start with search, status, controls, and action.",
      "Every heading should orient, prioritize, or explain state.",
      "Decorative sections should be removed unless they add signal.",
    ],
  },
  {
    id: "game",
    label: "Game",
    intent: "Playful and tactile while staying coherent with the TRR brand system.",
    cardPolicy: "Cards can carry game state and feedback, but motion should clarify play rather than decorate the shell.",
    typefaces: ["display", "games"],
    notes: [
      "Motion should reinforce correctness, progress, and turn state.",
      "Play surfaces can be denser if the interaction remains legible.",
      "Feedback should be immediate and consistent across devices.",
    ],
  },
] as const;

export const SAFE_AREA = {
  top: "env(safe-area-inset-top, 0px)",
  right: "env(safe-area-inset-right, 0px)",
  bottom: "env(safe-area-inset-bottom, 0px)",
  left: "env(safe-area-inset-left, 0px)",
} as const;

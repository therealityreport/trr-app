export const NYT_GAMES_RUNTIME_FONT_STACKS = {
  ui: "var(--dd-font-ui)",
  sans: "var(--dd-font-sans)",
  body: "var(--dd-font-body)",
  headline: "var(--dd-font-headline)",
  display: "var(--dd-font-display)",
  slab: "var(--dd-font-slab)",
} as const;

const SOURCE_FAMILY_TO_RUNTIME_FONT_STACK = {
  "nyt-franklin": NYT_GAMES_RUNTIME_FONT_STACKS.ui,
  "nyt-karnakcondensed": NYT_GAMES_RUNTIME_FONT_STACKS.headline,
  "nyt-karnak": NYT_GAMES_RUNTIME_FONT_STACKS.display,
  "nyt-stymie": NYT_GAMES_RUNTIME_FONT_STACKS.slab,
} as const;

export function resolveNYTGamesRuntimeFontFamily(sourceFamily: string) {
  return (
    SOURCE_FAMILY_TO_RUNTIME_FONT_STACK[
      sourceFamily as keyof typeof SOURCE_FAMILY_TO_RUNTIME_FONT_STACK
    ] ?? NYT_GAMES_RUNTIME_FONT_STACKS.body
  );
}

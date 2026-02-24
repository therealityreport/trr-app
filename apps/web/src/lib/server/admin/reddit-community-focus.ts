import "server-only";

export interface RedditCommunityFocusState {
  is_show_focused: boolean;
  network_focus_targets: string[];
  franchise_focus_targets: string[];
}

export interface RedditCommunityFocusInput {
  isShowFocused?: boolean;
  networkFocusTargets?: string[];
  franchiseFocusTargets?: string[];
}

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

export const sanitizeFocusTargets = (input: string[] | null | undefined): string[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of input) {
    if (typeof value !== "string") continue;
    const cleaned = collapseWhitespace(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(cleaned);
  }

  return output.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
};

export const resolveCommunityFocusState = (
  input: RedditCommunityFocusInput,
  fallback?: Partial<RedditCommunityFocusState> | null,
): RedditCommunityFocusState => {
  const isShowFocused =
    input.isShowFocused ??
    (typeof fallback?.is_show_focused === "boolean" ? fallback.is_show_focused : false);

  const networkTargets = sanitizeFocusTargets(
    input.networkFocusTargets ?? fallback?.network_focus_targets ?? [],
  );
  const franchiseTargets = sanitizeFocusTargets(
    input.franchiseFocusTargets ?? fallback?.franchise_focus_targets ?? [],
  );

  if (isShowFocused) {
    return {
      is_show_focused: true,
      network_focus_targets: [],
      franchise_focus_targets: [],
    };
  }

  return {
    is_show_focused: false,
    network_focus_targets: networkTargets,
    franchise_focus_targets: franchiseTargets,
  };
};

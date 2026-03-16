import type {
  TypographyAssignment,
  TypographyResolvedEntry,
  TypographyRoleConfig,
  TypographyRoleStyle,
  TypographySelector,
  TypographyState,
  TypographyStyleInput,
} from "@/lib/typography/types";

const EMPTY_PAGE = "__page__";
const EMPTY_INSTANCE = "__instance__";

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRoleStyle(style: TypographyStyleInput, fallback: TypographyRoleStyle): TypographyRoleStyle {
  return {
    fontFamily: toNonEmptyString(style?.fontFamily) ?? fallback.fontFamily,
    fontSize: toNonEmptyString(style?.fontSize) ?? fallback.fontSize,
    fontWeight: toNonEmptyString(style?.fontWeight) ?? fallback.fontWeight,
    lineHeight: toNonEmptyString(style?.lineHeight) ?? fallback.lineHeight,
    letterSpacing: toNonEmptyString(style?.letterSpacing) ?? fallback.letterSpacing,
    ...(toNonEmptyString(style?.textTransform)
      ? { textTransform: toNonEmptyString(style?.textTransform) ?? undefined }
      : fallback.textTransform
        ? { textTransform: fallback.textTransform }
        : {}),
  };
}

export function normalizeRoleConfig(roleConfig: Partial<TypographyRoleConfig> | null | undefined): TypographyRoleConfig | null {
  if (!roleConfig?.mobile || !roleConfig.desktop) return null;
  const mobileFallback = {
    fontFamily: "var(--font-hamburg)",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: "24px",
    letterSpacing: "0px",
  };
  const mobile = normalizeRoleStyle(roleConfig.mobile, mobileFallback);
  const desktop = normalizeRoleStyle(roleConfig.desktop, mobile);
  return { mobile, desktop };
}

function makeAssignmentKey(assignment: Pick<TypographyAssignment, "area" | "pageKey" | "instanceKey">): string {
  return [
    assignment.area,
    assignment.pageKey ?? EMPTY_PAGE,
    assignment.instanceKey ?? EMPTY_INSTANCE,
  ].join("::");
}

function selectorToAssignmentCandidates(selector: TypographySelector) {
  return [
    {
      area: selector.area,
      pageKey: selector.pageKey ?? null,
      instanceKey: selector.instanceKey ?? null,
    },
    {
      area: selector.area,
      pageKey: selector.pageKey ?? null,
      instanceKey: null,
    },
    {
      area: selector.area,
      pageKey: null,
      instanceKey: null,
    },
  ];
}

export function resolveTypographyEntry(
  state: TypographyState | null | undefined,
  selector: TypographySelector,
): TypographyResolvedEntry | null {
  if (!state) return null;
  const setsById = new Map(state.sets.map((set) => [set.id, set]));
  const assignmentsByKey = new Map(state.assignments.map((assignment) => [makeAssignmentKey(assignment), assignment]));

  for (const candidate of selectorToAssignmentCandidates(selector)) {
    const assignment = assignmentsByKey.get(makeAssignmentKey(candidate));
    if (!assignment) continue;
    const set = setsById.get(assignment.setId);
    if (!set) continue;
    const roleConfig = normalizeRoleConfig(set.roles[selector.role]);
    if (!roleConfig) continue;
    return {
      selector: {
        area: candidate.area,
        pageKey: candidate.pageKey,
        instanceKey: candidate.instanceKey,
        role: selector.role,
      },
      set,
      roleConfig,
    };
  }

  return null;
}

export function resolveTypographyStyle(
  state: TypographyState | null | undefined,
  selector: TypographySelector,
  fallback?: TypographyStyleInput,
): TypographyRoleStyle | null {
  return resolveTypographyStyleForBreakpoint(state, selector, "mobile", fallback);
}

export function resolveTypographyStyleForBreakpoint(
  state: TypographyState | null | undefined,
  selector: TypographySelector,
  breakpoint: "mobile" | "desktop",
  fallback?: TypographyStyleInput,
): TypographyRoleStyle | null {
  const resolved = resolveTypographyEntry(state, selector);
  if (!resolved && !fallback) return null;

  const base = normalizeRoleStyle(fallback, {
    fontFamily: "var(--font-hamburg)",
    fontSize: "16px",
    fontWeight: "400",
    lineHeight: "24px",
    letterSpacing: "0px",
  });
  if (!resolved) return base;

  return {
    ...base,
    ...resolved.roleConfig[breakpoint],
  };
}

export function buildTypographyDataAttributes(selector: TypographySelector) {
  return {
    "data-trr-typo-area": selector.area,
    "data-trr-typo-page": selector.pageKey ?? "",
    "data-trr-typo-instance": selector.instanceKey ?? "",
    "data-trr-typo-role": selector.role,
  };
}

function buildRuleSelector(entry: TypographyResolvedEntry): string {
  const fragments = [`[data-trr-typo-area="${entry.selector.area}"]`];
  if (entry.selector.pageKey) {
    fragments.push(`[data-trr-typo-page="${entry.selector.pageKey}"]`);
  }
  if (entry.selector.instanceKey) {
    fragments.push(`[data-trr-typo-instance="${entry.selector.instanceKey}"]`);
  }
  fragments.push(`[data-trr-typo-role="${entry.selector.role}"]`);
  return fragments.join("");
}

function buildRoleCss(style: TypographyRoleStyle): string {
  const declarations = [
    `font-family: ${style.fontFamily};`,
    `font-size: ${style.fontSize};`,
    `font-weight: ${style.fontWeight};`,
    `line-height: ${style.lineHeight};`,
    `letter-spacing: ${style.letterSpacing};`,
  ];
  if (style.textTransform) {
    declarations.push(`text-transform: ${style.textTransform};`);
  }
  return declarations.join(" ");
}

function getUniqueRoleKeys(state: TypographyState): string[] {
  const keys = new Set<string>();
  state.sets.forEach((set) => {
    Object.keys(set.roles).forEach((key) => keys.add(key));
  });
  return Array.from(keys).sort();
}

export function buildTypographyStylesheet(state: TypographyState | null | undefined): string {
  if (!state) return "";
  const roleKeys = getUniqueRoleKeys(state);
  const rules: string[] = [];

  for (const assignment of state.assignments) {
    for (const role of roleKeys) {
      const resolved = resolveTypographyEntry(state, {
        area: assignment.area,
        pageKey: assignment.pageKey,
        instanceKey: assignment.instanceKey,
        role,
      });
      if (!resolved) continue;
      const selector = buildRuleSelector(resolved);
      rules.push(`${selector} { ${buildRoleCss(resolved.roleConfig.mobile)} }`);
      rules.push(`@media (min-width: 768px) { ${selector} { ${buildRoleCss(resolved.roleConfig.desktop)} } }`);
    }
  }

  return rules.join("\n");
}

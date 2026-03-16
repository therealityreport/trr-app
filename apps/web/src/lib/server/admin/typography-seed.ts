import type {
  TypographyArea,
  TypographyAssignment,
  TypographyRoleConfig,
  TypographySet,
  TypographyState,
} from "@/lib/typography/types";

export interface SeedTypographyAssignmentDefinition {
  area: TypographyArea;
  pageKey: string | null;
  instanceKey: string | null;
  name: string;
  sourcePath: string;
  notes?: string | null;
  roles: Record<string, TypographyRoleConfig>;
}

type SeedTypographySetDefinition = Omit<TypographySet, "id" | "createdAt" | "updatedAt">;
type SeedTypographyAssignmentRecord = Omit<TypographyAssignment, "id" | "createdAt" | "updatedAt"> & {
  setSlug: string;
};

function makeRole(
  fontFamily: string,
  fontSize: string,
  fontWeight: string,
  lineHeight: string,
  letterSpacing: string,
  desktop?: Partial<TypographyRoleConfig["desktop"]>,
  textTransform?: string,
): TypographyRoleConfig {
  return {
    mobile: {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      ...(textTransform ? { textTransform } : {}),
    },
    desktop: {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      ...(textTransform ? { textTransform } : {}),
      ...(desktop ?? {}),
    },
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DEFAULT_USER_BODY = makeRole("var(--font-hamburg)", "16px", "400", "24px", "0px");
const DEFAULT_USER_SERIF = makeRole("var(--font-gloucester)", "30px", "400", "40px", "0px", {
  fontSize: "36px",
  lineHeight: "40px",
});
const DEFAULT_GAME_TITLE = makeRole("var(--font-rude-slab)", "36px", "700", "40px", "0.025em", {
  fontSize: "48px",
  lineHeight: "48px",
});
const DEFAULT_GAME_BODY = makeRole("var(--font-plymouth-serial)", "20px", "800", "28px", "0px", {
  fontSize: "30px",
  lineHeight: "36px",
});
const DEFAULT_SURVEY_PROMPT = makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "34px", "700", "36px", "0.01em", {
  fontSize: "48px",
  lineHeight: "50px",
});
const DEFAULT_SURVEY_OPTION = makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "14px", "800", "18px", "0.03em", {
  fontSize: "18px",
  lineHeight: "22px",
});
const DEFAULT_ADMIN_HEADING = makeRole("var(--font-hamburg)", "14px", "600", "20px", "0px", {
  fontSize: "14px",
  lineHeight: "20px",
});

export const SEEDED_TYPOGRAPHY_ASSIGNMENT_DEFINITIONS: SeedTypographyAssignmentDefinition[] = [
  {
    area: "user-frontend",
    pageKey: null,
    instanceKey: null,
    name: "User Frontend Base",
    sourcePath: "src/app/globals.css",
    notes: "Global user-frontend body and serif defaults.",
    roles: {
      body: DEFAULT_USER_BODY,
      heading: DEFAULT_USER_SERIF,
      button: makeRole("var(--font-hamburg)", "16px", "700", "24px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "home",
    instanceKey: "landing-shell",
    name: "Home Landing",
    sourcePath: "src/app/page.tsx",
    roles: {
      heroTitle: makeRole("var(--font-gloucester)", "30px", "400", "40px", "0px", {
        fontSize: "40px",
        lineHeight: "44px",
      }),
      body: DEFAULT_USER_BODY,
      cta: makeRole("var(--font-hamburg)", "16px", "700", "38px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "login",
    instanceKey: "auth-form",
    name: "Login Form",
    sourcePath: "src/app/login/page.tsx",
    roles: {
      heroTitle: DEFAULT_USER_SERIF,
      label: makeRole("var(--font-hamburg)", "14px", "500", "21px", "0.1px"),
      input: makeRole("var(--font-hamburg)", "16px", "500", "24px", "0px"),
      body: DEFAULT_USER_BODY,
      cta: makeRole("var(--font-hamburg)", "16px", "700", "38px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "register",
    instanceKey: "auth-form",
    name: "Register Form",
    sourcePath: "src/app/auth/register/page.tsx",
    roles: {
      heroTitle: DEFAULT_USER_SERIF,
      label: makeRole("var(--font-hamburg)", "14px", "500", "21px", "0.1px"),
      input: makeRole("var(--font-hamburg)", "16px", "500", "24px", "0px"),
      body: DEFAULT_USER_BODY,
      cta: makeRole("var(--font-hamburg)", "16px", "700", "38px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "legal",
    instanceKey: "document",
    name: "Legal Document",
    sourcePath: "src/app/privacy-policy/page.tsx",
    roles: {
      heading: makeRole("var(--font-gloucester)", "30px", "400", "36px", "0px"),
      body: DEFAULT_USER_BODY,
      link: makeRole("var(--font-gloucester)", "24px", "500", "32px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "hub",
    instanceKey: "game-grid",
    name: "Hub Game Grid",
    sourcePath: "src/app/hub/page.tsx",
    roles: {
      pageTitle: makeRole("var(--font-gloucester)", "36px", "700", "40px", "0px", {
        fontSize: "36px",
        lineHeight: "40px",
      }),
      cardTitle: makeRole("var(--font-rude-slab)", "24px", "900", "32px", "0px"),
      body: DEFAULT_GAME_BODY,
      button: makeRole("var(--font-plymouth-serial)", "14px", "800", "20px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "hub-surveys",
    instanceKey: "survey-list",
    name: "Hub Surveys",
    sourcePath: "src/app/hub/surveys/page.tsx",
    roles: {
      pageTitle: makeRole("var(--font-gloucester)", "30px", "700", "36px", "0px"),
      heroTitle: makeRole("var(--font-rude-slab)", "32px", "500", "36px", "0px", {
        fontSize: "36px",
        lineHeight: "40px",
      }),
      eyebrow: makeRole("var(--font-hamburg)", "12px", "600", "16px", "0.35em", undefined, "uppercase"),
      option: makeRole("var(--font-plymouth-serial)", "16px", "800", "24px", "0px"),
      button: makeRole("var(--font-hamburg)", "14px", "600", "20px", "0px"),
    },
  },
  {
    area: "user-frontend",
    pageKey: "profile",
    instanceKey: "hero",
    name: "Profile Hero",
    sourcePath: "src/app/profile/page.tsx",
    roles: {
      heading: makeRole("var(--font-rude-slab)", "36px", "700", "40px", "0px"),
      body: DEFAULT_USER_BODY,
    },
  },
  {
    area: "surveys",
    pageKey: null,
    instanceKey: null,
    name: "Survey Area Base",
    sourcePath: "src/lib/surveys/ui-templates.ts",
    roles: {
      prompt: DEFAULT_SURVEY_PROMPT,
      option: DEFAULT_SURVEY_OPTION,
      button: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "16px", "700", "20px", "0.8px", {
        fontSize: "40px",
        lineHeight: "52px",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "bravodle-cover",
    instanceKey: "hero",
    name: "Bravodle Cover",
    sourcePath: "src/app/bravodle/cover/page.tsx",
    roles: {
      title: DEFAULT_GAME_TITLE,
      subtitle: DEFAULT_GAME_BODY,
      settingsHeading: makeRole("var(--font-rude-slab)", "24px", "800", "32px", "0px"),
    },
  },
  {
    area: "surveys",
    pageKey: "realitease-cover",
    instanceKey: "hero",
    name: "Realitease Cover",
    sourcePath: "src/app/realitease/cover/page.tsx",
    roles: {
      title: DEFAULT_GAME_TITLE,
      subtitle: DEFAULT_GAME_BODY,
      settingsHeading: makeRole("var(--font-rude-slab)", "24px", "800", "32px", "0px"),
    },
  },
  {
    area: "surveys",
    pageKey: "rhoslc-survey",
    instanceKey: "landing",
    name: "RHOSLC Survey Landing",
    sourcePath: "src/app/surveys/rhoslc-s6/page.tsx",
    roles: {
      eyebrow: makeRole("var(--font-rude-slab)", "14px", "700", "20px", "0.4em", undefined, "uppercase"),
      title: makeRole("var(--font-rude-slab)", "36px", "700", "40px", "0px"),
      sectionHeading: makeRole("var(--font-rude-slab)", "24px", "700", "32px", "0.025em", undefined, "uppercase"),
    },
  },
  {
    area: "surveys",
    pageKey: "rhop-survey",
    instanceKey: "landing",
    name: "RHOP Survey Landing",
    sourcePath: "src/app/surveys/rhop-s10/page.tsx",
    roles: {
      title: makeRole("var(--font-rude-slab)", "36px", "600", "40px", "0px"),
      body: DEFAULT_GAME_BODY,
    },
  },
  {
    area: "surveys",
    pageKey: "single-select",
    instanceKey: "text-multiple-choice",
    name: "Single Select Text Options",
    sourcePath: "src/components/survey/SingleSelectInput.tsx",
    roles: {
      option: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "15px", "800", "1.2", "0.022em", {
        fontSize: "33px",
        letterSpacing: "0.03em",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "multi-select",
    instanceKey: "text-multiple-choice",
    name: "Multi Select Text Options",
    sourcePath: "src/components/survey/MultiSelectInput.tsx",
    roles: {
      option: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "18px", "800", "1.2", "0.03em", {
        fontSize: "33px",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "rank-text-fields",
    instanceKey: "question",
    name: "Rank Text Fields",
    sourcePath: "src/components/survey/RankTextFields.tsx",
    roles: {
      option: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "15px", "800", "1.2", "0.022em", {
        fontSize: "33px",
        letterSpacing: "0.03em",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "poster-single-select",
    instanceKey: "question",
    name: "Poster Single Select",
    sourcePath: "src/components/survey/PosterSingleSelect.tsx",
    roles: {
      heading: makeRole("\"Geometric Slabserif 712\", var(--font-sans), serif", "34px", "700", "32px", "0.008em", {
        fontSize: "44px",
        lineHeight: "42px",
      }),
      cardLabel: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "11px", "700", "1.1", "0.02em", {
        fontSize: "12px",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "cast-single-select",
    instanceKey: "question",
    name: "Cast Single Select",
    sourcePath: "src/components/survey/SingleSelectCastInput.tsx",
    roles: {
      heading: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "30px", "700", "30px", "0.01em", {
        fontSize: "38px",
        lineHeight: "38px",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "cast-multi-select",
    instanceKey: "question",
    name: "Cast Multi Select",
    sourcePath: "src/components/survey/CastMultiSelectInput.tsx",
    roles: {
      heading: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "32px", "800", "32px", "0.01em", {
        fontSize: "40px",
        lineHeight: "40px",
      }),
      subheading: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "16px", "700", "20px", "0.03em"),
    },
  },
  {
    area: "surveys",
    pageKey: "matrix-likert",
    instanceKey: "question",
    name: "Matrix Likert",
    sourcePath: "src/components/survey/MatrixLikertInput.tsx",
    roles: {
      heading: makeRole("\"Gloucester\", var(--font-sans), sans-serif", "28px", "700", "1.05", "0em", {
        fontSize: "36px",
      }),
      statement: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "24px", "800", "1.05", "0em"),
      option: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "13px", "500", "1.2", "0.015em"),
    },
  },
  {
    area: "surveys",
    pageKey: "cast-decision-card",
    instanceKey: "question",
    name: "Cast Decision Card",
    sourcePath: "src/components/survey/CastDecisionCardInput.tsx",
    roles: {
      prompt: makeRole("\"Gloucester MT Std\", var(--font-sans), sans-serif", "22px", "700", "24px", "0.04em", {
        fontSize: "26px",
      }),
      subject: makeRole("\"Geometric Slabserif 703\", var(--font-sans), sans-serif", "30px", "800", "34px", "0px", {
        fontSize: "40px",
      }),
      option: makeRole("\"Geometric Slabserif 703\", var(--font-sans), sans-serif", "18px", "700", "0.9", "0.02em"),
      button: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "18px", "700", "22px", "0.02em"),
    },
  },
  {
    area: "surveys",
    pageKey: "rankings",
    instanceKey: "shared",
    name: "Survey Rankings",
    sourcePath: "src/components/survey/rankings-core.tsx",
    roles: {
      rankNumber: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "24px", "700", "24px", "0.01em", {
        fontSize: "28px",
      }),
      trayLabel: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "16px", "700", "20px", "0em"),
      cardLabel: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "20px", "700", "22px", "0em"),
      pickerTitle: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "18px", "700", "22px", "0em"),
      pickerItem: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "16px", "700", "20px", "0em"),
    },
  },
  {
    area: "surveys",
    pageKey: "two-choice",
    instanceKey: "question",
    name: "Two Choice Cast",
    sourcePath: "src/components/survey/TwoChoiceCast.tsx",
    roles: {
      heading: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "28px", "700", "30px", "0.01em", {
        fontSize: "36px",
      }),
    },
  },
  {
    area: "surveys",
    pageKey: "reunion-seating",
    instanceKey: "question",
    name: "Reunion Seating Prediction",
    sourcePath: "src/components/survey/ReunionSeatingPredictionInput.tsx",
    roles: {
      heading: makeRole("\"Rude Slab Condensed\", var(--font-sans), sans-serif", "32px", "700", "34px", "0.008em", {
        fontSize: "40px",
      }),
      option: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "14px", "700", "20px", "0.02em"),
    },
  },
  {
    area: "surveys",
    pageKey: "continue-button",
    instanceKey: "shared",
    name: "Survey Continue Button",
    sourcePath: "src/components/survey/SurveyContinueButton.tsx",
    roles: {
      button: makeRole("\"Plymouth Serial\", var(--font-sans), sans-serif", "16px", "700", "20px", "0.8px", {
        fontSize: "40px",
        lineHeight: "52px",
      }),
    },
  },
  {
    area: "admin",
    pageKey: null,
    instanceKey: null,
    name: "Admin Base",
    sourcePath: "src/components/admin/AdminGlobalHeader.tsx",
    roles: {
      headerMeta: DEFAULT_ADMIN_HEADING,
      breadcrumb: makeRole("var(--font-hamburg)", "12px", "600", "16px", "0px"),
    },
  },
  {
    area: "admin",
    pageKey: "social-week",
    instanceKey: "detail-cards",
    name: "Social Week Detail Cards",
    sourcePath: "src/components/admin/social-week/WeekDetailPageView.tsx",
    roles: {
      heading: makeRole("var(--font-gloucester)", "16px", "400", "16px", "0px"),
      statLabel: makeRole("var(--font-plymouth-serial)", "14px", "700", "18px", "0px"),
    },
  },
];

function serializeRoles(roles: Record<string, TypographyRoleConfig>): string {
  return JSON.stringify(
    Object.keys(roles)
      .sort()
      .reduce<Record<string, TypographyRoleConfig>>((acc, key) => {
        acc[key] = roles[key]!;
        return acc;
      }, {}),
  );
}

export function buildSeededTypographyState(
  definitions: SeedTypographyAssignmentDefinition[] = SEEDED_TYPOGRAPHY_ASSIGNMENT_DEFINITIONS,
): {
  sets: SeedTypographySetDefinition[];
  assignments: SeedTypographyAssignmentRecord[];
} {
  const setKeyToSlug = new Map<string, string>();
  const sets: SeedTypographySetDefinition[] = [];
  const assignments: SeedTypographyAssignmentRecord[] = [];

  for (const definition of definitions) {
    const profileKey = `${definition.area}::${serializeRoles(definition.roles)}`;
    let setSlug = setKeyToSlug.get(profileKey);

    if (!setSlug) {
      setSlug = slugify(`${definition.area}-${definition.name}`);
      let suffix = 2;
      while (sets.some((entry) => entry.slug === setSlug)) {
        setSlug = slugify(`${definition.area}-${definition.name}-${suffix}`);
        suffix += 1;
      }
      setKeyToSlug.set(profileKey, setSlug);
      sets.push({
        slug: setSlug,
        name: definition.name,
        area: definition.area,
        seedSource: definition.sourcePath,
        roles: definition.roles,
      });
    }

    assignments.push({
      area: definition.area,
      pageKey: definition.pageKey,
      instanceKey: definition.instanceKey,
      setSlug,
      setId: "",
      sourcePath: definition.sourcePath,
      notes: definition.notes ?? null,
    });
  }

  return { sets, assignments };
}

export function buildTypographyStateSnapshot(): TypographyState {
  return buildSeededTypographyRuntimeState();
}

export function buildSeededTypographyRuntimeState(): TypographyState {
  const seeded = buildSeededTypographyState();
  const sets = seeded.sets.map((set, index) => ({
    ...set,
    id: `seed-set-${index + 1}`,
    createdAt: "",
    updatedAt: "",
  }));
  const setIdBySlug = new Map(sets.map((set) => [set.slug, set.id]));

  return {
    sets,
    assignments: seeded.assignments.map((assignment, index) => ({
      id: `seed-assignment-${index + 1}`,
      area: assignment.area,
      pageKey: assignment.pageKey,
      instanceKey: assignment.instanceKey,
      setId: setIdBySlug.get(assignment.setSlug) ?? "",
      sourcePath: assignment.sourcePath,
      notes: assignment.notes,
      createdAt: "",
      updatedAt: "",
    })),
  };
}

type FlagEnv = Record<string, string | undefined>;

type FlagDefault = "off" | "on";

export type TrrAppFlagDefinition<Key extends string = string> = {
  key: Key;
  envVar: string;
  default: FlagDefault;
  description: string;
};

export const TRR_APP_FLAGS = {
  adminSocialIngestionUi: {
    key: "adminSocialIngestionUi",
    envVar: "NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_INGESTION_UI",
    default: "off",
    description: "Shows experimental admin social-ingestion controls.",
  },
  adminSocialScraperTriggers: {
    key: "adminSocialScraperTriggers",
    envVar: "NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_SCRAPER_TRIGGERS",
    default: "off",
    description: "Allows admin UI actions that can trigger social scraper work.",
  },
  adminSocialLiveRefresh: {
    key: "adminSocialLiveRefresh",
    envVar: "NEXT_PUBLIC_TRR_FLAG_ADMIN_SOCIAL_LIVE_REFRESH",
    default: "off",
    description: "Allows admin social views to request fresh live profile data.",
  },
  adminCastSocialDashboard: {
    key: "adminCastSocialDashboard",
    envVar: "NEXT_PUBLIC_TRR_FLAG_ADMIN_CAST_SOCIAL_DASHBOARD",
    default: "on",
    description: "Keeps the existing cast/social dashboard surface available.",
  },
} as const satisfies Record<string, TrrAppFlagDefinition>;

export type TrrAppFlagKey = keyof typeof TRR_APP_FLAGS;

export type TrrAppFlagValues = Record<TrrAppFlagKey, boolean>;

const TRUE_VALUES = new Set(["1", "true", "yes", "y", "on", "enabled"]);
const FALSE_VALUES = new Set(["0", "false", "no", "n", "off", "disabled"]);

const EMPTY_ENV: FlagEnv = {};

function getDefaultEnv(): FlagEnv {
  return typeof process === "undefined" ? EMPTY_ENV : process.env;
}

export function getTrrAppFlagDefinitions(): TrrAppFlagDefinition<TrrAppFlagKey>[] {
  return Object.values(TRR_APP_FLAGS);
}

export function parseTrrAppFlagValue(value: string | undefined): boolean | null {
  if (value == null) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalizedValue)) {
    return true;
  }

  if (FALSE_VALUES.has(normalizedValue)) {
    return false;
  }

  return null;
}

export function getTrrAppFlagValue(
  key: TrrAppFlagKey,
  env: FlagEnv = getDefaultEnv(),
): boolean {
  const definition = TRR_APP_FLAGS[key];
  const override = parseTrrAppFlagValue(env[definition.envVar]);

  return override ?? definition.default === "on";
}

export function getTrrAppFlags(env: FlagEnv = getDefaultEnv()): TrrAppFlagValues {
  return Object.fromEntries(
    getTrrAppFlagDefinitions().map((definition) => [
      definition.key,
      getTrrAppFlagValue(definition.key, env),
    ]),
  ) as TrrAppFlagValues;
}

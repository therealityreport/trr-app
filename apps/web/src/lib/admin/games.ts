import type { Route } from "next";

export type AdminGameKey = "bravodle" | "realitease" | "flashback";

export interface AdminGameDefinition {
  key: AdminGameKey;
  title: string;
  subtitle: string;
  description: string;
  accentClassName: string;
  adminHref: Route;
  coverHref: Route;
  playHref: Route;
  statsHref: string;
  isLiveEnabled: boolean;
  liveStatusLabel?: string;
}

export const ADMIN_GAMES: readonly AdminGameDefinition[] = [
  {
    key: "bravodle",
    title: "Bravodle",
    subtitle: "Bravo-focused daily puzzle",
    description:
      "Manage and monitor the Bravodle gameplay surface, clue flow, and player problem reports.",
    accentClassName: "bg-[#d0adc9]",
    adminHref: "/admin/games/bravodle",
    coverHref: "/bravodle/cover",
    playHref: "/bravodle/play",
    statsHref: "/bravodle/play?show=stats",
    isLiveEnabled: true,
  },
  {
    key: "realitease",
    title: "Realitease",
    subtitle: "Cross-network reality puzzle",
    description:
      "Manage and monitor Realitease game behavior, dynamic columns, and player problem reports.",
    accentClassName: "bg-[#94aed1]",
    adminHref: "/admin/games/realitease",
    coverHref: "/realitease/cover",
    playHref: "/realitease/play",
    statsHref: "/realitease/play?show=stats",
    isLiveEnabled: true,
  },
  {
    key: "flashback",
    title: "Flashback",
    subtitle: "Weekly timeline quiz",
    description:
      "Weekly timeline quiz — place 8 reality TV moments in chronological order.",
    accentClassName: "bg-[#6B6BA0]",
    adminHref: "/admin/games/flashback",
    coverHref: "/hub",
    playHref: "/hub",
    statsHref: "/hub",
    isLiveEnabled: false,
    liveStatusLabel: "Gameplay disabled",
  },
] as const;

export const ADMIN_GAME_MAP: Record<AdminGameKey, AdminGameDefinition> = {
  bravodle: ADMIN_GAMES[0],
  realitease: ADMIN_GAMES[1],
  flashback: ADMIN_GAMES[2],
};

export function isAdminGameKey(value: string): value is AdminGameKey {
  return value === "bravodle" || value === "realitease" || value === "flashback";
}

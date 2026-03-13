export type RhoslcS6CastId =
  | "angie"
  | "britani"
  | "bronwyn"
  | "heather"
  | "lisa"
  | "mary"
  | "meredith"
  | "whitney";

export type RhoslcS6CastRole = "main" | "friend_of";

export type RhoslcS6CastMember = {
  id: RhoslcS6CastId;
  shortName: string;
  fullName: string;
  imagePath: string;
  castRole: RhoslcS6CastRole;
};

export const RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH = "/icons/snowflake-solid-ice-6.svg";
export const RHOSLC_S6_SNOWFLAKE_ICON_CDN_URL =
  "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev/icons/snowflake-solid-ice-6.svg";

export const RHOSLC_S6_CAST_MEMBERS: readonly RhoslcS6CastMember[] = [
  {
    id: "angie",
    shortName: "Angie",
    fullName: "Angie Katsanevas",
    imagePath: "/images/shows/rhoslc/season-6/angie.png",
    castRole: "main",
  },
  {
    id: "britani",
    shortName: "Britani",
    fullName: "Britani Bateman",
    imagePath: "/images/shows/rhoslc/season-6/Britani.png",
    castRole: "friend_of",
  },
  {
    id: "bronwyn",
    shortName: "Bronwyn",
    fullName: "Bronwyn Newport",
    imagePath: "/images/shows/rhoslc/season-6/Bronwyn.png",
    castRole: "main",
  },
  {
    id: "heather",
    shortName: "Heather",
    fullName: "Heather Gay",
    imagePath: "/images/shows/rhoslc/season-6/Heather.png",
    castRole: "main",
  },
  {
    id: "lisa",
    shortName: "Lisa",
    fullName: "Lisa Barlow",
    imagePath: "/images/shows/rhoslc/season-6/LIsa.png",
    castRole: "main",
  },
  {
    id: "mary",
    shortName: "Mary",
    fullName: "Mary Cosby",
    imagePath: "/images/shows/rhoslc/season-6/mary.png",
    castRole: "main",
  },
  {
    id: "meredith",
    shortName: "Meredith",
    fullName: "Meredith Marks",
    imagePath: "/images/shows/rhoslc/season-6/Meredith.png",
    castRole: "main",
  },
  {
    id: "whitney",
    shortName: "Whitney",
    fullName: "Whitney Rose",
    imagePath: "/images/shows/rhoslc/season-6/Whitney.png",
    castRole: "main",
  },
] as const;

export const RHOSLC_S6_CAST_BY_ID = Object.fromEntries(
  RHOSLC_S6_CAST_MEMBERS.map((member) => [member.id, member]),
) as Record<RhoslcS6CastId, RhoslcS6CastMember>;

export function getRhoslcS6CastMember(id: RhoslcS6CastId): RhoslcS6CastMember {
  return RHOSLC_S6_CAST_BY_ID[id];
}

export function getRhoslcS6CastImagePath(id: RhoslcS6CastId): string {
  return RHOSLC_S6_CAST_BY_ID[id].imagePath;
}

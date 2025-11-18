export interface CastAsset {
  name: string;
  image: string;
  role?: string;
  instagram?: string;
  status?: "main" | "friend" | "new" | "alum";
}

export interface SeasonAssets {
  id: string;
  label: string;
  description?: string;
  year?: string;
  colors: {
    primary: string;
    accent: string;
    neutral: string;
  };
  heroImage?: string;
  showIcon?: string;
  wordmark?: string;
  cast: CastAsset[];
  notes?: string[];
}

export interface ShowAssets {
  key: string;
  title: string;
  shortTitle?: string;
  network?: string;
  status?: string;
  palette: {
    primary: string;
    accent: string;
    dark: string;
    light: string;
  };
  hero?: string;
  icon?: string;
  wordmark?: string;
  logline?: string;
  tags?: string[];
  seasons: SeasonAssets[];
}

export const shows: ShowAssets[] = [
  {
    key: "rhop",
    title: "The Real Housewives of Potomac",
    shortTitle: "RHOP",
    network: "Bravo",
    status: "Season 10 airing",
    logline: "Potomac’s elite dive into alliances, new money moves, and Champagne Room shade.",
    palette: {
      primary: "#5C0F4F",
      accent: "#F6C1E4",
      dark: "#1B0017",
      light: "#FDF5FB",
    },
    icon: "/images/logos/fullname-black.svg",
    wordmark: "/images/logos/fullname-black.svg",
    seasons: [
      {
        id: "season-10",
        label: "Season 10",
        year: "2025",
        description: "New energy in Potomac with Angel & Jassi joining the OG lineup.",
        colors: {
          primary: "#5C0F4F",
          accent: "#F6C1E4",
          neutral: "#FDF5FB",
        },
        showIcon: "/images/logos/fullname-black.svg",
        wordmark: "/images/logos/fullname-black.svg",
        cast: [
          {
            name: "Angel",
            image: "/images/shows/rhop/season-10/Angel.png",
            role: "New Friend",
            status: "new",
          },
          {
            name: "Ashley Darby",
            image: "/images/shows/rhop/season-10/Ashley.png",
            role: "OG Wife",
            instagram: "@ashleyboalchdarby",
            status: "main",
          },
          {
            name: "Gizelle Bryant",
            image: "/images/shows/rhop/season-10/Gizelle.png",
            role: "OG Wife",
            instagram: "@gizellebryant",
            status: "main",
          },
          {
            name: "Jassi",
            image: "/images/shows/rhop/season-10/Jassi.png",
            role: "New Wife",
            status: "new",
          },
          {
            name: "Keiarna",
            image: "/images/shows/rhop/season-10/Keiarna.png",
            role: "Friend",
          },
          {
            name: "Monique Samuels",
            image: "/images/shows/rhop/season-10/MONIQUE.png",
            role: "Returning Wife",
            status: "alum",
          },
          {
            name: "Stacey",
            image: "/images/shows/rhop/season-10/Stacey.png",
            role: "Friend",
          },
          {
            name: "Tia",
            image: "/images/shows/rhop/season-10/Tia.png",
            role: "Friend",
          },
          {
            name: "Wendy Osefo",
            image: "/images/shows/rhop/season-10/Wendy.png",
            role: "Main Wife",
            instagram: "@wendyosefo",
            status: "main",
          },
        ],
        notes: [
          "Use deep plum (#5C0F4F) as hero background.",
          "Accent gradients: linear-gradient(135deg, #5C0F4F 0%, #F6C1E4 100%).",
          "Cast icon dimensions: 1600x1600 PNG, transparent background.",
        ],
      },
    ],
  },
];

export function getShowByKey(key: string): ShowAssets | undefined {
  return shows.find((show) => show.key === key);
}

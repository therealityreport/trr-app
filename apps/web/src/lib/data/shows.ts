/**
 * Show with alternative names (from API)
 */
export interface Show {
  id: string;
  name: string;
  alternativeNames: string[];
}

/**
 * Static list of show names (for backwards compatibility)
 */
export const ALL_SHOWS: string[] = [
  "Survivor",
  "The Bachelor",
  "The Bachelorette",
  "Bachelor in Paradise",
  "Love Is Blind",
  "Too Hot to Handle",
  "The Circle",
  "Amazing Race",
  "The Challenge",
  "Big Brother",
  "Below Deck",
  "Below Deck Mediterranean",
  "Below Deck Sailing Yacht",
  "Vanderpump Rules",
  "Real Housewives of Atlanta",
  "Real Housewives of Beverly Hills",
  "Real Housewives of Miami",
  "Real Housewives of New Jersey",
  "Real Housewives of New York",
  "Real Housewives of Potomac",
  "Real Housewives of Salt Lake City",
  "Selling Sunset",
  "The Traitors",
  "FBoy Island",
  "The Mole",
  "Married at First Sight",
  "90 Day Fiancé",
  "RuPaul's Drag Race",
  "Top Chef",
  "Project Runway",
];

/**
 * Extract the best abbreviation from alternative names.
 * Looks for short (<=6 chars), all-uppercase names like "RHOSLC", "ANTM", etc.
 */
export function getShowAbbreviation(show: Show): string | null {
  const abbreviations = show.alternativeNames
    .filter((name) => name.length <= 6 && name === name.toUpperCase())
    .sort((a, b) => a.length - b.length);

  return abbreviations[0] ?? null;
}

/**
 * Get display name for a show, including abbreviation if available.
 * Format: "RHOSLC - The Real Housewives of Salt Lake City"
 */
export function getShowDisplayName(show: Show): string {
  const abbrev = getShowAbbreviation(show);
  return abbrev ? `${abbrev} - ${show.name}` : show.name;
}

/**
 * Check if a search term matches a show (name or any alternative name)
 */
export function matchesShow(show: Show, searchTerm: string): boolean {
  const term = searchTerm.toLowerCase();
  if (show.name.toLowerCase().includes(term)) return true;
  return show.alternativeNames.some((alt) =>
    alt.toLowerCase().includes(term)
  );
}

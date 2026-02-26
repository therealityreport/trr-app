export type PaletteLibrarySourceType = "upload" | "url" | "media_library";

export interface PaletteSamplePoint {
  x: number;
  y: number;
  radius: number;
}

export interface PaletteLibraryEntry {
  id: string;
  trr_show_id: string;
  season_number: number | null;
  name: string;
  colors: string[];
  source_type: PaletteLibrarySourceType;
  source_image_url: string | null;
  seed: number;
  marker_points: PaletteSamplePoint[];
  created_by_uid: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThemeCell {
  background: string;
  text: string;
  contrast: number;
  passes: boolean;
}

export interface GeneratedTheme {
  mode: "light" | "dark";
  cells: ThemeCell[];
  passes: boolean;
}

export interface ShadeMatrixRow {
  label: string;
  ratio: number;
  colors: string[];
}

export interface ExportBundle {
  cssHex: string;
  cssHsl: string;
  scssHex: string;
  scssHsl: string;
  scssRgb: string;
  scssGradient: string;
  all: string;
}

export interface PaletteExtractionResult {
  seed: number;
  points: PaletteSamplePoint[];
  colors: string[];
}

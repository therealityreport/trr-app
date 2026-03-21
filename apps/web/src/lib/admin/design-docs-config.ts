export type DesignDocSectionId =
  | "overview"
  | "typography"
  | "colors"
  | "shapes"
  | "charts"
  | "maps"
  | "cards"
  | "components"
  | "layout"
  | "responsive"
  | "newsletters"
  | "patterns";

export type DesignDocSection = {
  id: DesignDocSectionId;
  label: string;
  description: string;
};

export const DESIGN_DOC_SECTIONS: readonly DesignDocSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Design philosophy and system summary",
  },
  {
    id: "typography",
    label: "Typography",
    description:
      "Cheltenham, Gloucester, Franklin Gothic, Hamburg Serial, Stymie, Chomsky",
  },
  {
    id: "colors",
    label: "Colors",
    description: "Ink/paper scale, data viz palette, TRR 45-color brand palette",
  },
  {
    id: "shapes",
    label: "Shapes & Radius",
    description: "Border radius scale, editorial vs app context, shadow system",
  },
  {
    id: "charts",
    label: "Charts & Graphs",
    description:
      "Bar, line, area, scatter, donut, slope, sparkline, lollipop, waterfall, bump",
  },
  {
    id: "maps",
    label: "Maps",
    description: "Point maps, choropleth tiles, dark satellite maps",
  },
  {
    id: "cards",
    label: "Card Formats",
    description: "Social cards, data-dark, opinion, breaking, badge system",
  },
  {
    id: "components",
    label: "Components",
    description: "Dividers, spacing scale, content width tiers",
  },
  {
    id: "layout",
    label: "Layout & Grid",
    description: "Grid demos, scrollytelling, design principles",
  },
  {
    id: "responsive",
    label: "Responsive",
    description:
      "Breakpoints, mobile vs desktop wireframes, typography scaling",
  },
  {
    id: "newsletters",
    label: "Newsletters",
    description: "Newsletter cards, discovery grid, email patterns",
  },
  {
    id: "patterns",
    label: "Patterns",
    description: "Scrollytelling, annotation, design principles",
  },
] as const;

const VALID_IDS = new Set<string>(DESIGN_DOC_SECTIONS.map((s) => s.id));

export function isDesignDocSectionId(
  value: string | undefined,
): value is DesignDocSectionId {
  return typeof value === "string" && VALID_IDS.has(value);
}

export function resolveDesignDocSection(
  sectionId: DesignDocSectionId,
): DesignDocSection {
  const section = DESIGN_DOC_SECTIONS.find((s) => s.id === sectionId);
  if (!section) {
    return DESIGN_DOC_SECTIONS[0];
  }
  return section;
}

export const DEFAULT_DESIGN_DOC_SECTION: DesignDocSectionId = "overview";

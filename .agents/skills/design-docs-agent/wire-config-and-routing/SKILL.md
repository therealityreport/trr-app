---
name: wire-config-and-routing
description: Register new brand in design docs config, sidebar, and routing.
---

# Wire Config and Routing

Register a new brand section in the design docs system. This skill modifies two files with exact insertion points so the new brand appears in the sidebar, routing, and dynamic-import map.

## Inputs

You need these values from the caller:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `slug` | `nyt-real-estate` | Kebab-case brand slug (used as `brand-{slug}`) |
| `label` | `NYT Real Estate` | Human-readable sidebar label |
| `description` | `Property listings, market data, neighborhood guides` | One-line description for the section metadata |
| `componentName` | `BrandNYTRealEstateSection` | PascalCase component filename (without `.tsx`) |
| `subSections` | _(optional)_ | Custom `BrandSubSection[]` array if the brand needs non-default sub-sections |
| `childSections` | _(optional)_ | Array of `{ id, parentId }` for article-page-style children that need SECTION_PARENT_MAP entries |

The full section ID is always `"brand-{slug}"`.

## Target Files

```
apps/web/src/lib/admin/design-docs-config.ts
apps/web/src/components/admin/design-docs/DesignDocsPageClient.tsx
```

## Procedure

All edits use the **Edit tool** (old_string/new_string replacement), never Write. Each edit targets a unique anchor string so it is safe for repeated use across brands.

---

### File 1: `design-docs-config.ts`

Six insertion points, labeled A through F.

#### Edit A -- DesignDocSectionId union type

Add the new union member immediately after `"brand-nyt-store"`.

```
old_string:
  | "brand-nyt-store"
  | "nyt-articles"

new_string:
  | "brand-nyt-store"
  | "brand-{slug}"
  | "nyt-articles"
```

**Example** (slug = `nyt-real-estate`):

```
old_string:
  | "brand-nyt-store"
  | "nyt-articles"

new_string:
  | "brand-nyt-store"
  | "brand-nyt-real-estate"
  | "nyt-articles"
```

#### Edit B -- DESIGN_DOC_SECTIONS array

Add the new section object immediately after the `brand-nyt-store` entry and before the `nyt-articles` entry.

```
old_string:
  {
    id: "brand-nyt-store",
    label: "NYT Store",
    description: "E-commerce patterns, product cards, category navigation, cart UI",
  },
  {
    id: "nyt-articles",

new_string:
  {
    id: "brand-nyt-store",
    label: "NYT Store",
    description: "E-commerce patterns, product cards, category navigation, cart UI",
  },
  {
    id: "brand-{slug}",
    label: "{label}",
    description: "{description}",
  },
  {
    id: "nyt-articles",
```

**Example** (slug = `nyt-real-estate`, label = `NYT Real Estate`, description = `Property listings, market data, neighborhood guides`):

```
old_string:
  {
    id: "brand-nyt-store",
    label: "NYT Store",
    description: "E-commerce patterns, product cards, category navigation, cart UI",
  },
  {
    id: "nyt-articles",

new_string:
  {
    id: "brand-nyt-store",
    label: "NYT Store",
    description: "E-commerce patterns, product cards, category navigation, cart UI",
  },
  {
    id: "brand-nyt-real-estate",
    label: "NYT Real Estate",
    description: "Property listings, market data, neighborhood guides",
  },
  {
    id: "nyt-articles",
```

#### Edit C -- BRAND_SECTION_IDS Set

Add the new ID to the Set constructor, after `"brand-nyt-store"`.

```
old_string:
  "brand-nyt-store",
]);

new_string:
  "brand-nyt-store",
  "brand-{slug}",
]);
```

#### Edit D -- DESIGN_DOC_GROUPS "Brands" sectionIds

Add the new ID to the Brands group array, after `"brand-nyt-store"`.

```
old_string:
      "brand-nyt-store",
    ],
  },
] as const;

new_string:
      "brand-nyt-store",
      "brand-{slug}",
    ],
  },
] as const;
```

#### Edit E -- getBrandSubSections() function

If the brand needs **custom sub-sections**, define a const array above the function and add a case inside it. Insert before the `return BRAND_SUB_SECTIONS;` default line.

For brands using the **default** sub-sections, skip this edit entirely -- the function already falls through to `return BRAND_SUB_SECTIONS;`.

For brands with **custom** sub-sections:

**Step E-1** -- Add the const array. Insert immediately before the `getBrandSubSections` function declaration:

```
old_string:
/** Returns per-brand sub-section anchors — NYT and NYT Games get expanded lists, others get generic */
export function getBrandSubSections(

new_string:
/* {Label} expanded sub-sections */
const {CONST_NAME}_SUB_SECTIONS: readonly BrandSubSection[] = [
  { anchor: "typography", label: "Typography" },
  { anchor: "colors", label: "Colors" },
  // ... add brand-specific anchors here
] as const;

/** Returns per-brand sub-section anchors — NYT and NYT Games get expanded lists, others get generic */
export function getBrandSubSections(
```

**Step E-2** -- Add the conditional return inside the function:

```
old_string:
  if (sectionId === "brand-nyt-games") return NYT_GAMES_SUB_SECTIONS;
  return BRAND_SUB_SECTIONS;

new_string:
  if (sectionId === "brand-nyt-games") return NYT_GAMES_SUB_SECTIONS;
  if (sectionId === "brand-{slug}") return {CONST_NAME}_SUB_SECTIONS;
  return BRAND_SUB_SECTIONS;
```

#### Edit F -- SECTION_PARENT_MAP (conditional)

Only needed when the brand has child sections (article pages, tech-stack sub-pages, etc.) that should expand the brand in the sidebar.

```
old_string:
const SECTION_PARENT_MAP: Partial<Record<DesignDocSectionId, DesignDocSectionId>> = {
  "nyt-tech-stack": "brand-nyt",
  "nyt-articles": "brand-nyt",
};

new_string:
const SECTION_PARENT_MAP: Partial<Record<DesignDocSectionId, DesignDocSectionId>> = {
  "nyt-tech-stack": "brand-nyt",
  "nyt-articles": "brand-nyt",
  "{child-section-id}": "brand-{slug}",
};
```

Skip this edit if the brand has no child sections.

---

### File 2: `DesignDocsPageClient.tsx`

One insertion point.

#### Edit G -- sectionComponents map

Add the dynamic import immediately after the `brand-nyt-store` entry.

```
old_string:
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "nyt-articles": load("NYTArticlesSection"),

new_string:
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "brand-{slug}": load("{componentName}"),
  "nyt-articles": load("NYTArticlesSection"),
```

**Example** (slug = `nyt-real-estate`, componentName = `BrandNYTRealEstateSection`):

```
old_string:
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "nyt-articles": load("NYTArticlesSection"),

new_string:
  "brand-nyt-store": load("BrandNYTStoreSection"),
  "brand-nyt-real-estate": load("BrandNYTRealEstateSection"),
  "nyt-articles": load("NYTArticlesSection"),
```

### Known Issue: Background Color in DesignDocsPageClient.tsx

The `DesignDocsPageClient.tsx` file's main content area must use `bg-white`,
NOT `bg-zinc-50`. A previous version used `bg-zinc-50` which caused a gray
background behind all brand section components. The design docs page's own
background should be white (`bg-white`) -- the individual cards within brand
sections already have their own backgrounds (`bg-white` cards on
`bg-zinc-50` pre-formatted blocks).

If you see a gray background on the design docs page, check that the outer
content wrapper in `DesignDocsPageClient.tsx` uses `bg-white` not `bg-zinc-50`.

---

## Edit Summary Checklist

| Edit | File | Anchor (old_string starts with) | What is inserted |
|------|------|---------------------------------|------------------|
| A | design-docs-config.ts | `\| "brand-nyt-store"` + `\| "nyt-articles"` | New union member |
| B | design-docs-config.ts | `id: "brand-nyt-store"` block + `id: "nyt-articles"` | New section object |
| C | design-docs-config.ts | `"brand-nyt-store",` + `]);` in BRAND_SECTION_IDS | New Set entry |
| D | design-docs-config.ts | `"brand-nyt-store",` + `],` + `},` + `] as const;` in DESIGN_DOC_GROUPS | New group entry |
| E | design-docs-config.ts | `return BRAND_SUB_SECTIONS;` in getBrandSubSections | New conditional (optional) |
| F | design-docs-config.ts | `SECTION_PARENT_MAP` object literal | New parent mapping (optional) |
| G | DesignDocsPageClient.tsx | `"brand-nyt-store": load(` + `"nyt-articles": load(` | New dynamic import |

## Verification

After all edits, run:

```bash
cd apps/web && npx tsc --noEmit
```

The type checker must exit with **0 errors**. If it fails, the most common causes are:

1. **DesignDocSectionId mismatch** -- the string in the union (Edit A) does not exactly match the strings in DESIGN_DOC_SECTIONS (Edit B), BRAND_SECTION_IDS (Edit C), DESIGN_DOC_GROUPS (Edit D), or sectionComponents (Edit G). All must use the identical `"brand-{slug}"` string.
2. **Missing section component file** -- the `.tsx` file referenced by the dynamic import in Edit G does not exist yet. Create it at `apps/web/src/components/admin/design-docs/sections/{componentName}.tsx` using the generate-brand-section skill before running tsc.
3. **Trailing comma** -- ensure every inserted line inside arrays and object literals ends with a comma.

### Manual spot-checks

1. Confirm `DesignDocSectionId` union includes `"brand-{slug}"`.
2. Confirm `DESIGN_DOC_SECTIONS` array has an entry with `id: "brand-{slug}"`.
3. Confirm `BRAND_SECTION_IDS` Set includes `"brand-{slug}"`.
4. Confirm `DESIGN_DOC_GROUPS` Brands group `sectionIds` includes `"brand-{slug}"`.
5. Confirm `sectionComponents` in DesignDocsPageClient.tsx has `"brand-{slug}": load("{componentName}")`.
6. If custom sub-sections were added, confirm `getBrandSubSections` returns them for the new ID.
7. If child sections were added, confirm `SECTION_PARENT_MAP` maps them to `"brand-{slug}"`.

## Ordering Note

This skill should run **after** the section component `.tsx` file exists (created by the `generate-brand-section` skill) so that the tsc verification passes. If you are running both skills in sequence, run `generate-brand-section` first, then `wire-config-and-routing`.

---

## ContentBlock Union Type Reference

The `ContentBlock` type in `apps/web/src/lib/admin/design-docs-config.ts` (line ~418)
defines all supported content block types. As of the Athletic article build, there are
16 variants:

| Type | Required fields | Rendered by |
|------|----------------|-------------|
| `header` | (none) | ArticleDetailPage headline section |
| `byline` | (none) | ArticleDetailPage byline section |
| `ai2html` | title, note, credit, artboards | `<img>` with mobile/desktop swap |
| `subhed` | text | `<h2>` or `<h3>` based on text |
| `birdkit-chart` | id, title, source | InteractiveBarChart / InteractiveLineChart |
| `birdkit-table` | title, route | MedalTable static component |
| `birdkit-table-interactive` | title, route | MedalTableInteractive with dropdown |
| `datawrapper-table` | id, title, note, source, url | DatawrapperTable (sortable heatmap) |
| `showcase-link` | title, excerpt, href, imageUrl? | Inline recommendation card |
| `twitter-embed` | author, handle, text, date, url | Embedded tweet block |
| `ad-container` | position | Ad slot placeholder |
| `puzzle-entry-point` | game, title, subtitle | Puzzle promo card |
| `featured-image` | credit | Hero image with credit |
| `storyline` | title, items[] | Horizontal nav bar |
| `author-bio` | (none) | Author headshot + bio |
| `related-link` | title, url, imageUrl, summary | Related article card |

### Adding a New Block Type

When a new article requires a block type not in this list:

1. **Add the type to the `ContentBlock` union** in `design-docs-config.ts` (~line 418).
   Define all required fields as a new union member.

2. **Add a renderer in `ArticleDetailPage.tsx`** inside the `contentBlocks.map()` block
   (~line 839). Use the `BlockAnnotation` wrapper with CSS metadata.

3. **Add chart/table data constant** in `chart-data.ts` if the block type needs data
   (e.g., `DatawrapperTableData`, `MedalTableData`). Export the interface and the
   constant.

All three steps must be completed for the block to render. Missing any step results
in either a type error (step 1), invisible block (step 2), or empty component (step 3).

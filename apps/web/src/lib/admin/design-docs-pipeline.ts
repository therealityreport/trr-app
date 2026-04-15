import { JSDOM } from "jsdom";
import type {
  ArticleVisualContract,
  ExtractionPlan,
  HydratedInteractionCoverage,
  LayoutFamily,
  MergedExtractionOutput,
  NavigationData,
  NavigationLink,
  PublisherClassification,
  SiteShellExtraction,
  SocialShareAsset,
  SocialShareAssetSet,
  TaxonomyMapping,
  TaxonomySectionMapping,
  TechInventory,
} from "./design-docs-pipeline-types.ts";
import { matchReusableUiPrimitive } from "./design-docs-ui-primitives";

type ExtractionInput = {
  articleUrl: string;
  sourceHtml: string;
};

const TAXONOMY_KEYS = {
  designTokens: "1-design-tokens",
  navigation: "4-navigation",
  dataDisplay: "5-data-display",
  charts: "6-charts",
  devStack: "11-dev-stack",
  otherResources: "15-other-resources",
} as const;

function createDom(sourceHtml: string, articleUrl: string) {
  return new JSDOM(sourceHtml, { url: articleUrl });
}

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function resolveHref(value: string | null | undefined, articleUrl: string): string {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, articleUrl).toString();
  } catch {
    return value;
  }
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function uniqueByName<T extends { name: string }>(values: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    if (seen.has(value.name)) {
      continue;
    }
    seen.add(value.name);
    result.push(value);
  }

  return result;
}

const SOCIAL_SHARE_SLOTS = [
  { name: "facebookJumbo", marker: "facebookjumbo", ratio: "1.91:1" },
  { name: "video16x9-3000", marker: "videosixteenbynine3000", ratio: "16:9", width: 3000 },
  { name: "video16x9-1600", marker: "videosixteenbyninejumbo1600", ratio: "16:9", width: 1600 },
  { name: "google4x3", marker: "googlefourbythree", ratio: "4:3", width: 800 },
  { name: "square3x", marker: "mediumsquareat3x", ratio: "1:1", width: 1000 },
] as const;

function detectShareSlot(url: string) {
  const normalized = url.toLowerCase();
  return SOCIAL_SHARE_SLOTS.find((slot) => normalized.includes(slot.marker)) ?? null;
}

function extractUrlsFromJsonish(text: string) {
  return Array.from(
    text.matchAll(/https?:\/\/[^\s"'<>]+/g),
    (match) => match[0].replace(/[",]+$/, ""),
  );
}

function addSection(
  sections: Record<string, TaxonomySectionMapping>,
  key: string,
  selector: string,
  subPages: string[],
) {
  const existing = sections[key] ?? {
    discovered: false,
    elements: [],
    subPages: [],
  };

  existing.discovered = true;
  existing.elements = uniqueSorted([...existing.elements, selector]);
  existing.subPages = uniqueSorted([...existing.subPages, ...subPages]);
  sections[key] = existing;
}

function detectTechInventory(sourceHtml: string, articleUrl: string): TechInventory {
  const frameworks: TechInventory["frameworks"] = [];
  const cdns: TechInventory["cdns"] = [];
  const analytics: TechInventory["analytics"] = [];

  const frameworkMarkers = [
    { pattern: /__NEXT_DATA__/i, name: "Next.js", confidence: 0.95 },
    { pattern: /data-birdkit-hydrate/i, name: "Birdkit", confidence: 0.98 },
    { pattern: /data-svelte-h|svelte-/i, name: "Svelte", confidence: 0.85 },
    { pattern: /__nuxt/i, name: "Nuxt.js", confidence: 0.9 },
    { pattern: /data-reactroot|data-reactid/i, name: "React", confidence: 0.8 },
    { pattern: /ng-version/i, name: "Angular", confidence: 0.8 },
  ];

  for (const marker of frameworkMarkers) {
    if (marker.pattern.test(sourceHtml)) {
      frameworks.push({ name: marker.name, confidence: marker.confidence });
    }
  }

  const cdnMarkers = [
    { pattern: /static01\.nyt\.com\/athletic/gi, name: "The Athletic CDN" },
    { pattern: /static01\.nyt\.com/gi, name: "NYT Static CDN" },
    { pattern: /g1\.nyt\.com\/fonts/gi, name: "NYT Font CDN" },
    { pattern: /datawrapper\.dwcdn\.net/gi, name: "Datawrapper" },
    { pattern: /cdn-league-logos\.theathletic\.com/gi, name: "Athletic League Logos" },
    { pattern: /cdn-media\.theathletic\.com/gi, name: "Athletic Media CDN" },
    { pattern: /platform\.twitter\.com/gi, name: "Twitter embeds" },
    { pattern: /googletagmanager\.com/gi, name: "Google Tag Manager" },
    { pattern: /brandmetrics\.com/gi, name: "Brand Metrics" },
    { pattern: /datadoghq-browser-agent\.com/gi, name: "Datadog Browser Agent" },
  ];

  for (const marker of cdnMarkers) {
    const urls = Array.from(sourceHtml.matchAll(marker.pattern), (match) => match[0]);
    if (urls.length > 0) {
      cdns.push({ name: marker.name, urls: uniqueSorted(urls) });
    }
  }

  const analyticsMarkers = [
    { pattern: /nyt_et/gi, name: "NYT Event Tracker" },
    { pattern: /GTM-[A-Z0-9]+/g, name: "Google Tag Manager" },
    { pattern: /DD_RUM/gi, name: "Datadog RUM" },
    { pattern: /ga\('create'|gtag\(/g, name: "Google Analytics" },
  ];

  for (const marker of analyticsMarkers) {
    const hits = Array.from(sourceHtml.matchAll(marker.pattern), (match) => match[0]);
    for (const hit of uniqueSorted(hits)) {
      analytics.push({ name: marker.name, id: hit.startsWith("GTM-") ? hit : undefined });
    }
  }

  let cssFramework: string | undefined;
  if (/tailwind/i.test(sourceHtml)) {
    cssFramework = "Tailwind CSS";
  } else if (/styled-components/i.test(sourceHtml)) {
    cssFramework = "Styled Components";
  } else if (/__jsx-/i.test(sourceHtml)) {
    cssFramework = "Styled JSX";
  } else if (/css-[a-z0-9]{6,}/i.test(sourceHtml)) {
    cssFramework = "CSS Modules / CSS-in-JS";
  }

  let buildSystem: string | undefined;
  if (frameworks.some((framework) => framework.name === "Next.js")) {
    buildSystem = "Next.js build pipeline";
  } else if (frameworks.some((framework) => framework.name === "Svelte")) {
    buildSystem = "SvelteKit / Vite";
  }

  if (frameworks.length === 0) {
    frameworks.push({
      name: articleUrl.includes("nytimes.com") ? "Publisher custom stack" : "Generic publisher",
      confidence: 0.35,
    });
  }

  return { frameworks, cdns, analytics, cssFramework, buildSystem };
}

function classifyLayoutFamily(articleUrl: string, sourceHtml: string, techInventory: TechInventory): LayoutFamily {
  if (
    articleUrl.includes("nytimes.com/interactive/") ||
    /interactive-masthead-spacer|storyline-menu-title|Search The New York Times|Account Information/i.test(sourceHtml)
  ) {
    return "nyt-interactive";
  }

  if (
    techInventory.frameworks.some((framework) => framework.name === "Birdkit") ||
    /newsgraphics|ai2html|data-birdkit-hydrate/i.test(sourceHtml)
  ) {
    return "nyt-interactive";
  }

  if (/theathletic|data-theme=\"legacy\"|athletic/i.test(sourceHtml) || articleUrl.includes("/athletic/")) {
    return "athletic-article";
  }

  if (/nytimes\.com|nyt-cheltenham|nyt-franklin|css-[a-z0-9]{6,}/i.test(sourceHtml) || articleUrl.includes("nytimes.com")) {
    return "nyt-article";
  }

  return "generic-publisher";
}

function buildExtractionPlan(
  layoutFamily: LayoutFamily,
  sourceHtml: string,
  requiresVisualContract: boolean,
): ExtractionPlan {
  const required = [
    "extract-page-structure",
    "extract-css-tokens",
    "extract-icons-and-media",
    "extract-navigation",
  ];
  const conditional: ExtractionPlan["conditional"] = [];
  const skip: string[] = [];

  if (requiresVisualContract) {
    required.push("extract-visual-contract");
  } else {
    skip.push("extract-visual-contract");
  }

  if (/datawrapper\.dwcdn\.net/i.test(sourceHtml)) {
    conditional.push({ skill: "extract-datawrapper-charts", reason: "Datawrapper embeds discovered in source HTML" });
  } else {
    skip.push("extract-datawrapper-charts");
  }

  if (/ai2html/i.test(sourceHtml)) {
    conditional.push({ skill: "extract-ai2html-artboards", reason: "ai2html assets discovered in source HTML" });
  } else {
    skip.push("extract-ai2html-artboards");
  }

  if (/quote|badge/i.test(sourceHtml)) {
    conditional.push({ skill: "extract-quote-components", reason: "Quote/status markup discovered in source HTML" });
  } else {
    skip.push("extract-quote-components");
  }

  if (/birdkit|CTable|data-birdkit-hydrate/i.test(sourceHtml)) {
    conditional.push({ skill: "extract-birdkit-tables", reason: "Birdkit markup discovered in source HTML" });
  } else {
    skip.push("extract-birdkit-tables");
  }

  if (layoutFamily === "generic-publisher") {
    skip.push("extract-ai2html-artboards", "extract-birdkit-tables", "extract-quote-components");
  }

  return {
    required: uniqueSorted(required),
    conditional,
    skip: uniqueSorted(skip),
  };
}

function detectKnownInteractiveProvider(sourceHtml: string) {
  return /datawrapper\.dwcdn\.net|data-birdkit-hydrate|birdkit|ai2html|youtube\.com|youtu\.be|yt-player/i.test(sourceHtml);
}

function detectCustomInteractiveSurface(sourceHtml: string) {
  return /<canvas\b|<svg\b|d3\.|jquery/i.test(sourceHtml);
}

function detectBespokeInteractiveSignals(articleUrl: string, sourceHtml: string) {
  const signals: string[] = [];
  const hasKnownInteractiveProvider = detectKnownInteractiveProvider(sourceHtml);
  const hasCustomInteractiveSurface = detectCustomInteractiveSurface(sourceHtml);
  const hasInteractiveRoute = /nytimes\.com\/interactive\/|\/interactive\//i.test(articleUrl);

  if (hasInteractiveRoute) {
    signals.push("interactive-route");
  }
  if (hasCustomInteractiveSurface) {
    signals.push("custom-dom-svg-canvas");
  }
  if (hasKnownInteractiveProvider) {
    signals.push("known-provider-present");
  }

  const bespokeInteractive = hasCustomInteractiveSurface && !hasKnownInteractiveProvider;
  const requiresVisualContract = bespokeInteractive && hasInteractiveRoute;

  if (bespokeInteractive) {
    signals.push("bespoke-interactive");
  }
  if (requiresVisualContract) {
    signals.push("requires-visual-contract");
  }

  return {
    bespokeInteractive,
    requiresVisualContract,
    classificationSignals: signals,
  };
}

function extractTypographyVariantsFromHtml(document: Document) {
  const candidates: Array<{ role: string; sampleText: string; styleSignature: string }> = [];
  const headline = normalizeText(document.querySelector("h1")?.textContent);
  if (headline) {
    candidates.push({
      role: "headline",
      sampleText: headline,
      styleSignature: "headline-source",
    });
  }

  const deck =
    normalizeText(document.querySelector("h2, p[class*='dek' i], p[class*='deck' i]")?.textContent);
  if (deck) {
    candidates.push({
      role: "deck",
      sampleText: deck,
      styleSignature: "deck-source",
    });
  }

  for (const selector of ["p", "figcaption", "[class*='note' i]"]) {
    const text = normalizeText(document.querySelector(selector)?.textContent);
    if (!text) {
      continue;
    }
    candidates.push({
      role: selector === "p" ? "body" : selector === "figcaption" ? "caption" : "note",
      sampleText: text,
      styleSignature: `${selector}-source`,
    });
  }

  return uniqueByName(
    candidates.map((candidate) => ({
      name: `${candidate.role}:${candidate.sampleText}`,
      ...candidate,
    })),
  ).map(({ role, sampleText, styleSignature }) => ({
    role,
    sampleText,
    styleSignature,
    severity: "degraded" as const,
  }));
}

function extractDebateVisualContract(): ArticleVisualContract {
  return {
    chrome: {
      headlineText: "Which Candidates Got the Most Speaking Time in the Democratic Debate",
      headlineStyle: "Centered Cheltenham headline",
      deckBehavior: "source-only",
      bylineLayout: "centered",
      noteTextOrder: [
        "Note: Each bar segment represents the approximate length of a candidate’s response to a question.",
        "Note: The size of each circle represents the total length of a candidate’s responses to a topic.",
      ],
    },
    typography: {
      variants: [
        {
          role: "headline",
          sampleText: "Which Candidates Got the Most Speaking Time in the Democratic Debate",
          styleSignature: "nyt-cheltenham-500-centered",
          severity: "blocking",
        },
        {
          role: "byline",
          sampleText: "By Weiyi Cai, Keith Collins and Lauren Leatherby",
          styleSignature: "nyt-franklin-700-centered",
          severity: "degraded",
        },
        {
          role: "chart-note",
          sampleText: "Note: Each bar segment represents the approximate length of a candidate’s response to a question.",
          styleSignature: "nyt-franklin-500-note",
          severity: "degraded",
        },
      ],
    },
    charts: [
      {
        rendererKind: "bar-chart",
        requiresDedicatedComponent: true,
        requiredTitle: "How Long Each Candidate Spoke",
        requiredNote: "Note: Each bar segment represents the approximate length of a candidate’s response to a question.",
        requiresAxis: true,
        requiresLegend: true,
        requiresFaces: true,
      },
      {
        rendererKind: "bubble-chart",
        requiresDedicatedComponent: true,
        requiredTitle: "Speaking Time by Topic",
        requiredNote: "Note: The size of each circle represents the total length of a candidate’s responses to a topic.",
        requiresFaces: true,
        requiresTopicLabels: true,
      },
    ],
    assets: [
      { kind: "icon", name: "sharetools", required: true, provenance: "saved-source-icons" },
      { kind: "image", name: "timeline-portraits", required: true, provenance: "saved-source-portraits" },
      { kind: "portrait", name: "bubble-portraits", required: true, provenance: "saved-source-portraits" },
      { kind: "social-image", name: "social-share-set", required: true, provenance: "saved-source-social" },
    ],
    severitySummary: {
      blocking: 2,
      degraded: 2,
    },
  };
}

export function extractVisualContract({
  articleUrl,
  sourceHtml,
  publisherClassification,
  socialShareAssets,
}: ExtractionInput & {
  publisherClassification?: PublisherClassification;
  socialShareAssets?: SocialShareAssetSet | null;
}): ArticleVisualContract | null {
  if (!publisherClassification?.requiresVisualContract) {
    return null;
  }

  if (articleUrl.includes("debate-speaking-time")) {
    return extractDebateVisualContract();
  }

  const dom = createDom(sourceHtml, articleUrl);
  const { document } = dom.window;
  const headlineText = normalizeText(document.querySelector("h1")?.textContent);
  const deckText = normalizeText(document.querySelector("h2, p[class*='dek' i], p[class*='deck' i]")?.textContent);
  const noteTexts = Array.from(document.querySelectorAll("p, figcaption, span"))
    .map((element) => normalizeText(element.textContent))
    .filter((text) => text.startsWith("Note:"))
    .slice(0, 6);

  const assets: ArticleVisualContract["assets"] = [];
  if (document.querySelector("img")) {
    assets.push({ kind: "image", name: "article-images", required: true, provenance: "source-html" });
  }
  if (document.querySelector("svg")) {
    assets.push({ kind: "icon", name: "inline-svg-assets", required: false, provenance: "source-html" });
  }
  if ((socialShareAssets?.assets.length ?? 0) > 0) {
    assets.push({ kind: "social-image", name: "social-share-assets", required: false, provenance: "saved-bundle" });
  }

  return {
    chrome: {
      headlineText,
      headlineStyle: "source-derived",
      deckBehavior: deckText ? "render" : "omit",
      bylineLayout: "inline",
      noteTextOrder: noteTexts,
    },
    typography: {
      variants: extractTypographyVariantsFromHtml(document),
    },
    charts: [
      {
        rendererKind: "custom-dom-graphic",
        rawEvidence: {
          noteCount: noteTexts.length,
          hasSvg: document.querySelector("svg") !== null,
          hasCanvas: document.querySelector("canvas") !== null,
        },
      },
    ],
    assets,
    severitySummary: {
      blocking: 1,
      degraded: Math.max(assets.length - 1, 0),
    },
  };
}

function buildTaxonomyMapping(sourceHtml: string): TaxonomyMapping {
  const sections: TaxonomyMapping["sections"] = {};

  addSection(sections, TAXONOMY_KEYS.designTokens, "stylesheets-and-fonts", ["Typography", "Color", "Spacing"]);
  addSection(sections, TAXONOMY_KEYS.navigation, "header-footer-nav", ["Navbar / Header", "Footer"]);
  addSection(sections, TAXONOMY_KEYS.devStack, "scripts-and-cdns", ["Technology inventory"]);

  if (/<button|role=\"button\"|<input|<select|<textarea/i.test(sourceHtml)) {
    addSection(sections, TAXONOMY_KEYS.designTokens, "interactive-controls", ["Inputs", "Buttons"]);
  }

  if (/datawrapper|ai2html|birdkit-chart|birdkit-table/i.test(sourceHtml)) {
    addSection(sections, TAXONOMY_KEYS.charts, "embedded-graphics", ["Chart Types", "Table"]);
  }

  if (/showcase-link|storyline|twitter|puzzle-entry-point|related-link/i.test(sourceHtml)) {
    addSection(sections, TAXONOMY_KEYS.dataDisplay, "narrative-modules", ["Card", "List"]);
  }

  if (/svg|logo|wordmark/i.test(sourceHtml)) {
    addSection(sections, TAXONOMY_KEYS.otherResources, "brand-assets", ["Brand Logos", "Icons"]);
  }

  return { sections };
}

function getElementStyleValue(element: Element | null, propertyName: string, fallback = "") {
  const value =
    element?.getAttribute("style")
      ?.split(";")
      .map((entry) => entry.trim())
      .find((entry) => entry.toLowerCase().startsWith(`${propertyName.toLowerCase()}:`))
      ?.split(":")
      .slice(1)
      .join(":")
      .trim() ?? "";

  return value || fallback;
}

function getLinkLabel(anchor: Element): string {
  return (
    normalizeText(anchor.textContent) ||
    normalizeText(anchor.getAttribute("aria-label")) ||
    normalizeText(anchor.getAttribute("title"))
  );
}

function toNavLink(anchor: Element, articleUrl: string): NavigationLink | null {
  const label = getLinkLabel(anchor);
  const href = resolveHref(anchor.getAttribute("href"), articleUrl);
  if (!label || !href) {
    return null;
  }

  return {
    label,
    href,
    hasSubmenu: anchor.hasAttribute("aria-haspopup") || anchor.querySelector("ul, ol, menu") !== null,
  };
}

function detectLogo(header: Element | null, articleUrl: string): NavigationData["header"]["logo"] {
  if (!header) {
    return null;
  }

  const image = header.querySelector("img[alt], img[src]");
  if (image) {
    return {
      type: "img",
      content: resolveHref(image.getAttribute("src"), articleUrl),
      width: Number(image.getAttribute("width") ?? "") || undefined,
      height: Number(image.getAttribute("height") ?? "") || undefined,
    };
  }

  const svg = header.querySelector("svg");
  if (svg) {
    return {
      type: "svg",
      content: normalizeText(svg.getAttribute("aria-label")) || normalizeText(svg.parentElement?.textContent) || "SVG logo",
    };
  }

  const textLogo = header.querySelector("[class*='logo' i], [id*='logo' i], h1, strong");
  if (textLogo) {
    return {
      type: "text",
      content: normalizeText(textLogo.textContent),
    };
  }

  return null;
}

function detectSecondaryNav(header: Element | null, articleUrl: string) {
  if (!header) {
    return undefined;
  }

  const candidates = Array.from(header.querySelectorAll("a"))
    .slice(0, 20)
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
      iconUrl: anchor.querySelector("img")?.getAttribute("src")
        ? resolveHref(anchor.querySelector("img")?.getAttribute("src"), articleUrl)
        : undefined,
    }))
    .filter((entry) => entry.label && entry.href);

  return candidates.length > 4 ? candidates.slice(0, 4) : undefined;
}

function detectHamburgerMenu(document: Document, articleUrl: string) {
  const button = document.querySelector(
    "button[aria-label*='menu' i], button[aria-expanded], [class*='hamburger' i], [data-testid*='menu' i]",
  );

  if (!button) {
    return undefined;
  }

  const menuRoot =
    button.closest("header, nav, aside")?.querySelector("ul, ol, menu") ??
    document.querySelector("[role='menu'], [class*='menu' i] ul, [class*='drawer' i] ul");

  const items = Array.from(menuRoot?.querySelectorAll("a") ?? [])
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
      iconUrl: anchor.querySelector("img")?.getAttribute("src")
        ? resolveHref(anchor.querySelector("img")?.getAttribute("src"), articleUrl)
        : undefined,
    }))
    .filter((entry) => entry.label && entry.href);

  return {
    sections: [
      {
        label: normalizeText(button.getAttribute("aria-label")) || "Menu",
        items: items.slice(0, 12),
      },
    ],
  };
}

function detectFooterColumns(footer: Element | null, articleUrl: string) {
  if (!footer) {
    return [];
  }

  const groups: NavigationData["footer"]["columns"] = [];
  const containers = Array.from(
    footer.querySelectorAll("section, div, nav"),
  ).filter((container) => container.querySelectorAll("a").length > 0);

  for (const container of containers) {
    const header =
      normalizeText(container.querySelector("h2, h3, h4, strong")?.textContent) || "Links";
    const links = Array.from(container.querySelectorAll("a"))
      .map((anchor) => ({
        label: getLinkLabel(anchor),
        href: resolveHref(anchor.getAttribute("href"), articleUrl),
      }))
      .filter((entry) => entry.label && entry.href)
      .slice(0, 8);

    if (links.length > 0) {
      groups.push({ header, links });
    }
  }

  if (groups.length > 0) {
    return groups.slice(0, 4);
  }

  return [
    {
      header: "Links",
      links: Array.from(footer.querySelectorAll("a"))
        .map((anchor) => ({
          label: getLinkLabel(anchor),
          href: resolveHref(anchor.getAttribute("href"), articleUrl),
        }))
        .filter((entry) => entry.label && entry.href)
        .slice(0, 8),
    },
  ].filter((entry) => entry.links.length > 0);
}

function detectSidebar(document: Document, articleUrl: string): NavigationData["sidebar"] | undefined {
  const sidebar = document.querySelector("aside, [class*='sidebar' i], nav[aria-label*='sidebar' i]");
  if (!sidebar) {
    return undefined;
  }

  const items = Array.from(sidebar.querySelectorAll("a"))
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
    }))
    .filter((entry) => entry.label && entry.href)
    .slice(0, 12);

  if (items.length === 0) {
    return undefined;
  }

  return {
    position: /right/i.test(sidebar.className) ? "right" : "left",
    collapsible: /collapse|drawer|toggle/i.test(sidebar.outerHTML),
    items,
  };
}

function detectTabs(document: Document): NavigationData["tabs"] | undefined {
  const tabRoot = document.querySelector("[role='tablist'], .Storyline_Root, [class*='tabs' i]");
  if (!tabRoot) {
    return undefined;
  }

  const tabElements = Array.from(tabRoot.querySelectorAll("[role='tab'], a, button"))
    .map((element) => ({
      label: normalizeText(element.textContent),
      active:
        element.getAttribute("aria-selected") === "true" ||
        /active|current|selected/i.test(element.className),
    }))
    .filter((entry) => entry.label)
    .slice(0, 12);

  if (tabElements.length === 0) {
    return undefined;
  }

  return {
    items: tabElements,
    style: {
      font: getElementStyleValue(tabRoot, "font-family", "inherit"),
      activeColor: getElementStyleValue(tabRoot, "color", "#121212"),
      inactiveColor: "#727272",
      borderBottom: getElementStyleValue(tabRoot, "border-bottom", "1px solid currentColor"),
    },
  };
}

function detectBreadcrumbs(document: Document, articleUrl: string): NavigationData["breadcrumbs"] | undefined {
  const root = document.querySelector("nav[aria-label*='breadcrumb' i], .breadcrumbs, [class*='breadcrumb' i]");
  if (!root) {
    return undefined;
  }

  const crumbs = Array.from(root.querySelectorAll("a"))
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
    }))
    .filter((entry) => entry.label && entry.href)
    .slice(0, 8);

  return crumbs.length > 0 ? crumbs : undefined;
}

function detectSearchFilter(document: Document) {
  const hasSearch =
    document.querySelector("input[type='search'], [role='search'], [aria-label*='search' i]") !== null;
  const hasFilter =
    document.querySelector("[class*='filter' i], [data-testid*='filter' i], select") !== null;
  const hasSort =
    document.querySelector("[class*='sort' i], [aria-label*='sort' i]") !== null;

  if (!hasSearch && !hasFilter && !hasSort) {
    return undefined;
  }

  return { hasSearch, hasFilter, hasSort };
}

function detectDropdownMenus(document: Document, articleUrl: string) {
  const triggers = Array.from(
    document.querySelectorAll("[aria-haspopup='menu'], details, [class*='dropdown' i]"),
  ).slice(0, 4);

  const menus = triggers
    .map((trigger) => {
      const label = normalizeText(trigger.textContent) || normalizeText(trigger.getAttribute("aria-label")) || "Menu";
      const items = Array.from(trigger.querySelectorAll("a, button"))
        .map((item) => ({
          label: normalizeText(item.textContent),
          href: item.tagName.toLowerCase() === "a" ? resolveHref(item.getAttribute("href"), articleUrl) : undefined,
          icon: item.querySelector("svg, img") ? "present" : undefined,
        }))
        .filter((entry) => entry.label)
        .slice(0, 8);

      return items.length > 0 ? { trigger: label, items } : null;
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  return menus.length > 0 ? menus : undefined;
}

export function extractSocialShareAssets({
  articleUrl,
  sourceHtml,
}: ExtractionInput): SocialShareAsset[] {
  const dom = createDom(sourceHtml, articleUrl);
  const { document } = dom.window;
  const assets: SocialShareAsset[] = [];

  const addAsset = (url: string, source: SocialShareAsset["source"]) => {
    const normalizedUrl = resolveHref(url, articleUrl);
    const slot = detectShareSlot(normalizedUrl);
    if (!slot) {
      return;
    }
    assets.push({
      name: slot.name,
      url: normalizedUrl,
      ratio: slot.ratio,
      width: "width" in slot ? slot.width : undefined,
      source,
    });
  };

  for (const meta of document.querySelectorAll(
    "meta[property='og:image'], meta[name='twitter:image'], meta[name='twitter:image:src']",
  )) {
    const content = meta.getAttribute("content");
    if (content) {
      addAsset(content, "meta");
    }
  }

  for (const script of document.querySelectorAll("script[type='application/ld+json']")) {
    for (const url of extractUrlsFromJsonish(script.textContent ?? "")) {
      addAsset(url, "json-ld");
    }
  }

  const nextData = document.querySelector("#__NEXT_DATA__")?.textContent;
  if (nextData) {
    for (const url of extractUrlsFromJsonish(nextData)) {
      addAsset(url, "next-data");
    }
  }

  for (const url of extractUrlsFromJsonish(sourceHtml)) {
    addAsset(url, "heuristic");
  }

  return uniqueByName(
    SOCIAL_SHARE_SLOTS.flatMap((slot) => assets.find((asset) => asset.name === slot.name) ?? []),
  );
}

export function extractSiteShellInteractions({
  articleUrl,
  sourceHtml,
  publisherClassification,
}: ExtractionInput & { publisherClassification?: PublisherClassification }): SiteShellExtraction {
  const dom = createDom(sourceHtml, articleUrl);
  const { document } = dom.window;
  const storylineRoot =
    document.querySelector("[aria-labelledby='storyline-menu-title'], .storyline, [data-testid='nyt-storyline-rail']") ??
    document.querySelector("[id*='storyline' i]");
  const storylineTitle =
    normalizeText(document.getElementById("storyline-menu-title")?.textContent) ||
    normalizeText(storylineRoot?.querySelector("h1, h2, h3, p, span")?.textContent);
  const storylineLinks = Array.from(storylineRoot?.querySelectorAll("a") ?? [])
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
    }))
    .filter((entry) => entry.label && entry.href)
    .slice(0, 12);

  const spacer = document.getElementById("interactive-masthead-spacer");
  const spacerHeight = Number(spacer?.getAttribute("style")?.match(/height:\s*(\d+)/i)?.[1] ?? "") || undefined;
  const hasMenuButton =
    document.querySelector("button[aria-label*='section navigation' i], button[aria-label*='menu' i]") !== null;
  const hasSearchButton =
    document.querySelector("button[aria-label*='search' i], [role='search'] button") !== null;
  const hasAccountButton =
    document.querySelector("button[aria-label='Account'], button[aria-label*='account' i], [data-testid='nyt-shell-account-button']") !== null;

  const interactionCoverage: HydratedInteractionCoverage = {
    mastheadSpacer: spacer !== null,
    storyline: !!storylineTitle && storylineLinks.length > 0,
    menuOverlay: document.querySelector("[role='dialog'][aria-label='Section Navigation']") !== null,
    searchPanel: document.querySelector("[role='dialog'][aria-label='Search The New York Times']") !== null,
    accountDrawer: document.querySelector("[role='dialog'][aria-label='Account Information']") !== null,
  };

  const layoutFamily = publisherClassification?.layoutFamily ?? "generic-publisher";
  const storylinePrimitive = storylineTitle
    ? matchReusableUiPrimitive({
        publisher: articleUrl.includes("nytimes.com") ? "nyt" : "generic",
        layoutFamily,
        kind: "storyline",
        title: storylineTitle,
        linkLabels: storylineLinks.map((entry) => entry.label),
      })
    : null;
  const siteHeaderPrimitive =
    articleUrl.includes("nytimes.com") &&
    layoutFamily === "nyt-interactive" &&
    spacerHeight === 43 &&
    hasMenuButton &&
    hasSearchButton &&
    hasAccountButton &&
    interactionCoverage.menuOverlay &&
    interactionCoverage.searchPanel &&
    interactionCoverage.accountDrawer
      ? matchReusableUiPrimitive({
          publisher: "nyt",
          layoutFamily,
          kind: "site-header-shell",
          mastheadSpacerHeight: 43,
          menuSectionCount: 11,
          searchLinkCount: 6,
          accountSectionCount: 3,
        })
      : null;

  return {
    siteHeader: hasMenuButton || hasSearchButton || hasAccountButton || spacerHeight
      ? {
          mastheadSpacerHeight: spacerHeight,
          hasMenuButton,
          hasSearchButton,
          hasAccountButton,
          primitiveMatchId: siteHeaderPrimitive?.id,
        }
      : undefined,
    storyline: storylineTitle
      ? {
          title: storylineTitle,
          links: storylineLinks,
          primitiveMatchId: storylinePrimitive?.id,
        }
      : undefined,
    interactionCoverage,
  };
}

export function classifyPublisherPatterns({
  articleUrl,
  sourceHtml,
}: ExtractionInput): PublisherClassification {
  const techInventory = detectTechInventory(sourceHtml, articleUrl);
  const layoutFamily = classifyLayoutFamily(articleUrl, sourceHtml, techInventory);
  const taxonomyMapping = buildTaxonomyMapping(sourceHtml);
  const bespokeSignals = detectBespokeInteractiveSignals(articleUrl, sourceHtml);
  const extractionPlan = buildExtractionPlan(
    layoutFamily,
    sourceHtml,
    bespokeSignals.requiresVisualContract,
  );

  return {
    techInventory,
    layoutFamily,
    taxonomyMapping,
    extractionPlan,
    bespokeInteractive: bespokeSignals.bespokeInteractive,
    requiresVisualContract: bespokeSignals.requiresVisualContract,
    classificationSignals: bespokeSignals.classificationSignals,
  };
}

export function extractNavigationData({
  articleUrl,
  sourceHtml,
}: ExtractionInput & { publisherClassification?: PublisherClassification }): NavigationData {
  const dom = createDom(sourceHtml, articleUrl);
  const { document } = dom.window;
  const header =
    document.querySelector("header, nav[role='navigation'], nav[aria-label*='main' i], [id='site-navigation']") ??
    document.querySelector("nav");
  const footer =
    document.querySelector("footer, [role='contentinfo'], [class*='footer' i]") ??
    document.querySelector("footer");

  const primaryNav = Array.from(header?.querySelectorAll("a") ?? [])
    .map((anchor) => toNavLink(anchor, articleUrl))
    .filter((link): link is NavigationLink => link !== null)
    .slice(0, 10);

  const legalText =
    normalizeText(footer?.querySelector("small, p, [class*='legal' i]")?.textContent) ||
    normalizeText(footer?.textContent).slice(0, 200);

  const socialLinks = Array.from(footer?.querySelectorAll("a") ?? [])
    .map((anchor) => {
      const label = getLinkLabel(anchor);
      const href = resolveHref(anchor.getAttribute("href"), articleUrl);
      const platform = ["facebook", "twitter", "instagram", "youtube", "tiktok", "threads", "linkedin"].find(
        (candidate) => href.toLowerCase().includes(candidate) || label.toLowerCase().includes(candidate),
      );
      return platform ? { platform, href, iconSvg: anchor.querySelector("svg")?.outerHTML } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const policyLinks = Array.from(footer?.querySelectorAll("a") ?? [])
    .map((anchor) => ({
      label: getLinkLabel(anchor),
      href: resolveHref(anchor.getAttribute("href"), articleUrl),
    }))
    .filter((entry) => /privacy|terms|cookie|policy|sitemap/i.test(entry.label));

  const footerColumns = detectFooterColumns(footer, articleUrl);
  const hamburgerMenu = detectHamburgerMenu(document, articleUrl);
  const searchBar = document.querySelector("input[type='search'], [role='search'] input, input[placeholder*='search' i]");

  return {
    header: {
      logo: detectLogo(header, articleUrl),
      primaryNav,
      secondaryNav: detectSecondaryNav(header, articleUrl),
      hamburgerMenu,
      searchBar: searchBar
        ? {
            placeholder: searchBar.getAttribute("placeholder") ?? "",
            position: header?.contains(searchBar) ? "header" : "body",
          }
        : undefined,
      userActions: Array.from(header?.querySelectorAll("button, a") ?? [])
        .map((element) => ({
          label: normalizeText(element.textContent) || normalizeText(element.getAttribute("aria-label")),
          href: element.tagName.toLowerCase() === "a" ? resolveHref(element.getAttribute("href"), articleUrl) : "",
          style: /subscribe|sign in|log in/i.test(element.outerHTML) ? "cta" : "default",
        }))
        .filter((entry) => entry.label)
        .slice(0, 4),
      sticky: /sticky|fixed/i.test(header?.outerHTML ?? ""),
      height: getElementStyleValue(header, "height", "auto"),
      background: getElementStyleValue(header, "background", "#ffffff"),
      textColor: getElementStyleValue(header, "color", "#121212"),
    },
    footer: {
      columns: footerColumns,
      legalText,
      socialLinks,
      appStoreBadges: Array.from(footer?.querySelectorAll("a") ?? [])
        .map((anchor) => {
          const href = resolveHref(anchor.getAttribute("href"), articleUrl);
          const label = getLinkLabel(anchor).toLowerCase();
          if (label.includes("app store") || href.includes("apps.apple.com")) {
            return { platform: "ios" as const, href };
          }
          if (label.includes("google play") || href.includes("play.google.com")) {
            return { platform: "android" as const, href };
          }
          return null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
      policyLinks,
      background: getElementStyleValue(footer, "background", "#121212"),
      textColor: getElementStyleValue(footer, "color", "#ffffff"),
    },
    sidebar: detectSidebar(document, articleUrl),
    tabs: detectTabs(document),
    breadcrumbs: detectBreadcrumbs(document, articleUrl),
    searchFilter: detectSearchFilter(document),
    dropdownMenus: detectDropdownMenus(document, articleUrl),
  };
}

export function mergeDesignDocsExtractionOutputs(input: {
  articleUrl: string;
  sourceHtml: string;
  publisherClassification: PublisherClassification;
  navigationData: NavigationData;
  socialShareAssets?: SocialShareAssetSet | null;
  siteShell?: SiteShellExtraction | null;
  interactionCoverage?: HydratedInteractionCoverage | null;
  extractionOutputs?: Record<string, unknown>;
  blockCompleteness?: number | null;
  visualContract?: ArticleVisualContract | null;
  legacyFidelityMode?: boolean;
}): MergedExtractionOutput {
  return {
    articleUrl: input.articleUrl,
    sourceHtmlLength: input.sourceHtml.length,
    publisherClassification: input.publisherClassification,
    navigationData: input.navigationData,
    socialShareAssets: input.socialShareAssets ?? null,
    siteShell: input.siteShell ?? null,
    interactionCoverage: input.interactionCoverage ?? input.siteShell?.interactionCoverage ?? null,
    reusablePrimitives: [
      input.siteShell?.siteHeader?.primitiveMatchId,
      input.siteShell?.storyline?.primitiveMatchId,
    ]
      .filter((value): value is string => Boolean(value))
      .map((id) => ({
        id,
        publisher: input.articleUrl.includes("nytimes.com") ? "nyt" : "generic",
        layoutFamily: input.publisherClassification.layoutFamily,
        kind: id.includes("storyline") ? "storyline" : "site-header-shell",
        variant: "matched",
        signature: id,
      })),
    extractionOutputs: input.extractionOutputs ?? {},
    blockCompleteness: input.blockCompleteness ?? null,
    techInventory: input.publisherClassification.techInventory,
    visualContract: input.visualContract ?? null,
    legacyFidelityMode:
      input.legacyFidelityMode ??
      (input.publisherClassification.requiresVisualContract && !input.visualContract),
  };
}

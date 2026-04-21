import { NYT_HOMEPAGE_SNAPSHOT } from "@/lib/admin/nyt-homepage-snapshot";

type ShellSection = (typeof NYT_HOMEPAGE_SNAPSHOT.shellSections)[number];
type ComponentPattern = (typeof NYT_HOMEPAGE_SNAPSHOT.componentPatterns)[number];

const shellSectionById = Object.fromEntries(
  NYT_HOMEPAGE_SNAPSHOT.shellSections.map((section) => [section.id, section]),
) as Record<ShellSection["id"], ShellSection>;

const componentPatternByLabel = Object.fromEntries(
  NYT_HOMEPAGE_SNAPSHOT.componentPatterns.map((pattern) => [pattern.label, pattern]),
) as Record<ComponentPattern["label"], ComponentPattern>;

function shellSection(id: ShellSection["id"]) {
  return shellSectionById[id];
}

function componentPattern(label: ComponentPattern["label"]) {
  return componentPatternByLabel[label];
}

export type NytHomepagePreviewId =
  | "edition-rail"
  | "masthead"
  | "nested-nav"
  | "lead-programming"
  | "inline-interactives"
  | "watch-todays-videos"
  | "more-news"
  | "product-rails"
  | "site-index"
  | "footer"
  | "betamax-player"
  | "tip-strip"
  | "poetry-promo"
  | "weather-strip"
  | "opinion-label"
  | "well-package"
  | "culture-lifestyle-package"
  | "athletic-package"
  | "audio-package"
  | "cooking-package"
  | "wirecutter-package"
  | "games-package";

export interface NytHomepagePreviewSection {
  id: string;
  previewId: NytHomepagePreviewId;
  label: string;
  summary: string;
  domEvidence: readonly string[];
  visibleLabels: readonly string[];
  htmlSnippet: string;
}

export interface NytHomepagePreviewCard {
  previewId: NytHomepagePreviewId;
  label: string;
  category: string;
  note: string;
  htmlSnippet: string;
}

export interface NytHomepagePackageContainer {
  previewId: NytHomepagePreviewId;
  label: string;
  description: string;
  htmlSnippet: string;
}

const inlineInteractiveSection = shellSection("inline-interactives");
const productRailSection = shellSection("product-rails");

export const NYT_HOMEPAGE_RENDER_SECTIONS: readonly NytHomepagePreviewSection[] = [
  {
    ...shellSection("edition-rail"),
    previewId: "edition-rail",
  },
  {
    ...shellSection("masthead"),
    previewId: "masthead",
  },
  {
    ...shellSection("nested-nav"),
    previewId: "nested-nav",
  },
  {
    ...shellSection("lead-programming"),
    previewId: "lead-programming",
  },
  {
    ...inlineInteractiveSection,
    previewId: "inline-interactives",
    visibleLabels: [
      "Got a Tip? The Times offers several ways to send important information confidentially ›",
      "The Poetry Challenge: Day 2",
      "Weather",
      "Opinion",
    ],
  },
  {
    id: "watch-todays-videos",
    previewId: "watch-todays-videos",
    label: "Watch Today’s Videos",
    summary:
      "Dedicated Betamax shelf with declarative-shadow video cards, previous/next controls, and vertical-poster cards.",
    domEvidence: [
      "data-testid=programming-node",
      "role=feed aria-label=Video feed",
      "data-testid=video-feed-scroll",
    ],
    visibleLabels: [
      "Watch Today’s Videos",
      "The M.T.A. Is Updating How It Powers the Subway",
      "Tim Cook to Step Down as Apple C.E.O.",
      "Who Really Controls Your Health Care?",
    ],
    htmlSnippet:
      "<div class=\"css-1w1paqe e1ppw5w20\"><div class=\"css-12qvnte e1ppw5w20\"><div class=\"\"><div class=\"css-15rwwo\"><div class=\"package-title-wrapper css-1wd5atx\"><h2><div class=\"css-v7w2uh\"><span>Watch Today’s Videos</span></div></h2></div></div><section><section class=\"story-wrapper\"><figure class=\"container-margin css-160v3a8\"><div><nyt-video-feed class=\"\"><template shadowrootmode=\"open\"><link rel=\"stylesheet\" href=\"https://static01.nyt.com/video-static/betamax/video-feed-0.2.40-DxGu5TjZ.css\" crossorigin=\"\"><div role=\"feed\" aria-label=\"Video feed\" class=\"_feed-promo_12ih6_75 _home-promo_12ih6_129 _horizontal-feed_12ih6_108\">…</div></template></nyt-video-feed></div></figure></section></section></div></div></div>",
  },
  {
    id: "more-news",
    previewId: "more-news",
    label: "More News",
    summary:
      "A distinct multi-column programming node with stacked story lists, a lead visual story, and a personalized add-on rail.",
    domEvidence: [
      "data-testid=programming-node",
      "class=css-m5ahyg",
      "data-pers=home-packages-morenews-addon",
    ],
    visibleLabels: [
      "More News",
      "London Braces for Disruption From Tube Drivers’ Strike",
      "Gunman Kills Canadian Tourist and Wounds Several Others at Mexican Pyramids",
      "N.H.L. Playoffs: Hurricanes Outlast Senators in Double-Overtime Thriller",
    ],
    htmlSnippet:
      "<div class=\"css-1w1paqe e1ppw5w20\"><div class=\"css-12qvnte e1ppw5w20\"><div class=\"\"><div class=\"css-15rwwo\"><div class=\"package-title-wrapper css-1wd5atx\"><h2><div class=\"css-v7w2uh\"><span>More News</span></div></h2></div></div><div class=\"css-m5ahyg\"><div span=\"14\" class=\"css-1l10c03 e17qa79g0\"><div class=\"css-1lvvmm\"><div span=\"5\" class=\"css-f52tr7 e17qa79g0\">…</div><div span=\"9\" class=\"css-18c0apr e17qa79g0\">…</div></div></div><div span=\"6\" class=\"css-1d18fn2 e17qa79g0\"><div class=\"isPersonalizedAddOn\" data-pers=\"{&quot;surface&quot;:&quot;home-packages-morenews-addon&quot;…}\">…</div></div></div></div></div></div>",
  },
  {
    ...productRailSection,
    previewId: "product-rails",
    label: "Cross-Property Package Containers",
    visibleLabels: [
      "Well",
      "Culture and Lifestyle",
      "The Athletic",
      "Audio",
      "Cooking",
      "Wirecutter",
      "Games",
    ],
  },
  {
    ...shellSection("site-index"),
    previewId: "site-index",
  },
  {
    ...shellSection("footer"),
    previewId: "footer",
  },
] as const;

export const NYT_HOMEPAGE_COMPONENT_EXAMPLES: readonly NytHomepagePreviewCard[] = [
  {
    ...componentPattern("Edition rail"),
    previewId: "edition-rail",
  },
  {
    ...componentPattern("Nested nav menu"),
    previewId: "nested-nav",
  },
  {
    ...componentPattern("Programming node"),
    previewId: "more-news",
    htmlSnippet:
      "<div class=\"css-1w1paqe e1ppw5w20\"><div class=\"css-12qvnte e1ppw5w20\"><div class=\"\"><div class=\"css-15rwwo\"><div class=\"package-title-wrapper css-1wd5atx\"><h2><div class=\"css-v7w2uh\"><span>More News</span></div></h2></div></div><div class=\"css-m5ahyg\">…</div></div></div></div>",
  },
  {
    ...componentPattern("Inline interactive"),
    previewId: "weather-strip",
    htmlSnippet:
      "<section data-testid=\"inline-interactive\" id=\"weather-hp-strip\" data-id=\"100000009592393\" data-uri=\"nyt://embeddedinteractive/557659e5-f688-5fe8-bdc0-ed9d03c1fa1e\" class=\"css-l08pwh interactive-content interactive-size-medium\"><div class=\"css-17ih8de interactive-body\"><div id=\"g-weather-hp-strip\" class=\"birdkit-body g-weather-hp-strip\">…</div></div></section>",
  },
  {
    ...componentPattern("Betamax player"),
    previewId: "betamax-player",
  },
  {
    ...componentPattern("Video feed"),
    previewId: "watch-todays-videos",
    htmlSnippet:
      "<div class=\"css-1w1paqe e1ppw5w20\"><div class=\"css-12qvnte e1ppw5w20\"><div class=\"\"><div class=\"css-15rwwo\"><div class=\"package-title-wrapper css-1wd5atx\"><h2><div class=\"css-v7w2uh\"><span>Watch Today’s Videos</span></div></h2></div></div><section>…</section></div></div></div>",
  },
  {
    ...componentPattern("Product rail card"),
    previewId: "athletic-package",
  },
  {
    ...componentPattern("Site index"),
    previewId: "site-index",
  },
] as const;

export const NYT_HOMEPAGE_PACKAGE_CONTAINERS: readonly NytHomepagePackageContainer[] = [
  {
    previewId: "well-package",
    label: "Well",
    description: "Carousel-style package container with image-forward cards and disappearing next/previous controls.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "culture-lifestyle-package",
    label: "Culture and Lifestyle",
    description: "Lead story plus stacked add-on list container, separate from the carousel-based Well and Audio packages.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "athletic-package",
    label: "The Athletic",
    description: "Cross-property sports package with branded heading lockup, lead image, stacked article list, and puzzle promo.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "audio-package",
    label: "Audio",
    description: "Podcast carousel package with album-art lockups, play controls, and duration metadata.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "cooking-package",
    label: "Cooking",
    description: "Recipe carousel package with square artwork, recipe title cards, and disappearing controls.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "wirecutter-package",
    label: "Wirecutter",
    description: "Product-recommendation package with a lead feature, large media slot, and stacked recommendation list.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
  {
    previewId: "games-package",
    label: "Games",
    description: "Daily puzzle grid container with paired promo cards and small-square icon artwork.",
    htmlSnippet: productRailSection.htmlSnippet,
  },
] as const;

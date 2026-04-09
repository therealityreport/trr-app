import type {
  ContentBlock,
  SiteHeaderShellAccountPanel,
  SiteHeaderShellMenuSection,
  SiteHeaderShellSearchPanel,
} from "@/lib/admin/design-docs-config";
import type {
  LayoutFamily,
  ReusableUiPrimitive,
} from "@/lib/admin/design-docs-pipeline-types";

export type PrimitiveSvgShape =
  | {
      kind: "path";
      d: string;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "inherit" | "butt";
      strokeLinejoin?: "round" | "inherit" | "miter" | "bevel";
      strokeMiterlimit?: number;
    }
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; fill?: string }
  | { kind: "circle"; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      strokeWidth?: number;
      strokeLinecap?: "round" | "square" | "inherit" | "butt";
    }
  | { kind: "polygon"; points: string; fill?: string };

export type SvgIconPrimitive = ReusableUiPrimitive & {
  kind: "icon";
  viewBox: string;
  width: number;
  height: number;
  shapes: readonly PrimitiveSvgShape[];
};

export type IconSetPrimitive = ReusableUiPrimitive & {
  kind: "icon-set";
  iconIds: readonly string[];
};

export type SiteHeaderShellPrimitive = ReusableUiPrimitive & {
  kind: "site-header-shell";
  data: {
    mastheadSpacerHeight: number;
    subscribeLabel: string;
    subscribeHref: string;
    accountLabel: string;
    menuSections: readonly SiteHeaderShellMenuSection[];
    searchPanel: SiteHeaderShellSearchPanel;
    accountPanel: SiteHeaderShellAccountPanel;
    iconSetId: string;
  };
};

export type StorylinePrimitive = ReusableUiPrimitive & {
  kind: "storyline";
  data: {
    title: string;
    links: readonly { label: string; href: string }[];
  };
};

export type AnyUiPrimitive =
  | SvgIconPrimitive
  | IconSetPrimitive
  | SiteHeaderShellPrimitive
  | StorylinePrimitive;

type SiteHeaderShellBlock = Extract<ContentBlock, { type: "site-header-shell" }>;
type StorylineBlock = Extract<ContentBlock, { type: "storyline" }>;

export type ResolvedSiteHeaderShellBlock = Omit<
  SiteHeaderShellBlock,
  "mastheadSpacerHeight" | "subscribeLabel" | "subscribeHref" | "accountLabel" | "menuSections" | "searchPanel" | "accountPanel"
> & {
  mastheadSpacerHeight: number;
  subscribeLabel: string;
  subscribeHref: string;
  accountLabel: string;
  menuSections: readonly SiteHeaderShellMenuSection[];
  searchPanel: SiteHeaderShellSearchPanel;
  accountPanel: SiteHeaderShellAccountPanel;
  iconSetId: string;
};

export type ResolvedStorylineBlock = Omit<StorylineBlock, "title" | "links"> & {
  title: string;
  links: readonly { label: string; href: string }[];
};

const T_LOGO_PATH =
  "M43.6284633,34.8996508 C41.83393,39.6379642 38.53153,43.2989842 33.7932167,45.2371375 L33.7932167,34.8996508 L39.46463,29.8027175 L33.7932167,24.7777375 L33.7932167,17.6709842 C38.9621033,17.3120775 42.5514567,13.5074375 42.5514567,8.84136417 C42.5514567,2.73966417 36.7369967,0.5859375 33.4345967,0.5859375 C32.71707,0.5859375 31.9270167,0.5859375 30.7789167,0.872890833 L30.7789167,1.16013083 C31.20949,1.16013083 31.8550633,1.08846417 32.0709233,1.08846417 C34.36827,1.08846417 36.0911367,2.16518417 36.0911367,4.2469575 C36.0911367,5.82620417 34.7988433,7.40545083 32.5017833,7.40545083 C26.83037,7.40545083 20.15419,2.81133083 12.9038167,2.81133083 C6.44292333,2.81133083 1.99242333,7.6207375 1.99242333,12.5023842 C1.99242333,17.3120775 4.79201,18.8913242 7.73521667,19.9680442 L7.80717,19.6808042 C6.87378333,19.1066108 6.22763667,18.1018442 6.22763667,16.5223108 C6.22763667,14.3688708 8.23774333,12.5743375 10.7503767,12.5743375 C16.8520767,12.5743375 26.68675,17.6709842 32.7887367,17.6709842 L33.36293,17.6709842 L33.36293,24.8496908 L27.6918033,29.8027175 L33.36293,34.8996508 L33.36293,45.3804708 C30.9942033,46.2416175 28.5532367,46.6010975 26.0406033,46.6010975 C16.5648367,46.6010975 10.53509,40.8577308 10.53509,31.3102975 C10.53509,29.0135242 10.8220433,26.7878442 11.46819,24.6341175 L16.20593,22.5526308 L16.20593,43.6576042 L25.8253167,39.4226775 L25.8253167,17.8146042 L11.6834767,24.1315908 C13.1191033,19.9680442 16.06231,16.9531708 19.5799967,15.2303042 L19.50833,15.0150175 C10.0322767,17.0967908 0.84375,24.2754975 0.84375,35.0432708 C0.84375,47.4622442 11.32457,56.0768642 23.5285433,56.0768642 C36.4497567,56.0768642 43.7720833,47.4622442 43.84375,34.8996508 L43.6284633,34.8996508 Z";

function toSignature(parts: readonly string[]) {
  return parts.join("|").toLowerCase();
}

function storylineSignature(title: string, linkLabels: readonly string[]) {
  return toSignature(["storyline", title, ...linkLabels]);
}

const primitiveList: readonly AnyUiPrimitive[] = [
  {
    id: "nyt.icon.menu.17",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "menu", "17"]),
    viewBox: "0 0 17 14",
    width: 17,
    height: 14,
    shapes: [
      { kind: "rect", x: 0, y: 0, width: 17, height: 2, rx: 0.5, fill: "#121212" },
      { kind: "rect", x: 0, y: 6, width: 17, height: 2, rx: 0.5, fill: "#121212" },
      { kind: "rect", x: 0, y: 12, width: 17, height: 2, rx: 0.5, fill: "#121212" },
    ],
  },
  {
    id: "nyt.icon.search.16",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "search", "16"]),
    viewBox: "0 0 16 16",
    width: 16,
    height: 16,
    shapes: [
      { kind: "circle", cx: 6.5, cy: 6.5, r: 5.5, stroke: "#121212", strokeWidth: 1.5 },
      { kind: "line", x1: 10.5, y1: 10.5, x2: 15, y2: 15, stroke: "#121212", strokeWidth: 1.5, strokeLinecap: "round" },
    ],
  },
  {
    id: "nyt.icon.chevron-down.13",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "chevron-down", "13"]),
    viewBox: "0 0 13 8",
    width: 13,
    height: 8,
    shapes: [{ kind: "polygon", fill: "#121212", points: "6.5,8 0,1.4 1.4,0 6.5,5.2 11.6,0 13,1.4" }],
  },
  {
    id: "nyt.icon.chevron-right.20",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "chevron-right", "20"]),
    viewBox: "0 0 25 24",
    width: 20,
    height: 20,
    shapes: [{ kind: "path", d: "M9.90283 3L8 5.115L14.1808 12L8 18.885L9.90283 21L18 12L9.90283 3Z", fill: "#666666" }],
  },
  {
    id: "nyt.icon.close.15",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "close", "15"]),
    viewBox: "0 0 15 15",
    width: 15,
    height: 15,
    shapes: [
      { kind: "path", d: "M2 2l11 11", stroke: "#111", strokeWidth: 2, strokeLinecap: "square", strokeMiterlimit: 10 },
      { kind: "path", d: "M13 2L2 13", stroke: "#111", strokeWidth: 2, strokeLinecap: "square", strokeMiterlimit: 10 },
    ],
  },
  {
    id: "nyt.icon.t-logo.44",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon",
    variant: "standard",
    signature: toSignature(["icon", "t-logo", "44"]),
    viewBox: "0 0 44 57",
    width: 44,
    height: 57,
    shapes: [{ kind: "path", d: T_LOGO_PATH, fill: "var(--color-content-primary,#121212)" }],
  },
  {
    id: "nyt.icon-set.shell.standard",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "icon-set",
    variant: "standard",
    signature: toSignature(["icon-set", "shell", "standard"]),
    iconIds: [
      "nyt.icon.menu.17",
      "nyt.icon.search.16",
      "nyt.icon.chevron-down.13",
      "nyt.icon.chevron-right.20",
      "nyt.icon.close.15",
      "nyt.icon.t-logo.44",
    ],
  },
  {
    id: "nyt.storyline.tariffs-and-trade.standard",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "storyline",
    variant: "standard",
    signature: storylineSignature("Tariffs and Trade", [
      "Metals and Pharmaceuticals",
      "U.S.-E.U. Trade Deal",
      "Tariff Refunds",
      "U.S. Trade Deficit",
      "Trade Investigation",
      "Tariff Tracker",
    ]),
    data: {
      title: "Tariffs and Trade",
      links: [
        { label: "Metals and Pharmaceuticals", href: "https://www.nytimes.com/2026/04/02/business/economy/trump-metal-pharmaceutical-tariffs.html" },
        { label: "U.S.-E.U. Trade Deal", href: "https://www.nytimes.com/2026/03/26/world/europe/eu-trade-deal-us-european-parliament.html" },
        { label: "Tariff Refunds", href: "https://www.nytimes.com/2026/03/12/us/politics/trump-tariff-refunds-delay.html" },
        { label: "U.S. Trade Deficit", href: "https://www.nytimes.com/2026/03/12/business/economy/us-trade-deficit-january.html" },
        { label: "Trade Investigation", href: "https://www.nytimes.com/2026/03/12/us/politics/trump-forced-labor-tariffs.html" },
        { label: "Tariff Tracker", href: "https://www.nytimes.com/interactive/2026/business/economy/trump-tariff-tracker.html" },
      ],
    },
  },
  {
    id: "nyt.interactive.header-shell.standard",
    publisher: "nyt",
    layoutFamily: "nyt-interactive",
    kind: "site-header-shell",
    variant: "standard",
    signature: toSignature(["site-header-shell", "nyt", "nyt-interactive", "standard", "43", "11", "6", "3"]),
    provenance: "trump-tariffs-reaction",
    data: {
      mastheadSpacerHeight: 43,
      subscribeLabel: "Subscribe",
      subscribeHref: "https://www.nytimes.com/subscription?campaignId=37WXW",
      accountLabel: "Account",
      iconSetId: "nyt.icon-set.shell.standard",
      menuSections: [
        {
          label: "U.S.",
          href: "https://www.nytimes.com/section/us",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "U.S.", href: "https://www.nytimes.com/section/us" },
                { label: "Politics", href: "https://www.nytimes.com/section/politics" },
                { label: "New York", href: "https://www.nytimes.com/section/nyregion" },
                { label: "California", href: "https://www.nytimes.com/spotlight/california-news" },
                { label: "Education", href: "https://www.nytimes.com/section/education" },
                { label: "Health", href: "https://www.nytimes.com/section/health" },
                { label: "Obituaries", href: "https://www.nytimes.com/section/obituaries" },
                { label: "Science", href: "https://www.nytimes.com/section/science" },
              ],
            },
            {
              links: [
                { label: "Climate", href: "https://www.nytimes.com/section/climate" },
                { label: "Weather", href: "https://www.nytimes.com/section/weather" },
                { label: "Sports", href: "https://www.nytimes.com/section/sports" },
                { label: "Business", href: "https://www.nytimes.com/section/business" },
                { label: "Tech", href: "https://www.nytimes.com/section/technology" },
                { label: "The Upshot", href: "https://www.nytimes.com/section/upshot" },
                { label: "The Magazine", href: "https://www.nytimes.com/section/magazine" },
              ],
            },
            {
              heading: "Top Stories",
              links: [
                { label: "Donald Trump", href: "https://www.nytimes.com/spotlight/donald-trump" },
                { label: "Supreme Court", href: "https://www.nytimes.com/topic/organization/us-supreme-court" },
                { label: "Congress", href: "https://www.nytimes.com/topic/organization/us-congress" },
                { label: "Immigration", href: "https://www.nytimes.com/news-event/immigration-us" },
                { label: "Abortion", href: "https://www.nytimes.com/spotlight/abortion-news" },
              ],
            },
          ],
          promoGroups: [
            {
              heading: "Newsletters",
              items: [
                {
                  title: "The Morning",
                  description: "Make sense of the day’s news and ideas.",
                  href: "https://www.nytimes.com/newsletters/morning-briefing",
                  imageUrl: "/vi-assets/static-assets/icon-the-morning_144x144-b12a6923b6ad9102b766352261b1a847.webp",
                },
                {
                  title: "The Evening",
                  description: "Catch up on big news, and wind down to end your day.",
                  href: "https://www.nytimes.com/newsletters/evening-briefing",
                  imageUrl: "https://static.nytimes.com/email-images/NYT-Newsletters-TheEvening-Icon.jpg",
                },
              ],
              ctaLabel: "See all newsletters",
              ctaHref: "https://www.nytimes.com/newsletters",
            },
            {
              heading: "Podcasts",
              items: [
                {
                  title: "The Daily",
                  description: "The biggest stories of our time, in 20 minutes a day.",
                  href: "https://www.nytimes.com/column/the-daily",
                  imageUrl: "https://static01.nyt.com/images/2017/01/29/podcasts/the-daily-album-art/the-daily-album-art-mediumSquare149-v3.jpg?quality=75&auto=webp&disable=upscale",
                },
              ],
              ctaLabel: "See all podcasts",
              ctaHref: "https://www.nytimes.com/spotlight/podcasts",
            },
          ],
        },
        {
          label: "World",
          href: "https://www.nytimes.com/section/world",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "World", href: "https://www.nytimes.com/section/world" },
                { label: "Africa", href: "https://www.nytimes.com/section/world/africa" },
                { label: "Americas", href: "https://www.nytimes.com/section/world/americas" },
                { label: "Asia", href: "https://www.nytimes.com/section/world/asia" },
                { label: "Australia", href: "https://www.nytimes.com/section/world/australia" },
                { label: "Canada", href: "https://www.nytimes.com/section/world/canada" },
                { label: "Europe", href: "https://www.nytimes.com/section/world/europe" },
              ],
            },
            {
              links: [
                { label: "Middle East", href: "https://www.nytimes.com/section/world/middleeast" },
                { label: "Science", href: "https://www.nytimes.com/section/science" },
                { label: "Climate", href: "https://www.nytimes.com/section/climate" },
                { label: "Weather", href: "https://www.nytimes.com/section/weather" },
                { label: "Health", href: "https://www.nytimes.com/section/health" },
                { label: "Obituaries", href: "https://www.nytimes.com/section/obituaries" },
              ],
            },
            {
              heading: "Top Stories",
              links: [
                { label: "Middle East Crisis", href: "https://www.nytimes.com/news-event/israel-hamas-gaza" },
                { label: "Russia-Ukraine War", href: "https://www.nytimes.com/news-event/ukraine-russia" },
                { label: "China International Relations", href: "https://www.nytimes.com/spotlight/china-relations" },
                { label: "The Global Profile", href: "https://www.nytimes.com/column/the-global-profile" },
                { label: "Leer en Español", href: "https://www.nytimes.com/es/" },
              ],
            },
          ],
          promoGroups: [
            {
              heading: "Newsletters",
              items: [
                {
                  title: "The World",
                  description: "A guide to understanding the news, made for readers around the globe.",
                  href: "https://www.nytimes.com/newsletters/the-world",
                  imageUrl: "https://static.nytimes.com/email-images/Newsletter%20Icons/NYT-Newsletters-TheWorld-Icon%20(3).jpg",
                },
                {
                  title: "The Interpreter",
                  description: "Original analysis on the week’s biggest global stories.",
                  href: "https://www.nytimes.com/newsletters/the-interpreter",
                  imageUrl: "/vi-assets/static-assets/icon-the-interpreter_144x144-b29b74b2ebedb8e74823f33b16fb8167.webp",
                },
              ],
              ctaLabel: "See all newsletters",
              ctaHref: "https://www.nytimes.com/newsletters",
            },
          ],
        },
        {
          label: "Business",
          href: "https://www.nytimes.com/section/business",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "Business", href: "https://www.nytimes.com/section/business" },
                { label: "Tech", href: "https://www.nytimes.com/section/technology" },
                { label: "Economy", href: "https://www.nytimes.com/section/business/economy" },
                { label: "Media", href: "https://www.nytimes.com/section/business/media" },
                { label: "Finance and Markets", href: "https://www.nytimes.com/section/markets-overview" },
              ],
            },
            {
              links: [
                { label: "DealBook", href: "https://www.nytimes.com/section/business/dealbook" },
                { label: "Personal Tech", href: "https://www.nytimes.com/section/technology/personaltech" },
                { label: "Energy Transition", href: "https://www.nytimes.com/section/business/energy-environment" },
                { label: "Your Money", href: "https://www.nytimes.com/section/your-money" },
              ],
            },
            {
              heading: "Top Stories",
              links: [
                { label: "U.S. Economy", href: "https://www.nytimes.com/news-event/economy-business-us" },
                { label: "Stock Market", href: "https://www.nytimes.com/section/markets-overview" },
                { label: "Artificial Intelligence", href: "https://www.nytimes.com/spotlight/artificial-intelligence" },
              ],
            },
          ],
        },
        {
          label: "Arts",
          href: "https://www.nytimes.com/section/arts",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "Today's Arts", href: "https://www.nytimes.com/section/arts" },
                { label: "Book Review", href: "https://www.nytimes.com/section/books" },
                { label: "Best Sellers", href: "https://www.nytimes.com/books/best-sellers" },
                { label: "Dance", href: "https://www.nytimes.com/section/arts/dance" },
                { label: "Movies", href: "https://www.nytimes.com/section/movies" },
                { label: "Music", href: "https://www.nytimes.com/section/arts/music" },
                { label: "Television", href: "https://www.nytimes.com/section/arts/television" },
                { label: "Theater", href: "https://www.nytimes.com/section/theater" },
                { label: "Visual Arts", href: "https://www.nytimes.com/section/arts/design" },
              ],
            },
            {
              heading: "Recommendations",
              links: [
                { label: "100 Best Movies of the 21st Century", href: "https://www.nytimes.com/interactive/2025/movies/best-movies-21st-century.html" },
                { label: "Critic’s Picks", href: "https://www.nytimes.com/spotlight/critics-picks" },
                { label: "What to Read", href: "https://www.nytimes.com/spotlight/books-to-read" },
                { label: "What to Watch", href: "https://www.nytimes.com/spotlight/what-to-watch" },
                { label: "What to Listen To", href: "https://www.nytimes.com/column/playlist" },
              ],
            },
          ],
        },
        {
          label: "Lifestyle",
          href: "https://www.nytimes.com/spotlight/lifestyle",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "All Lifestyle", href: "https://www.nytimes.com/spotlight/lifestyle" },
                { label: "Well", href: "https://www.nytimes.com/section/well" },
                { label: "Travel", href: "https://www.nytimes.com/section/travel" },
                { label: "Style", href: "https://www.nytimes.com/section/style" },
                { label: "Real Estate", href: "https://www.nytimes.com/section/realestate" },
                { label: "Food", href: "https://www.nytimes.com/section/food" },
                { label: "Love", href: "https://www.nytimes.com/section/fashion/weddings" },
                { label: "Your Money", href: "https://www.nytimes.com/section/your-money" },
              ],
            },
            {
              heading: "Columns",
              links: [
                { label: "36 Hours", href: "https://www.nytimes.com/column/36-hours" },
                { label: "Ask Well", href: "https://www.nytimes.com/column/ask-well" },
                { label: "The Hunt", href: "https://www.nytimes.com/column/the-hunt" },
                { label: "Modern Love", href: "https://www.nytimes.com/column/modern-love" },
                { label: "Where to Eat", href: "https://www.nytimes.com/spotlight/best-restaurants" },
              ],
            },
          ],
        },
        {
          label: "Opinion",
          href: "https://www.nytimes.com/section/opinion",
          columns: [
            {
              heading: "Sections",
              links: [
                { label: "Opinion", href: "https://www.nytimes.com/section/opinion" },
                { label: "Guest Essays", href: "https://www.nytimes.com/section/opinion/contributors" },
                { label: "Editorials", href: "https://www.nytimes.com/section/opinion/editorials" },
                { label: "Op-Docs", href: "https://www.nytimes.com/column/op-docs" },
                { label: "Videos", href: "https://www.nytimes.com/spotlight/opinion-video" },
                { label: "Letters", href: "https://www.nytimes.com/section/opinion/letters" },
              ],
            },
            {
              heading: "Topics",
              links: [
                { label: "Politics", href: "https://www.nytimes.com/section/opinion/politics" },
                { label: "World", href: "https://www.nytimes.com/section/opinion/international-world" },
                { label: "Business", href: "https://www.nytimes.com/section/opinion/business-economics" },
                { label: "Tech", href: "https://www.nytimes.com/section/opinion/technology" },
                { label: "Climate", href: "https://www.nytimes.com/section/opinion/environment" },
              ],
            },
            {
              heading: "Columnists",
              links: [
                { label: "Jamelle Bouie", href: "https://www.nytimes.com/by/jamelle-bouie" },
                { label: "Ross Douthat", href: "https://www.nytimes.com/by/ross-douthat" },
                { label: "Maureen Dowd", href: "https://www.nytimes.com/by/maureen-dowd" },
                { label: "David French", href: "https://www.nytimes.com/by/david-french" },
                { label: "Thomas L. Friedman", href: "https://www.nytimes.com/by/thomas-l-friedman" },
              ],
            },
          ],
        },
        {
          label: "Video",
          href: "https://www.nytimes.com/video",
          columns: [
            {
              heading: "Playlists",
              links: [
                { label: "Today's Videos", href: "https://www.nytimes.com/video/watch" },
                { label: "U.S.", href: "https://www.nytimes.com/video/u-s" },
                { label: "Politics", href: "https://www.nytimes.com/video/politics" },
                { label: "Immigration", href: "https://www.nytimes.com/video/immigration" },
                { label: "Business", href: "https://www.nytimes.com/video/business" },
                { label: "World", href: "https://www.nytimes.com/video/world" },
              ],
            },
            {
              links: [
                { label: "Middle East Crisis", href: "https://www.nytimes.com/video/middle-east-crisis" },
                { label: "Russia-Ukraine Crisis", href: "https://www.nytimes.com/video/ukraine" },
                { label: "Visual Investigations", href: "https://www.nytimes.com/video/investigations" },
                { label: "Opinion Video", href: "https://www.nytimes.com/spotlight/opinion-video" },
              ],
            },
          ],
        },
        {
          label: "Audio",
          href: "https://www.nytimes.com/spotlight/podcasts",
          columns: [
            {
              heading: "Listen",
              links: [
                { label: "The Headlines", href: "https://www.nytimes.com/column/the-headlines" },
                { label: "The Daily", href: "https://www.nytimes.com/column/the-daily" },
                { label: "Hard Fork", href: "https://www.nytimes.com/column/hard-fork" },
                { label: "The Ezra Klein Show", href: "https://www.nytimes.com/column/ezra-klein-podcast" },
                { label: "Interesting Times", href: "https://www.nytimes.com/column/interesting-times" },
                { label: "The Opinions", href: "https://www.nytimes.com/column/the-opinions" },
              ],
            },
            {
              links: [
                { label: "Serial Productions", href: "https://www.nytimes.com/interactive/2022/podcasts/serial-productions.html" },
                { label: "Book Review Podcast", href: "https://www.nytimes.com/column/book-review-podcast" },
                { label: "Modern Love", href: "https://www.nytimes.com/column/modern-love-podcast" },
                { label: "Popcast", href: "https://www.nytimes.com/column/popcast-pop-music-podcast" },
              ],
            },
          ],
        },
        {
          label: "Games",
          href: "https://www.nytimes.com/crosswords",
          columns: [
            {
              heading: "Play",
              links: [
                { label: "Crossplay", href: "https://www.nytimes.com/games/crossplay" },
                { label: "Wordle", href: "https://www.nytimes.com/games/wordle/index.html" },
                { label: "Spelling Bee", href: "https://www.nytimes.com/puzzles/spelling-bee" },
                { label: "The Crossword", href: "https://www.nytimes.com/crosswords/game/daily/" },
                { label: "Connections", href: "https://www.nytimes.com/games/connections" },
                { label: "Strands", href: "https://www.nytimes.com/games/strands" },
              ],
            },
            {
              heading: "Community",
              links: [
                { label: "Spelling Bee Forum", href: "https://www.nytimes.com/spotlight/spelling-bee-forum" },
                { label: "Wordplay Column", href: "https://www.nytimes.com/spotlight/daily-crossword-column" },
                { label: "Wordle Review", href: "https://www.nytimes.com/spotlight/wordle-review" },
                { label: "Wordlebot", href: "https://www.nytimes.com/interactive/2022/upshot/wordle-bot.html" },
              ],
            },
          ],
        },
        {
          label: "Cooking",
          href: "https://cooking.nytimes.com/",
          columns: [
            {
              heading: "Recipes",
              links: [
                { label: "Easy", href: "https://cooking.nytimes.com/topics/easy-recipes" },
                { label: "Dinner", href: "https://cooking.nytimes.com/topics/dinner-recipes" },
                { label: "Quick", href: "https://cooking.nytimes.com/68861692-nyt-cooking/43843372-quick-recipes" },
                { label: "Healthy", href: "https://cooking.nytimes.com/topics/healthy-recipes" },
                { label: "Breakfast", href: "https://cooking.nytimes.com/topics/breakfast" },
                { label: "Vegetarian", href: "https://cooking.nytimes.com/topics/vegetarian" },
              ],
            },
            {
              heading: "Editors' Picks",
              links: [
                { label: "Easy Salmon Recipes", href: "https://cooking.nytimes.com/68861692-nyt-cooking/1334836-easy-salmon-recipes" },
                { label: "Soup and Stew Recipes", href: "https://cooking.nytimes.com/68861692-nyt-cooking/638891-best-soup-stew-recipes" },
                { label: "Easy Weeknight", href: "https://cooking.nytimes.com/topics/easy-weeknight" },
                { label: "Newest Recipes", href: "https://cooking.nytimes.com/68861692-nyt-cooking/32998034-our-newest-recipes" },
              ],
            },
          ],
        },
        {
          label: "Wirecutter",
          href: "https://www.nytimes.com/wirecutter/",
          columns: [
            {
              heading: "Reviews",
              links: [
                { label: "Kitchen", href: "https://www.nytimes.com/wirecutter/kitchen-dining/" },
                { label: "Tech", href: "https://www.nytimes.com/wirecutter/electronics/" },
                { label: "Sleep", href: "https://www.nytimes.com/wirecutter/sleep/" },
                { label: "Appliances", href: "https://www.nytimes.com/wirecutter/appliances/" },
                { label: "Home and Garden", href: "https://www.nytimes.com/wirecutter/home-garden/" },
              ],
            },
            {
              heading: "The Best...",
              links: [
                { label: "Air Purifier", href: "https://www.nytimes.com/wirecutter/reviews/best-air-purifier/" },
                { label: "Electric Toothbrush", href: "https://www.nytimes.com/wirecutter/reviews/best-electric-toothbrush/" },
                { label: "Pressure Washer", href: "https://www.nytimes.com/wirecutter/reviews/best-pressure-washer/" },
                { label: "Cordless Stick Vacuum", href: "https://www.nytimes.com/wirecutter/reviews/best-cordless-stick-vacuum/" },
              ],
            },
          ],
        },
        {
          label: "The Athletic",
          href: "https://www.nytimes.com/athletic/",
          columns: [
            {
              heading: "Leagues",
              links: [
                { label: "NFL", href: "https://www.nytimes.com/athletic/nfl/" },
                { label: "NBA", href: "https://www.nytimes.com/athletic/nba/" },
                { label: "NHL", href: "https://www.nytimes.com/athletic/nhl/" },
                { label: "Premier League", href: "https://www.nytimes.com/athletic/football/premier-league/" },
                { label: "MLB", href: "https://www.nytimes.com/athletic/mlb/" },
                { label: "College Football", href: "https://www.nytimes.com/athletic/college-football/" },
              ],
            },
            {
              heading: "Top Stories",
              links: [
                { label: "Today's Headlines", href: "https://www.nytimes.com/athletic/news/" },
                { label: "N.F.L. Draft", href: "https://www.nytimes.com/athletic/nfl/draft/" },
                { label: "2026 Men’s World Cup", href: "https://www.nytimes.com/athletic/football/world-cup/" },
                { label: "Connections: Sports Edition", href: "https://www.nytimes.com/athletic/connections-sports-edition" },
              ],
            },
          ],
        },
      ],
      searchPanel: {
        title: "Search The New York Times",
        placeholder: "Search articles, sections and products",
        links: [
          { label: "Tariffs and Trade", href: "https://www.nytimes.com/spotlight/trump-tariffs", description: "Topic page" },
          { label: "No Big Stick: Many Tariff Targets Avoid Hitting Back", href: "https://www.nytimes.com/interactive/2025/04/07/business/economy/trump-tariffs-reaction-china-eu-canada.html", description: "Interactive" },
          { label: "The cost of new tariffs on U.S. imports", href: "https://www.nytimes.com/interactive/2025/04/03/business/economy/trump-tariffs-us-imports.html", description: "Related interactive" },
          { label: "Tariff Tracker", href: "https://www.nytimes.com/interactive/2026/business/economy/trump-tariff-tracker.html", description: "Tracker" },
          { label: "Business", href: "https://www.nytimes.com/section/business", description: "Section" },
          { label: "Economy", href: "https://www.nytimes.com/section/business/economy", description: "Section" },
        ],
      },
      accountPanel: {
        email: "admin@thereality.report",
        greeting: "Good afternoon, Thomas.",
        relationshipCopy: "The email you logged in with isn’t associated with a News subscription and has limited access to articles.",
        subscribeLabel: "Subscribe for more access",
        subscribeHref: "https://www.nytimes.com/subscription?source=vi.mum&campaignId=8L9JX",
        alternateLoginLabel: "Try a different email",
        alternateLoginHref: "https://myaccount.nytimes.com/auth/login?response_type=cookie&client_id=vi&redirect_uri=https%3A%2F%2Fwww.nytimes.com%2Finteractive%2F2025%2F04%2F07%2Fbusiness%2Feconomy%2Ftrump-tariffs-reaction-china-eu-canada.html",
        sections: [
          {
            heading: "Account",
            links: [{ label: "Account settings", href: "https://www.nytimes.com/account?source=vi.mum" }],
          },
          {
            heading: "Your Content",
            links: [
              { label: "Saved articles", href: "https://www.nytimes.com/saved" },
              { label: "Newsletters", href: "https://www.nytimes.com/account/settings?source=vi.mum" },
            ],
          },
          {
            heading: "Get Support",
            links: [{ label: "Help Center", href: "https://help.nytimes.com/hc/en-us?referrer=masthead-user-modal" }],
          },
        ],
        logoutLabel: "Log out",
        logoutHref: "https://myaccount.nytimes.com/auth/logout?redirect_uri=https%3A%2F%2Fwww.nytimes.com%2Fhomepage",
      },
    },
  },
] as const;

const primitiveMap = new Map(primitiveList.map((primitive) => [primitive.id, primitive]));

export function getReusableUiPrimitive(id: string): AnyUiPrimitive | null {
  return primitiveMap.get(id) ?? null;
}

export function getSvgIconPrimitive(id: string): SvgIconPrimitive | null {
  const primitive = getReusableUiPrimitive(id);
  return primitive?.kind === "icon" ? primitive : null;
}

export function getSiteHeaderShellPrimitive(id: string): SiteHeaderShellPrimitive | null {
  const primitive = getReusableUiPrimitive(id);
  return primitive?.kind === "site-header-shell" ? primitive : null;
}

export function getStorylinePrimitive(id: string): StorylinePrimitive | null {
  const primitive = getReusableUiPrimitive(id);
  return primitive?.kind === "storyline" ? primitive : null;
}

export function resolveSiteHeaderShellBlock(block: SiteHeaderShellBlock): ResolvedSiteHeaderShellBlock {
  const primitive = block.primitiveId ? getSiteHeaderShellPrimitive(block.primitiveId) : null;

  return {
    ...block,
    mastheadSpacerHeight: block.mastheadSpacerHeight ?? primitive?.data.mastheadSpacerHeight ?? 0,
    subscribeLabel: block.subscribeLabel ?? primitive?.data.subscribeLabel ?? "Subscribe",
    subscribeHref: block.subscribeHref ?? primitive?.data.subscribeHref ?? "#",
    accountLabel: block.accountLabel ?? primitive?.data.accountLabel ?? "Account",
    menuSections: block.menuSections ?? primitive?.data.menuSections ?? [],
    searchPanel: block.searchPanel ?? primitive?.data.searchPanel ?? { title: "Search", placeholder: "Search", links: [] },
    accountPanel:
      block.accountPanel ??
      primitive?.data.accountPanel ?? {
        email: "",
        greeting: "",
        relationshipCopy: "",
        subscribeLabel: "",
        subscribeHref: "#",
        alternateLoginLabel: "",
        alternateLoginHref: "#",
        sections: [],
        logoutLabel: "",
        logoutHref: "#",
      },
    iconSetId: primitive?.data.iconSetId ?? "nyt.icon-set.shell.standard",
  };
}

export function resolveStorylineBlock(block: StorylineBlock): ResolvedStorylineBlock {
  const primitive = block.primitiveId ? getStorylinePrimitive(block.primitiveId) : null;
  return {
    ...block,
    title: block.title ?? primitive?.data.title ?? "",
    links: block.links ?? primitive?.data.links ?? [],
  };
}

export function matchReusableUiPrimitive(candidate: {
  publisher: string;
  layoutFamily: LayoutFamily;
  kind: ReusableUiPrimitive["kind"];
  title?: string;
  linkLabels?: readonly string[];
  mastheadSpacerHeight?: number;
  menuSectionCount?: number;
  searchLinkCount?: number;
  accountSectionCount?: number;
}): AnyUiPrimitive | null {
  if (candidate.kind === "storyline" && candidate.title && candidate.linkLabels) {
    const signature = storylineSignature(candidate.title, candidate.linkLabels);
    return (
      primitiveList.find(
        (primitive) =>
          primitive.publisher === candidate.publisher &&
          primitive.layoutFamily === candidate.layoutFamily &&
          primitive.kind === "storyline" &&
          primitive.signature === signature,
      ) ?? null
    );
  }

  if (candidate.kind === "site-header-shell") {
    const signature = toSignature([
      "site-header-shell",
      candidate.publisher,
      candidate.layoutFamily,
      "standard",
      String(candidate.mastheadSpacerHeight ?? 0),
      String(candidate.menuSectionCount ?? 0),
      String(candidate.searchLinkCount ?? 0),
      String(candidate.accountSectionCount ?? 0),
    ]);
    return (
      primitiveList.find(
        (primitive) =>
          primitive.publisher === candidate.publisher &&
          primitive.layoutFamily === candidate.layoutFamily &&
          primitive.kind === "site-header-shell" &&
          primitive.signature === signature,
      ) ?? null
    );
  }

  return null;
}

export const DESIGN_DOCS_UI_PRIMITIVES = primitiveList;

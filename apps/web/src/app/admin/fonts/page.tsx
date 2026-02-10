"use client";

import { useRouter } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const CDN_BASE = "https://d1fmdyqfafwim3.cloudfront.net/fonts";

interface UsedOnEntry {
  page: string;
  path: string;
}

interface FontFamily {
  name: string;
  cssVar: string;
  usage: string;
  weights: number[];
  hasItalic: boolean;
  type: "CDN Font" | "Google Font" | "Font Stack";
  source: "CloudFront CDN" | "Google Fonts" | "Tailwind Theme";
  cdnPath?: string;
  description: string;
  usedOn: UsedOnEntry[];
}

const FONT_FAMILIES: FontFamily[] = [
  {
    name: "Sans (Hamburg + Inter + Geist)",
    cssVar: "--font-sans",
    usage: "font-sans (Default body font)",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Hamburg Serial, Inter, and Geist Sans",
    usedOn: [
      { page: "Global default", path: "globals.css" },
    ],
  },
  {
    name: "Serif (Gloucester + Playfair)",
    cssVar: "--font-serif",
    usage: "font-serif (Used for h1, h2, h3)",
    weights: [400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Gloucester OS, Playfair Display, and fallbacks",
    usedOn: [
      { page: "Global h1/h2/h3", path: "globals.css" },
    ],
  },
  {
    name: "Games (Plymouth Serial)",
    cssVar: "--font-games",
    usage: "font-games",
    weights: [300, 400, 500, 700, 800, 900],
    hasItalic: false,
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Plymouth Serial and fallbacks for game UIs",
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
    ],
  },
  {
    name: "Hamburg Serial",
    cssVar: "--font-hamburg",
    usage: 'className="font-hamburg" or style={{ fontFamily: "var(--font-hamburg)" }}',
    weights: [200, 300, 400, 500, 700, 800, 900],
    hasItalic: false,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/`,
    description: "Primary brand font. Sans-serif display face used across most pages.",
    usedOn: [
      { page: "Home", path: "app/page.tsx" },
      { page: "Login", path: "app/login/page.tsx" },
      { page: "Register", path: "app/auth/register/page.tsx" },
      { page: "Auth Finish", path: "app/auth/finish/page.tsx" },
      { page: "Signup", path: "signup/page.tsx" },
      { page: "Privacy Policy", path: "app/privacy-policy/page.tsx" },
      { page: "Terms of Service", path: "app/terms-of-service/page.tsx" },
      { page: "Terms of Sale", path: "app/terms-of-sale/page.tsx" },
      { page: "Profile", path: "app/profile/page.tsx" },
      { page: "Hub", path: "app/hub/page.tsx" },
      { page: "Surveys Hub", path: "app/hub/surveys/page.tsx" },
      { page: "RHOP Survey", path: "app/surveys/rhop-s10/page.tsx" },
      { page: "Error Boundary", path: "components/ErrorBoundary.tsx" },
      { page: "Flashback Ranker", path: "components/flashback-ranker.tsx" },
      { page: "Global default", path: "font-sans stack" },
    ],
  },
  {
    name: "Gloucester OS MT Std",
    cssVar: "--font-gloucester",
    usage: 'className="font-gloucester" or style={{ fontFamily: "var(--font-gloucester)" }}',
    weights: [400],
    hasItalic: false,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/`,
    description: "Serif display face used for headings and editorial text.",
    usedOn: [
      { page: "Home", path: "app/page.tsx" },
      { page: "Login", path: "app/login/page.tsx" },
      { page: "Register", path: "app/auth/register/page.tsx" },
      { page: "Auth Finish", path: "app/auth/finish/page.tsx" },
      { page: "Signup", path: "signup/page.tsx" },
      { page: "Privacy Policy", path: "app/privacy-policy/page.tsx" },
      { page: "Global h1/h2/h3", path: "font-serif stack" },
    ],
  },
  {
    name: "Plymouth Serial",
    cssVar: "--font-plymouth-serial",
    usage: 'style={{ fontFamily: "var(--font-plymouth-serial)" }}',
    weights: [300, 400, 500, 700, 800, 900],
    hasItalic: false,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/`,
    description: "Decorative serif used in game covers and surveys.",
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
      { page: "RHOSLC Survey", path: "app/surveys/rhoslc-s6/page.tsx" },
      { page: "Global", path: "font-games stack" },
    ],
  },
  {
    name: "Rude Slab Condensed",
    cssVar: "--font-rude-slab",
    usage: 'style={{ fontFamily: "var(--font-rude-slab)" }}',
    weights: [200, 300, 400, 500, 700, 800, 900],
    hasItalic: true,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/`,
    description: "Condensed slab serif with italic variants. Used in game UIs.",
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Bravodle Play", path: "app/bravodle/play/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
      { page: "RHOSLC Survey", path: "app/surveys/rhoslc-s6/page.tsx" },
    ],
  },
  {
    name: "Gloucester Goodall",
    cssVar: "--font-goodall",
    usage: 'style={{ fontFamily: "var(--font-goodall)" }}',
    weights: [400, 500, 600, 700, 900],
    hasItalic: true,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/`,
    description: "Elegant serif with italic variants. Available via CSS var but not yet referenced on any page.",
    usedOn: [
      { page: "Not yet used", path: "Available via CSS var --font-goodall" },
    ],
  },
  {
    name: "Geist Sans",
    cssVar: "--font-geist-sans",
    usage: 'style={{ fontFamily: "var(--font-geist-sans)" }}',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Google Font",
    source: "Google Fonts",
    description: "Vercel system font. Part of the default sans stack fallback.",
    usedOn: [
      { page: "Global fallback", path: "font-sans stack" },
    ],
  },
  {
    name: "Inter",
    cssVar: "--font-inter",
    usage: 'style={{ fontFamily: "var(--font-inter)" }}',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Google Font",
    source: "Google Fonts",
    description: "Popular UI font. Part of the default sans stack fallback.",
    usedOn: [
      { page: "Global fallback", path: "font-sans stack" },
    ],
  },
  {
    name: "Playfair Display",
    cssVar: "--font-playfair",
    usage: 'style={{ fontFamily: "var(--font-playfair)" }}',
    weights: [400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Google Font",
    source: "Google Fonts",
    description: "Transitional serif. Part of the default serif stack fallback.",
    usedOn: [
      { page: "Global fallback", path: "font-serif stack" },
    ],
  },
];

interface RealiteaseFontEntry {
  name: string;
  fontFamily: string;
  cdnUrl: string;
  weights: number[];
}

const REALITEASE_FONTS: RealiteaseFontEntry[] = [
  {
    name: "NYTKarnak Condensed",
    fontFamily: "'NYTKarnak_Condensed'",
    cdnUrl: `${CDN_BASE}/realitease/NYTKarnak_Condensed`,
    weights: [400, 700],
  },
  {
    name: "KarnakPro Condensed",
    fontFamily: "'KarnakPro-CondensedBlack'",
    cdnUrl: `${CDN_BASE}/realitease/NYTKarnak Medium`,
    weights: [400, 900],
  },
  {
    name: "NYTFranklin",
    fontFamily: "'NYTFranklin'",
    cdnUrl: `${CDN_BASE}/realitease/NYTFranklin`,
    weights: [400, 500, 700],
  },
  {
    name: "NYTFranklin Medium",
    fontFamily: "'nyt-franklin'",
    cdnUrl: `${CDN_BASE}/realitease/NYTFranklin Medium`,
    weights: [500],
  },
  {
    name: "TN Web Use Only",
    fontFamily: "'TN_Web_Use_Only'",
    cdnUrl: `${CDN_BASE}/realitease/TN_Web_Use_Only`,
    weights: [400],
  },
  {
    name: "Helvetica Neue (Tee Franklin)",
    fontFamily: "'Helvetica Neue', 'Tee Franklin W01 Medium'",
    cdnUrl: `${CDN_BASE}/realitease/Tee Franklin W01 Medium`,
    weights: [400, 500],
  },
];

const REALITEASE_USED_ON: UsedOnEntry[] = [
  { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
  { page: "Bravodle Play", path: "app/bravodle/play/page.tsx" },
  { page: "Bravodle Completed", path: "app/bravodle/play/completed-view.tsx" },
  { page: "Realitease Main", path: "app/realitease/page.tsx" },
  { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
  { page: "Realitease Play", path: "app/realitease/play/page.tsx" },
  { page: "Realitease Completed", path: "app/realitease/play/completed-view.tsx" },
];

const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

function TypeBadge({ type }: { type: FontFamily["type"] }) {
  const colorMap = {
    "CDN Font": "bg-blue-100 text-blue-800 border-blue-200",
    "Google Font": "bg-green-100 text-green-800 border-green-200",
    "Font Stack": "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorMap[type]}`}
    >
      {type}
    </span>
  );
}

function UsedOnChips({ entries }: { entries: UsedOnEntry[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry, idx) => (
        <span
          key={idx}
          title={entry.path}
          className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs text-violet-700 ring-1 ring-inset ring-violet-200"
        >
          {entry.page}
        </span>
      ))}
    </div>
  );
}

function FontPreview({ family }: { family: FontFamily }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-zinc-900">{family.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <TypeBadge type={family.type} />
            <span className="text-xs text-zinc-500">{family.source}</span>
            {family.hasItalic && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                + Italic
              </span>
            )}
          </div>
          {family.description && (
            <p className="mt-2 text-xs text-zinc-500">{family.description}</p>
          )}
        </div>
        <span className="flex-shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {family.weights.length} weight{family.weights.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-3">
        {/* CSS Variable */}
        <div className="rounded bg-zinc-50 p-3">
          <p className="mb-1 text-xs font-medium text-zinc-600">CSS Variable</p>
          <code className="text-sm text-zinc-900">{family.cssVar}</code>
        </div>

        {/* Usage */}
        <div className="rounded bg-zinc-50 p-3">
          <p className="mb-1 text-xs font-medium text-zinc-600">Usage</p>
          <code className="text-xs text-zinc-900 break-all">{family.usage}</code>
        </div>

        {/* CDN Path */}
        {family.cdnPath && (
          <div className="rounded bg-blue-50 p-3">
            <p className="mb-1 text-xs font-medium text-blue-700">CDN Path</p>
            <code className="text-xs text-blue-900 break-all">{family.cdnPath}</code>
          </div>
        )}

        {/* Used On */}
        <div className="rounded bg-zinc-50 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-600">Used On</p>
          <UsedOnChips entries={family.usedOn} />
        </div>

        {/* Weight Previews */}
        <div className="space-y-2 border-t border-zinc-200 pt-4">
          <p className="text-xs font-medium text-zinc-600">Weight Previews</p>
          {family.weights.map((weight) => (
            <div key={weight} className="space-y-1">
              <div
                style={{
                  fontFamily: `var(${family.cssVar})`,
                  fontWeight: weight,
                }}
              >
                <span className="mr-2 inline-block w-28 text-xs text-zinc-400">
                  {weight} {WEIGHT_LABELS[weight] ?? ""}
                </span>
                <span className="text-lg text-zinc-900">
                  The quick brown fox jumps over the lazy dog
                </span>
              </div>
              {family.hasItalic && (
                <div
                  style={{
                    fontFamily: `var(${family.cssVar})`,
                    fontWeight: weight,
                    fontStyle: "italic",
                  }}
                >
                  <span className="mr-2 inline-block w-28 text-xs text-zinc-400">
                    {weight} Italic
                  </span>
                  <span className="text-lg text-zinc-900">
                    The quick brown fox jumps over the lazy dog
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RealiteaseFontPreview({ font }: { font: RealiteaseFontEntry }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="font-bold text-zinc-900">{font.name}</h4>
          <code className="text-xs text-zinc-500">{font.fontFamily}</code>
        </div>
        <TypeBadge type="CDN Font" />
      </div>
      <div className="mb-3 rounded bg-blue-50 p-2">
        <code className="text-xs text-blue-900 break-all">{font.cdnUrl}</code>
      </div>
      <div className="space-y-1 border-t border-zinc-100 pt-3">
        {font.weights.map((weight) => (
          <div
            key={weight}
            style={{ fontFamily: font.fontFamily, fontWeight: weight }}
          >
            <span className="mr-2 inline-block w-20 text-xs text-zinc-400">
              {weight} {WEIGHT_LABELS[weight] ?? ""}
            </span>
            <span className="text-base text-zinc-900">
              The quick brown fox jumps over the lazy dog
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminFontsPage() {
  const router = useRouter();
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"></div>
          <p className="text-sm text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const cdnFonts = FONT_FAMILIES.filter((f) => f.type === "CDN Font");
  const googleFonts = FONT_FAMILIES.filter((f) => f.type === "Google Font");
  const fontStacks = FONT_FAMILIES.filter((f) => f.type === "Font Stack");

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">Font Library</h1>
                <p className="mt-1 text-sm text-zinc-600">
                  All fonts loaded in the application &mdash; served from CloudFront CDN &amp; Google Fonts
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Back to Admin Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/hub")}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Back to Hub
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-7xl px-6 py-8">
          {/* Summary Bar */}
          <div className="mb-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
              <span className="text-sm font-semibold text-blue-900">
                {cdnFonts.length} CDN Fonts
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
              <span className="text-sm font-semibold text-green-900">
                {googleFonts.length} Google Fonts
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2">
              <span className="text-sm font-semibold text-zinc-700">
                {fontStacks.length} Font Stacks
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
              <span className="text-sm font-semibold text-purple-900">
                {REALITEASE_FONTS.length} Realitease Fonts
              </span>
            </div>
          </div>

          {/* Font Stacks Section */}
          <section className="mb-12">
            <h2 className="mb-6 text-xl font-bold text-zinc-900">
              Font Stacks ({fontStacks.length})
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {fontStacks.map((family) => (
                <FontPreview key={family.name} family={family} />
              ))}
            </div>
          </section>

          {/* CDN Fonts Section */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                CDN Fonts ({cdnFonts.length})
              </h2>
              <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                CloudFront CDN
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {cdnFonts.map((family) => (
                <FontPreview key={family.name} family={family} />
              ))}
            </div>
          </section>

          {/* Google Fonts Section */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                Google Fonts ({googleFonts.length})
              </h2>
              <span className="rounded-md bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                Google Fonts
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {googleFonts.map((family) => (
                <FontPreview key={family.name} family={family} />
              ))}
            </div>
          </section>

          {/* Realitease Fonts Section */}
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                Realitease Fonts ({REALITEASE_FONTS.length})
              </h2>
              <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                Game-specific
              </span>
            </div>
            <div className="mb-4 rounded bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-600">Used On</p>
              <UsedOnChips entries={REALITEASE_USED_ON} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {REALITEASE_FONTS.map((font) => (
                <RealiteaseFontPreview key={font.name} font={font} />
              ))}
            </div>
          </section>

          {/* Usage Instructions */}
          <section className="mt-12 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-3 font-bold text-blue-900">Usage Instructions</h3>
            <div className="space-y-3 text-sm text-blue-800">
              <p>
                <strong>To use fonts in your components:</strong>
              </p>

              <div className="space-y-2">
                <p className="font-semibold">Option 1: Use font stacks (Recommended)</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-sans&quot;</code>
                  <p className="mt-1 text-xs">Uses Hamburg + Inter + Geist Sans</p>
                </div>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-serif&quot;</code>
                  <p className="mt-1 text-xs">Uses Gloucester + Playfair Display</p>
                </div>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-games&quot;</code>
                  <p className="mt-1 text-xs">Uses Plymouth Serial for game UIs</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Option 2: Use specific fonts with CSS variables</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">style={`{{ fontFamily: "var(--font-hamburg)" }}`}</code>
                  <p className="mt-1 text-xs">Uses only Hamburg Serial</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Option 3: Combine with font weights</p>
                <div className="rounded bg-blue-100 p-3">
                  <code className="text-xs">className=&quot;font-sans font-bold&quot;</code>
                  <p className="mt-1 text-xs">Uses sans stack with bold weight (700)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Theme Configuration */}
          <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-6">
            <h3 className="mb-3 font-bold text-zinc-900">Tailwind v4 Theme Configuration</h3>
            <p className="mb-3 text-sm text-zinc-600">
              Fonts are configured in globals.css using the @theme directive:
            </p>
            <div className="space-y-2">
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-sans: var(--font-hamburg), var(--font-inter), var(--font-geist-sans)
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-serif: var(--font-gloucester), var(--font-playfair), ...
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-body: var(--font-hamburg)
                </code>
              </div>
              <div className="rounded bg-zinc-50 p-3">
                <code className="text-xs text-zinc-900">
                  --font-games: var(--font-plymouth-serial), ...
                </code>
              </div>
            </div>
          </section>

          {/* CDN Info */}
          <section className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-3 font-bold text-blue-900">CDN Configuration</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                All Monotype and Realitease fonts are served from CloudFront CDN. Font files are stored in S3 and cached globally.
              </p>
              <div className="rounded bg-blue-100 p-3">
                <p className="mb-1 text-xs font-medium">CDN Base URL</p>
                <code className="text-xs">{CDN_BASE}</code>
              </div>
              <div className="rounded bg-blue-100 p-3">
                <p className="mb-1 text-xs font-medium">Monotype fonts path</p>
                <code className="text-xs">{CDN_BASE}/monotype/</code>
              </div>
              <div className="rounded bg-blue-100 p-3">
                <p className="mb-1 text-xs font-medium">Realitease fonts path</p>
                <code className="text-xs">{CDN_BASE}/realitease/</code>
              </div>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}

"use client";

import { useState } from "react";
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
  /** The actual CSS font-family value to use for rendering previews */
  fontFamilyValue?: string;
}

/* ------------------------------------------------------------------ */
/*  CDN Fonts                                                         */
/* ------------------------------------------------------------------ */
const CDN_FONTS: FontFamily[] = [
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
    fontFamilyValue: "var(--font-hamburg)",
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
    fontFamilyValue: "var(--font-gloucester)",
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
    cdnPath: `${CDN_BASE}/plymouth-serial-book/`,
    description: "Decorative serif used in game covers and surveys.",
    fontFamilyValue: "var(--font-plymouth-serial)",
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
    cdnPath: `${CDN_BASE}/rude-slab-condensed-book/`,
    description: "Condensed slab serif with italic variants. Used in game UIs.",
    fontFamilyValue: "var(--font-rude-slab)",
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Bravodle Play", path: "app/bravodle/play/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
      { page: "RHOSLC Survey", path: "app/surveys/rhoslc-s6/page.tsx" },
    ],
  },
  {
    name: "Goodall",
    cssVar: "--font-goodall",
    usage: 'style={{ fontFamily: "var(--font-goodall)" }}',
    weights: [400, 500, 600, 700, 900],
    hasItalic: true,
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/gloucester-goodall/`,
    description: "Elegant serif with italic variants.",
    fontFamilyValue: "var(--font-goodall)",
    usedOn: [
      { page: "Not yet used", path: "Available via CSS var --font-goodall" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Google Fonts                                                      */
/* ------------------------------------------------------------------ */
const GOOGLE_FONTS: FontFamily[] = [
  {
    name: "Geist Sans",
    cssVar: "--font-geist-sans",
    usage: 'style={{ fontFamily: "var(--font-geist-sans)" }}',
    weights: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Google Font",
    source: "Google Fonts",
    description: "Vercel system font. Part of the default sans stack fallback.",
    fontFamilyValue: "var(--font-geist-sans)",
    usedOn: [{ page: "Global fallback", path: "font-sans stack" }],
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
    fontFamilyValue: "var(--font-inter)",
    usedOn: [{ page: "Global fallback", path: "font-sans stack" }],
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
    fontFamilyValue: "var(--font-playfair)",
    usedOn: [{ page: "Global fallback", path: "font-serif stack" }],
  },
];

/* ------------------------------------------------------------------ */
/*  Font Stacks                                                       */
/* ------------------------------------------------------------------ */
const FONT_STACKS: FontFamily[] = [
  {
    name: "Sans (Hamburg + Inter + Geist)",
    cssVar: "--font-sans",
    usage: "font-sans (Default body font)",
    weights: [200, 300, 400, 500, 600, 700, 800, 900],
    hasItalic: false,
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Hamburg Serial, Inter, and Geist Sans",
    fontFamilyValue: "var(--font-sans)",
    usedOn: [{ page: "Global default", path: "globals.css" }],
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
    fontFamilyValue: "var(--font-serif)",
    usedOn: [{ page: "Global h1/h2/h3", path: "globals.css" }],
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
    fontFamilyValue: "var(--font-games)",
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Realitease Fonts                                                  */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  Shared UI Components                                              */
/* ------------------------------------------------------------------ */

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  CDN Font Card (primary display)                                   */
/* ------------------------------------------------------------------ */

function CdnFontCard({
  family,
  previewText,
}: {
  family: FontFamily;
  previewText: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-zinc-50/60 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-xl font-bold text-zinc-900"
              style={{ fontFamily: family.fontFamilyValue }}
            >
              {family.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">{family.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="flex-shrink-0 rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
              {family.weights.length} weight{family.weights.length > 1 ? "s" : ""}
            </span>
            {family.hasItalic && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                + Italic
              </span>
            )}
          </div>
        </div>

        {/* CDN Path Pill — hyperlinked */}
        {family.cdnPath && (
          <a
            href={family.cdnPath}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-200 transition-colors hover:bg-blue-200 hover:text-blue-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {family.cdnPath}
          </a>
        )}
      </div>

      {/* Used On */}
      <div className="border-b border-zinc-100 px-6 py-3">
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Used On
        </p>
        <UsedOnChips entries={family.usedOn} />
      </div>

      {/* Weight Previews */}
      <div className="px-6 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Weight Previews
        </p>
        <div className="space-y-4">
          {family.weights.map((weight) => (
            <div key={weight}>
              {/* Normal */}
              <div>
                <p className="text-xs font-medium text-zinc-400 mb-1">
                  {weight} {WEIGHT_LABELS[weight] ?? ""}
                </p>
                <p
                  className="text-lg text-zinc-900 leading-snug"
                  style={{
                    fontFamily: family.fontFamilyValue,
                    fontWeight: weight,
                  }}
                >
                  {previewText}
                </p>
              </div>
              {/* Italic */}
              {family.hasItalic && (
                <div className="mt-1.5">
                  <p className="text-xs font-medium text-zinc-400 mb-1">
                    {weight} Italic
                  </p>
                  <p
                    className="text-lg text-zinc-900 leading-snug"
                    style={{
                      fontFamily: family.fontFamilyValue,
                      fontWeight: weight,
                      fontStyle: "italic",
                    }}
                  >
                    {previewText}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible Font Stack / Google Font Card                         */
/* ------------------------------------------------------------------ */

function CollapsibleFontCard({
  family,
  previewText,
}: {
  family: FontFamily;
  previewText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-zinc-50"
      >
        <div className="min-w-0">
          <h3
            className="text-base font-bold text-zinc-900"
            style={{ fontFamily: family.fontFamilyValue }}
          >
            {family.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                family.type === "Font Stack"
                  ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                  : "bg-green-100 text-green-800 border-green-200"
              }`}
            >
              {family.type}
            </span>
            <span className="text-xs text-zinc-500">{family.source}</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-600">
              {family.weights.length} weight{family.weights.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-zinc-100">
          {/* Description */}
          {family.description && (
            <div className="px-6 pt-4 pb-2">
              <p className="text-xs text-zinc-500">{family.description}</p>
            </div>
          )}

          {/* CSS Variable */}
          <div className="px-6 py-2">
            <div className="rounded bg-zinc-50 p-3">
              <p className="mb-1 text-xs font-medium text-zinc-600">CSS Variable</p>
              <code className="text-sm text-zinc-900">{family.cssVar}</code>
            </div>
          </div>

          {/* Usage */}
          <div className="px-6 py-2">
            <div className="rounded bg-zinc-50 p-3">
              <p className="mb-1 text-xs font-medium text-zinc-600">Usage</p>
              <code className="text-xs text-zinc-900 break-all">{family.usage}</code>
            </div>
          </div>

          {/* Used On */}
          <div className="px-6 py-2">
            <div className="rounded bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-600">Used On</p>
              <UsedOnChips entries={family.usedOn} />
            </div>
          </div>

          {/* Weight Previews */}
          <div className="px-6 pt-2 pb-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Weight Previews
            </p>
            <div className="space-y-3">
              {family.weights.map((weight) => (
                <div key={weight}>
                  <p className="text-xs font-medium text-zinc-400 mb-1">
                    {weight} {WEIGHT_LABELS[weight] ?? ""}
                  </p>
                  <p
                    className="text-lg text-zinc-900 leading-snug"
                    style={{
                      fontFamily: family.fontFamilyValue,
                      fontWeight: weight,
                    }}
                  >
                    {previewText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Realitease Font Card                                              */
/* ------------------------------------------------------------------ */

function RealiteaseFontPreview({
  font,
  previewText,
}: {
  font: RealiteaseFontEntry;
  previewText: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4
            className="font-bold text-zinc-900"
            style={{ fontFamily: font.fontFamily }}
          >
            {font.name}
          </h4>
          <code className="text-xs text-zinc-500">{font.fontFamily}</code>
        </div>
        <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          CDN Font
        </span>
      </div>
      <div className="mb-3 rounded-lg bg-blue-50 p-2.5">
        <code className="text-xs text-blue-900 break-all">{font.cdnUrl}</code>
      </div>
      <div className="space-y-3 border-t border-zinc-100 pt-3">
        {font.weights.map((weight) => (
          <div key={weight}>
            <p className="text-xs font-medium text-zinc-400 mb-1">
              {weight} {WEIGHT_LABELS[weight] ?? ""}
            </p>
            <p
              className="text-base text-zinc-900 leading-snug"
              style={{ fontFamily: font.fontFamily, fontWeight: weight }}
            >
              {previewText}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function AdminFontsPage() {
  const router = useRouter();
  const { user, checking, hasAccess } = useAdminGuard();
  const [previewText, setPreviewText] = useState(
    "The quick brown fox jumps over the lazy dog"
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

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
          {/* Preview Text Input */}
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="preview-text"
              className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Preview Text
            </label>
            <input
              id="preview-text"
              type="text"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Type preview text..."
              className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition"
            />
          </div>

          {/* Summary Bar */}
          <div className="mb-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
              <span className="text-sm font-semibold text-blue-900">
                {CDN_FONTS.length} CDN Fonts
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
              <span className="text-sm font-semibold text-green-900">
                {GOOGLE_FONTS.length} Google Fonts
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2">
              <span className="text-sm font-semibold text-zinc-700">
                {FONT_STACKS.length} Font Stacks
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2">
              <span className="text-sm font-semibold text-purple-900">
                {REALITEASE_FONTS.length} Realitease Fonts
              </span>
            </div>
          </div>

          {/* ========================================= */}
          {/* CDN Fonts — Primary Display               */}
          {/* ========================================= */}
          <section className="mb-12">
            <div className="mb-6 flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                CDN Fonts ({CDN_FONTS.length})
              </h2>
              <span className="rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                CloudFront CDN
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {CDN_FONTS.map((family) => (
                <CdnFontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* ========================================= */}
          {/* Realitease Fonts                          */}
          {/* ========================================= */}
          <section className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-zinc-900">
                Realitease Fonts ({REALITEASE_FONTS.length})
              </h2>
              <span className="rounded-md bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                Game-specific
              </span>
            </div>
            <div className="mb-4 rounded-lg bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-medium text-zinc-600">Used On</p>
              <UsedOnChips entries={REALITEASE_USED_ON} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {REALITEASE_FONTS.map((font) => (
                <RealiteaseFontPreview
                  key={font.name}
                  font={font}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* ========================================= */}
          {/* Google Fonts — Collapsible                 */}
          {/* ========================================= */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-zinc-900">
              Google Fonts ({GOOGLE_FONTS.length})
            </h2>
            <div className="space-y-3">
              {GOOGLE_FONTS.map((family) => (
                <CollapsibleFontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* ========================================= */}
          {/* Font Stacks — Collapsible                 */}
          {/* ========================================= */}
          <section className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-zinc-900">
              Font Stacks ({FONT_STACKS.length})
            </h2>
            <div className="space-y-3">
              {FONT_STACKS.map((family) => (
                <CollapsibleFontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}

"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import ImagePaletteLab from "@/components/admin/color-lab/ImagePaletteLab";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_ROOT_PATH } from "@/lib/admin/admin-route-paths";
import { ADDITIONAL_MONOTYPE_FONTS } from "@/lib/fonts/additional-monotype-fonts";
import { GENERATED_ADDITIONAL_TRR_FONT_CATALOG } from "@/lib/fonts/generated/additional-trr-font-catalog";
import {
  DESIGN_SYSTEM_TAB_DEFINITIONS,
  buildDesignSystemHref,
  getDesignSystemSubtabs,
  type DesignSystemSubtabId,
  type DesignSystemTabId,
} from "@/lib/admin/design-system-routing";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  DESIGN_SYSTEM_BASE_COLORS,
  DESIGN_SYSTEM_COLORS_STORAGE_KEY,
} from "@/lib/admin/design-system-tokens";
import type { ColorLabShareState } from "@/lib/admin/color-lab/types";
import {
  buildHostedFontAssetPath,
  buildHostedFontUrl,
  extractHostedFontAssetLinks,
} from "@/lib/fonts/hosted-fonts";
import {
  normalizeHostedFamilyKey,
  parseHostedFontCatalogStylesheet,
  type HostedFontCatalogFamily,
  type HostedFontCatalogStyle,
} from "@/lib/fonts/hosted-font-catalog";
import type { TypographyArea, TypographyState } from "@/lib/typography/types";
import BrandFontMatchesPanel from "./BrandFontMatchesPanel";

const FontPairAudit = dynamic(() => import("./FontPairAudit"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading font pair audit...
    </div>
  ),
});

const QuestionsTab = dynamic(() => import("@/app/admin/fonts/_components/QuestionsTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading question catalog...
    </div>
  ),
});
const ButtonsTab = dynamic(() => import("@/app/admin/fonts/_components/ButtonsTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading button catalog...
    </div>
  ),
});
const NYTOccurrencesTab = dynamic(() => import("@/app/admin/fonts/_components/NYTOccurrencesTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Scanning NYT occurrences...
    </div>
  ),
});
const ComponentsTab = dynamic(() => import("./ComponentsTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading component catalog...
    </div>
  ),
});
const IconsIllustrationsTab = dynamic(() => import("./IconsIllustrationsTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading icons and illustrations...
    </div>
  ),
});
const TypographyTab = dynamic(() => import("./TypographyTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading typography editor...
    </div>
  ),
});
const AdminLabelsTab = dynamic(() => import("@/components/admin/design-docs/sections/AdminIASection"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading admin route audit...
    </div>
  ),
});

const TINT_SHADE_SWATCHES_PER_SIDE = 3;

type RGB = { red: number; green: number; blue: number };

function normalizeHexColor(colorValue: string): string | null {
  const raw = colorValue.trim();
  if (!raw) return null;
  const match = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  const hex = match[1];
  if (!hex) return null;
  const normalized = hex.length === 3
    ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
    : hex;
  return `#${normalized.toUpperCase()}`;
}

function hexToRgb(colorValue: string): RGB | null {
  const normalized = normalizeHexColor(colorValue);
  if (!normalized) return null;
  const hex = normalized.slice(1);
  return {
    red: parseInt(hex.slice(0, 2), 16),
    green: parseInt(hex.slice(2, 4), 16),
    blue: parseInt(hex.slice(4, 6), 16),
  };
}

function mixChannel(from: number, to: number, ratio: number): number {
  return from + (to - from) * ratio;
}

function channelToHex(channel: number): string {
  return Math.min(Math.max(Math.round(channel), 0), 255).toString(16).padStart(2, "0").toUpperCase();
}

function rgbToHex(rgb: RGB): string {
  return `#${channelToHex(rgb.red)}${channelToHex(rgb.green)}${channelToHex(rgb.blue)}`;
}

function calculateShades(colorValue: string, steps = TINT_SHADE_SWATCHES_PER_SIDE): string[] {
  const rgb = hexToRgb(colorValue);
  if (!rgb) return [];
  const shades = Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / (steps + 1);
    return rgbToHex({
      red: mixChannel(rgb.red, 0, ratio),
      green: mixChannel(rgb.green, 0, ratio),
      blue: mixChannel(rgb.blue, 0, ratio),
    });
  });
  return shades.reverse();
}

function calculateTints(colorValue: string, steps = TINT_SHADE_SWATCHES_PER_SIDE): string[] {
  const rgb = hexToRgb(colorValue);
  if (!rgb) return [];
  return Array.from({ length: steps }, (_, index) => {
    const ratio = (index + 1) / (steps + 1);
    return rgbToHex({
      red: mixChannel(rgb.red, 255, ratio),
      green: mixChannel(rgb.green, 255, ratio),
      blue: mixChannel(rgb.blue, 255, ratio),
    });
  });
}

const CDN_BASE = buildHostedFontAssetPath("/fonts");

interface UsedOnEntry {
  page: string;
  path: string;
}

interface FontWeight {
  weight: number;
  label: string;
  hasItalic: boolean;
  stretch?: string;
  usedOn?: UsedOnEntry[];
}

interface FontFamily {
  name: string;
  cssVar?: string;
  weights: FontWeight[];
  type: "CDN Font" | "Google Font" | "Font Stack";
  source: "CloudFront CDN" | "Google Fonts" | "Tailwind Theme";
  cdnPath?: string;
  previewAssetPath?: string;
  description: string;
  usedOn: UsedOnEntry[];
  fontFamilyValue: string;
}

type FontCatalogSort = "az" | "most-used" | "most-styles" | "recently-touched";
type FontCatalogSourceFilter = "all" | "hosted" | "google" | "stacks" | "reference";
type FontLibraryMode = "catalog" | "brand-matches";

type TypographySetLink = {
  id: string;
  name: string;
  area: TypographyArea;
};

type FontUsagePreview = {
  page: string;
  title: string;
  eyebrow: string;
  body: string;
  snippets: string[];
  route?: string;
  emphasis: string;
};

type ActiveFontPreview = {
  preview: FontUsagePreview;
  fontFamily: string;
};

const INACTIVE_USED_ON_PATTERN = /(Not yet used|Not actively used|Available|Deprecated)/i;

interface ColorFamily {
  title: string;
  description: string;
  usage: string;
  colors: { hex: string; label: string }[];
}

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

function w(weight: number, hasItalic = false): FontWeight {
  return { weight, label: WEIGHT_LABELS[weight] ?? `${weight}`, hasItalic };
}

function stretchLabel(stretch?: string): string {
  if (stretch === "extra-condensed") return "Extra Condensed";
  if (stretch === "condensed") return "Condensed";
  if (stretch === "expanded") return "Expanded";
  return "";
}

function buildCatalogWeightKey(weight: number, stretch?: string): string {
  return `${weight}::${stretch ?? "normal"}`;
}

function buildWeightLabel(weight: number, stretch?: string): string {
  const baseLabel = WEIGHT_LABELS[weight] ?? `${weight}`;
  const widthLabel = stretchLabel(stretch);
  return widthLabel ? `${baseLabel} ${widthLabel}` : baseLabel;
}

function isActiveUsedOnEntry(entry: UsedOnEntry): boolean {
  return !INACTIVE_USED_ON_PATTERN.test(entry.page) && !INACTIVE_USED_ON_PATTERN.test(entry.path);
}

function dedupeUsedOnEntries(entries: UsedOnEntry[]): UsedOnEntry[] {
  const seen = new Set<string>();
  const ordered: UsedOnEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.page}::${entry.path}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(entry);
  }
  return ordered;
}

function getWeightUsedOnEntries(weight: FontWeight, activeOnly = false): UsedOnEntry[] {
  const entries = weight.usedOn ?? [];
  return dedupeUsedOnEntries(activeOnly ? entries.filter(isActiveUsedOnEntry) : entries);
}

function getFontUsedOnEntries(font: { usedOn: UsedOnEntry[]; weights?: FontWeight[] }, activeOnly = false): UsedOnEntry[] {
  const familyEntries = activeOnly ? font.usedOn.filter(isActiveUsedOnEntry) : font.usedOn;
  const weightEntries =
    font.weights?.flatMap((weight) => getWeightUsedOnEntries(weight, activeOnly)) ?? [];
  return dedupeUsedOnEntries([...familyEntries, ...weightEntries]);
}

function normalizeFontLabel(value: string): string {
  const normalized = value
    .replace(/^var\(--font-/, "")
    .replace(/\)$/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s*,.*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const aliases: Record<string, string> = {
    hamburg: "hamburg serial",
    gloucester: "gloucester",
    "plymouth serial": "plymouth serial",
    "plymouth serial variable": "plymouth serial",
    "rude slab": "rude slab condensed",
    "font games": "plymouth serial",
    games: "plymouth serial",
    serif: "gloucester",
  };

  return aliases[normalized] ?? normalized;
}

function normalizeRealiteaseFontKey(value: string): string {
  const primaryFamily = value.split(",")[0]?.replace(/^['"]+|['"]+$/g, "").trim() ?? value;
  return normalizeHostedFamilyKey(primaryFamily);
}

function buildFontWeightsFromCatalog(
  styles: readonly HostedFontCatalogStyle[],
  overrideWeights: readonly FontWeight[] = [],
): FontWeight[] {
  const overrideByKey = new Map(
    overrideWeights.map((weight) => [buildCatalogWeightKey(weight.weight, weight.stretch), weight]),
  );
  const grouped = new Map<
    string,
    { weight: number; stretch?: string; hasItalic: boolean; usedOn?: UsedOnEntry[] }
  >();

  for (const style of styles) {
    const key = buildCatalogWeightKey(style.weight, style.stretch);
    const current = grouped.get(key) ?? {
      weight: style.weight,
      stretch: style.stretch,
      hasItalic: false,
      usedOn: overrideByKey.get(key)?.usedOn,
    };
    current.hasItalic = current.hasItalic || style.style === "italic";
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((entry) => {
      const override = overrideByKey.get(buildCatalogWeightKey(entry.weight, entry.stretch));
      return {
        weight: entry.weight,
        label: override?.label ?? buildWeightLabel(entry.weight, entry.stretch),
        hasItalic: entry.hasItalic || Boolean(override?.hasItalic),
        stretch: entry.stretch,
        usedOn: override?.usedOn,
      };
    })
    .sort((left, right) => {
      if (left.weight !== right.weight) return left.weight - right.weight;
      return (left.stretch ?? "normal").localeCompare(right.stretch ?? "normal");
    });
}

const FONT_PAGE_ROUTE_MAP: Record<string, string> = {
  Home: "/",
  Login: "/login",
  Register: "/auth/register",
  "Auth Finish": "/auth/register",
  "Privacy Policy": "/privacy-policy",
  "Terms of Service": "/terms-of-service",
  "Terms of Sale": "/terms-of-sale",
  Hub: "/hub",
  Profile: "/profile",
  "Hub Surveys": "/hub/surveys",
  "Bravodle Cover": "/bravodle/cover",
  "Bravodle Play": "/bravodle/play",
  "Realitease Cover": "/realitease/cover",
  "Realitease Play": "/realitease/play",
  "RHOSLC Survey": "/surveys/rhoslc-s6",
  "RHOSLC Survey Play": "/surveys/rhoslc-s6/play",
  "RHOSLC Survey Results": "/surveys/rhoslc-s6/results",
  "RHOP Survey": "/surveys/rhop-s10",
};

function buildFontUsagePreview(entry: UsedOnEntry): FontUsagePreview {
  const parsed = parsePreviewFromPath(entry.path);
  const snippets = parsed?.texts?.length ? parsed.texts : [entry.path];
  const primarySnippet = snippets[0] ?? entry.page;
  return {
    page: entry.page,
    title: entry.page,
    eyebrow: "Page usage preview",
    body: entry.path,
    snippets,
    route: FONT_PAGE_ROUTE_MAP[entry.page],
    emphasis: primarySnippet,
  };
}

function countFontStyles(weights: Array<FontWeight | number>): number {
  return weights.reduce<number>((count, weight) => {
    if (typeof weight === "number") return count + 1;
    return count + 1 + (weight.hasItalic ? 1 : 0);
  }, 0);
}

function deriveTouchedScore(entries: UsedOnEntry[]): number {
  return entries.reduce((score, entry, index) => {
    const pathScore = /app\/|src\/|page\.tsx|component/i.test(entry.path) ? 3 : 1;
    const activeScore = isActiveUsedOnEntry(entry) ? 6 : 0;
    return score + activeScore + pathScore + Math.max(0, 12 - index);
  }, 0);
}

function StaticUsedOnPills({ entries }: { entries: UsedOnEntry[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {entries.map((entry, idx) => (
        <span
          key={`${entry.page}-${idx}`}
          title={entry.path}
          className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-inset ring-violet-200"
        >
          {entry.page}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CDN Fonts  (alphabetical)                                         */
/* ------------------------------------------------------------------ */
const CDN_FONTS: FontFamily[] = [
  {
    name: "Beton",
    weights: [w(300), w(600), w(700), w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Beton/`,
    description: "Geometric slab serif by Heinrich Jost. Light through ExtraBold plus condensed/compressed cuts.",
    fontFamilyValue: '"Beton"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Biotif Pro",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(600, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Biotif%20Pro/`,
    description: "Geometric sans-serif with humanist touches. 8 weights with italics.",
    fontFamilyValue: '"Biotif Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Cheltenham",
    weights: [w(300, true), w(400, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Cheltenham/`,
    description: "Classic Bertram Goodhue serif. Light through Ultra weights.",
    fontFamilyValue: '"Cheltenham"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Cheltenham Old Style Pro",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Cheltenham%20Old%20Style%20Pro/`,
    description: "Classic editorial serif from the Cheltenham family.",
    fontFamilyValue: '"Cheltenham Old Style Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Chomsky",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Chomsky/`,
    description: "Blackletter display typeface inspired by the New York Times masthead.",
    fontFamilyValue: '"Chomsky"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Franklin Gothic",
    weights: [w(400, true), w(500, true), w(600, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Franklin%20Gothic/`,
    description: "Classic American grotesque sans-serif. ITC version.",
    fontFamilyValue: '"Franklin Gothic"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Franklin Gothic Raw",
    weights: [w(300, true), w(400, true), w(500), w(600, true), w(800), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Franklin%20Gothic%20Raw/`,
    description: "Rough-textured Franklin Gothic variant by Wiescher Design.",
    fontFamilyValue: '"Franklin Gothic Raw"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Futura Now",
    weights: [w(300, true), w(400, true), w(500, true), w(600, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Futura%20Now/`,
    description: "Geometric sans-serif by Paul Renner (Futura PT variant). 6 weights with obliques. See also: Futura Now Display, Headline, Text.",
    fontFamilyValue: '"Futura Now"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Futura Now Display",
    weights: [w(100, true), w(300, true), w(400, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Futura%20Now/`,
    description: "Futura Now Display sub-family. 6 weights with italics. Optimized for large sizes.",
    fontFamilyValue: '"Futura Now Display"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Futura Now Headline",
    weights: [w(100, true), w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Futura%20Now/`,
    description: "Futura Now Headline sub-family. 8 weights with italics, plus full condensed range.",
    fontFamilyValue: '"Futura Now Headline"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Futura Now Text",
    weights: [w(100, true), w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Futura%20Now/`,
    description: "Futura Now Text sub-family. 8 weights with italics, plus full condensed range. Optimized for body text.",
    fontFamilyValue: '"Futura Now Text"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Geometric Slabserif 703",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Geometric%20Slabserif%20703/`,
    description: "Bitstream geometric slab serif with condensed cuts.",
    fontFamilyValue: '"Geometric Slabserif 703"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Geometric Slabserif 712",
    weights: [w(300, true), w(400, true), w(700), w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Geometric%20Slabserif%20712/`,
    description: "Bitstream geometric slab serif. Light through Extra Bold.",
    fontFamilyValue: '"Geometric Slabserif 712"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Gloucester",
    cssVar: "--font-gloucester",
    weights: [
      {
        weight: 400, label: "Old Style", hasItalic: false,
        usedOn: [
          { page: "Home", path: 'w400 · "Welcome back!", "Log in or create an account"' },
          { page: "Login", path: 'w400 · "Log in to your account"' },
          { page: "Register", path: 'w400 · "Create an Account"' },
          { page: "Auth Finish", path: 'w400 · "Complete Profile"' },
        ],
      },
      {
        weight: 700, label: "Bold", hasItalic: false,
        usedOn: [
          { page: "Signup", path: 'w700 · "Create account"' },
          { page: "Privacy Policy", path: 'w700 · "Privacy Policy"' },
          { page: "Global h1/h2/h3", path: 'w700 · Default browser heading weight via font-serif stack' },
        ],
      },
      { weight: 700, label: "Bold Condensed", hasItalic: false, stretch: "condensed" },
      { weight: 700, label: "Bold Extra Condensed", hasItalic: false, stretch: "extra-condensed" },
      { weight: 700, label: "Bold Extended", hasItalic: false, stretch: "expanded" },
    ],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Gloucester/`,
    description: "Monotype serif family. 5 styles: Old Style, Bold, Bold Condensed, Bold Extra Condensed, Bold Extended.",
    fontFamilyValue: '"Gloucester"',
    usedOn: [],
  },
  {
    name: "Goodall",
    cssVar: "--font-goodall",
    weights: [w(400, true), w(500, true), w(600, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Goodall/`,
    description: "Elegant serif with italic variants.",
    fontFamilyValue: '"Goodall"',
    usedOn: [{ page: "Not yet used", path: "Available via CSS var --font-goodall" }],
  },
  {
    name: "Hamburg Serial",
    cssVar: "--font-hamburg",
    weights: [
      { weight: 200, label: "ExtraLight", hasItalic: true },
      { weight: 300, label: "Light", hasItalic: true },
      {
        weight: 400, label: "Regular", hasItalic: true,
        usedOn: [
          { page: "Home", path: 'w400 · "Log in or create an account to get started" (body text)' },
          { page: "Login", path: 'w400 · "Don\'t have an account? Sign up" (body text)' },
          { page: "Register", path: 'w400 · "Already have an account? Log in" (body text)' },
          { page: "Auth Finish", path: 'w400 · Form placeholder text' },
          { page: "Privacy Policy", path: 'w400 · Policy body paragraphs' },
          { page: "Terms of Service", path: 'w400 · Terms body paragraphs' },
          { page: "Terms of Sale", path: 'w400 · Terms body paragraphs' },
          { page: "Error Boundary", path: 'w400 · "Something went wrong" (fallback text)' },
          { page: "Global default", path: 'w400 · Default body font via font-sans stack' },
        ],
      },
      {
        weight: 500, label: "Medium", hasItalic: true,
        usedOn: [
          { page: "Home", path: 'w500 · "Email" (form label)' },
          { page: "Login", path: 'w500 · "Email", "Password" (form labels), "or" separator' },
          { page: "Register", path: 'w500 · "Email", "Name", "Password" (form labels)' },
          { page: "Auth Finish", path: 'w500 · "Username", "Birthday", "Gender", "Country" (form labels)' },
        ],
      },
      { weight: 700, label: "Bold", hasItalic: true,
        usedOn: [
          { page: "Home", path: 'w700 · "Go to Hub" (button)' },
          { page: "Login", path: 'w700 · "Log in" (button)' },
          { page: "Register", path: 'w700 · "Continue" (button)' },
        ],
      },
      { weight: 800, label: "ExtraBold", hasItalic: true },
      { weight: 900, label: "Black", hasItalic: true },
    ],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Hamburg%20Serial/`,
    description: "Primary brand font. Sans-serif display face used across most pages.",
    fontFamilyValue: '"Hamburg Serial"',
    usedOn: [],
  },
  {
    name: "ITC Cheltenham",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/ITC%20Cheltenham/`,
    description: "ITC standard version of Cheltenham. Light through Ultra with condensed cuts.",
    fontFamilyValue: '"ITC Cheltenham"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "ITC Franklin Gothic LT",
    weights: [w(400, true), w(500, true), w(600, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/ITC%20Franklin%20Gothic%20LT/`,
    description: "Workhorse grotesque sans-serif. ITC Linotype version.",
    fontFamilyValue: '"ITC Franklin Gothic LT"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Magnus",
    weights: [w(700)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Magnus/`,
    description: "Display face. Single bold weight.",
    fontFamilyValue: '"Magnus"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Malden Sans",
    weights: [w(100, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Malden%20Sans/`,
    description: "Contemporary grotesque sans-serif. 7 weights with italics. See also: Malden Sans Condensed.",
    fontFamilyValue: '"Malden Sans"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Malden Sans Condensed",
    weights: [w(100, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Malden%20Sans/`,
    description: "Condensed variant of Malden Sans. 6 weights with italics.",
    fontFamilyValue: '"Malden Sans Condensed"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "News Gothic",
    weights: [w(300), w(400, true), w(500), w(600), w(700, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/News%20Gothic/`,
    description: "Classic grotesque sans-serif by Morris Fuller Benton. Light through Bold.",
    fontFamilyValue: '"News Gothic"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "News Gothic No. 2",
    weights: [w(100, true), w(300, true), w(400, true), w(500, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/News%20Gothic%20No.%202/`,
    description: "Updated News Gothic with expanded weight range. Thin through Black with italics.",
    fontFamilyValue: '"News Gothic No. 2"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Newspaper Publisher JNL",
    weights: [w(400, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Newspaper%20Publisher%20JNL/`,
    description: "Vintage newspaper masthead display face by Jeff Levine.",
    fontFamilyValue: '"Newspaper Publisher JNL"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Newston",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Newston/`,
    description: "Contemporary serif. Normal, inline, and outline variants.",
    fontFamilyValue: '"Newston"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Plymouth Serial",
    cssVar: "--font-plymouth-serial",
    weights: [w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Plymouth%20Serial/`,
    description: "Decorative serif used in game covers and surveys. 6 weights with italics.",
    fontFamilyValue: '"Plymouth Serial"',
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
      { page: "RHOSLC Survey", path: "app/surveys/rhoslc-s6/page.tsx" },
      { page: "Global", path: "font-games stack" },
    ],
  },
  {
    name: "Rockwell",
    weights: [w(300, true), w(400, true), w(700, true), w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Rockwell/`,
    description: "Classic geometric slab serif. Light through ExtraBold with italics and condensed cuts.",
    fontFamilyValue: '"Rockwell"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Rockwell Nova",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Rockwell%20Nova/`,
    description: "Updated Rockwell. 4 weights with italics. See also: Rockwell Nova Condensed.",
    fontFamilyValue: '"Rockwell Nova"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Rockwell Nova Condensed",
    weights: [w(300, true), w(400, true), w(700, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Rockwell%20Nova/`,
    description: "Condensed variant of Rockwell Nova. Light, Regular, Bold with italics.",
    fontFamilyValue: '"Rockwell Nova Condensed"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Rude Slab Condensed",
    cssVar: "--font-rude-slab",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Rude%20Slab%20Condensed/`,
    description: "Condensed slab serif with italic variants. Primary heading font for games and surveys (replaced NYTKarnak Condensed).",
    fontFamilyValue: '"Rude Slab Condensed"',
    usedOn: [
      { page: "Bravodle Cover", path: "app/bravodle/cover/page.tsx" },
      { page: "Bravodle Play", path: "app/bravodle/play/page.tsx" },
      { page: "Bravodle Completed", path: "app/bravodle/play/completed-view.tsx" },
      { page: "Realitease Cover", path: "app/realitease/cover/page.tsx" },
      { page: "Realitease Play", path: "app/realitease/play/page.tsx" },
      { page: "Realitease Completed", path: "app/realitease/play/completed-view.tsx" },
      { page: "RHOSLC Survey", path: "app/surveys/rhoslc-s6/page.tsx" },
      { page: "RHOSLC Survey Play", path: "app/surveys/rhoslc-s6/play/page.tsx" },
      { page: "RHOSLC Survey Results", path: "app/surveys/rhoslc-s6/results/page.tsx" },
      { page: "Hub", path: "app/hub/page.tsx" },
      { page: "Profile", path: "app/profile/page.tsx" },
      { page: "RHOP Survey", path: "app/surveys/rhop-s10/" },
    ],
  },
  {
    name: "Sofia Pro",
    weights: [w(100, true), w(200, true), w(300, true), w(400, true), w(500, true), w(600, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Sofia%20Pro/`,
    description: "Geometric sans-serif with soft terminals. 8 weights with italics.",
    fontFamilyValue: '"Sofia Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stafford Serial",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Stafford%20Serial/`,
    description: "Transitional serif family by SoftMaker. 7 weights with italics.",
    fontFamilyValue: '"Stafford Serial"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stymie",
    weights: [w(300, true), w(500, true), w(700, true), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Stymie/`,
    description: "Classic geometric slab serif. Light through Black with condensed cuts.",
    fontFamilyValue: '"Stymie"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stymie Extra Bold",
    weights: [w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Stymie%20Extra%20Bold/`,
    description: "Classic geometric slab serif. ExtraBold plus condensed cut.",
    fontFamilyValue: '"Stymie Extra Bold"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Velino Compressed Text",
    weights: [w(100), w(300), w(400), w(500), w(700), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/trr/Velino%20Compressed%20Text/`,
    description: "Compressed text serif. 6 weights from Thin to Black.",
    fontFamilyValue: '"Velino Compressed Text"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
];

function inferFontFormat(assetPath: string): string {
  const normalized = assetPath.toLowerCase();
  if (normalized.endsWith(".ttf")) return "truetype";
  if (normalized.endsWith(".woff2")) return "woff2";
  if (normalized.endsWith(".woff")) return "woff";
  return "opentype";
}

const COMPLETE_CDN_FONTS: FontFamily[] = [
  ...CDN_FONTS,
  ...ADDITIONAL_MONOTYPE_FONTS.map((font) => {
    const generatedCatalogEntry = GENERATED_ADDITIONAL_TRR_FONT_CATALOG.find(
      (entry) => normalizeHostedFamilyKey(entry.familyName) === normalizeHostedFamilyKey(font.name),
    );
    return {
      name: font.name,
      weights: generatedCatalogEntry
        ? buildFontWeightsFromCatalog(generatedCatalogEntry.styles)
        : [w(400)],
      type: "CDN Font" as const,
      source: "CloudFront CDN" as const,
      cdnPath: generatedCatalogEntry?.cdnPath ?? `${CDN_BASE}/trr/${encodeURIComponent(font.name)}/`,
      previewAssetPath: font.previewAssetPath,
      description: font.description,
      fontFamilyValue: `"${font.name}"`,
      usedOn: [{ page: "Not yet used", path: "Available in hosted font library" }],
    };
  }),
].sort((left, right) => left.name.localeCompare(right.name));

/* ------------------------------------------------------------------ */
/*  Google Fonts                                                      */
/* ------------------------------------------------------------------ */
const GOOGLE_FONTS: FontFamily[] = [
  {
    name: "Geist Sans",
    cssVar: "--font-geist-sans",
    weights: [w(100), w(200), w(300), w(400), w(500), w(600), w(700), w(800), w(900)],
    type: "Google Font",
    source: "Google Fonts",
    description: "Vercel system font. Part of the default sans stack fallback.",
    fontFamilyValue: "var(--font-geist-sans)",
    usedOn: [{ page: "Global fallback", path: "font-sans stack" }],
  },
  {
    name: "Inter",
    cssVar: "--font-inter",
    weights: [w(100), w(200), w(300), w(400), w(500), w(600), w(700), w(800), w(900)],
    type: "Google Font",
    source: "Google Fonts",
    description: "Popular UI font. Part of the default sans stack fallback.",
    fontFamilyValue: "var(--font-inter)",
    usedOn: [{ page: "Global fallback", path: "font-sans stack" }],
  },
  {
    name: "Playfair Display",
    cssVar: "--font-playfair",
    weights: [w(400), w(500), w(600), w(700), w(800), w(900)],
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
    weights: [w(200), w(300), w(400), w(500), w(600), w(700), w(800), w(900)],
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Hamburg Serial, Inter, and Geist Sans",
    fontFamilyValue: "var(--font-sans)",
    usedOn: [{ page: "Global default", path: "globals.css" }],
  },
  {
    name: "Serif (Gloucester + Playfair)",
    cssVar: "--font-serif",
    weights: [w(400), w(500), w(600), w(700), w(800), w(900)],
    type: "Font Stack",
    source: "Tailwind Theme",
    description: "Includes Gloucester OS, Playfair Display, and fallbacks",
    fontFamilyValue: "var(--font-serif)",
    usedOn: [{ page: "Global h1/h2/h3", path: "globals.css" }],
  },
  {
    name: "Games (Plymouth Serial)",
    cssVar: "--font-games",
    weights: [w(300), w(400), w(500), w(700), w(800), w(900)],
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
/*  Reference Fonts                                                   */
/* ------------------------------------------------------------------ */
interface RealiteaseFontEntry {
  name: string;
  fontFamily: string;
  cdnUrl: string;
  weights: number[];
  description: string;
  usedOn: UsedOnEntry[];
}

const REALITEASE_FONTS: RealiteaseFontEntry[] = [
  {
    name: "NYTKarnak Condensed",
    fontFamily: "'NYTKarnak_Condensed'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/NYTKarnak_Condensed`,
    weights: [400, 700],
    description: "Legacy condensed serif. Replaced by Rude Slab Condensed Bold for all headings.",
    usedOn: [
      { page: "Deprecated", path: "All usages replaced with Rude Slab Condensed Bold (font-rude-slab)" },
    ],
  },
  {
    name: "KarnakPro Condensed",
    fontFamily: "'KarnakPro-CondensedBlack'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/NYTKarnak Medium`,
    weights: [400, 900],
    description: "Condensed serif variant. Defined in CSS but not currently referenced in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "NYTFranklin",
    fontFamily: "'NYTFranklin'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/NYTFranklin`,
    weights: [400, 500, 700],
    description: "Sans-serif. Defined in CSS but not currently referenced directly in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "NYTFranklin Medium",
    fontFamily: "'nyt-franklin'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/NYTFranklin Medium`,
    weights: [500],
    description: "Medium-weight sans-serif. Defined in CSS but not currently referenced directly in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "TN Web Use Only",
    fontFamily: "'TN_Web_Use_Only'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/TN_Web_Use_Only`,
    weights: [400],
    description: "Sans-serif used for instructional text, tab labels, dates, and stat values in games and surveys.",
    usedOn: [
      { page: "Game Cover Date", path: 'w600 · "FEBRUARY 11, 2026" (dynamic date)' },
      { page: "Game Instructions Body", path: 'w500 · "Each guess must be a valid Reality TV personality..."' },
      { page: "Game Instructions Body", path: 'w500 · "The color of the tiles will change to show how close..."' },
      { page: "Game How-To-Play Tabs", path: 'w500/w700 · "GENDER", "AGE", "SHOWS", "EPISODES", "WWHL"' },
      { page: "Game Completed Stats", path: 'w500 · Stat values (Played, Win %, Current Streak, Max Streak)' },
      { page: "Realitease Answer Reveal", path: 'w700 · "ANSWER: PHAEDRA PARKS" (dynamic name)' },
      { page: "RHOSLC Survey Body", path: 'w400 · "Drag each Salt Lake City Housewife from the bench..."' },
      { page: "RHOSLC Survey Results", path: 'w600 · Cast member names (e.g. "Lisa Barlow")' },
    ],
  },
  {
    name: "Helvetica Neue (Tee Franklin)",
    fontFamily: "'Helvetica Neue', 'Tee Franklin W01 Medium'",
    cdnUrl: `${CDN_BASE}/reference%20fonts/NYTimes/Tee Franklin W01 Medium`,
    weights: [400, 500],
    description: "Sans-serif used for puzzle metadata on game cover pages.",
    usedOn: [
      { page: "Game Cover Puzzle Number", path: 'w600 · "NO. 001" (3-digit padded number)' },
      { page: "Game Cover Attribution", path: 'w600 · "CREATED BY THE REALITY REPORTER"' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared UI Components                                              */
/* ------------------------------------------------------------------ */

/** Parse a path like 'w700 · "How To Play", "Report a Problem"' */
function parsePreviewFromPath(path: string): { weight: number; texts: string[] } | null {
  const weightMatch = path.match(/^w(\d+)/);
  if (!weightMatch) return null;
  const weight = parseInt(weightMatch[1], 10);
  const texts: string[] = [];
  const textMatches = path.matchAll(/"([^"]+)"/g);
  for (const m of textMatches) texts.push(m[1]);
  return texts.length > 0 ? { weight, texts } : null;
}

function FontUsagePreviewModal({
  activePreview,
  onClose,
}: {
  activePreview: ActiveFontPreview | null;
  onClose: () => void;
}) {
  if (!activePreview) return null;

  const { preview, fontFamily } = activePreview;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-zinc-950/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="font-usage-preview-title"
      data-testid="font-usage-preview-modal"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {preview.eyebrow}
            </div>
            <h3 id="font-usage-preview-title" className="mt-2 text-xl font-bold tracking-[-0.03em] text-zinc-950">
              {preview.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 [overflow-wrap:anywhere]">
              {preview.body}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-600"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-[24px] border border-zinc-200 bg-[#F8F5EE] p-5">
          <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {preview.page}
            </div>
            <div
              className="mt-4 max-w-[18ch] text-[2rem] font-semibold leading-none tracking-[-0.04em] text-zinc-950"
              style={{ fontFamily }}
            >
              {preview.emphasis}
            </div>
            <div className="mt-4 space-y-2">
              {preview.snippets.map((snippet) => (
                <div
                  key={snippet}
                  className="rounded-[16px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900"
                  style={{ fontFamily }}
                >
                  {snippet}
                </div>
              ))}
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600">
              This specimen keeps the original page’s typography feel while focusing on the text that actually uses this font.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {preview.route ? (
            <a
              href={preview.route}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Open actual page
            </a>
          ) : (
            <span className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-400">
              No live page route
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function UsedOnChips({
  entries,
  fontFamily,
  onOpenPreview,
}: {
  entries: UsedOnEntry[];
  fontFamily: string;
  onOpenPreview: (preview: ActiveFontPreview) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry, idx) => {
        const preview = buildFontUsagePreview(entry);
        return (
          <button
            key={`${entry.page}-${idx}`}
            type="button"
            onClick={() => onOpenPreview({ preview, fontFamily })}
            title={entry.path}
            className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-inset ring-violet-200 transition hover:bg-violet-100"
          >
            {entry.page}
          </button>
        );
      })}
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

function TypeBadge({ type, source }: { type: FontFamily["type"]; source: FontFamily["source"] }) {
  const displayType = type === "CDN Font" ? "Hosted Font" : type;
  const displaySource = source === "CloudFront CDN" ? "Cloudflare R2" : source;
  const colors =
    type === "CDN Font"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : type === "Google Font"
        ? "bg-green-50 text-green-700 ring-green-200"
        : "bg-zinc-100 text-zinc-600 ring-zinc-200";
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${colors}`}>
        {displayType}
      </span>
      <span className="text-[10px] text-zinc-400">{displaySource}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible Font Card — Google Fonts style                        */
/* ------------------------------------------------------------------ */

function FontCard({
  family,
  fontAssetHref,
  previewText,
  linkedSets,
  isPinned,
  onTogglePin,
  onOpenPreview,
  onOpenTypographySet,
}: {
  family: FontFamily;
  fontAssetHref?: string;
  previewText: string;
  linkedSets: TypographySetLink[];
  isPinned: boolean;
  onTogglePin: () => void;
  onOpenPreview: (preview: ActiveFontPreview) => void;
  onOpenTypographySet: (setId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const totalWeights = family.weights.length;
  const hasAnyItalic = family.weights.some((w) => w.hasItalic);
  const totalStyles = totalWeights + (hasAnyItalic ? family.weights.filter((w) => w.hasItalic).length : 0);
  const activeUsedOn = getFontUsedOnEntries(family, true);
  const displayUsedOn = activeUsedOn.length > 0 ? activeUsedOn : getFontUsedOnEntries(family);
  const fallbackCdnHref = family.previewAssetPath
    ? buildHostedFontUrl(family.previewAssetPath)
    : family.cdnPath
      ? (family.cdnPath.startsWith("/fonts/") ? buildHostedFontUrl(family.cdnPath) : family.cdnPath)
      : null;
  const resolvedAssetHref = fontAssetHref ?? fallbackCdnHref;

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      data-testid={`font-card-${family.name}`}
    >
      <div className="flex items-stretch gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-zinc-50/60"
        >
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h3
                className="truncate text-[15px] font-semibold text-zinc-900"
                style={{ fontFamily: family.fontFamilyValue }}
              >
                {family.name}
              </h3>
              <p
                className="mt-1 truncate text-sm text-zinc-500"
                style={{ fontFamily: family.fontFamilyValue, fontWeight: 400 }}
              >
                {previewText}
              </p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <TypeBadge type={family.type} source={family.source} />
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
                {displayUsedOn.length} used
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-600">
                {totalStyles} style{totalStyles > 1 ? "s" : ""}
              </span>
            </div>
            {activeUsedOn.length > 0 ? <StaticUsedOnPills entries={activeUsedOn} /> : null}
          </div>
          <ChevronIcon open={open} />
        </button>
        <button
          type="button"
          onClick={onTogglePin}
          className={`self-start rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
            isPinned
              ? "bg-zinc-950 text-white"
              : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
          }`}
        >
          {isPinned ? "Pinned" : "Compare"}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-100">
          <div className="px-4 py-2 bg-zinc-50/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
            {family.cssVar && (
              <span>
                CSS: <code className="font-mono text-zinc-700">{family.cssVar}</code>
              </span>
            )}
            {family.cdnPath && resolvedAssetHref && (
              <a
                href={resolvedAssetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-sm"
                title={resolvedAssetHref}
              >
                {family.cdnPath}
              </a>
            )}
          </div>

          <div className="px-4 py-1.5">
            <p className="text-xs text-zinc-500">{family.description}</p>
          </div>

          {linkedSets.length > 0 ? (
            <div className="px-4 py-2 border-b border-zinc-100">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                In Typography Sets
              </p>
              <div className="flex flex-wrap gap-1">
                {linkedSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => onOpenTypographySet(set.id)}
                    className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-200"
                  >
                    {set.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {displayUsedOn.length > 0 && (
            <div className="px-4 py-2 border-b border-zinc-100">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Used On
              </p>
              <UsedOnChips
                entries={displayUsedOn}
                fontFamily={family.fontFamilyValue}
                onOpenPreview={onOpenPreview}
              />
            </div>
          )}

          <div className="px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Weights
            </p>
            <div className="mb-1.5 hidden grid-cols-[8rem_minmax(0,1fr)_14rem] gap-2 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 md:grid">
              <span>Style</span>
              <span>Preview</span>
              <span>Pages</span>
            </div>
            <div className="space-y-2">
              {family.weights.map((wt, idx) => (
                <div key={`${wt.weight}-${wt.stretch ?? "normal"}-${idx}`} className="border-b border-zinc-50 pb-2 last:border-0 last:pb-0">
                  {(() => {
                    const activeWeightUsedOn = getWeightUsedOnEntries(wt, true);
                    const displayWeightUsedOn = activeWeightUsedOn.length > 0 ? activeWeightUsedOn : getWeightUsedOnEntries(wt);
                    return (
                      <>
                        <div className="grid gap-1 md:grid-cols-[8rem_minmax(0,1fr)_14rem] md:items-start md:gap-2">
                          <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
                            {wt.weight} {wt.label}
                          </span>
                          <p
                            className="text-lg text-zinc-900 leading-snug truncate"
                            style={{
                              fontFamily: family.fontFamilyValue,
                              fontWeight: wt.weight,
                              ...(wt.stretch ? { fontStretch: wt.stretch } : {}),
                            }}
                          >
                            {previewText}
                          </p>
                          <div className="min-h-6 md:pt-0.5">
                            {displayWeightUsedOn.length > 0 ? (
                              <UsedOnChips
                                entries={displayWeightUsedOn}
                                fontFamily={family.fontFamilyValue}
                                onOpenPreview={onOpenPreview}
                              />
                            ) : (
                              <span className="text-xs text-zinc-300">—</span>
                            )}
                          </div>
                        </div>
                        {wt.hasItalic && (
                          <div className="mt-1.5 grid gap-1 md:grid-cols-[8rem_minmax(0,1fr)_14rem] md:items-start md:gap-2">
                            <span className="text-[11px] font-medium text-zinc-400 tabular-nums">
                              {wt.weight} Italic
                            </span>
                            <p
                              className="text-lg text-zinc-900 leading-snug truncate"
                              style={{
                                fontFamily: family.fontFamilyValue,
                                fontWeight: wt.weight,
                                fontStyle: "italic",
                                ...(wt.stretch ? { fontStretch: wt.stretch } : {}),
                              }}
                            >
                              {previewText}
                            </p>
                            <div className="min-h-6 md:pt-0.5">
                              {displayWeightUsedOn.length > 0 ? (
                                <UsedOnChips
                                  entries={displayWeightUsedOn}
                                  fontFamily={family.fontFamilyValue}
                                  onOpenPreview={onOpenPreview}
                                />
                              ) : (
                                <span className="text-xs text-zinc-300">—</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
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
/*  Reference Font Card                                               */
/* ------------------------------------------------------------------ */

function RealiteaseFontCard({
  font,
  previewText,
  linkedSets,
  isPinned,
  onTogglePin,
  onOpenPreview,
  onOpenTypographySet,
}: {
  font: RealiteaseFontEntry;
  previewText: string;
  linkedSets: TypographySetLink[];
  isPinned: boolean;
  onTogglePin: () => void;
  onOpenPreview: (preview: ActiveFontPreview) => void;
  onOpenTypographySet: (setId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      data-testid={`font-card-${font.name}`}
    >
      <div className="flex items-stretch gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-4 text-left transition-colors hover:bg-zinc-50/60"
        >
          <div className="min-w-0 flex-1">
            <div className="min-w-0">
              <h3
                className="truncate text-lg font-semibold text-zinc-900"
                style={{ fontFamily: font.fontFamily }}
              >
                {font.name}
              </h3>
              <p
                className="mt-2 truncate text-sm text-zinc-500"
                style={{ fontFamily: font.fontFamily, fontWeight: 400 }}
              >
                {previewText}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 ring-1 ring-inset ring-purple-200">
                CDN Font
              </span>
              <span className="text-[10px] text-zinc-400">Reference</span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {font.usedOn.length} used
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                {font.weights.length} style{font.weights.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <ChevronIcon open={open} />
        </button>
        <button
          type="button"
          onClick={onTogglePin}
          className={`self-start rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
            isPinned
              ? "bg-zinc-950 text-white"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          {isPinned ? "Pinned" : "Compare"}
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-100">
          <div className="px-5 py-2 bg-zinc-50/40">
            <code className="text-xs text-blue-700 break-all">{font.cdnUrl}</code>
          </div>

          {/* Description */}
          <div className="px-5 py-2">
            <p className="text-xs text-zinc-500">{font.description}</p>
          </div>

          {linkedSets.length > 0 ? (
            <div className="px-5 py-2 border-b border-zinc-100">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                In Typography Sets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {linkedSets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => onOpenTypographySet(set.id)}
                    className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-200"
                  >
                    {set.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Used On */}
          <div className="px-5 py-2 border-b border-zinc-100">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Used On
            </p>
            <UsedOnChips entries={font.usedOn} fontFamily={font.fontFamily} onOpenPreview={onOpenPreview} />
          </div>

          {/* Weights */}
          <div className="px-5 py-4 space-y-3">
            {font.weights.map((weight) => (
              <div key={weight} className="flex items-baseline gap-3">
                <span className="w-24 flex-shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums">
                  {weight} {WEIGHT_LABELS[weight] ?? ""}
                </span>
                <p
                  className="text-xl text-zinc-900 leading-snug truncate"
                  style={{ fontFamily: font.fontFamily, fontWeight: weight }}
                >
                  {previewText}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FontComparisonTray({
  entries,
  previewText,
  onRemove,
}: {
  entries: Array<{
    id: string;
    name: string;
    fontFamily: string;
    styles: number;
    usageCount: number;
    sets: TypographySetLink[];
  }>;
  previewText: string;
  onRemove: (id: string) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="sticky top-0 z-20 mb-5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold tracking-tight text-zinc-950">
            Comparison tray
          </h2>
          <span className="text-xs tabular-nums text-zinc-400">
            {entries.length}/3 pinned
          </span>
        </div>
      </div>
      <div className="mt-3 grid gap-2.5 lg:grid-cols-3">
        {entries.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-zinc-200 bg-zinc-50/60 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-zinc-950">{entry.name}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-zinc-500">
                  <span>{entry.usageCount} used</span>
                  <span className="text-zinc-300">·</span>
                  <span>{entry.styles} styles</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                className="rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-700"
              >
                Remove
              </button>
            </div>
            <div
              className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-xl leading-snug tracking-tight text-zinc-950"
              style={{ fontFamily: entry.fontFamily }}
            >
              {previewText}
            </div>
            {entry.sets.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1">
                {entry.sets.map((set) => (
                  <span
                    key={`${entry.id}-${set.id}`}
                    className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-200"
                  >
                    {set.name}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

const COLOR_FAMILIES: ColorFamily[] = [
  {
    title: "Auth Neutrals",
    description: "Login, landing, and account-completion surfaces rely on a clean neutral palette with black CTAs.",
    usage: "Landing + auth",
    colors: [
      { hex: "#000000", label: "Primary text / border" },
      { hex: "#FFFFFF", label: "Surface" },
      { hex: "#171717", label: "Primary CTA" },
      { hex: "#E5E7EB", label: "Dividers / muted borders" },
      { hex: "#DC2626", label: "Error text" },
      { hex: "#2563EB", label: "Info banners" },
    ],
  },
  {
    title: "Admin Zinc + Utility",
    description: "Admin shell and tooling lean on zinc neutrals, cyan badges, and red destructive states.",
    usage: "Admin shell",
    colors: [
      { hex: "#18181B", label: "Primary admin CTA / active nav" },
      { hex: "#FFFFFF", label: "Panel surfaces" },
      { hex: "#F4F4F5", label: "Subtle panel background" },
      { hex: "#E4E4E7", label: "Panel borders" },
      { hex: "#CFFAFE", label: "Info badges" },
      { hex: "#DC2626", label: "Destructive states" },
    ],
  },
  {
    title: "RHOSLC Rose",
    description: "Season-specific survey pages use a rose-toned system across entry, play, and results views.",
    usage: "RHOSLC survey",
    colors: [
      { hex: "#881337", label: "Headline / text" },
      { hex: "#E11D48", label: "Primary CTA" },
      { hex: "#FB7185", label: "Accent / progress" },
      { hex: "#FFF1F2", label: "Soft background" },
      { hex: "#FFE4E6", label: "Card borders / fills" },
      { hex: "#0EA5E9", label: "Snowflake fill accent" },
    ],
  },
  {
    title: "RHOP Plum",
    description: "RHOP survey pages use a plum and blush palette with soft white overlays.",
    usage: "RHOP survey",
    colors: [
      { hex: "#5C0F4F", label: "Primary plum" },
      { hex: "#1B0017", label: "Headline text" },
      { hex: "#FDF5FB", label: "Surface background" },
      { hex: "#12000E", label: "Gradient anchor" },
      { hex: "#FFFFFF", label: "Inverse text / button" },
      { hex: "#4B0A3F", label: "Hover plum" },
    ],
  },
  {
    title: "Realitease Gameplay",
    description: "Realitease uses show-tile colors and a cool blue game frame with high-contrast status states.",
    usage: "Realitease",
    colors: [
      { hex: "#94AED1", label: "Board background" },
      { hex: "#60811F", label: "Success / exact match" },
      { hex: "#E6B903", label: "Partial match" },
      { hex: "#28578A", label: "Episode-cycle blue" },
      { hex: "#644073", label: "Grouped match alt" },
      { hex: "#5D5F63", label: "Incorrect / neutral tile" },
    ],
  },
  {
    title: "Bravodle Lavender",
    description: "Bravodle cover surfaces use a soft lavender base paired with the shared game typography.",
    usage: "Bravodle",
    colors: [
      { hex: "#D0ADC9", label: "Cover background" },
      { hex: "#FFFFFF", label: "Headline / icon surface" },
      { hex: "#111827", label: "Body / contrast text" },
    ],
  },
  {
    title: "Social Platform Badges",
    description: "Admin social and show tabs use platform-specific badge colors for fast recognition.",
    usage: "Social admin",
    colors: [
      { hex: "#F43F5E", label: "Instagram" },
      { hex: "#111827", label: "TikTok / Threads base" },
      { hex: "#0284C7", label: "Twitter/X" },
      { hex: "#DC2626", label: "YouTube" },
      { hex: "#1D4ED8", label: "Facebook" },
      { hex: "#EA580C", label: "Reddit" },
    ],
  },
  {
    title: "Survey Fallbacks",
    description: "Reusable survey inputs ship with default fallback colors for placeholders, options, and answer scales.",
    usage: "Survey components",
    colors: [
      { hex: "#5D3167", label: "Figma-selected fill" },
      { hex: "#E2C3E9", label: "Figma option background" },
      { hex: "#D9D9D9", label: "Placeholder fill" },
      { hex: "#DCDDDF", label: "Placeholder border" },
      { hex: "#356A3B", label: "Positive sentiment / keep" },
      { hex: "#99060A", label: "Negative sentiment / fire" },
    ],
  },
];

interface DesignSystemPageContentProps {
  activeTab: DesignSystemTabId;
  activeSubtab: DesignSystemSubtabId | null;
  initialColorLabState?: ColorLabShareState | null;
}

function DesignSystemPageContent({ activeTab, activeSubtab, initialColorLabState = null }: DesignSystemPageContentProps) {
  const router = useRouter();
  const { user, checking, hasAccess } = useAdminGuard();
  const [previewText, setPreviewText] = useState(
    "The quick brown fox jumps over the lazy dog"
  );
  const [showUsedOnly, setShowUsedOnly] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [fontSort, setFontSort] = useState<FontCatalogSort>("az");
  const [fontSourceFilter, setFontSourceFilter] = useState<FontCatalogSourceFilter>("all");
  const [fontLibraryMode, setFontLibraryMode] = useState<FontLibraryMode>("catalog");
  const [brandMatchesRefreshToken, setBrandMatchesRefreshToken] = useState(0);
  const [brandMatchesRefreshing, setBrandMatchesRefreshing] = useState(false);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [typographyState, setTypographyState] = useState<TypographyState | null>(null);
  const [activeFontPreview, setActiveFontPreview] = useState<ActiveFontPreview | null>(null);
  const [hostedFontAssetLinks, setHostedFontAssetLinks] = useState<Record<string, string>>({});
  const [hostedFontCatalogEntries, setHostedFontCatalogEntries] = useState<HostedFontCatalogFamily[]>([]);
  const [designSystemColors, setDesignSystemColors] = useState<string[]>(() => [...DESIGN_SYSTEM_BASE_COLORS]);
  const [newBaseColor, setNewBaseColor] = useState("#5C0F4F");
  const [newBaseColorError, setNewBaseColorError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/hosted-fonts.css")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.text();
      })
      .then((stylesheet) => {
        if (!stylesheet || cancelled) return;
        setHostedFontAssetLinks(extractHostedFontAssetLinks(stylesheet));
        setHostedFontCatalogEntries(parseHostedFontCatalogStylesheet(stylesheet));
      })
      .catch(() => {
        if (cancelled) return;
        setHostedFontAssetLinks({});
        setHostedFontCatalogEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/design-system/typography")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<TypographyState>;
      })
      .then((payload) => {
        if (!payload || cancelled) return;
        setTypographyState(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setTypographyState(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DESIGN_SYSTEM_COLORS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const normalized = parsed
        .map((entry) => (typeof entry === "string" ? normalizeHexColor(entry) : null))
        .filter((entry): entry is string => Boolean(entry));
      if (!normalized.length) return;
      setDesignSystemColors(Array.from(new Set(normalized)));
    } catch {
      // Ignore malformed persisted colors and keep defaults.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DESIGN_SYSTEM_COLORS_STORAGE_KEY,
        JSON.stringify(designSystemColors),
      );
    } catch {
      // Ignore persistence failures.
    }
  }, [designSystemColors]);

  const authoritativeCdnFonts = useMemo(() => {
    if (hostedFontCatalogEntries.length === 0) return COMPLETE_CDN_FONTS;

    const overridesByKey = new Map(
      COMPLETE_CDN_FONTS.map((font) => [normalizeHostedFamilyKey(font.name), font]),
    );
    const parsedHosted = hostedFontCatalogEntries
      .filter((entry) => entry.bucket === "trr")
      .map((entry) => {
        const override = overridesByKey.get(normalizeHostedFamilyKey(entry.familyName));
        const primarySourceUrl = entry.styles[0]?.sourceUrl ?? "";
        return {
          name: override?.name ?? entry.familyName,
          cssVar: override?.cssVar,
          weights: buildFontWeightsFromCatalog(entry.styles, override?.weights ?? []),
          type: "CDN Font" as const,
          source: "CloudFront CDN" as const,
          cdnPath: entry.cdnPath ?? override?.cdnPath,
          previewAssetPath:
            override?.previewAssetPath ??
            (primarySourceUrl.startsWith("/fonts/") ? primarySourceUrl : undefined),
          description:
            override?.description ??
            `Hosted font family served from Cloudflare R2. ${entry.styles.length} font file${entry.styles.length === 1 ? "" : "s"} discovered in /hosted-fonts.css.`,
          usedOn: override?.usedOn ?? [{ page: "Not yet used", path: "Available in hosted font library" }],
          fontFamilyValue: override?.fontFamilyValue ?? `"${entry.familyName}"`,
        };
      });
    const parsedKeys = new Set(parsedHosted.map((font) => normalizeHostedFamilyKey(font.name)));
    const extras = COMPLETE_CDN_FONTS.filter((font) => !parsedKeys.has(normalizeHostedFamilyKey(font.name)));

    return [...parsedHosted, ...extras].sort((left, right) => left.name.localeCompare(right.name));
  }, [hostedFontCatalogEntries]);

  const authoritativeRealiteaseFonts = useMemo(() => {
    if (hostedFontCatalogEntries.length === 0) return REALITEASE_FONTS;

    const overridesByKey = new Map<string, RealiteaseFontEntry>();
    for (const font of REALITEASE_FONTS) {
      overridesByKey.set(normalizeHostedFamilyKey(font.name), font);
      overridesByKey.set(normalizeRealiteaseFontKey(font.fontFamily), font);
    }

    const parsedRealitease = hostedFontCatalogEntries
      .filter((entry) => entry.bucket === "reference")
      .map((entry) => {
        const override = overridesByKey.get(normalizeHostedFamilyKey(entry.familyName));
        const primarySourceUrl = entry.styles[0]?.sourceUrl ?? "";
        const displayName = override?.name ?? entry.familyName.replace(/_/g, " ");
        const uniqueWeights = [...new Set(entry.styles.map((style) => style.weight))].sort((left, right) => left - right);
        return {
          name: displayName,
          fontFamily: override?.fontFamily ?? `"${entry.familyName}"`,
          cdnUrl: primarySourceUrl || entry.cdnPath || "",
          weights: uniqueWeights,
          description:
            override?.description ??
            `Reference font family discovered in /hosted-fonts.css. ${entry.styles.length} font file${entry.styles.length === 1 ? "" : "s"} available from Cloudflare R2.`,
          usedOn: override?.usedOn ?? [{ page: "Not actively used", path: "Available on CDN" }],
        };
      });
    const parsedKeys = new Set(parsedRealitease.map((font) => normalizeHostedFamilyKey(font.name)));
    const extras = REALITEASE_FONTS.filter((font) => !parsedKeys.has(normalizeHostedFamilyKey(font.name)));

    return [...parsedRealitease, ...extras].sort((left, right) => left.name.localeCompare(right.name));
  }, [hostedFontCatalogEntries]);

  const handleAddBaseColor = useCallback(() => {
    const normalized = normalizeHexColor(newBaseColor);
    if (!normalized) {
      setNewBaseColorError("Enter a valid hex color (for example #5C0F4F).");
      return;
    }

    let added = false;
    setDesignSystemColors((prev) => {
      if (prev.includes(normalized)) {
        return prev;
      }
      added = true;
      return [...prev, normalized];
    });

    if (added) {
      setNewBaseColor(normalized);
      setNewBaseColorError(null);
    } else {
      setNewBaseColorError("That base color is already in the list.");
    }
  }, [newBaseColor]);

  const handleTabClick = useCallback(
    (tabId: DesignSystemTabId) => {
      if (activeTab === tabId) return;
      router.push(buildDesignSystemHref(tabId));
    },
    [activeTab, router],
  );

  const normalizedNewBaseColor = normalizeHexColor(newBaseColor) ?? "#000000";

  const isUsed = (font: { usedOn: UsedOnEntry[]; weights?: FontWeight[] }) =>
    getFontUsedOnEntries(font, true).length > 0;

  const typographySetLinksByFont = useMemo(() => {
    const map = new Map<string, TypographySetLink[]>();
    typographyState?.sets.forEach((set) => {
      const seenInSet = new Set<string>();
      Object.values(set.roles).forEach((role) => {
        [role.mobile.fontFamily, role.desktop.fontFamily].forEach((fontFamily) => {
          const key = normalizeFontLabel(fontFamily);
          if (!key || seenInSet.has(key)) return;
          seenInSet.add(key);
          const bucket = map.get(key) ?? [];
          bucket.push({ id: set.id, name: set.name, area: set.area });
          map.set(key, bucket);
        });
      });
    });
    return map;
  }, [typographyState]);

  const matchesSearch = useCallback(
    (values: string[]) => {
      const query = fontSearch.trim().toLowerCase();
      if (!query) return true;
      return values.some((value) => value.toLowerCase().includes(query));
    },
    [fontSearch],
  );

  const sortFamilies = useCallback(
    <T extends FontFamily | RealiteaseFontEntry>(items: T[], getEntries: (item: T) => UsedOnEntry[], getStyles: (item: T) => number, getName: (item: T) => string) => {
      const next = [...items];
      next.sort((left, right) => {
        const leftEntries = getEntries(left);
        const rightEntries = getEntries(right);
        if (fontSort === "most-used") {
          return rightEntries.length - leftEntries.length || getName(left).localeCompare(getName(right));
        }
        if (fontSort === "most-styles") {
          return getStyles(right) - getStyles(left) || getName(left).localeCompare(getName(right));
        }
        if (fontSort === "recently-touched") {
          return deriveTouchedScore(rightEntries) - deriveTouchedScore(leftEntries) || getName(left).localeCompare(getName(right));
        }
        return getName(left).localeCompare(getName(right));
      });
      return next;
    },
    [fontSort],
  );

  const filteredCDN = useMemo(() => {
    const filtered = authoritativeCdnFonts.filter((family) => {
      if (fontSourceFilter !== "all" && fontSourceFilter !== "hosted") return false;
      const entries = getFontUsedOnEntries(family);
      if (showUsedOnly && !isUsed(family)) return false;
      return matchesSearch([family.name, family.cssVar ?? "", family.description, ...entries.map((entry) => `${entry.page} ${entry.path}`)]);
    });
    return sortFamilies(filtered, (item) => getFontUsedOnEntries(item, true), (item) => countFontStyles(item.weights), (item) => item.name);
  }, [authoritativeCdnFonts, fontSourceFilter, matchesSearch, showUsedOnly, sortFamilies]);

  const filteredGoogle = useMemo(() => {
    const filtered = GOOGLE_FONTS.filter((family) => {
      if (fontSourceFilter !== "all" && fontSourceFilter !== "google") return false;
      const entries = getFontUsedOnEntries(family);
      if (showUsedOnly && !isUsed(family)) return false;
      return matchesSearch([family.name, family.cssVar ?? "", family.description, ...entries.map((entry) => `${entry.page} ${entry.path}`)]);
    });
    return sortFamilies(filtered, (item) => getFontUsedOnEntries(item, true), (item) => countFontStyles(item.weights), (item) => item.name);
  }, [fontSourceFilter, matchesSearch, showUsedOnly, sortFamilies]);

  const filteredStacks = useMemo(() => {
    const filtered = FONT_STACKS.filter((family) => {
      if (fontSourceFilter !== "all" && fontSourceFilter !== "stacks") return false;
      const entries = getFontUsedOnEntries(family);
      if (showUsedOnly && !isUsed(family)) return false;
      return matchesSearch([family.name, family.cssVar ?? "", family.description, ...entries.map((entry) => `${entry.page} ${entry.path}`)]);
    });
    return sortFamilies(filtered, (item) => getFontUsedOnEntries(item, true), (item) => countFontStyles(item.weights), (item) => item.name);
  }, [fontSourceFilter, matchesSearch, showUsedOnly, sortFamilies]);

  const filteredRealitease = useMemo(() => {
    const filtered = authoritativeRealiteaseFonts.filter((font) => {
      if (fontSourceFilter !== "all" && fontSourceFilter !== "reference") return false;
      if (showUsedOnly && !isUsed({ usedOn: font.usedOn })) return false;
      return matchesSearch([font.name, font.description, ...font.usedOn.map((entry) => `${entry.page} ${entry.path}`)]);
    });
    return sortFamilies(filtered, (item) => item.usedOn.filter(isActiveUsedOnEntry), (item) => item.weights.length, (item) => item.name);
  }, [authoritativeRealiteaseFonts, fontSourceFilter, matchesSearch, showUsedOnly, sortFamilies]);

  const catalogTotalFamilies =
    authoritativeCdnFonts.length + GOOGLE_FONTS.length + FONT_STACKS.length + authoritativeRealiteaseFonts.length;
  const activeInAppFamilies = [
    ...authoritativeCdnFonts.filter((family) => isUsed(family)),
    ...GOOGLE_FONTS.filter((family) => isUsed(family)),
    ...FONT_STACKS.filter((family) => isUsed(family)),
    ...authoritativeRealiteaseFonts.filter((font) => isUsed({ usedOn: font.usedOn })),
  ].length;

  const comparisonEntries = useMemo(() => {
    const allEntries = [
      ...authoritativeCdnFonts.map((family) => ({
        id: family.name,
        name: family.name,
        fontFamily: family.fontFamilyValue,
        styles: countFontStyles(family.weights),
        usageCount: getFontUsedOnEntries(family, true).length,
        sets: typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? [],
      })),
      ...GOOGLE_FONTS.map((family) => ({
        id: family.name,
        name: family.name,
        fontFamily: family.fontFamilyValue,
        styles: countFontStyles(family.weights),
        usageCount: getFontUsedOnEntries(family, true).length,
        sets: typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? [],
      })),
      ...FONT_STACKS.map((family) => ({
        id: family.name,
        name: family.name,
        fontFamily: family.fontFamilyValue,
        styles: countFontStyles(family.weights),
        usageCount: getFontUsedOnEntries(family, true).length,
        sets: typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? [],
      })),
      ...authoritativeRealiteaseFonts.map((font) => ({
        id: font.name,
        name: font.name,
        fontFamily: font.fontFamily,
        styles: font.weights.length,
        usageCount: font.usedOn.filter(isActiveUsedOnEntry).length,
        sets: typographySetLinksByFont.get(normalizeFontLabel(font.fontFamily)) ?? [],
      })),
    ];
    return comparisonIds.map((id) => allEntries.find((entry) => entry.id === id)).filter(Boolean) as NonNullable<typeof allEntries[number]>[];
  }, [authoritativeCdnFonts, authoritativeRealiteaseFonts, comparisonIds, typographySetLinksByFont]);

  const cdnFontCount = filteredCDN.length;
  const googleFontCount = filteredGoogle.length;
  const stackCount = filteredStacks.length;
  const realiteaseCount = filteredRealitease.length;
  const totalStyles = filteredCDN.reduce((sum, f) => sum + f.weights.length + f.weights.filter((w) => w.hasItalic).length, 0);
  const activeTabSubtabs = getDesignSystemSubtabs(activeTab);
  const additionalHostedFontPreviewCss = ADDITIONAL_MONOTYPE_FONTS.map((font) => (
    `@font-face { font-family: "${font.name}"; src: url("${buildHostedFontAssetPath(font.previewAssetPath)}") format("${inferFontFormat(font.previewAssetPath)}"); font-weight: 400; font-style: normal; font-display: swap; }`
  )).join("\n");
  const toggleComparison = (fontId: string) => {
    setComparisonIds((current) => {
      if (current.includes(fontId)) {
        return current.filter((entry) => entry !== fontId);
      }
      if (current.length >= 3) {
        return [...current.slice(1), fontId];
      }
      return [...current, fontId];
    });
  };
  const openTypographySet = (setId: string) => {
    router.push(`/design-system/fonts/typography?set=${encodeURIComponent(setId)}`);
  };
  const triggerBrandMatchesRefresh = useCallback(() => {
    setBrandMatchesRefreshToken((current) => current + 1);
  }, []);

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
        <AdminGlobalHeader bodyClassName="px-6 py-4">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <AdminBreadcrumbs
                  items={buildAdminSectionBreadcrumb(
                    activeTab === "fonts"
                      ? "Fonts"
                      : activeTab === "admin-labels"
                        ? "Admin Labels & Routes"
                        : "UI Design System",
                    activeTab === "admin-labels" ? "/design-system/admin-labels" : "/design-system/fonts",
                  )}
                  className="mb-1"
                />
                <h1 className="text-2xl font-bold text-zinc-900">
                  {activeTab === "fonts"
                    ? activeSubtab === "typography"
                      ? "Typography Sets"
                      : fontLibraryMode === "brand-matches"
                        ? "Brand Font Matches"
                        : "Fonts Library"
                    : activeTab === "admin-labels"
                      ? "Admin Labels & Routes"
                      : "UI Design System"}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  {activeTab === "fonts"
                    ? activeSubtab === "typography"
                      ? "Reusable typography defaults, page assignments, and live preview specimens."
                      : fontLibraryMode === "brand-matches"
                        ? "Audit source-brand typography, evidence, and the strongest hosted matches without leaving the Fonts Library."
                        : "Browse hosted, Google, stack, and reference families used across the app."
                    : activeTab === "admin-labels"
                      ? "Canonical admin labels, ideal paths, and legacy route forwarders that still need cleanup."
                      : "Fonts, colors, buttons, question components, and form patterns used across the app."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push(ADMIN_ROOT_PATH)}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/hub")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                >
                  Hub
                </button>
              </div>
            </div>
          </div>
        </AdminGlobalHeader>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-6">
            <nav className="flex gap-6">
              {DESIGN_SYSTEM_TAB_DEFINITIONS.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            {activeTabSubtabs.length > 0 ? (
              <nav className="flex flex-wrap gap-1.5 border-t border-zinc-100 py-2.5" aria-label={`${activeTab} sections`}>
                {activeTab === "fonts" ? (
                  <button
                    type="button"
                    onClick={() => router.push(buildDesignSystemHref("fonts"))}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      activeSubtab === null
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Catalog
                  </button>
                ) : null}
                {activeTabSubtabs.map((subtab) => {
                  const isActiveSubtab = activeSubtab === subtab.id;
                  return (
                    <button
                      type="button"
                      key={subtab.id}
                      onClick={() => router.push(buildDesignSystemHref(activeTab, subtab.id))}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                        isActiveSubtab
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {subtab.label}
                    </button>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </div>

        <main className="mx-auto max-w-5xl px-6 py-6">

        {/* Questions & Forms Tab */}
        {activeTab === "questions-forms" && <QuestionsTab baseColors={designSystemColors} sectionFilter={activeSubtab} />}

        {/* Admin Labels & Routes Tab */}
        {activeTab === "admin-labels" && <AdminLabelsTab />}

        {/* Buttons Tab */}
        {activeTab === "buttons" && <ButtonsTab />}

        {/* NYT Occurrences Tab */}
        {activeTab === "nyt-occurrences" && <NYTOccurrencesTab preferredUser={user} />}

        {/* Components Tab */}
        {activeTab === "components" && <ComponentsTab activeSubtab={activeSubtab} />}

        {/* Icons & Illustrations Tab */}
        {activeTab === "icons-illustrations" && <IconsIllustrationsTab activeSubtab={activeSubtab} />}

        {/* Colors Tab */}
        {activeTab === "colors" && (
          <>
            <form
              className="mb-4 rounded-xl border border-zinc-200 bg-white p-4"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddBaseColor();
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizedNewBaseColor}
                    onChange={(event) => {
                      setNewBaseColor(event.target.value.toUpperCase());
                      setNewBaseColorError(null);
                    }}
                    className="h-10 w-10 rounded border border-zinc-200 bg-white p-0.5"
                    aria-label="Pick base color"
                  />
                  <input
                    id="new-base-color"
                    type="text"
                    value={newBaseColor}
                    onChange={(event) => {
                      setNewBaseColor(event.target.value);
                      setNewBaseColorError(null);
                    }}
                    placeholder="#5C0F4F"
                    className="w-36 rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase tracking-wide text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Add Base Color
                </button>
              </div>
              {newBaseColorError && (
                <p className="mt-2 text-xs font-medium text-red-600">{newBaseColorError}</p>
              )}
            </form>
            <p className="mb-4 text-sm text-zinc-500">
              {designSystemColors.length} style-guide colors. Each row shows generated shades (left), base (center),
              and generated tints (right).
            </p>
            <section className="space-y-2">
              {designSystemColors.map((hex, index) => {
                const shades = calculateShades(hex);
                const tints = calculateTints(hex);
                return (
                  <div
                    key={`${hex}-${index}`}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="grid w-full max-w-[24rem] grid-cols-7 gap-2">
                      {shades.map((shadeHex, slot) => (
                        <div
                          key={`left-${slot}-${shadeHex}`}
                          className="aspect-square rounded-md border border-zinc-300"
                          style={{ backgroundColor: shadeHex }}
                          aria-label={`Shade ${slot + 1} for ${hex}: ${shadeHex}`}
                          role="img"
                          title={`Shade ${slot + 1}: ${shadeHex}`}
                        />
                      ))}
                      <div
                        className="aspect-square rounded-md border border-zinc-300"
                        style={{ backgroundColor: hex }}
                        aria-label={`Base color ${hex}`}
                        role="img"
                        title={`Base: ${hex}`}
                      />
                      {tints.map((tintHex, slot) => (
                        <div
                          key={`right-${slot}-${tintHex}`}
                          className="aspect-square rounded-md border border-zinc-300"
                          style={{ backgroundColor: tintHex }}
                          aria-label={`Tint ${slot + 1} for ${hex}: ${tintHex}`}
                          role="img"
                          title={`Tint ${slot + 1}: ${tintHex}`}
                        />
                      ))}
                    </div>
                    <div className="min-w-[14rem] text-sm text-zinc-700">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-zinc-900">Row {String(index + 1).padStart(2, "0")}</span>
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-zinc-600">
                          {hex}
                        </code>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                        {shades.join(" • ")} • {hex} • {tints.join(" • ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-zinc-900">In-Use Color Families</h2>
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                  {COLOR_FAMILIES.length}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {COLOR_FAMILIES.map((family) => (
                  <article key={family.title} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">{family.title}</h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        {family.usage}
                      </span>
                    </div>
                    <p className="mb-4 text-sm text-zinc-600">{family.description}</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                      {family.colors.map((entry) => (
                        <div key={`${family.title}-${entry.hex}`} className="rounded-xl border border-zinc-200 p-2">
                          <div
                            className="mb-2 h-16 rounded-lg border border-zinc-200"
                            style={{ backgroundColor: entry.hex }}
                            aria-hidden="true"
                          />
                          <p className="text-xs font-semibold text-zinc-900">{entry.label}</p>
                          <code className="mt-1 block text-[11px] uppercase tracking-wide text-zinc-500">{entry.hex}</code>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-6">
              <ImagePaletteLab title="Image Palette Lab (Global)" initialState={initialColorLabState} />
            </section>
          </>
        )}

        {/* Fonts Tab */}
        {activeTab === "fonts" && (<>
          {activeSubtab === "typography" ? (
            <TypographyTab />
          ) : (
            <>
              <style>{additionalHostedFontPreviewCss}</style>

              <section className="mb-5 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                      {fontLibraryMode === "brand-matches"
                        ? "Brand font matches"
                        : "Font library"}
                    </h2>
                    <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-zinc-500">
                      {fontLibraryMode === "brand-matches"
                        ? "Regenerate brand-to-hosted suggestions, audit evidence, and pin matches into the compare tray."
                        : "Compare families, preview live usage, and cross-link into typography sets."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-zinc-500">
                      <span>{catalogTotalFamilies} families</span>
                      <span className="text-zinc-300">·</span>
                      <span>{activeInAppFamilies} active</span>
                      <span className="text-zinc-300">·</span>
                      <span>{totalStyles} hosted styles</span>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFontLibraryMode("catalog")}
                      className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                        fontLibraryMode === "catalog"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Catalog
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontLibraryMode("brand-matches")}
                      className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                        fontLibraryMode === "brand-matches"
                          ? "bg-zinc-950 text-white"
                          : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      Brand Matches
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/design-system/fonts/typography")}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-zinc-600 ring-1 ring-inset ring-zinc-200 transition hover:bg-zinc-50"
                    >
                      Typography Sets
                    </button>
                    {fontLibraryMode === "brand-matches" ? (
                      <button
                        type="button"
                        onClick={triggerBrandMatchesRefresh}
                        disabled={brandMatchesRefreshing}
                        className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
                          brandMatchesRefreshing
                            ? "cursor-wait bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200"
                            : "bg-zinc-900 text-white hover:bg-zinc-800"
                        }`}
                      >
                        {brandMatchesRefreshing ? "Running..." : "Rebuild Rankings"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </section>

              <FontComparisonTray
                entries={comparisonEntries}
                previewText={previewText}
                onRemove={(id) => setComparisonIds((current) => current.filter((entry) => entry !== id))}
              />

              {fontLibraryMode === "catalog" ? (
                <>
                  <div className="sticky top-0 z-10 -mx-6 bg-zinc-50 px-6 pb-3">
                    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
                      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr]">
                        <div className="space-y-2.5">
                          <div>
                            <label
                              htmlFor="font-search"
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
                            >
                              Search fonts
                            </label>
                            <input
                              id="font-search"
                              type="text"
                              value={fontSearch}
                              onChange={(event) => setFontSearch(event.target.value)}
                              placeholder="Search family, CSS var, page, or usage..."
                              className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { value: "all", label: "All" },
                              { value: "hosted", label: "Hosted" },
                              { value: "google", label: "Google" },
                              { value: "stacks", label: "Stacks" },
                              { value: "reference", label: "Reference" },
                            ].map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setFontSourceFilter(option.value as FontCatalogSourceFilter)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                  fontSourceFilter === option.value
                                    ? "bg-zinc-950 text-white"
                                    : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                                }`}
                              >
                                {option.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setShowUsedOnly((value) => !value)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                showUsedOnly
                                  ? "bg-violet-600 text-white"
                                  : "text-zinc-600 ring-1 ring-inset ring-zinc-200 hover:bg-zinc-50"
                              }`}
                            >
                              Currently Used
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <div>
                            <label
                              htmlFor="preview-text"
                              className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
                            >
                              Preview Text
                            </label>
                            <input
                              id="preview-text"
                              type="text"
                              value={previewText}
                              onChange={(e) => setPreviewText(e.target.value)}
                              placeholder="Type preview text..."
                              className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
                            />
                          </div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            Sort
                            <select
                              aria-label="Font sort"
                              value={fontSort}
                              onChange={(event) => setFontSort(event.target.value as FontCatalogSort)}
                              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-zinc-900 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
                            >
                              <option value="az">A-Z</option>
                              <option value="most-used">Most Used</option>
                              <option value="most-styles">Most Styles</option>
                              <option value="recently-touched">Recently Touched in App</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mb-3 text-xs tabular-nums text-zinc-400">
                    {cdnFontCount} hosted ({totalStyles} styles) · {googleFontCount} Google · {stackCount} stacks · {realiteaseCount} reference
                  </p>

                  <section className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-[15px] font-bold text-zinc-900">Hosted Fonts</h2>
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-blue-700">
                        {cdnFontCount}
                      </span>
                      <span className="text-[11px] text-zinc-400">Cloudflare R2</span>
                    </div>
                    <div className="space-y-3">
                      {filteredCDN.map((family) => (
                        <FontCard
                          key={family.name}
                          family={family}
                          fontAssetHref={hostedFontAssetLinks[family.name]}
                          previewText={previewText}
                          linkedSets={typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? []}
                          isPinned={comparisonIds.includes(family.name)}
                          onTogglePin={() => toggleComparison(family.name)}
                          onOpenPreview={setActiveFontPreview}
                          onOpenTypographySet={openTypographySet}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-[15px] font-bold text-zinc-900">Reference Fonts</h2>
                      <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-violet-700">
                        {realiteaseCount}
                      </span>
                      <span className="text-[11px] text-zinc-400">NYTimes reference</span>
                    </div>
                    <div className="space-y-3">
                      {filteredRealitease.map((font) => (
                        <RealiteaseFontCard
                          key={font.name}
                          font={font}
                          previewText={previewText}
                          linkedSets={typographySetLinksByFont.get(normalizeFontLabel(font.fontFamily)) ?? []}
                          isPinned={comparisonIds.includes(font.name)}
                          onTogglePin={() => toggleComparison(font.name)}
                          onOpenPreview={setActiveFontPreview}
                          onOpenTypographySet={openTypographySet}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-[15px] font-bold text-zinc-900">Google Fonts</h2>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-700">
                        {googleFontCount}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {filteredGoogle.map((family) => (
                        <FontCard
                          key={family.name}
                          family={family}
                          previewText={previewText}
                          linkedSets={typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? []}
                          isPinned={comparisonIds.includes(family.name)}
                          onTogglePin={() => toggleComparison(family.name)}
                          onOpenPreview={setActiveFontPreview}
                          onOpenTypographySet={openTypographySet}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="mb-8">
                    <div className="mb-3 flex items-center gap-2">
                      <h2 className="text-[15px] font-bold text-zinc-900">Font Stacks</h2>
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-zinc-600">
                        {stackCount}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {filteredStacks.map((family) => (
                        <FontCard
                          key={family.name}
                          family={family}
                          previewText={previewText}
                          linkedSets={typographySetLinksByFont.get(normalizeFontLabel(family.fontFamilyValue)) ?? []}
                          isPinned={comparisonIds.includes(family.name)}
                          onTogglePin={() => toggleComparison(family.name)}
                          onOpenPreview={setActiveFontPreview}
                          onOpenTypographySet={openTypographySet}
                        />
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <>
                  <FontPairAudit />
                  <BrandFontMatchesPanel
                    comparisonIds={comparisonIds}
                    onToggleComparison={toggleComparison}
                    refreshToken={brandMatchesRefreshToken}
                    onRefreshStateChange={setBrandMatchesRefreshing}
                    onViewCatalog={(familyName) => {
                      setFontLibraryMode("catalog");
                      setFontSearch(familyName);
                      setFontSourceFilter("hosted");
                      setShowUsedOnly(false);
                    }}
                  />
                </>
              )}

              <FontUsagePreviewModal activePreview={activeFontPreview} onClose={() => setActiveFontPreview(null)} />
            </>
          )}
        </>)}
        </main>
      </div>
    </ClientOnly>
  );
}

interface DesignSystemPageClientProps {
  activeTab: DesignSystemTabId;
  activeSubtab: DesignSystemSubtabId | null;
  initialColorLabState?: ColorLabShareState | null;
}

export default function DesignSystemPageClient({
  activeTab,
  activeSubtab,
  initialColorLabState = null,
}: DesignSystemPageClientProps) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <DesignSystemPageContent
        activeTab={activeTab}
        activeSubtab={activeSubtab}
        initialColorLabState={initialColorLabState}
      />
    </Suspense>
  );
}

"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import {
  DESIGN_SYSTEM_BASE_COLORS,
  DESIGN_SYSTEM_COLORS_STORAGE_KEY,
} from "@/lib/admin/design-system-tokens";

const QuestionsTab = dynamic(() => import("./_components/QuestionsTab"), {
  loading: () => (
    <div className="py-12 text-center text-sm text-zinc-500">
      Loading question catalog...
    </div>
  ),
});

type TabId = "fonts" | "questions" | "colors";
type TabDefinition = {
  id: TabId;
  label: string;
  queryValue: string;
};

const TAB_DEFINITIONS: TabDefinition[] = [
  { id: "fonts", label: "Fonts", queryValue: "fonts" },
  { id: "colors", label: "Colors", queryValue: "colors" },
  { id: "questions", label: "Questions & Forms", queryValue: "questions-forms" },
];

const TAB_QUERY_TO_ID: Record<string, TabId> = {
  fonts: "fonts",
  colors: "colors",
  questions: "questions",
  "questions-forms": "questions",
};

function getTabFromQuery(tabQueryValue: string | null): TabId {
  if (!tabQueryValue) return "fonts";
  return TAB_QUERY_TO_ID[tabQueryValue] ?? "fonts";
}

function isValidTabQuery(tabQueryValue: string | null): boolean {
  if (!tabQueryValue) return true;
  return Boolean(TAB_QUERY_TO_ID[tabQueryValue]);
}

type TabHref = "/admin/fonts" | "/admin/fonts?tab=colors" | "/admin/fonts?tab=questions-forms";

function buildTabHref(tabId: TabId): TabHref {
  if (tabId === "colors") return "/admin/fonts?tab=colors";
  if (tabId === "questions") return "/admin/fonts?tab=questions-forms";
  return "/admin/fonts";
}

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

const CDN_BASE = "https://d1fmdyqfafwim3.cloudfront.net/fonts";

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
  description: string;
  usedOn: UsedOnEntry[];
  fontFamilyValue: string;
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

/* ------------------------------------------------------------------ */
/*  CDN Fonts  (alphabetical)                                         */
/* ------------------------------------------------------------------ */
const CDN_FONTS: FontFamily[] = [
  {
    name: "Beton",
    weights: [w(700)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Beton/`,
    description: "Extended bold geometric slab serif by Heinrich Jost.",
    fontFamilyValue: '"Beton"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Biotif Pro",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(600, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Biotif%20Pro/`,
    description: "Geometric sans-serif with humanist touches. 8 weights with italics.",
    fontFamilyValue: '"Biotif Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Cheltenham",
    weights: [w(300, true), w(400, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Cheltenham/`,
    description: "Classic Bertram Goodhue serif. Light through Ultra weights.",
    fontFamilyValue: '"Cheltenham"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Cheltenham Old Style Pro",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Cheltenham%20Old%20Style%20Pro/`,
    description: "Classic editorial serif from the Cheltenham family.",
    fontFamilyValue: '"Cheltenham Old Style Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Chomsky",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Chomsky/`,
    description: "Blackletter display typeface inspired by the New York Times masthead.",
    fontFamilyValue: '"Chomsky"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Franklin Gothic",
    weights: [w(400, true), w(500, true), w(600, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Franklin%20Gothic/`,
    description: "Classic American grotesque sans-serif. ITC version.",
    fontFamilyValue: '"Franklin Gothic"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Franklin Gothic Raw",
    weights: [w(300, true), w(400, true), w(500), w(600, true), w(800), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Franklin%20Gothic%20Raw/`,
    description: "Rough-textured Franklin Gothic variant by Wiescher Design.",
    fontFamilyValue: '"Franklin Gothic Raw"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Futura Now",
    weights: [w(300, true), w(400, true), w(500, true), w(600, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Futura%20Now/`,
    description: "Geometric sans-serif by Paul Renner. 6 weights with obliques.",
    fontFamilyValue: '"Futura Now"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Geometric Slabserif 703",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Geometric%20Slabserif%20703/`,
    description: "Bitstream geometric slab serif with condensed cuts.",
    fontFamilyValue: '"Geometric Slabserif 703"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Geometric Slabserif 712",
    weights: [w(400), w(700), w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Geometric%20Slabserif%20712/`,
    description: "Bitstream geometric slab serif. Medium, Bold, and Extra Bold.",
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
    cdnPath: `${CDN_BASE}/monotype/Gloucester/`,
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
    cdnPath: `${CDN_BASE}/monotype/Goodall/`,
    description: "Elegant serif with italic variants.",
    fontFamilyValue: '"Goodall"',
    usedOn: [{ page: "Not yet used", path: "Available via CSS var --font-goodall" }],
  },
  {
    name: "Hamburg Serial",
    cssVar: "--font-hamburg",
    weights: [
      { weight: 200, label: "ExtraLight", hasItalic: false },
      { weight: 300, label: "Light", hasItalic: false },
      {
        weight: 400, label: "Regular", hasItalic: false,
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
        weight: 500, label: "Medium", hasItalic: false,
        usedOn: [
          { page: "Home", path: 'w500 · "Email" (form label)' },
          { page: "Login", path: 'w500 · "Email", "Password" (form labels), "or" separator' },
          { page: "Register", path: 'w500 · "Email", "Name", "Password" (form labels)' },
          { page: "Auth Finish", path: 'w500 · "Username", "Birthday", "Gender", "Country" (form labels)' },
        ],
      },
      { weight: 700, label: "Bold", hasItalic: false,
        usedOn: [
          { page: "Home", path: 'w700 · "Go to Hub" (button)' },
          { page: "Login", path: 'w700 · "Log in" (button)' },
          { page: "Register", path: 'w700 · "Continue" (button)' },
        ],
      },
      { weight: 800, label: "ExtraBold", hasItalic: false },
      { weight: 900, label: "Black", hasItalic: false },
    ],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Hamburg%20Serial/`,
    description: "Primary brand font. Sans-serif display face used across most pages.",
    fontFamilyValue: '"Hamburg Serial"',
    usedOn: [],
  },
  {
    name: "ITC Cheltenham",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/ITC%20Cheltenham/`,
    description: "ITC standard version of Cheltenham. Light through Ultra with condensed cuts.",
    fontFamilyValue: '"ITC Cheltenham"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "ITC Franklin Gothic LT",
    weights: [w(400, true), w(500, true), w(600, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/ITC%20Franklin%20Gothic%20LT/`,
    description: "Workhorse grotesque sans-serif. ITC Linotype version.",
    fontFamilyValue: '"ITC Franklin Gothic LT"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Magnus",
    weights: [w(700)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Magnus/`,
    description: "Display face. Single bold weight.",
    fontFamilyValue: '"Magnus"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Malden Sans",
    weights: [w(100, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Malden%20Sans/`,
    description: "Contemporary grotesque sans-serif. 7 weights with italics.",
    fontFamilyValue: '"Malden Sans"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "News Gothic",
    weights: [w(400, true), w(500), w(600), w(700, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/News%20Gothic/`,
    description: "Classic grotesque sans-serif by Morris Fuller Benton.",
    fontFamilyValue: '"News Gothic"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "News Gothic No. 2",
    weights: [w(300), w(400), w(500, true), w(700, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/News%20Gothic%20No.%202/`,
    description: "Updated News Gothic with expanded weight range. Light through Black.",
    fontFamilyValue: '"News Gothic No. 2"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Newspaper Publisher JNL",
    weights: [w(400, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Newspaper%20Publisher%20JNL/`,
    description: "Vintage newspaper masthead display face by Jeff Levine.",
    fontFamilyValue: '"Newspaper Publisher JNL"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Newston",
    weights: [w(400)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Newston/`,
    description: "Contemporary serif. Normal, inline, and outline variants.",
    fontFamilyValue: '"Newston"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Plymouth Serial",
    cssVar: "--font-plymouth-serial",
    weights: [w(300), w(400), w(500), w(700), w(800), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Plymouth%20Serial/`,
    description: "Decorative serif used in game covers and surveys.",
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
    weights: [w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Rockwell/`,
    description: "Classic geometric slab serif. Single extra bold weight.",
    fontFamilyValue: '"Rockwell"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Rockwell Nova",
    weights: [w(300, true), w(400, true), w(700, true), w(800, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Rockwell%20Nova/`,
    description: "Updated Rockwell with expanded weights. Geometric slab serif.",
    fontFamilyValue: '"Rockwell Nova"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Rude Slab Condensed",
    cssVar: "--font-rude-slab",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Rude%20Slab%20Condensed/`,
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
    cdnPath: `${CDN_BASE}/monotype/Sofia%20Pro/`,
    description: "Geometric sans-serif with soft terminals. 8 weights with italics.",
    fontFamilyValue: '"Sofia Pro"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stafford Serial",
    weights: [w(200, true), w(300, true), w(400, true), w(500, true), w(700, true), w(800, true), w(900, true)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Stafford%20Serial/`,
    description: "Transitional serif family by SoftMaker. 7 weights with italics.",
    fontFamilyValue: '"Stafford Serial"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stymie",
    weights: [w(500)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Stymie/`,
    description: "Classic geometric slab serif. Single medium weight.",
    fontFamilyValue: '"Stymie"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Stymie Extra Bold",
    weights: [w(800)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Stymie%20Extra%20Bold/`,
    description: "Classic geometric slab serif. Single extra bold weight.",
    fontFamilyValue: '"Stymie Extra Bold"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
  {
    name: "Velino Compressed Text",
    weights: [w(100), w(300), w(400), w(500), w(700), w(900)],
    type: "CDN Font",
    source: "CloudFront CDN",
    cdnPath: `${CDN_BASE}/monotype/Velino%20Compressed%20Text/`,
    description: "Compressed text serif. 6 weights from Thin to Black.",
    fontFamilyValue: '"Velino Compressed Text"',
    usedOn: [{ page: "Not yet used", path: "Available on CDN" }],
  },
];

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
/*  Realitease Fonts                                                  */
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
    cdnUrl: `${CDN_BASE}/realitease/NYTKarnak_Condensed`,
    weights: [400, 700],
    description: "Legacy condensed serif. Replaced by Rude Slab Condensed Bold for all headings.",
    usedOn: [
      { page: "Deprecated", path: "All usages replaced with Rude Slab Condensed Bold (font-rude-slab)" },
    ],
  },
  {
    name: "KarnakPro Condensed",
    fontFamily: "'KarnakPro-CondensedBlack'",
    cdnUrl: `${CDN_BASE}/realitease/NYTKarnak Medium`,
    weights: [400, 900],
    description: "Condensed serif variant. Defined in CSS but not currently referenced in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "NYTFranklin",
    fontFamily: "'NYTFranklin'",
    cdnUrl: `${CDN_BASE}/realitease/NYTFranklin`,
    weights: [400, 500, 700],
    description: "Sans-serif. Defined in CSS but not currently referenced directly in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "NYTFranklin Medium",
    fontFamily: "'nyt-franklin'",
    cdnUrl: `${CDN_BASE}/realitease/NYTFranklin Medium`,
    weights: [500],
    description: "Medium-weight sans-serif. Defined in CSS but not currently referenced directly in components.",
    usedOn: [
      { page: "Not actively used", path: "Available on CDN" },
    ],
  },
  {
    name: "TN Web Use Only",
    fontFamily: "'TN_Web_Use_Only'",
    cdnUrl: `${CDN_BASE}/realitease/TN_Web_Use_Only`,
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
    cdnUrl: `${CDN_BASE}/realitease/Tee Franklin W01 Medium`,
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

function PreviewPopover({
  entry,
  fontFamily,
  anchorRef,
  onClose,
}: {
  entry: UsedOnEntry;
  fontFamily: string;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  const parsed = parsePreviewFromPath(entry.path);
  if (!pos) return null;

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      className="z-[9999] w-80 rounded-xl border border-zinc-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5">
        <span className="text-xs font-semibold text-zinc-700">{entry.page}</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-sm leading-none">
          &times;
        </button>
      </div>
      <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
        {parsed ? (
          parsed.texts.map((text, i) => (
            <div key={i}>
              <span className="text-[10px] font-medium text-zinc-400 tabular-nums">
                {parsed.weight} {WEIGHT_LABELS[parsed.weight] ?? ""}
              </span>
              <p
                className="mt-0.5 text-lg text-zinc-900 leading-snug"
                style={{ fontFamily, fontWeight: parsed.weight }}
              >
                {text}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-zinc-500">{entry.path}</p>
        )}
      </div>
    </div>,
    document.body,
  );
}

function UsedOnChips({ entries, fontFamily }: { entries: UsedOnEntry[]; fontFamily: string }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const chipRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const setChipRef = useCallback((idx: number, el: HTMLButtonElement | null) => {
    if (el) chipRefs.current.set(idx, el);
    else chipRefs.current.delete(idx);
  }, []);

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map((entry, idx) => {
        const hasPreviews = parsePreviewFromPath(entry.path) !== null;
        return (
          <span key={idx}>
            <button
              ref={(el) => setChipRef(idx, el)}
              type="button"
              onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
              title={entry.path}
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs ring-1 ring-inset transition-colors ${
                activeIdx === idx
                  ? "bg-violet-200 text-violet-900 ring-violet-400"
                  : "bg-violet-50 text-violet-700 ring-violet-200 hover:bg-violet-100"
              } ${hasPreviews ? "cursor-pointer" : "cursor-default"}`}
            >
              {entry.page}
            </button>
            {activeIdx === idx && hasPreviews && (
              <PreviewPopover
                entry={entry}
                fontFamily={fontFamily}
                anchorRef={{ current: chipRefs.current.get(idx) ?? null }}
                onClose={() => setActiveIdx(null)}
              />
            )}
          </span>
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
  const colors =
    type === "CDN Font"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : type === "Google Font"
        ? "bg-green-50 text-green-700 ring-green-200"
        : "bg-zinc-100 text-zinc-600 ring-zinc-200";
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${colors}`}>
        {type}
      </span>
      <span className="text-[10px] text-zinc-400">{source}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible Font Card — Google Fonts style                        */
/* ------------------------------------------------------------------ */

function FontCard({
  family,
  previewText,
}: {
  family: FontFamily;
  previewText: string;
}) {
  const [open, setOpen] = useState(false);
  const totalWeights = family.weights.length;
  const hasAnyItalic = family.weights.some((w) => w.hasItalic);
  const totalStyles = totalWeights + (hasAnyItalic ? family.weights.filter((w) => w.hasItalic).length : 0);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50/60"
      >
        {/* Font name rendered in its own font */}
        <div className="min-w-0 flex-1">
          <h3
            className="text-lg font-semibold text-zinc-900 truncate"
            style={{ fontFamily: family.fontFamilyValue }}
          >
            {family.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <TypeBadge type={family.type} source={family.source} />
            <span className="text-[10px] text-zinc-400">
              {totalStyles} style{totalStyles > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Preview text in the font (collapsed state) */}
        <p
          className="hidden sm:block max-w-xs text-sm text-zinc-500 truncate"
          style={{ fontFamily: family.fontFamilyValue, fontWeight: 400 }}
        >
          {previewText}
        </p>

        <ChevronIcon open={open} />
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-zinc-100">
          {/* Meta row */}
          <div className="px-5 py-3 bg-zinc-50/40 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
            {family.cssVar && (
              <span>
                CSS: <code className="font-mono text-zinc-700">{family.cssVar}</code>
              </span>
            )}
            {family.cdnPath && (
              <a
                href={family.cdnPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-sm"
              >
                {family.cdnPath}
              </a>
            )}
          </div>

          {/* Description */}
          <div className="px-5 py-2">
            <p className="text-xs text-zinc-500">{family.description}</p>
          </div>

          {/* Used On (font-level, only if entries exist) */}
          {family.usedOn.length > 0 && (
            <div className="px-5 py-2 border-b border-zinc-100">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Used On
              </p>
              <UsedOnChips entries={family.usedOn} fontFamily={family.fontFamilyValue} />
            </div>
          )}

          {/* Weight Previews */}
          <div className="px-5 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Weights
            </p>
            <div className="space-y-3">
              {family.weights.map((wt, idx) => (
                <div key={`${wt.weight}-${wt.stretch ?? "normal"}-${idx}`} className="border-b border-zinc-50 pb-3 last:border-0 last:pb-0">
                  {/* Normal */}
                  <div className="flex items-baseline gap-3">
                    <span className="w-36 flex-shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums">
                      {wt.weight} {wt.label}
                    </span>
                    <p
                      className="text-xl text-zinc-900 leading-snug truncate"
                      style={{
                        fontFamily: family.fontFamilyValue,
                        fontWeight: wt.weight,
                        ...(wt.stretch ? { fontStretch: wt.stretch } : {}),
                      }}
                    >
                      {previewText}
                    </p>
                  </div>
                  {/* Italic */}
                  {wt.hasItalic && (
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="w-36 flex-shrink-0 text-[11px] font-medium text-zinc-400 tabular-nums">
                        {wt.weight} Italic
                      </span>
                      <p
                        className="text-xl text-zinc-900 leading-snug truncate"
                        style={{
                          fontFamily: family.fontFamilyValue,
                          fontWeight: wt.weight,
                          fontStyle: "italic",
                          ...(wt.stretch ? { fontStretch: wt.stretch } : {}),
                        }}
                      >
                        {previewText}
                      </p>
                    </div>
                  )}
                  {/* Per-weight Used On */}
                  {wt.usedOn && wt.usedOn.length > 0 && (
                    <div className="mt-2 ml-36 pl-3">
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-300">
                        Used On
                      </p>
                      <UsedOnChips entries={wt.usedOn} fontFamily={family.fontFamilyValue} />
                    </div>
                  )}
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

function RealiteaseFontCard({
  font,
  previewText,
}: {
  font: RealiteaseFontEntry;
  previewText: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50/60"
      >
        <div className="min-w-0 flex-1">
          <h3
            className="text-lg font-semibold text-zinc-900 truncate"
            style={{ fontFamily: font.fontFamily }}
          >
            {font.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700 ring-1 ring-inset ring-purple-200">
              CDN Font
            </span>
            <span className="text-[10px] text-zinc-400">Realitease</span>
            <span className="text-[10px] text-zinc-400">
              {font.weights.length} style{font.weights.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="border-t border-zinc-100">
          <div className="px-5 py-2 bg-zinc-50/40">
            <code className="text-xs text-blue-700 break-all">{font.cdnUrl}</code>
          </div>

          {/* Description */}
          <div className="px-5 py-2">
            <p className="text-xs text-zinc-500">{font.description}</p>
          </div>

          {/* Used On */}
          <div className="px-5 py-2 border-b border-zinc-100">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Used On
            </p>
            <UsedOnChips entries={font.usedOn} fontFamily={font.fontFamily} />
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

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

function AdminFontsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checking, hasAccess } = useAdminGuard();
  const [previewText, setPreviewText] = useState(
    "The quick brown fox jumps over the lazy dog"
  );
  const [showUsedOnly, setShowUsedOnly] = useState(false);
  const [designSystemColors, setDesignSystemColors] = useState<string[]>(() => [...DESIGN_SYSTEM_BASE_COLORS]);
  const [newBaseColor, setNewBaseColor] = useState("#5C0F4F");
  const [newBaseColorError, setNewBaseColorError] = useState<string | null>(null);
  const tabQueryValue = searchParams.get("tab");
  const activeTab = getTabFromQuery(tabQueryValue);

  useEffect(() => {
    if (!isValidTabQuery(tabQueryValue)) {
      router.replace("/admin/fonts");
    }
  }, [router, tabQueryValue]);

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
    (tabId: TabId) => {
      if (activeTab === tabId) return;
      router.push(buildTabHref(tabId));
    },
    [activeTab, router],
  );

  const normalizedNewBaseColor = normalizeHexColor(newBaseColor) ?? "#000000";

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

  const isActiveEntry = (e: UsedOnEntry) => !/(Not yet used|Not actively used|Available)/i.test(e.page);
  const isUsed = (font: { usedOn: UsedOnEntry[]; weights?: FontWeight[] }) =>
    font.usedOn.some(isActiveEntry) ||
    (font.weights?.some((w) => w.usedOn?.some(isActiveEntry)) ?? false);

  const filteredCDN = showUsedOnly ? CDN_FONTS.filter((f) => isUsed(f)) : CDN_FONTS;
  const filteredGoogle = showUsedOnly ? GOOGLE_FONTS.filter((f) => isUsed(f)) : GOOGLE_FONTS;
  const filteredStacks = showUsedOnly ? FONT_STACKS.filter((f) => isUsed(f)) : FONT_STACKS;
  const filteredRealitease = showUsedOnly ? REALITEASE_FONTS.filter((f) => isUsed({ usedOn: f.usedOn })) : REALITEASE_FONTS;

  const cdnFontCount = filteredCDN.length;
  const googleFontCount = filteredGoogle.length;
  const stackCount = filteredStacks.length;
  const realiteaseCount = filteredRealitease.length;
  const totalStyles = filteredCDN.reduce((sum, f) => sum + f.weights.length + f.weights.filter((w) => w.hasItalic).length, 0);

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-4">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900">UI Design System</h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Fonts, colors, question components, and form patterns used across the app.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin")}
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
        </header>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-5xl px-6">
            <nav className="flex gap-6">
              {TAB_DEFINITIONS.map((tab) => (
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
          </div>
        </div>

        <main className="mx-auto max-w-5xl px-6 py-6">

        {/* Questions & Forms Tab */}
        {activeTab === "questions" && <QuestionsTab baseColors={designSystemColors} />}

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
          </>
        )}

        {/* Fonts Tab */}
        {activeTab === "fonts" && (<>
          <p className="mb-4 text-sm text-zinc-500">
            {cdnFontCount} CDN fonts ({totalStyles} styles) &middot; {googleFontCount} Google &middot; {stackCount} stacks &middot; {realiteaseCount} Realitease
          </p>
          {/* Toolbar — sticky */}
          <div className="sticky top-0 z-10 -mx-6 px-6 pb-4 pt-0 bg-zinc-50">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowUsedOnly((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    showUsedOnly
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  Currently Used
                </button>
                {showUsedOnly && (
                  <span className="text-xs text-zinc-400">
                    Showing only fonts actively used in the app
                  </span>
                )}
              </div>
              <div>
                <label
                  htmlFor="preview-text"
                  className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400"
                >
                  Preview Text
                </label>
                <input
                  id="preview-text"
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Type preview text..."
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition"
                />
              </div>
            </div>
          </div>

          {/* CDN Fonts */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">
                CDN Fonts
              </h2>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                {cdnFontCount}
              </span>
              <span className="text-xs text-zinc-400">CloudFront CDN</span>
            </div>
            <div className="space-y-2">
              {filteredCDN.map((family) => (
                <FontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* Realitease Fonts */}
          <section className="mb-10">
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">
                Realitease Fonts
              </h2>
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                {realiteaseCount}
              </span>
              <span className="text-xs text-zinc-400">Game-specific</span>
            </div>
            <div className="space-y-2">
              {filteredRealitease.map((font) => (
                <RealiteaseFontCard
                  key={font.name}
                  font={font}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* Google Fonts */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">
                Google Fonts
              </h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                {googleFontCount}
              </span>
            </div>
            <div className="space-y-2">
              {filteredGoogle.map((family) => (
                <FontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>

          {/* Font Stacks */}
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">
                Font Stacks
              </h2>
              <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {stackCount}
              </span>
            </div>
            <div className="space-y-2">
              {filteredStacks.map((family) => (
                <FontCard
                  key={family.name}
                  family={family}
                  previewText={previewText}
                />
              ))}
            </div>
          </section>
        </>)}
        </main>
      </div>
    </ClientOnly>
  );
}

export default function AdminFontsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-zinc-500">Loading...</div>}>
      <AdminFontsPageContent />
    </Suspense>
  );
}

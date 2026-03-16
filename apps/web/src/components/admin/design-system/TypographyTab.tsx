"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { DESIGN_SYSTEM_CDN_FONT_OPTIONS } from "@/lib/admin/design-system-tokens";
import { notifyTypographyRuntimeRefresh } from "@/lib/typography/runtime-client";
import type {
  TypographyArea,
  TypographyAssignment,
  TypographyRoleConfig,
  TypographyRoleStyle,
  TypographySet,
  TypographyState,
} from "@/lib/typography/types";

type EditableTypographySet = {
  id: string | null;
  name: string;
  area: TypographyArea;
  seedSource: string;
  roles: Record<string, TypographyRoleConfig>;
};

type TypographySort = "most-used" | "heading-font" | "font-count";
type AreaFilter = "all" | TypographyArea | "other";
type EditorPreviewContext = string;

type TypographyPreviewDescriptor = {
  key: string;
  label: string;
  title: string;
  eyebrow: string;
  body: string;
  variant: "hero" | "document" | "hub" | "survey-question" | "likert" | "decision" | "rankings" | "admin";
  content: {
    kicker: string;
    title: string;
    body?: string;
    secondary?: string;
    options?: string[];
    chips?: string[];
    cta?: string;
  };
  route?: string;
};

type UsagePill = {
  key: string;
  label: string;
  title: string;
  preview: TypographyPreviewDescriptor;
};

const AREA_LABELS: Record<TypographyArea, string> = {
  "user-frontend": "Frontend",
  surveys: "Surveys",
  admin: "Admin",
};

const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  login: "Login",
  register: "Register",
  legal: "Legal",
  hub: "Hub",
  "hub-surveys": "Hub Surveys",
  profile: "Profile",
  "bravodle-cover": "Bravodle Cover",
  "realitease-cover": "Realitease Cover",
  "rhoslc-survey": "RHOSLC Survey",
  "rhop-survey": "RHOP Survey",
  "single-select": "Single Select",
  "multi-select": "Multi Select",
  "rank-text-fields": "Rank Text Fields",
  "poster-single-select": "Poster Single Select",
  "cast-single-select": "Cast Single Select",
  "cast-multi-select": "Cast Multi Select",
  "matrix-likert": "Matrix Likert",
  "cast-decision-card": "Cast Decision Card",
  rankings: "Rankings",
  "two-choice": "Two Choice",
  "reunion-seating": "Reunion Seating",
  "continue-button": "Continue Button",
  "social-week": "Social Week",
};

const INSTANCE_LABELS: Record<string, string> = {
  "landing-shell": "Landing Shell",
  "game-grid": "Game Grid",
  "survey-list": "Survey List",
  document: "Document",
  "auth-form": "Auth Form",
  hero: "Hero",
  landing: "Landing",
  question: "Question",
  shared: "Shared",
  "detail-cards": "Detail Cards",
  "text-multiple-choice": "Text Multiple Choice",
};

const FIELD_LABELS: Record<keyof TypographyRoleStyle, string> = {
  fontFamily: "Font",
  fontSize: "Font Size",
  fontWeight: "Weight",
  lineHeight: "Line Height",
  letterSpacing: "Letter Spacing",
  textTransform: "Transform",
};

const EMPTY_ROLE_STYLE: TypographyRoleStyle = {
  fontFamily: "var(--font-hamburg)",
  fontSize: "16px",
  fontWeight: "400",
  lineHeight: "24px",
  letterSpacing: "0px",
};

const WRAP_ANYWHERE = "[overflow-wrap:anywhere]";

const SORT_OPTIONS: Array<{ value: TypographySort; label: string }> = [
  { value: "most-used", label: "Most Used" },
  { value: "heading-font", label: "Heading Font A-Z" },
  { value: "font-count", label: "Number of Fonts" },
];

const AREA_FILTER_OPTIONS: Array<{ value: AreaFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin" },
  { value: "surveys", label: "Surveys" },
  { value: "user-frontend", label: "Frontend" },
  { value: "other", label: "Other" },
];

const PRIMARY_ROLE_ORDER = ["heading", "title", "heroTitle", "pageTitle"];

const PREVIEW_COPY_BY_ROLE: Record<string, string> = {
  heading: "Heading",
  title: "Title",
  heroTitle: "Hero Title",
  pageTitle: "Page Title",
  subtitle: "Subtitle",
  body: "Body",
  prompt: "Prompt",
  statement: "Statement",
  option: "Option",
  sectionHeading: "Section Heading",
  settingsHeading: "Settings Heading",
  eyebrow: "Eyebrow",
  label: "Label",
  button: "Button",
  cta: "CTA",
  input: "Input",
  link: "Link",
  cardTitle: "Card Title",
  questionText: "Question Text",
};

const PREVIEW_ROUTE_MAP: Record<string, string> = {
  home: "/",
  login: "/login",
  register: "/auth/register",
  legal: "/privacy-policy",
  hub: "/hub",
  "hub-surveys": "/hub/surveys",
  profile: "/profile",
  "bravodle-cover": "/bravodle/cover",
  "realitease-cover": "/realitease/cover",
  "rhoslc-survey": "/surveys/rhoslc-s6",
  "rhop-survey": "/surveys/rhop-s10",
  "survey-play": "/surveys/rhoslc-s6/play",
  "social-week": "/admin/social-week",
};

const PREVIEW_DESCRIPTOR_MAP: Record<string, Omit<TypographyPreviewDescriptor, "key" | "label">> = {
  "frontend-default": {
    title: "Frontend default typography",
    eyebrow: "Area default",
    body: "Used anywhere the frontend falls back to the shared default set for body copy and headings.",
    variant: "hero",
    content: {
      kicker: "The Reality Report",
      title: "Shared frontend baseline for headings, body copy, and buttons.",
      body: "Reusable defaults for hero text, body copy, and action labels across the frontend.",
      cta: "Explore surveys",
    },
    route: PREVIEW_ROUTE_MAP.home,
  },
  home: {
    title: "Home landing",
    eyebrow: "Frontend page",
    body: "Homepage hero typography for the Reality Report landing shell and the first-scroll content stack.",
    variant: "hero",
    content: {
      kicker: "The Reality Report",
      title: "Rank the cast, predict the drama, and compare your take.",
      body: "A cinematic landing hero with editorial body copy and a direct survey CTA.",
      cta: "Start exploring",
    },
    route: PREVIEW_ROUTE_MAP.home,
  },
  login: {
    title: "Login",
    eyebrow: "Frontend page",
    body: "Auth form headings, labels, and CTA typography for sign-in flows.",
    variant: "hero",
    content: {
      kicker: "Account Access",
      title: "Welcome back. Sign in to continue.",
      body: "Compact auth shell with a high-contrast heading, field labels, and a bold submit action.",
      cta: "Sign in",
    },
    route: PREVIEW_ROUTE_MAP.login,
  },
  register: {
    title: "Register",
    eyebrow: "Frontend page",
    body: "Registration form typography for account creation fields and actions.",
    variant: "hero",
    content: {
      kicker: "Join The Reality Report",
      title: "Create your account and join the next survey round.",
      body: "Registration screens lean on expressive title typography with straightforward form copy underneath.",
      cta: "Create account",
    },
    route: PREVIEW_ROUTE_MAP.register,
  },
  legal: {
    title: "Legal document",
    eyebrow: "Frontend page",
    body: "Long-form serif document typography used for policy and terms pages.",
    variant: "document",
    content: {
      kicker: "Privacy Policy",
      title: "How we use your account and survey data.",
      body: "Long-form document pages use a calmer serif heading with straightforward body paragraphs and inline links.",
      secondary: "Effective March 16, 2026",
    },
    route: PREVIEW_ROUTE_MAP.legal,
  },
  hub: {
    title: "Hub game grid",
    eyebrow: "Frontend page",
    body: "Hub cards and page-title typography that frame game entry points.",
    variant: "hub",
    content: {
      kicker: "Game Hub",
      title: "Pick a game, scan the grid, and jump into the next challenge.",
      body: "This surface mixes a large page title with tighter card titles and descriptive support copy.",
      chips: ["Bravodle", "Realitease", "Survey Predictions"],
    },
    route: PREVIEW_ROUTE_MAP.hub,
  },
  "hub-surveys": {
    title: "Hub surveys",
    eyebrow: "Frontend page",
    body: "Survey-list typography for browsable survey collections, section labels, and callouts.",
    variant: "hub",
    content: {
      kicker: "Active Surveys",
      title: "Browse active surveys and jump back into unfinished answers.",
      body: "Survey lists pair a strong lead title with browsable chips and smaller supporting descriptions.",
      chips: ["RHOSLC S6", "RHOP S10", "Reunion Seating"],
    },
    route: PREVIEW_ROUTE_MAP["hub-surveys"],
  },
  profile: {
    title: "Profile",
    eyebrow: "Frontend page",
    body: "Profile hero typography for account, stats, and identity surfaces.",
    variant: "hero",
    content: {
      kicker: "Profile",
      title: "Your survey history, rankings, and saved predictions.",
      body: "Profile typography emphasizes a strong hero title with compact account-support copy.",
      cta: "View activity",
    },
    route: PREVIEW_ROUTE_MAP.profile,
  },
  "survey-area-default": {
    title: "Survey area default",
    eyebrow: "Survey default",
    body: "Fallback survey typography used when a question template does not override the shared survey defaults.",
    variant: "survey-question",
    content: {
      kicker: "Survey Prompt",
      title: "Prompt, response labels, and continue controls for survey flows.",
      body: "The base survey set covers prompt text, options, and CTA defaults when a template does not override them.",
      options: ["Option One", "Option Two", "Option Three"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "survey-cover": {
    title: "Survey cover",
    eyebrow: "Shared specimen",
    body: "Shared hero treatment for survey/game cover screens where multiple pages reuse the same visual structure.",
    variant: "hero",
    content: {
      kicker: "Season Prediction",
      title: "Predict the seating chart and set your confidence before you start.",
      body: "Survey covers lead with a large title, compact subtitle, and strong enter-state CTA.",
      cta: "Enter experience",
    },
    route: PREVIEW_ROUTE_MAP["rhoslc-survey"],
  },
  "rhoslc-survey": {
    title: "RHOSLC survey landing",
    eyebrow: "Survey page",
    body: "Landing-page typography for season-specific survey promos and intro modules.",
    variant: "hero",
    content: {
      kicker: "RHOSLC S6",
      title: "Rank the cast, predict the reunion seating chart, and compare your results.",
      body: "Season landing pages blend bold uppercase section headings with a very large lead title.",
      cta: "Start the RHOSLC survey",
    },
    route: PREVIEW_ROUTE_MAP["rhoslc-survey"],
  },
  "rhop-survey": {
    title: "RHOP survey landing",
    eyebrow: "Survey page",
    body: "Landing-page typography for RHOP-specific survey intros and sectional callouts.",
    variant: "hero",
    content: {
      kicker: "RHOP S10",
      title: "Cast rankings, hot takes, and season pulse all in one survey flow.",
      body: "Like RHOSLC, the RHOP landing uses an oversized hero title with short support copy and a single entry CTA.",
      cta: "Start the RHOP survey",
    },
    route: PREVIEW_ROUTE_MAP["rhop-survey"],
  },
  "single-select": {
    title: "Single Select",
    eyebrow: "Survey question",
    body: "One-answer survey question treatment used in text multiple-choice flows.",
    variant: "survey-question",
    content: {
      kicker: "Single Select",
      title: "Choose the one answer that best matches your take.",
      body: "This question style uses a clear prompt with stacked answer rows.",
      options: ["Meredith", "Whitney", "Heather"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "multi-select": {
    title: "Multi Select",
    eyebrow: "Survey question",
    body: "Multi-answer question typography for option grids, image-assisted choices, and guidance text.",
    variant: "survey-question",
    content: {
      kicker: "Multi Select",
      title: "Pick every answer that applies and continue when you are satisfied.",
      body: "This variant keeps the same prompt hierarchy but supports more than one selected answer.",
      options: ["First chair", "Center snowflake", "Wildcard pick"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "rank-text-fields": {
    title: "Rank Text Fields",
    eyebrow: "Survey question",
    body: "Ranking template that pairs bold question titles with editable text fields.",
    variant: "rankings",
    content: {
      kicker: "Rank Text Fields",
      title: "Rank the cast from first chair to reunion sidelines.",
      body: "The template combines a clear instruction line with stackable ranked slots.",
      options: ["1. Heather", "2. Meredith", "3. Whitney"],
      cta: "Save ranking",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "poster-single-select": {
    title: "Poster Single Select",
    eyebrow: "Survey question",
    body: "Poster-style card selector that puts a single bold label on each media card.",
    variant: "survey-question",
    content: {
      kicker: "Poster Select",
      title: "Tap the poster that best matches your answer.",
      body: "Poster layouts reduce body copy and rely on bigger option labels inside the cards.",
      options: ["Lisa", "Meredith", "Whitney"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "cast-single-select": {
    title: "Cast Single Select",
    eyebrow: "Survey question",
    body: "Cast profile selector that uses strong row labels and answer buttons.",
    variant: "survey-question",
    content: {
      kicker: "Cast Single Select",
      title: "Choose the Housewife who owned the episode.",
      body: "The page keeps the prompt prominent while option labels carry the character-specific typography.",
      options: ["Heather", "Meredith", "Lisa"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "cast-multi-select": {
    title: "Cast Multi Select",
    eyebrow: "Survey question",
    body: "Cast-selection layout for selecting multiple people within a visually heavier answer grid.",
    variant: "survey-question",
    content: {
      kicker: "Cast Multi Select",
      title: "Select every cast member who deserves a confessional this week.",
      body: "This version uses heavier answer blocks with multiple selected choices.",
      options: ["Heather", "Bronwyn", "Whitney"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "matrix-likert": {
    title: "Matrix Likert",
    eyebrow: "Survey question",
    body: "Agree/disagree matrix with a smaller prompt, strong statement typography, and compact answer rows.",
    variant: "likert",
    content: {
      kicker: "How much do you agree with the following statement:",
      title: "Heather and Whitney are telling the truth about Meredith on the plane.",
      options: ["Strongly Agree", "Somewhat Agree", "Neither", "Somewhat Disagree", "Strongly Disagree"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "cast-decision-card": {
    title: "Cast Decision Card",
    eyebrow: "Survey question",
    body: "Decision-card layout with a prompt, featured subject, and bold answer actions.",
    variant: "decision",
    content: {
      kicker: "Cast Decision Card",
      title: "Who should take the first chair at the reunion?",
      body: "Decision-card layouts put the key subject line in the largest font and stack bold actions below.",
      options: ["Heather Gay", "Meredith Marks"],
      cta: "Lock answer",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  rankings: {
    title: "Rankings",
    eyebrow: "Survey question",
    body: "Shared rankings surface for draggable list, tray labels, and picker items.",
    variant: "rankings",
    content: {
      kicker: "Rankings",
      title: "Rank the cast from most iconic to most forgettable.",
      body: "Rankings surfaces use a large title, compact picker labels, and strong numbered rows.",
      options: ["1. Lisa", "2. Meredith", "3. Angie"],
      cta: "Submit ranking",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "two-choice": {
    title: "Two Choice",
    eyebrow: "Survey question",
    body: "Binary survey pattern with a crisp title and oversized choice treatment.",
    variant: "survey-question",
    content: {
      kicker: "Two Choice",
      title: "Pick the side you think is telling the truth.",
      body: "Binary layouts push option typography harder while keeping the prompt short.",
      options: ["Team Meredith", "Team Whitney"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "reunion-seating": {
    title: "Reunion Seating",
    eyebrow: "Survey question",
    body: "Interactive seating-chart predictor with a large title and supporting action copy.",
    variant: "hero",
    content: {
      kicker: "Prediction",
      title: "Predict the RHOSLC reunion seating chart.",
      body: "This page behaves like a hybrid between a survey cover and an interactive game intro.",
      cta: "Build seating chart",
    },
    route: PREVIEW_ROUTE_MAP["rhoslc-survey"],
  },
  "continue-button": {
    title: "Continue Button",
    eyebrow: "Shared control",
    body: "Primary continue CTA used at the end of many survey question templates.",
    variant: "survey-question",
    content: {
      kicker: "Continue Button",
      title: "Primary action at the end of many survey questions.",
      body: "The continue button inherits the set’s CTA styling inside the surrounding question layout.",
      options: ["Ready to move on?"],
      cta: "Continue",
    },
    route: PREVIEW_ROUTE_MAP["survey-play"],
  },
  "admin-default": {
    title: "Admin default typography",
    eyebrow: "Admin default",
    body: "Fallback typography for admin global header, breadcrumbs, and general shell metadata.",
    variant: "admin",
    content: {
      kicker: "Admin shell",
      title: "Global header, breadcrumbs, and supporting metadata.",
      body: "This is the quieter admin typography used around management interfaces and supporting labels.",
      chips: ["Overview", "Status: Healthy", "Updated 2m ago"],
    },
    route: PREVIEW_ROUTE_MAP["social-week"],
  },
  "social-week": {
    title: "Social Week",
    eyebrow: "Admin page",
    body: "Admin detail card typography for weekly social reporting panels and status surfaces.",
    variant: "admin",
    content: {
      kicker: "Weekly reporting",
      title: "Week detail analytics, health snapshots, and review cards.",
      body: "The page uses small admin meta labels, a utility heading, and dense card copy below.",
      chips: ["Instagram", "TikTok", "Sentiment"],
    },
    route: PREVIEW_ROUTE_MAP["social-week"],
  },
};

function formatFontLabel(fontFamily: string): string {
  return fontFamily
    .replace(/^var\(--font-/, "")
    .replace(/\)$/, "")
    .replace(/^"+|"+$/g, "")
    .replace(/-/g, " ")
    .replace(/\s*,.*$/, "")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatTokenLabel(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPageLabel(area: TypographyArea, pageKey: string | null): string {
  if (!pageKey) {
    return `${AREA_LABELS[area]} Default`;
  }
  return PAGE_LABELS[pageKey] ?? formatTokenLabel(pageKey);
}

function formatInstanceLabel(instanceKey: string | null): string | null {
  if (!instanceKey) {
    return null;
  }
  return INSTANCE_LABELS[instanceKey] ?? formatTokenLabel(instanceKey);
}

function formatAssignmentTitle(assignment: TypographyAssignment): string {
  const pageLabel = formatPageLabel(assignment.area, assignment.pageKey);
  const instanceLabel = formatInstanceLabel(assignment.instanceKey);

  if (!assignment.pageKey && !assignment.instanceKey) {
    return pageLabel;
  }
  if (!instanceLabel) {
    return pageLabel;
  }
  return `${pageLabel} / ${instanceLabel}`;
}

function formatAssignmentMeta(assignment: TypographyAssignment): string {
  if (!assignment.pageKey && !assignment.instanceKey) {
    return "Default set for this entire area.";
  }
  if (!assignment.instanceKey) {
    return "Default set for this page.";
  }
  return "Default set for this component slot.";
}

function getPreviewKey(assignment: TypographyAssignment): string {
  if (!assignment.pageKey) {
    if (assignment.area === "surveys") return "survey-area-default";
    if (assignment.area === "admin") return "admin-default";
    return "frontend-default";
  }

  if (assignment.pageKey === "bravodle-cover" || assignment.pageKey === "realitease-cover") {
    return "survey-cover";
  }

  return assignment.pageKey;
}

function getPreviewDescriptor(assignment: TypographyAssignment): TypographyPreviewDescriptor {
  const key = getPreviewKey(assignment);
  const base = PREVIEW_DESCRIPTOR_MAP[key] ?? {
    title: formatPageLabel(assignment.area, assignment.pageKey),
    eyebrow: AREA_LABELS[assignment.area],
    body: formatAssignmentMeta(assignment),
    variant: "hero" as const,
    content: {
      kicker: formatPageLabel(assignment.area, assignment.pageKey),
      title: formatAssignmentTitle(assignment),
      body: formatAssignmentMeta(assignment),
      cta: "Open page",
    },
  };

  return {
    key,
    label: formatPageLabel(assignment.area, assignment.pageKey),
    ...base,
  };
}

function buildUsagePills(assignments: TypographyAssignment[]): UsagePill[] {
  const seen = new Map<string, UsagePill>();

  assignments.forEach((assignment) => {
    const descriptor = getPreviewDescriptor(assignment);
    if (!seen.has(descriptor.key)) {
      seen.set(descriptor.key, {
        key: descriptor.key,
        label: descriptor.label,
        title: formatAssignmentTitle(assignment),
        preview: descriptor,
      });
    }
  });

  return Array.from(seen.values());
}

function cloneRoles(roles: Record<string, TypographyRoleConfig>) {
  return JSON.parse(JSON.stringify(roles)) as Record<string, TypographyRoleConfig>;
}

function toEditableSet(set: TypographySet | null): EditableTypographySet {
  if (!set) {
    return {
      id: null,
      name: "",
      area: "user-frontend",
      seedSource: "manual",
      roles: {
        body: {
          mobile: { ...EMPTY_ROLE_STYLE },
          desktop: { ...EMPTY_ROLE_STYLE },
        },
      },
    };
  }

  return {
    id: set.id,
    name: set.name,
    area: set.area,
    seedSource: set.seedSource,
    roles: cloneRoles(set.roles),
  };
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetchAdminWithAuth(
    input,
    {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    },
    {
      allowDevAdminBypass: true,
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function resolvePrimaryRoleKey(roles: Record<string, TypographyRoleConfig>): string {
  for (const key of PRIMARY_ROLE_ORDER) {
    if (roles[key]) return key;
  }
  return Object.keys(roles)[0] ?? "body";
}

function resolveRoleDisplayLabel(roleKey: string): string {
  return PREVIEW_COPY_BY_ROLE[roleKey] ?? formatTokenLabel(roleKey);
}

function resolveRoleSampleText(roleKey: string, fontLabel: string): string {
  if (fontLabel.trim()) return fontLabel;
  return resolveRoleDisplayLabel(roleKey);
}

function countUniqueFonts(roles: Record<string, TypographyRoleConfig>): number {
  const fonts = new Set<string>();
  Object.values(roles).forEach((roleConfig) => {
    fonts.add(formatFontLabel(roleConfig.mobile.fontFamily));
    fonts.add(formatFontLabel(roleConfig.desktop.fontFamily));
  });
  return fonts.size;
}

function matchesAreaFilter(area: string, filter: AreaFilter): boolean {
  if (filter === "all") return true;
  if (filter === "other") {
    return area !== "admin" && area !== "surveys" && area !== "user-frontend";
  }
  return area === filter;
}

function resolveRolePreviewStyle(roleConfig: TypographyRoleConfig, breakpoint: "mobile" | "desktop"): CSSProperties {
  const active = roleConfig[breakpoint];
  return {
    fontFamily: active.fontFamily,
    fontSize: active.fontSize,
    fontWeight: active.fontWeight,
    lineHeight: active.lineHeight,
    letterSpacing: active.letterSpacing,
    ...(active.textTransform ? { textTransform: active.textTransform } : {}),
  };
}

const PREVIEW_SLOT_ROLE_CANDIDATES = {
  kicker: ["eyebrow", "label", "button", "body"],
  title: ["title", "heroTitle", "pageTitle", "heading", "prompt", "statement", "sectionHeading", "cardTitle"],
  body: ["body", "subtitle", "subheading", "prompt", "statement", "input", "link"],
  option: ["option", "button", "cta", "label"],
  cta: ["button", "cta", "option"],
  chip: ["label", "eyebrow", "body", "button"],
} as const;

function resolvePreviewSlotStyle(
  roles: Record<string, TypographyRoleConfig>,
  breakpoint: "mobile" | "desktop",
  slot: keyof typeof PREVIEW_SLOT_ROLE_CANDIDATES,
) {
  const candidateKey =
    PREVIEW_SLOT_ROLE_CANDIDATES[slot].find((roleKey) => roleKey in roles) ??
    Object.keys(roles)[0] ??
    null;
  if (!candidateKey || !roles[candidateKey]) {
    return null;
  }

  return {
    roleKey: candidateKey,
    style: resolveRolePreviewStyle(roles[candidateKey], breakpoint),
  };
}

function resolveHighlightClass(isFocused: boolean) {
  return isFocused ? "ring-2 ring-zinc-950/20 ring-offset-2 ring-offset-transparent" : "";
}

function SpecimenPreviewSurface({
  preview,
  set,
  breakpoint,
  focusRoleKey,
  compact = false,
}: {
  preview: TypographyPreviewDescriptor;
  set: TypographySet;
  breakpoint: "mobile" | "desktop";
  focusRoleKey?: string;
  compact?: boolean;
}) {
  const kickerSlot = resolvePreviewSlotStyle(set.roles, breakpoint, "kicker");
  const titleSlot = resolvePreviewSlotStyle(set.roles, breakpoint, "title");
  const bodySlot = resolvePreviewSlotStyle(set.roles, breakpoint, "body");
  const optionSlot = resolvePreviewSlotStyle(set.roles, breakpoint, "option");
  const ctaSlot = resolvePreviewSlotStyle(set.roles, breakpoint, "cta");
  const chipSlot = resolvePreviewSlotStyle(set.roles, breakpoint, "chip");
  const cardPadding = compact ? "p-3.5" : "p-5 sm:p-6";
  const surfaceTone =
    preview.variant === "admin"
      ? "bg-[#F4F4F5]"
      : preview.variant === "likert"
        ? "bg-[#D9D9D9]"
        : preview.variant === "document"
          ? "bg-[#FAF7F1]"
          : "bg-[#F8F5EE]";
  const innerTone =
    preview.variant === "admin"
      ? "bg-white"
      : preview.variant === "likert"
        ? "bg-[#D9D9D9]"
        : "bg-white";
  const titleClass = compact ? "text-[1.1rem] sm:text-[1.2rem]" : "text-[1.55rem] sm:text-[2rem]";
  const bodyClass = compact ? "text-xs leading-5" : "text-sm leading-6";
  const chipClass = compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]";
  const optionPadding = compact ? "px-3 py-2" : "px-4 py-2.5";

  const renderRoleMeta = (slot: typeof titleSlot, fallbackLabel: string) => (
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
      {slot?.roleKey ? resolveRoleDisplayLabel(slot.roleKey) : fallbackLabel}
    </div>
  );

  if (preview.variant === "document") {
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className={`rounded-[22px] border border-zinc-200 ${innerTone} p-5 shadow-sm`}>
          {renderRoleMeta(kickerSlot, "Eyebrow")}
          <div
            className={`mt-3 break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          {preview.content.secondary ? (
            <div
              className={`mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500 ${resolveHighlightClass(
                kickerSlot?.roleKey === focusRoleKey,
              )}`}
              style={kickerSlot?.style}
            >
              {preview.content.secondary}
            </div>
          ) : null}
          <p
            className={`mt-4 max-w-2xl break-words text-zinc-700 ${bodyClass} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            {preview.content.body}
          </p>
          <p
            className={`mt-3 max-w-2xl break-words text-zinc-600 ${compact ? "text-[11px] leading-5" : "text-sm leading-6"} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            This is the long-form reading rhythm users see on the actual page.
          </p>
        </div>
      </div>
    );
  }

  if (preview.variant === "likert") {
    const likertColors = ["#356A3B", "#76A34C", "#E6B903", "#C76D00", "#99060A"];
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className={`rounded-[22px] border border-zinc-300 ${innerTone} p-4 shadow-sm`}>
          <div
            className={`text-center uppercase text-zinc-900 ${resolveHighlightClass(
              kickerSlot?.roleKey === focusRoleKey,
            )}`}
            style={kickerSlot?.style}
          >
            {preview.content.kicker}
          </div>
          <div
            className={`mx-auto mt-4 max-w-[26ch] text-center break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          <div className="mt-5 space-y-2.5">
            {(preview.content.options ?? []).map((option, index) => (
              <div
                key={`${preview.key}-${option}`}
                className={`rounded-[14px] text-center text-white shadow-sm ${optionPadding} ${resolveHighlightClass(
                  optionSlot?.roleKey === focusRoleKey,
                )}`}
                style={{
                  backgroundColor: likertColors[index] ?? "#27272A",
                  color: index === 1 || index === 2 ? "#111111" : "#FFFFFF",
                  ...optionSlot?.style,
                }}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview.variant === "decision") {
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className={`rounded-[22px] border border-zinc-200 ${innerTone} p-5 shadow-sm`}>
          <div
            className={`text-[10px] uppercase tracking-[0.22em] text-zinc-400 ${resolveHighlightClass(
              kickerSlot?.roleKey === focusRoleKey,
            )}`}
            style={kickerSlot?.style}
          >
            {preview.content.kicker}
          </div>
          <div
            className={`mt-4 max-w-[20ch] break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          <p
            className={`mt-3 max-w-2xl break-words text-zinc-600 ${bodyClass} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            {preview.content.body}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {(preview.content.options ?? []).map((option) => (
              <div
                key={`${preview.key}-${option}`}
                className={`rounded-[16px] border border-zinc-200 bg-zinc-50 text-center text-zinc-950 shadow-sm ${optionPadding} ${resolveHighlightClass(
                  optionSlot?.roleKey === focusRoleKey,
                )}`}
                style={optionSlot?.style}
              >
                {option}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview.variant === "rankings") {
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className={`rounded-[22px] border border-zinc-200 ${innerTone} p-5 shadow-sm`}>
          <div
            className={`text-[10px] uppercase tracking-[0.22em] text-zinc-400 ${resolveHighlightClass(
              kickerSlot?.roleKey === focusRoleKey,
            )}`}
            style={kickerSlot?.style}
          >
            {preview.content.kicker}
          </div>
          <div
            className={`mt-3 break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          <p
            className={`mt-2 break-words text-zinc-600 ${bodyClass} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            {preview.content.body}
          </p>
          <div className="mt-5 space-y-2">
            {(preview.content.options ?? []).map((option) => (
              <div
                key={`${preview.key}-${option}`}
                className={`flex items-center gap-3 rounded-[16px] border border-zinc-200 bg-zinc-50 ${optionPadding}`}
              >
                <div
                  className={`rounded-full bg-zinc-950 px-2 py-1 text-[11px] font-semibold text-white ${resolveHighlightClass(
                    optionSlot?.roleKey === focusRoleKey,
                  )}`}
                >
                  {option.split(".")[0]}
                </div>
                <div
                  className={`break-words text-zinc-950 ${resolveHighlightClass(
                    optionSlot?.roleKey === focusRoleKey,
                  )}`}
                  style={optionSlot?.style}
                >
                  {option.replace(/^\d+\.\s*/, "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview.variant === "admin") {
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div
            className={`text-[10px] uppercase tracking-[0.22em] text-zinc-400 ${resolveHighlightClass(
              kickerSlot?.roleKey === focusRoleKey,
            )}`}
            style={kickerSlot?.style}
          >
            {preview.content.kicker}
          </div>
          <div
            className={`mt-3 break-words text-[1.15rem] font-semibold text-zinc-950 sm:text-[1.35rem] ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          <p
            className={`mt-2 break-words text-zinc-600 ${bodyClass} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            {preview.content.body}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(preview.content.chips ?? []).map((chip) => (
              <div
                key={`${preview.key}-${chip}`}
                className={`rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 ${chipClass} ${resolveHighlightClass(
                  chipSlot?.roleKey === focusRoleKey,
                )}`}
                style={chipSlot?.style}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (preview.variant === "hub") {
    return (
      <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
        <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div
            className={`text-[10px] uppercase tracking-[0.22em] text-zinc-400 ${resolveHighlightClass(
              kickerSlot?.roleKey === focusRoleKey,
            )}`}
            style={kickerSlot?.style}
          >
            {preview.content.kicker}
          </div>
          <div
            className={`mt-3 break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
              titleSlot?.roleKey === focusRoleKey,
            )}`}
            style={titleSlot?.style}
          >
            {preview.content.title}
          </div>
          <p
            className={`mt-2 break-words text-zinc-600 ${bodyClass} ${resolveHighlightClass(
              bodySlot?.roleKey === focusRoleKey,
            )}`}
            style={bodySlot?.style}
          >
            {preview.content.body}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(preview.content.chips ?? []).map((chip) => (
              <div key={`${preview.key}-${chip}`} className="rounded-[16px] border border-zinc-200 bg-zinc-50 p-3">
                <div
                  className={`break-words text-zinc-950 ${resolveHighlightClass(
                    chipSlot?.roleKey === focusRoleKey,
                  )}`}
                  style={chipSlot?.style}
                >
                  {chip}
                </div>
                <div className="mt-2 text-[11px] leading-5 text-zinc-500">
                  Preview card copy and button labels sit underneath this title style on the actual page.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[24px] border border-zinc-200 ${surfaceTone} ${cardPadding}`}>
      <div className="rounded-[22px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div
          className={`text-[10px] uppercase tracking-[0.22em] text-zinc-400 ${resolveHighlightClass(
            kickerSlot?.roleKey === focusRoleKey,
          )}`}
          style={kickerSlot?.style}
        >
          {preview.content.kicker}
        </div>
        <div
          className={`mt-3 break-words ${titleClass} font-semibold text-zinc-950 ${resolveHighlightClass(
            titleSlot?.roleKey === focusRoleKey,
          )}`}
          style={titleSlot?.style}
        >
          {preview.content.title}
        </div>
        <p
          className={`mt-2 max-w-2xl break-words text-zinc-600 ${bodyClass} ${resolveHighlightClass(
            bodySlot?.roleKey === focusRoleKey,
          )}`}
          style={bodySlot?.style}
        >
          {preview.content.body}
        </p>
        {(preview.content.options ?? []).length > 0 ? (
          <div className="mt-5 space-y-2">
            {(preview.content.options ?? []).map((option) => (
              <div
                key={`${preview.key}-${option}`}
                className={`rounded-[16px] border border-zinc-200 bg-zinc-50 text-zinc-950 shadow-sm ${optionPadding} ${resolveHighlightClass(
                  optionSlot?.roleKey === focusRoleKey,
                )}`}
                style={optionSlot?.style}
              >
                {option}
              </div>
            ))}
          </div>
        ) : null}
        {preview.content.cta ? (
          <div
            className={`mt-5 inline-flex rounded-full bg-zinc-950 text-white ${compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"} ${resolveHighlightClass(
              ctaSlot?.roleKey === focusRoleKey,
            )}`}
            style={ctaSlot?.style}
          >
            {preview.content.cta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpecimenPreviewModal({
  preview,
  set,
  breakpoint,
  onClose,
}: {
  preview: TypographyPreviewDescriptor | null;
  set: TypographySet | null;
  breakpoint: "mobile" | "desktop";
  onClose: () => void;
}) {
  if (!preview || !set) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="typography-preview-title"
      data-testid="usage-preview-modal"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[28px] border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {preview.eyebrow}
            </div>
            <h3 id="typography-preview-title" className="mt-2 text-xl font-bold tracking-[-0.03em] text-zinc-950">
              {preview.title}
            </h3>
            <p className={`mt-2 text-sm leading-6 text-zinc-600 ${WRAP_ANYWHERE}`}>
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

        <div className="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Example preview
          </div>
          <div className="mt-4">
            <SpecimenPreviewSurface
              preview={preview}
              set={set}
              breakpoint={breakpoint}
            />
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
    </div>
  );
}

export default function TypographyTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamSetId = searchParams.get("set");
  const [state, setState] = useState<TypographyState | null>(null);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditableTypographySet>(toEditableSet(null));
  const [openAreas, setOpenAreas] = useState<Record<TypographyArea, boolean>>({
    "user-frontend": true,
    surveys: false,
    admin: false,
  });
  const [previewBreakpoint, setPreviewBreakpoint] = useState<"mobile" | "desktop">("desktop");
  const [sortBy, setSortBy] = useState<TypographySort>("most-used");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [activeUsagePreview, setActiveUsagePreview] = useState<{
    preview: TypographyPreviewDescriptor;
    set: TypographySet;
  } | null>(null);
  const [hoveredRolePreview, setHoveredRolePreview] = useState<{
    id: string;
    preview: TypographyPreviewDescriptor;
    set: TypographySet;
    roleKey: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedRoles, setCollapsedRoles] = useState<Record<string, boolean>>({});
  const [previewContextKey, setPreviewContextKey] = useState<EditorPreviewContext | null>(null);

  const loadState = useCallback(async (preferredSetId?: string | null) => {
    setError(null);
    const nextState = await requestJson<TypographyState>("/api/admin/design-system/typography");
    setState(nextState);
    const firstSetId = preferredSetId ?? searchParamSetId ?? nextState.sets[0]?.id ?? null;
    setSelectedSetId(firstSetId);
    setEditor(toEditableSet(nextState.sets.find((set) => set.id === firstSetId) ?? null));
  }, [searchParamSetId]);

  useEffect(() => {
    void loadState(searchParamSetId);
  }, [loadState, searchParamSetId]);

  const selectedSet = useMemo(
    () => state?.sets.find((set) => set.id === selectedSetId) ?? null,
    [selectedSetId, state?.sets],
  );

  useEffect(() => {
    if (!selectedSet) return;
    setOpenAreas((current) => ({
      ...current,
      [selectedSet.area]: true,
    }));
  }, [selectedSet]);

  useEffect(() => {
    if (!selectedSetId) return;
    if (searchParamSetId === selectedSetId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("set", selectedSetId);
    router.replace(`/design-system/fonts/typography?${params.toString()}`, { scroll: false });
  }, [router, searchParamSetId, searchParams, selectedSetId]);

  const groupedAssignments = useMemo(() => {
    const groups = new Map<TypographyArea, TypographyAssignment[]>();
    state?.assignments.forEach((assignment) => {
      const bucket = groups.get(assignment.area) ?? [];
      bucket.push(assignment);
      groups.set(assignment.area, bucket);
    });
    return groups;
  }, [state?.assignments]);

  const assignmentsBySetId = useMemo(() => {
    const groups = new Map<string, TypographyAssignment[]>();
    state?.assignments.forEach((assignment) => {
      const bucket = groups.get(assignment.setId) ?? [];
      bucket.push(assignment);
      groups.set(assignment.setId, bucket);
    });
    return groups;
  }, [state?.assignments]);

  const setOptions = useMemo(() => state?.sets ?? [], [state?.sets]);

  const selectedSetAssignments = useMemo(
    () => (selectedSet?.id ? assignmentsBySetId.get(selectedSet.id) ?? [] : []),
    [assignmentsBySetId, selectedSet?.id],
  );

  const selectedSetUsagePills = useMemo(
    () => buildUsagePills(selectedSetAssignments),
    [selectedSetAssignments],
  );

  useEffect(() => {
    if (!selectedSet) {
      setPreviewContextKey(null);
      setCollapsedRoles({});
      return;
    }

    setCollapsedRoles({});
  }, [selectedSet]);

  useEffect(() => {
    if (!selectedSetUsagePills.length) {
      setPreviewContextKey(null);
      return;
    }

    setPreviewContextKey((current) =>
      current && selectedSetUsagePills.some((pill) => pill.key === current)
        ? current
        : selectedSetUsagePills[0]?.key ?? null,
    );
  }, [selectedSetUsagePills]);

  const selectedPreviewDescriptor = useMemo(() => {
    if (!selectedSet) return null;
    if (!selectedSetUsagePills.length) {
      return {
        key: `${selectedSet.id}-default`,
        label: selectedSet.name,
        title: selectedSet.name,
        eyebrow: AREA_LABELS[selectedSet.area] ?? formatTokenLabel(selectedSet.area),
        body: "Live specimen preview for the selected typography set.",
        variant: "hero" as const,
        content: {
          kicker: AREA_LABELS[selectedSet.area] ?? formatTokenLabel(selectedSet.area),
          title: selectedSet.name,
          body: "Preview the selected typography roles in a representative page composition.",
          cta: "Open page",
        },
      };
    }

    return (
      selectedSetUsagePills.find((pill) => pill.key === previewContextKey)?.preview ??
      selectedSetUsagePills[0]?.preview ??
      null
    );
  }, [previewContextKey, selectedSet, selectedSetUsagePills]);

  const visibleSets = useMemo(() => {
    const sets = [...setOptions].filter((set) => matchesAreaFilter(set.area, areaFilter));

    sets.sort((left, right) => {
      const leftAssignments = assignmentsBySetId.get(left.id) ?? [];
      const rightAssignments = assignmentsBySetId.get(right.id) ?? [];
      const leftHeadingFont = formatFontLabel(
        left.roles[resolvePrimaryRoleKey(left.roles)]?.desktop.fontFamily ??
          left.roles[resolvePrimaryRoleKey(left.roles)]?.mobile.fontFamily ??
          EMPTY_ROLE_STYLE.fontFamily,
      );
      const rightHeadingFont = formatFontLabel(
        right.roles[resolvePrimaryRoleKey(right.roles)]?.desktop.fontFamily ??
          right.roles[resolvePrimaryRoleKey(right.roles)]?.mobile.fontFamily ??
          EMPTY_ROLE_STYLE.fontFamily,
      );
      const leftFontCount = countUniqueFonts(left.roles);
      const rightFontCount = countUniqueFonts(right.roles);

      if (sortBy === "heading-font") {
        return leftHeadingFont.localeCompare(rightHeadingFont) || left.name.localeCompare(right.name);
      }

      if (sortBy === "font-count") {
        return rightFontCount - leftFontCount || rightAssignments.length - leftAssignments.length || left.name.localeCompare(right.name);
      }

      return rightAssignments.length - leftAssignments.length || left.name.localeCompare(right.name);
    });

    return sets;
  }, [areaFilter, assignmentsBySetId, setOptions, sortBy]);

  useEffect(() => {
    if (!visibleSets.length) return;
    if (selectedSetId === null) return;
    const selectedStillVisible = visibleSets.some((set) => set.id === selectedSetId);
    if (!selectedStillVisible) {
      const nextSet = visibleSets[0] ?? null;
      setSelectedSetId(nextSet?.id ?? null);
      setEditor(toEditableSet(nextSet));
      setHoveredRolePreview(null);
    }
  }, [selectedSetId, visibleSets]);

  const handleSelectSet = (setId: string | null) => {
    setSelectedSetId(setId);
    setEditor(toEditableSet(state?.sets.find((set) => set.id === setId) ?? null));
    setMessage(null);
    setError(null);
    setHoveredRolePreview(null);
  };

  const handleRoleNameAdd = () => {
    let nextRole = "newRole";
    let suffix = 2;
    while (editor.roles[nextRole]) {
      nextRole = `newRole${suffix}`;
      suffix += 1;
    }
    setEditor((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [nextRole]: {
          mobile: { ...EMPTY_ROLE_STYLE },
          desktop: { ...EMPTY_ROLE_STYLE },
        },
      },
    }));
  };

  const toggleRoleCollapsed = (roleKey: string) => {
    setCollapsedRoles((current) => ({
      ...current,
      [roleKey]: !current[roleKey],
    }));
  };

  const updateRole = (
    roleKey: string,
    breakpoint: "mobile" | "desktop",
    field: keyof TypographyRoleStyle,
    value: string,
  ) => {
    setEditor((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [roleKey]: {
          ...current.roles[roleKey],
          [breakpoint]: {
            ...current.roles[roleKey]?.[breakpoint],
            [field]: value,
          },
        },
      },
    }));
  };

  const renameRole = (currentKey: string, nextKey: string) => {
    const trimmed = nextKey.trim();
    if (!trimmed || trimmed === currentKey) return;
    setEditor((current) => {
      const nextRoles = { ...current.roles };
      const roleValue = nextRoles[currentKey];
      delete nextRoles[currentKey];
      nextRoles[trimmed] = roleValue!;
      return {
        ...current,
        roles: nextRoles,
      };
    });
  };

  const removeRole = (roleKey: string) => {
    setEditor((current) => {
      const nextRoles = { ...current.roles };
      delete nextRoles[roleKey];
      return {
        ...current,
        roles: Object.keys(nextRoles).length ? nextRoles : current.roles,
      };
    });
  };

  const resetRole = (roleKey: string) => {
    const savedRole =
      selectedSet?.roles[roleKey] ??
      ({
        mobile: { ...EMPTY_ROLE_STYLE },
        desktop: { ...EMPTY_ROLE_STYLE },
      } satisfies TypographyRoleConfig);

    setEditor((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [roleKey]: cloneRoles({ [roleKey]: savedRole })[roleKey],
      },
    }));
  };

  const saveSet = async () => {
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      if (!editor.name.trim()) {
        throw new Error("Set name is required");
      }
      if (!editor.seedSource.trim()) {
        throw new Error("Seed source is required");
      }

      if (editor.id) {
        const response = await requestJson<{ set: TypographySet }>(
          `/api/admin/design-system/typography/sets/${editor.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              name: editor.name,
              area: editor.area,
              seedSource: editor.seedSource,
              roles: editor.roles,
            }),
          },
        );
        await loadState(response.set.id);
      } else {
        const response = await requestJson<{ set: TypographySet }>(
          "/api/admin/design-system/typography/sets",
          {
            method: "POST",
            body: JSON.stringify({
              name: editor.name,
              area: editor.area,
              seedSource: editor.seedSource,
              roles: editor.roles,
            }),
          },
        );
        await loadState(response.set.id);
      }
      setMessage("Typography set saved.");
      notifyTypographyRuntimeRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save typography set");
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateSet = async () => {
    if (!selectedSet) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await requestJson<{ set: TypographySet }>(
        "/api/admin/design-system/typography/sets",
        {
          method: "POST",
          body: JSON.stringify({
            name: `${selectedSet.name} Copy`,
            area: selectedSet.area,
            seedSource: selectedSet.seedSource,
            roles: selectedSet.roles,
          }),
        },
      );
      await loadState(response.set.id);
      setMessage("Typography set duplicated.");
      notifyTypographyRuntimeRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to duplicate typography set");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSet = async () => {
    if (!selectedSet?.id) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      await requestJson(`/api/admin/design-system/typography/sets/${selectedSet.id}`, {
        method: "DELETE",
      });
      await loadState(null);
      setMessage("Typography set deleted.");
      notifyTypographyRuntimeRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to delete typography set");
    } finally {
      setIsSaving(false);
    }
  };

  const updateAssignment = async (assignment: TypographyAssignment, setId: string) => {
    setMessage(null);
    setError(null);
    try {
      await requestJson<{ assignment: TypographyAssignment }>(
        "/api/admin/design-system/typography/assignments",
        {
          method: "PUT",
          body: JSON.stringify({
            area: assignment.area,
            pageKey: assignment.pageKey,
            instanceKey: assignment.instanceKey,
            setId,
            sourcePath: assignment.sourcePath,
            notes: assignment.notes,
          }),
        },
      );
      await loadState(selectedSetId);
      setMessage("Assignment updated.");
      notifyTypographyRuntimeRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to update assignment");
    }
  };

  if (!state) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">
        Loading typography sets...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        <section
          data-testid="typography-page-shell"
          className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[26px] md:p-6"
        >
          <div className="flex flex-col gap-4 md:gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl min-w-0 space-y-3">
              <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                Design System
              </span>
              <div className="min-w-0">
                <h1 className="text-[1.7rem] font-bold tracking-[-0.03em] text-zinc-950 md:text-[2rem]">
                  Typography Sets
                </h1>
                <p className={`mt-2 max-w-3xl text-sm leading-6 text-zinc-600 md:text-[15px] ${WRAP_ANYWHERE}`}>
                  A typography set is a reusable group of text styles for headings, body copy, labels,
                  and other roles. Assign sets to areas or pages, then edit the selected set below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {state.sets.length} set{state.sets.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                  {state.assignments.length} assignments
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                  Mobile + desktop roles
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelectSet(null)}
              className="inline-flex items-center justify-center self-start rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              New Set
            </button>
          </div>
        </section>

        <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="space-y-4">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[26px]">
              <div className="flex flex-col gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold tracking-[-0.02em] text-zinc-950 md:text-lg">
                    Set Library
                  </h2>
                  <p className={`mt-1 max-w-3xl text-sm leading-6 text-zinc-500 ${WRAP_ANYWHERE}`}>
                    Browse reusable sets, see which pages inherit them, and scan their fonts before you edit anything.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Sort by
                    <select
                      aria-label="Sort by"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as TypographySort)}
                      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Area
                    <select
                      aria-label="Area filter"
                      value={areaFilter}
                      onChange={(event) => setAreaFilter(event.target.value as AreaFilter)}
                      className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                    >
                      {AREA_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-4" data-testid="typography-summary-rail">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Frontend
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                      {state.sets.filter((set) => set.area === "user-frontend").length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Surveys
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                      {state.sets.filter((set) => set.area === "surveys").length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Admin
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                      {state.sets.filter((set) => set.area === "admin").length}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Active View
                    </div>
                    <div className="mt-1 text-sm font-semibold tracking-[-0.01em] text-zinc-950">
                      {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {AREA_FILTER_OPTIONS.find((option) => option.value === areaFilter)?.label} filter
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {visibleSets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-500">
                    No typography sets match this filter.
                  </div>
                ) : null}

                {visibleSets.map((set) => {
                  const linkedAssignments = assignmentsBySetId.get(set.id) ?? [];
                  const usagePills = buildUsagePills(linkedAssignments);
                  const isSelected = selectedSetId === set.id;
                  const primaryRoleKey = resolvePrimaryRoleKey(set.roles);
                  const primaryFontLabel = formatFontLabel(set.roles[primaryRoleKey]?.desktop.fontFamily ?? EMPTY_ROLE_STYLE.fontFamily);
                  const uniqueFontCount = countUniqueFonts(set.roles);

                  return (
                    <article
                      key={set.id}
                      className={`rounded-[24px] border p-4 text-left transition ${
                        isSelected
                          ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_18px_48px_-34px_rgba(24,24,27,0.7)]"
                          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300 hover:shadow-[0_16px_42px_-38px_rgba(24,24,27,0.45)]"
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`Select ${set.name}`}
                        onClick={() => handleSelectSet(set.id)}
                        className="w-full text-left"
                      >
                        <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-white/70" : "text-zinc-500"}`}>
                              {AREA_LABELS[set.area] ?? formatTokenLabel(set.area)}
                            </div>
                            <div className={`mt-1 break-words text-base font-bold tracking-[-0.02em] ${WRAP_ANYWHERE}`}>
                              {set.name}
                            </div>
                            <div className={`mt-2 text-sm ${isSelected ? "text-white/78" : "text-zinc-600"}`}>
                              Heading font: <span className="font-semibold">{primaryFontLabel}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                isSelected ? "bg-white/12 text-white" : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {linkedAssignments.length} page{linkedAssignments.length === 1 ? "" : "s"}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                isSelected ? "bg-white/12 text-white" : "bg-zinc-100 text-zinc-600"
                              }`}
                            >
                              {uniqueFontCount} font{uniqueFontCount === 1 ? "" : "s"}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="mt-3 min-w-0">
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isSelected ? "text-white/55" : "text-zinc-400"}`}>
                          Seed source
                        </div>
                        <div
                          data-testid={`set-seed-source-${set.id}`}
                          className={`mt-1 break-all text-xs leading-5 ${WRAP_ANYWHERE} ${isSelected ? "text-white/72" : "text-zinc-500"}`}
                        >
                          {set.seedSource}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[22px] border border-current/10 bg-current/[0.03] p-3">
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-white/65" : "text-zinc-500"}`}>
                          Fonts in this set
                        </div>
                        <div className="mt-3 space-y-2.5">
                          {Object.entries(set.roles).map(([roleKey, roleConfig]) => {
                            const activeStyle = roleConfig[previewBreakpoint];
                            const roleFontLabel = formatFontLabel(activeStyle.fontFamily);
                            const rolePreviewId = `${set.id}-${roleKey}`;
                            const preview = usagePills[0]?.preview ?? {
                              key: `${set.id}-${roleKey}`,
                              label: set.name,
                              title: set.name,
                              eyebrow: AREA_LABELS[set.area] ?? formatTokenLabel(set.area),
                              body: "This role is part of the selected typography set.",
                              specimen: set.name,
                            };

                            return (
                              <div
                                key={roleKey}
                                className="relative"
                                onMouseEnter={() => setHoveredRolePreview({ id: rolePreviewId, preview, set, roleKey })}
                                onMouseLeave={() =>
                                  setHoveredRolePreview((current) => (current?.id === rolePreviewId ? null : current))
                                }
                              >
                                <button
                                  type="button"
                                  onFocus={() => setHoveredRolePreview({ id: rolePreviewId, preview, set, roleKey })}
                                  onBlur={() =>
                                    setHoveredRolePreview((current) => (current?.id === rolePreviewId ? null : current))
                                  }
                                  className={`flex w-full min-w-0 items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left ${
                                    isSelected
                                      ? "border-white/10 bg-white/6"
                                      : "border-zinc-200 bg-white"
                                  }`}
                                  data-testid={`set-role-row-${set.id}-${roleKey}`}
                                >
                                  <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-white/65" : "text-zinc-500"}`}>
                                    {resolveRoleDisplayLabel(roleKey)}
                                  </span>
                                  <span
                                    className={`min-w-0 break-words text-right ${WRAP_ANYWHERE} ${isSelected ? "text-white" : "text-zinc-950"}`}
                                    style={resolveRolePreviewStyle(roleConfig, previewBreakpoint)}
                                  >
                                    {resolveRoleSampleText(roleKey, roleFontLabel)}
                                  </span>
                                </button>

                                {hoveredRolePreview?.id === rolePreviewId ? (
                                  <div
                                    className={`absolute right-0 top-[calc(100%+0.5rem)] z-20 w-full max-w-sm rounded-2xl border p-3 shadow-xl ${
                                      isSelected
                                        ? "border-white/15 bg-zinc-900 text-white"
                                        : "border-zinc-200 bg-white text-zinc-950"
                                    }`}
                                    data-testid={`role-preview-popover-${set.id}-${roleKey}`}
                                  >
                                    <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-white/60" : "text-zinc-500"}`}>
                                      Example usage
                                    </div>
                                    <div className="mt-2 text-sm font-semibold">
                                      {preview.title}
                                    </div>
                                    <p className={`mt-1 text-xs leading-5 ${WRAP_ANYWHERE} ${isSelected ? "text-white/75" : "text-zinc-600"}`}>
                                      This shows how the {resolveRoleDisplayLabel(roleKey).toLowerCase()} text is written on the page.
                                    </p>
                                    <div className="mt-3">
                                      <SpecimenPreviewSurface
                                        preview={preview}
                                        set={set}
                                        breakpoint={previewBreakpoint}
                                        focusRoleKey={roleKey}
                                        compact
                                      />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "text-white/65" : "text-zinc-500"}`}>
                          Used On
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {usagePills.length > 0 ? (
                            usagePills.map((pill) => (
                              <button
                                key={pill.key}
                                type="button"
                                title={pill.title}
                                onClick={() => setActiveUsagePreview({ preview: pill.preview, set })}
                                className={`max-w-full rounded-full px-2.5 py-1 text-[11px] font-semibold break-words transition ${WRAP_ANYWHERE} ${
                                  isSelected
                                    ? "bg-white/12 text-white hover:bg-white/18"
                                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                                }`}
                              >
                                {pill.label}
                              </button>
                            ))
                          ) : (
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isSelected ? "bg-white/12 text-white/85" : "bg-zinc-100 text-zinc-500"
                              }`}
                            >
                              Unassigned
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[26px] xl:sticky xl:top-6">
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-[-0.02em] text-zinc-950 md:text-lg">
                  {selectedSet ? "Edit Selected Set" : "Create New Set"}
                </h2>
                <p className={`mt-1 w-full max-w-none text-sm leading-6 text-zinc-500 ${WRAP_ANYWHERE}`}>
                  {selectedSet
                    ? "Update the selected set’s typography roles, mobile/desktop values, and metadata."
                    : "Create a reusable typography set, then assign it to areas, pages, or component slots."}
                </p>
              </div>

              <div className="sticky top-0 z-10 -mx-4 mt-4 border-y border-zinc-200 bg-white px-4 py-3 sm:-mx-5 sm:px-5" data-testid="editor-sticky-actions">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 p-1">
                      <button
                        type="button"
                        onClick={() => setPreviewBreakpoint("mobile")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                          previewBreakpoint === "mobile"
                            ? "bg-zinc-950 text-white"
                            : "text-zinc-600"
                        }`}
                      >
                        Mobile
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewBreakpoint("desktop")}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${
                          previewBreakpoint === "desktop"
                            ? "bg-zinc-950 text-white"
                            : "text-zinc-600"
                        }`}
                      >
                        Desktop
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void saveSet()}
                        disabled={isSaving}
                        className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save Set"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void duplicateSet()}
                        disabled={!selectedSet || isSaving}
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteSet()}
                        disabled={!selectedSet || isSaving}
                        className="rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-700">
                      Editing {previewBreakpoint}
                    </span>
                    <span>Adjust the active breakpoint values, then save to update linked pages.</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    {AREA_LABELS[editor.area]}
                  </span>
                  {selectedSet ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      {(assignmentsBySetId.get(selectedSet.id) ?? []).length} linked page
                      {(assignmentsBySetId.get(selectedSet.id) ?? []).length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Draft
                    </span>
                  )}
                </div>
                <p className={`mt-3 text-sm leading-6 text-zinc-600 ${WRAP_ANYWHERE}`}>
                  {selectedSet
                    ? "Changes here update the set itself. The page pills in the library show which pages will inherit those defaults."
                    : "Create the set first. You can assign it to pages from the section below after saving."}
                </p>
              </div>

              {selectedSet && selectedPreviewDescriptor ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                        Live Preview Context
                      </div>
                      <p className={`mt-1 text-sm leading-6 text-zinc-600 ${WRAP_ANYWHERE}`}>
                        Switch the specimen to match the page family this set currently styles.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedSetUsagePills.map((pill) => (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => setPreviewContextKey(pill.key)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            previewContextKey === pill.key
                              ? "bg-zinc-950 text-white"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                    <SpecimenPreviewSurface
                      preview={selectedPreviewDescriptor}
                      set={selectedSet}
                      breakpoint={previewBreakpoint}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="min-w-0 text-sm font-medium text-zinc-700">
                  Set name
                  <input
                    value={editor.name}
                    onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  />
                </label>
                <label className="min-w-0 text-sm font-medium text-zinc-700">
                  Area
                  <select
                    value={editor.area}
                    onChange={(event) => setEditor((current) => ({ ...current, area: event.target.value as TypographyArea }))}
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  >
                    {(Object.keys(AREA_LABELS) as TypographyArea[]).map((area) => (
                      <option key={area} value={area}>
                        {AREA_LABELS[area]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 text-sm font-medium text-zinc-700 sm:col-span-2">
                  Seed source
                  <input
                    value={editor.seedSource}
                    onChange={(event) => setEditor((current) => ({ ...current, seedSource: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  />
                </label>
              </div>

              <div className="mt-4 space-y-3 md:space-y-4">
                {Object.entries(editor.roles).map(([roleKey, roleConfig]) => {
                  const activeConfig = roleConfig[previewBreakpoint];
                  const isCollapsed = collapsedRoles[roleKey] ?? false;

                  return (
                    <article key={roleKey} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleRoleCollapsed(roleKey)}
                                className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600"
                              >
                                {isCollapsed ? "Expand" : "Collapse"}
                              </button>
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                                {resolveRoleDisplayLabel(roleKey)}
                              </span>
                            </div>
                            <input
                              defaultValue={roleKey}
                              onBlur={(event) => renameRole(roleKey, event.target.value)}
                              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => resetRole(roleKey)}
                              className="self-start rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700"
                            >
                              Reset
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRole(roleKey)}
                              className="self-start rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-zinc-200 bg-white px-3 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            Live Sample
                          </div>
                          <p
                            className={`mt-2 break-words text-zinc-900 ${WRAP_ANYWHERE}`}
                            style={resolveRolePreviewStyle(roleConfig, previewBreakpoint)}
                          >
                            {resolveRoleSampleText(roleKey, formatFontLabel(activeConfig.fontFamily))}
                          </p>
                        </div>
                      </div>

                      {!isCollapsed ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:col-span-2">
                            Font
                            <select
                              value={activeConfig.fontFamily}
                              onChange={(event) => updateRole(roleKey, previewBreakpoint, "fontFamily", event.target.value)}
                              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                            >
                              {[...DESIGN_SYSTEM_CDN_FONT_OPTIONS].map((option) => (
                                <option key={option.name} value={option.fontFamily}>
                                  {option.name}
                                </option>
                              ))}
                              <option value="var(--font-hamburg)">Hamburg Variable</option>
                              <option value="var(--font-gloucester)">Gloucester Variable</option>
                              <option value="var(--font-plymouth-serial)">Plymouth Serial Variable</option>
                              <option value="var(--font-rude-slab)">Rude Slab Variable</option>
                            </select>
                          </label>
                          {(
                            ["fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform"] as const
                          ).map((field) => (
                            <label key={field} className="min-w-0 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                              {FIELD_LABELS[field]}
                              <input
                                value={activeConfig[field] ?? ""}
                                onChange={(event) => updateRole(roleKey, previewBreakpoint, field, event.target.value)}
                                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-zinc-900"
                              />
                            </label>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRoleNameAdd}
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Add Role
                </button>
              </div>

              {message ? <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p> : null}
              {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
            </div>
          </aside>
        </div>

        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 md:rounded-[26px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-[-0.02em] text-zinc-950 md:text-lg">
                Where Sets Are Applied
              </h2>
              <p className={`mt-1 max-w-2xl text-sm leading-6 text-zinc-500 ${WRAP_ANYWHERE}`}>
                Choose the default typography set for each area, page, or component slot. This stays secondary to the set library.
              </p>
            </div>
            <span className="inline-flex self-start rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Each page or component slot uses one default set
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(Object.keys(AREA_LABELS) as TypographyArea[]).map((area) => {
              const areaAssignments = groupedAssignments.get(area) ?? [];
              const isOpen = openAreas[area];

              return (
                <details
                  key={area}
                  open={isOpen}
                  onToggle={(event) => {
                    const nextOpen = event.currentTarget.open;
                    setOpenAreas((current) => ({
                      ...current,
                      [area]: nextOpen,
                    }));
                  }}
                  className="group rounded-2xl border border-zinc-200 bg-zinc-50 p-4 open:bg-white"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-950">{AREA_LABELS[area]}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {areaAssignments.length} target{areaAssignments.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-600 transition group-open:bg-zinc-100">
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </summary>

                  <div className="mt-4 space-y-3">
                    {areaAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-zinc-200 bg-white p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 space-y-1">
                            <div className={`break-words text-sm font-semibold text-zinc-950 ${WRAP_ANYWHERE}`}>
                              {formatAssignmentTitle(assignment)}
                            </div>
                            <div className={`text-xs text-zinc-500 ${WRAP_ANYWHERE}`}>
                              {formatAssignmentMeta(assignment)}
                            </div>
                            <div
                              data-testid={`assignment-source-${assignment.id}`}
                              className={`text-[11px] break-all text-zinc-400 ${WRAP_ANYWHERE}`}
                            >
                              Source
                              <span className="ml-1 font-medium text-zinc-500">{assignment.sourcePath}</span>
                            </div>
                          </div>

                          <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 lg:w-[15rem]">
                            Assigned set
                            <select
                              aria-label="Assigned set"
                              data-testid={`assignment-select-${assignment.id}`}
                              value={assignment.setId}
                              onChange={(event) => void updateAssignment(assignment, event.target.value)}
                              className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-900"
                            >
                              {setOptions.map((set) => (
                                <option key={set.id} value={set.id}>
                                  {set.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      </div>

      <SpecimenPreviewModal
        preview={activeUsagePreview?.preview ?? null}
        set={activeUsagePreview?.set ?? null}
        breakpoint={previewBreakpoint}
        onClose={() => setActiveUsagePreview(null)}
      />
    </>
  );
}

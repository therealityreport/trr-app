"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import QuestionRenderer from "@/components/survey/QuestionRenderer";
import IconRatingInput from "@/components/survey/IconRatingInput";
import FlashbackRanker, {
  type FlashbackRankerFontOverrides,
  type FlashbackRankerStyleOverrides,
} from "@/components/flashback-ranker";
import {
  DESIGN_SYSTEM_BASE_COLORS,
  DESIGN_SYSTEM_CDN_FONT_OPTIONS,
  DESIGN_SYSTEM_COLORS_STORAGE_KEY,
} from "@/lib/admin/design-system-tokens";
import { extractPrimaryFontToken, resolveCloudfrontCdnFont } from "@/lib/fonts/cdn-fonts";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { SurveyRankingItem } from "@/lib/surveys/types";
import MultiSelectPills from "@/components/survey/MultiSelectPills";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QuestionExample {
  label: string;
  source: string;
  mockQuestion: SurveyQuestion & { options: QuestionOption[] };
  mockValue: unknown;
}

interface AuthExample {
  label: string;
  source: string;
}

interface CatalogEntry {
  key: string;
  displayName: string;
  description: string;
  componentPath: string;
  category: "survey" | "auth" | "standalone";
  examples?: QuestionExample[];
  authExamples?: AuthExample[];
}

type PreviewViewport = "phone" | "tablet" | "desktop";
type DefaultViewport = "mobile" | "desktop";

interface TemplatePreviewEditorState {
  titleText: string;
  subText: string;
  titleColor: string;
  subTextColor: string;
  questionColor: string;
  componentBackgroundColor: string;
  placeholderShapeColor: string;
  placeholderShapeBorderColor: string;
  unassignedContainerColor: string;
  unassignedContainerBorderColor: string;
  unassignedCastCircleBorderColor: string;
  titleFontFamily: string;
  subTextFontFamily: string;
  titleFontSize: number;
  subTextFontSize: number;
  shapeScale: number;
  buttonScale: number;
  unassignedCastCircleSize: number;
  canvasBackground: string;
  frameBackground: string;
  frameBorderColor: string;
}

type TemplateStyleKey =
  | "titleColor"
  | "subTextColor"
  | "questionColor"
  | "componentBackgroundColor"
  | "placeholderShapeColor"
  | "placeholderShapeBorderColor"
  | "unassignedContainerColor"
  | "unassignedContainerBorderColor"
  | "unassignedCastCircleBorderColor"
  | "titleFontFamily"
  | "subTextFontFamily"
  | "titleFontSize"
  | "subTextFontSize"
  | "shapeScale"
  | "buttonScale"
  | "unassignedCastCircleSize"
  | "canvasBackground"
  | "frameBackground"
  | "frameBorderColor";

type TemplateStyleDefaults = Pick<TemplatePreviewEditorState, TemplateStyleKey>;
const TEMPLATE_STYLE_FIELDS: TemplateStyleKey[] = [
  "titleColor",
  "subTextColor",
  "questionColor",
  "componentBackgroundColor",
  "placeholderShapeColor",
  "placeholderShapeBorderColor",
  "unassignedContainerColor",
  "unassignedContainerBorderColor",
  "unassignedCastCircleBorderColor",
  "titleFontFamily",
  "subTextFontFamily",
  "titleFontSize",
  "subTextFontSize",
  "shapeScale",
  "buttonScale",
  "unassignedCastCircleSize",
  "canvasBackground",
  "frameBackground",
  "frameBorderColor",
];

interface SurveyQuestionDefaultsState {
  mobile: TemplateStyleDefaults;
  desktop: TemplateStyleDefaults;
}

interface QuestionsTabProps {
  baseColors?: string[];
}

const TEMPLATE_EDITOR_STORAGE_PREFIX = "trr.questions-tab.template-editor.v2";
const SURVEY_QUESTION_DEFAULTS_STORAGE_KEY = "trr.questions-tab.survey-defaults.v1";
const SURVEY_PREVIEW_SOURCE_STORAGE_KEY = "trr.questions-tab.preview-source.v1";
const DEFAULT_SURVEY_PREVIEW_SOURCE = "RHOSLC S6 Survey";
type TemplateEditorStringKey =
  | "titleText"
  | "subText"
  | "titleColor"
  | "subTextColor"
  | "questionColor"
  | "componentBackgroundColor"
  | "placeholderShapeColor"
  | "placeholderShapeBorderColor"
  | "unassignedContainerColor"
  | "unassignedContainerBorderColor"
  | "unassignedCastCircleBorderColor"
  | "titleFontFamily"
  | "subTextFontFamily"
  | "canvasBackground"
  | "frameBackground"
  | "frameBorderColor";
type TemplateEditorNumberKey =
  | "titleFontSize"
  | "subTextFontSize"
  | "shapeScale"
  | "buttonScale"
  | "unassignedCastCircleSize";

/* ------------------------------------------------------------------ */
/*  Auth / Signup field data                                            */
/* ------------------------------------------------------------------ */

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say", "Other"];

const SAMPLE_COUNTRIES = [
  "United States", "Canada", "United Kingdom", "Australia", "Germany",
  "France", "Japan", "Brazil", "Mexico", "India",
];

const SAMPLE_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
];

const SAMPLE_SHOWS = [
  "RHOSLC - Real Housewives of Salt Lake City",
  "RHOBH - Real Housewives of Beverly Hills",
  "RHOA - Real Housewives of Atlanta",
  "RHOP - Real Housewives of Potomac",
  "RHONJ - Real Housewives of New Jersey",
  "RHONY - Real Housewives of New York City",
  "RHOD - Real Housewives of Dubai",
  "RHOM - Real Housewives of Miami",
  "VPR - Vanderpump Rules",
  "SC - Southern Charm",
  "BD - Below Deck",
  "BDMED - Below Deck Mediterranean",
  "Summer House",
  "Winter House",
  "Married to Medicine",
  "Love & Marriage: Huntsville",
  "Family Karma",
  "Shahs of Sunset",
  "Million Dollar Listing",
];

const CHARACTERISTIC_PILLS = [
  "Shady/Messy",
  "Philanthropy",
  "Personal Storylines",
  "Relatability",
  "Wealth",
  "Humor",
  "Authentic",
  "Honest",
  "Fashion",
  "Family Drama",
];

const SHOW_COLORS = [
  "#7A0307", "#95164A", "#B81D22", "#CF5315", "#C76D00", "#F1991B",
  "#B05E2A", "#E3A320", "#D48C42", "#ECC91C", "#977022", "#744A1F",
  "#C2B72D", "#76A34C", "#356A3B", "#0C454A", "#769F25", "#A1C6D4",
  "#53769C",
];

/* ------------------------------------------------------------------ */
/*  Helper – build a mock question quickly                             */
/* ------------------------------------------------------------------ */

function mkQ(
  key: string,
  text: string,
  questionType: SurveyQuestion["question_type"],
  config: Record<string, unknown>,
  options: Array<{ key: string; text: string; metadata?: Record<string, unknown> }> = [],
): SurveyQuestion & { options: QuestionOption[] } {
  return {
    id: `mock-${key}`,
    survey_id: "mock",
    question_key: key,
    question_text: text,
    question_type: questionType,
    display_order: 1,
    is_required: false,
    config,
    created_at: "",
    updated_at: "",
    options: options.map((o, i) => ({
      id: `${key}-opt-${i}`,
      question_id: `mock-${key}`,
      option_key: o.key,
      option_text: o.text,
      display_order: i + 1,
      metadata: o.metadata ?? {},
      created_at: "",
    })),
  };
}

const RHOSLC_S6_CAST_OPTIONS: Array<{ key: string; text: string; metadata: { imagePath: string } }> = [
  { key: "angie", text: "Angie Katsanevas", metadata: { imagePath: "/images/cast/rhoslc-s6/angie.png" } },
  { key: "britani", text: "Britani Bateman", metadata: { imagePath: "/images/cast/rhoslc-s6/britani.png" } },
  { key: "bronwyn", text: "Bronwyn Newport", metadata: { imagePath: "/images/cast/rhoslc-s6/bronwyn.png" } },
  { key: "heather", text: "Heather Gay", metadata: { imagePath: "/images/cast/rhoslc-s6/heather.png" } },
  { key: "lisa", text: "Lisa Barlow", metadata: { imagePath: "/images/cast/rhoslc-s6/lisa.png" } },
  { key: "mary", text: "Mary Cosby", metadata: { imagePath: "/images/cast/rhoslc-s6/mary.png" } },
  { key: "meredith", text: "Meredith Marks", metadata: { imagePath: "/images/cast/rhoslc-s6/meredith.png" } },
  { key: "whitney", text: "Whitney Rose", metadata: { imagePath: "/images/cast/rhoslc-s6/whitney.png" } },
];

/* ------------------------------------------------------------------ */
/*  Catalog data – real survey questions with multiple examples         */
/* ------------------------------------------------------------------ */

const SURVEY_CATALOG: CatalogEntry[] = [
  { key: "star-rating", displayName: "Star Rating", description: "10-star rating with partial fill, text input, and slider. 0.1 precision.", componentPath: "components/survey/StarRatingInput.tsx", category: "survey", examples: [
    { label: "Episode Rating", source: "RHOP S10 Survey", mockQuestion: mkQ("star_ep", "Rate this week's episode of RHOP", "numeric", { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 }), mockValue: 7.5 },
    { label: "Season Rating", source: "RHOSLC S6 Survey", mockQuestion: mkQ("star_season", "Rate RHOSLC Season 6 overall", "numeric", { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 }), mockValue: null },
  ]},
  { key: "numeric-slider", displayName: "Numeric Slider", description: "Horizontal range slider with min/max labels for cast or subject ratings.", componentPath: "components/survey/SliderInput.tsx", category: "survey", examples: [
    { label: "Entertainment Factor", source: "Cast Rating Survey", mockQuestion: mkQ("slider_ent", "How entertaining was Lisa Barlow this episode?", "numeric", { uiVariant: "numeric-scale-slider", min: 0, max: 100, step: 1, minLabel: "Boring", maxLabel: "Entertaining", subject: { name: "Lisa Barlow", img: "/images/cast/rhoslc-s6/lisa.png" } }), mockValue: 65 },
  ]},
  { key: "single-select", displayName: "Single Select (Radio)", description: "Vertical radio button list for single-choice questions.", componentPath: "components/survey/SingleSelectInput.tsx", category: "survey", examples: [
    { label: "Favorite Housewife", source: "RHOSLC Survey", mockQuestion: mkQ("fav_hw", "Who is your favorite RHOSLC housewife this season?", "single_choice", { uiVariant: "text-multiple-choice" }, [{ key: "lisa", text: "Lisa Barlow" }, { key: "heather", text: "Heather Gay" }, { key: "meredith", text: "Meredith Marks" }, { key: "whitney", text: "Whitney Rose" }, { key: "angie", text: "Angie Katsanevas" }]), mockValue: null },
    { label: "Yes / No Question", source: "General Survey", mockQuestion: mkQ("yes_no", "Do you watch the show live or on streaming?", "single_choice", { uiVariant: "text-multiple-choice" }, [{ key: "live", text: "Live on Bravo" }, { key: "streaming", text: "Streaming (Peacock)" }, { key: "both", text: "Both" }]), mockValue: null },
  ]},
  { key: "image-select", displayName: "Image Select (Grid)", description: "Grid of circular image buttons for cast/image-based selection.", componentPath: "components/survey/SingleSelectInput.tsx (grid)", category: "survey", examples: [
    { label: "Cast Member Select", source: "RHOSLC S6 Survey", mockQuestion: mkQ("cast_img", "Which RHOSLC cast member had the best confessional look?", "single_choice", { uiVariant: "image-multiple-choice" }, [{ key: "lisa", text: "Lisa Barlow", metadata: { imagePath: "/images/cast/rhoslc-s6/lisa.png" } }, { key: "heather", text: "Heather Gay", metadata: { imagePath: "/images/cast/rhoslc-s6/heather.png" } }, { key: "meredith", text: "Meredith Marks", metadata: { imagePath: "/images/cast/rhoslc-s6/meredith.png" } }, { key: "whitney", text: "Whitney Rose", metadata: { imagePath: "/images/cast/rhoslc-s6/whitney.png" } }]), mockValue: null },
  ]},
  { key: "multi-select", displayName: "Multi-Select (Checkbox)", description: "Checkbox group with optional min/max selection constraints.", componentPath: "components/survey/MultiSelectInput.tsx", category: "survey", examples: [
    { label: "Select Shows", source: "Signup / Onboarding", mockQuestion: mkQ("select_shows", "Which Real Housewives shows do you watch?", "multi_choice", { uiVariant: "multi-select-choice", minSelections: 1, maxSelections: 5 }, [{ key: "rhoslc", text: "RHOSLC" }, { key: "rhobh", text: "RHOBH" }, { key: "rhoa", text: "RHOA" }, { key: "rhop", text: "RHOP" }, { key: "rhonj", text: "RHONJ" }, { key: "rhony", text: "RHONY" }, { key: "rhod", text: "RHOD" }]), mockValue: ["rhoslc", "rhop"] },
    { label: "Favorite Moments", source: "Episode Survey", mockQuestion: mkQ("fav_moments", "Select all the scenes that stood out to you", "multi_choice", { uiVariant: "multi-select-choice", minSelections: 1 }, [{ key: "dinner", text: "The group dinner confrontation" }, { key: "confessional", text: "Lisa's confessional breakdown" }, { key: "trip", text: "The cast trip reveal" }, { key: "reunion", text: "The reunion preview" }]), mockValue: [] },
  ]},
  { key: "text-entry", displayName: "Text Entry", description: "Single-line text input with optional validation (pattern, length).", componentPath: "components/survey/TextEntryInput.tsx", category: "survey", examples: [
    { label: "Free Text Response", source: "General Survey", mockQuestion: mkQ("thoughts", "What would you like to see next season?", "free_text", { uiVariant: "text-entry", placeholder: "Share your thoughts...", inputType: "text" }), mockValue: "" },
  ]},
  { key: "whose-side", displayName: "Whose Side (Head-to-Head)", description: "Two-choice comparison with VS divider and optional neutral option.", componentPath: "components/survey/WhoseSideInput.tsx", category: "survey", examples: [
    { label: "Feud: Lisa vs Meredith", source: "RHOSLC S6 Survey", mockQuestion: mkQ("feud_lm", "Whose side are you on in the Lisa vs. Meredith feud?", "single_choice", { uiVariant: "two-choice-slider", neutralOption: "Neutral" }, [{ key: "lisa", text: "Lisa Barlow", metadata: { imagePath: "/images/cast/rhoslc-s6/lisa.png" } }, { key: "meredith", text: "Meredith Marks", metadata: { imagePath: "/images/cast/rhoslc-s6/meredith.png" } }]), mockValue: null },
    { label: "Feud: Whitney vs Heather", source: "RHOSLC S6 Survey", mockQuestion: mkQ("feud_wh", "Whose side are you on in the Whitney vs. Heather feud?", "single_choice", { uiVariant: "two-choice-slider", neutralOption: "Neither" }, [{ key: "whitney", text: "Whitney Rose", metadata: { imagePath: "/images/cast/rhoslc-s6/whitney.png" } }, { key: "heather", text: "Heather Gay", metadata: { imagePath: "/images/cast/rhoslc-s6/heather.png" } }]), mockValue: null },
  ]},
  { key: "matrix-likert", displayName: "Matrix / Likert Scale", description: "Statement-based agree/disagree bars with a 5-point sentiment scale.", componentPath: "components/survey/MatrixLikertInput.tsx", category: "survey", examples: [
    { label: "Agree / Disagree", source: "RHOSLC S6 Survey", mockQuestion: mkQ("agree", "Heather and Whitney are telling the truth about Meredith on the Plane.", "likert", { uiVariant: "agree-likert-scale", promptText: "How much do you agree with the following statement:", rows: [{ id: "s1", label: "Heather and Whitney are telling the truth about Meredith on the Plane." }] }, [{ key: "strongly_disagree", text: "Strongly Disagree" }, { key: "somewhat_disagree", text: "Somewhat Disagree" }, { key: "neutral", text: "Neither" }, { key: "somewhat_agree", text: "Somewhat Agree" }, { key: "strongly_agree", text: "Strongly Agree" }]), mockValue: {} },
  ]},
  { key: "cast-decision", displayName: "Cast Decision Card", description: "Single-cast decision card for verdict-style prompts (Keep/Fire/Demote, Bring Back/Keep Gone).", componentPath: "components/survey/CastDecisionCardInput.tsx", category: "survey", examples: [
    { label: "Cast Verdict (Keep/Fire/Demote)", source: "RHOSLC S6 Survey", mockQuestion: mkQ("verdict", "For each cast member, should Bravo keep, demote, or fire them?", "likert", { uiVariant: "cast-decision-card", choices: [{ value: "fire", label: "Fire" }, { value: "demote", label: "Demote" }, { value: "keep", label: "Keep" }], rows: [{ id: "whitney", label: "Whitney Rose", img: "/images/cast/rhoslc-s6/whitney.png" }, { id: "lisa", label: "Lisa Barlow", img: "/images/cast/rhoslc-s6/lisa.png" }, { id: "heather", label: "Heather Gay", img: "/images/cast/rhoslc-s6/heather.png" }, { id: "meredith", label: "Meredith Marks", img: "/images/cast/rhoslc-s6/meredith.png" }] }, [{ key: "fire", text: "Fire" }, { key: "demote", text: "Demote" }, { key: "keep", text: "Keep" }]), mockValue: {} },
    { label: "Ex-Wives: Bring Back / Keep Gone", source: "Legacy Cast Survey", mockQuestion: mkQ("exwives", "Should these former cast members return?", "likert", { uiVariant: "cast-decision-card", choices: [{ value: "bring_back", label: "Bring Back" }, { value: "keep_gone", label: "Keep Gone" }], rows: [{ id: "monica", label: "Monica Garcia" }, { id: "jen", label: "Jen Shah" }] }, [{ key: "bring_back", text: "Bring Back" }, { key: "keep_gone", text: "Keep Gone" }]), mockValue: {} },
  ]},
  { key: "poster-rankings", displayName: "Poster Rankings", description: "Drag-and-drop ranked season/poster slots with an unassigned bank.", componentPath: "components/survey/PosterRankingsInput.tsx", category: "survey", examples: [
    { label: "RHOSLC Season Ranking", source: "RHOSLC S6 Survey", mockQuestion: mkQ("rank_seasons", "Rank the Seasons of RHOSLC.", "ranking", { uiVariant: "poster-rankings", lineLabelTop: "ICONIC", lineLabelBottom: "SNOOZE" }, [{ key: "s1", text: "SEASON 1" }, { key: "s2", text: "SEASON 2" }, { key: "s3", text: "SEASON 3" }, { key: "s4", text: "SEASON 4" }, { key: "s5", text: "SEASON 5" }, { key: "s6", text: "SEASON 6" }]), mockValue: [] },
  ]},
  { key: "person-rankings", displayName: "Person Rankings", description: "Drag-and-drop ranked cast slots with an unassigned cast bank.", componentPath: "components/survey/PersonRankingsInput.tsx", category: "survey", examples: [
    { label: "RHOSLC Cast Ranking", source: "RHOSLC S6 Survey", mockQuestion: mkQ("rank_rhoslc", "Rank the Cast of RHOSLC S6.", "ranking", { uiVariant: "person-rankings", lineLabelTop: "ICONIC", lineLabelBottom: "SNOOZE" }, RHOSLC_S6_CAST_OPTIONS), mockValue: [] },
  ]},
  { key: "two-axis-grid", displayName: "Two-Axis Grid (2D Map)", description: "Draggable tokens on a 2D grid with labeled axes. Snap-to-grid.", componentPath: "components/survey/TwoAxisGridInput.tsx", category: "survey", examples: [
    { label: "Cast Perception Map", source: "RHOSLC S6 Survey", mockQuestion: mkQ("perception", "Place each housewife on the grid", "likert", { uiVariant: "two-axis-grid", extent: 3, xLabelLeft: "VILLAIN", xLabelRight: "HERO", yLabelTop: "ENTERTAINING", yLabelBottom: "BORING", rows: [{ id: "lisa", label: "Lisa B.", img: "/images/cast/rhoslc-s6/lisa.png" }, { id: "heather", label: "Heather G.", img: "/images/cast/rhoslc-s6/heather.png" }, { id: "meredith", label: "Meredith M.", img: "/images/cast/rhoslc-s6/meredith.png" }] }), mockValue: {} },
  ]},
];

/* ------------------------------------------------------------------ */
/*  Auth / Signup catalog entries                                       */
/* ------------------------------------------------------------------ */

const AUTH_CATALOG: CatalogEntry[] = [
  { key: "auth-email", displayName: "Email", description: "Email text input with format validation.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-password", displayName: "Password", description: "Password text input with masked characters.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-country-dropdown", displayName: "Country Dropdown Select", description: "Native dropdown country select used for compact auth flows.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-username", displayName: "Username", description: "Text input, 3-20 chars, lowercase + digits + underscores. Checked for uniqueness on blur.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-birthday", displayName: "Birthday (Date)", description: "Native date picker (type=\"date\"). Must be 13+. Required for OAuth users.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-gender", displayName: "Gender (Select)", description: "Dropdown select with 5 options: Male, Female, Non-binary, Prefer not to say, Other.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-country", displayName: "Country (Datalist)", description: "Text input with datalist autocomplete. 196 countries.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-state", displayName: "State (Datalist)", description: "Text input with datalist autocomplete. 50 US states. Only shows if country = United States.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-shows", displayName: "MultiSelectPills (Shows)", description: "Scrollable pill-based multi-select for shows. Min 3 required.", componentPath: "components/survey/MultiSelectPills.tsx + app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-characteristics", displayName: "MultiSelectPills (Characteristics)", description: "Characteristic-based pill selector variant for question templates.", componentPath: "components/survey/MultiSelectPills.tsx", category: "auth" },
];

/* ------------------------------------------------------------------ */
/*  Standalone / custom survey components                               */
/* ------------------------------------------------------------------ */

const RHOSLC_CAST: SurveyRankingItem[] = [
  { id: "angie", label: "Angie Katsanevas", img: "/images/cast/rhoslc-s6/angie.png" },
  { id: "britani", label: "Britani Bateman", img: "/images/cast/rhoslc-s6/britani.png" },
  { id: "bronwyn", label: "Bronwyn Newport", img: "/images/cast/rhoslc-s6/bronwyn.png" },
  { id: "heather", label: "Heather Gay", img: "/images/cast/rhoslc-s6/heather.png" },
  { id: "lisa", label: "Lisa Barlow", img: "/images/cast/rhoslc-s6/lisa.png" },
  { id: "mary", label: "Mary Cosby", img: "/images/cast/rhoslc-s6/mary.png" },
  { id: "meredith", label: "Meredith Marks", img: "/images/cast/rhoslc-s6/meredith.png" },
  { id: "whitney", label: "Whitney Rose", img: "/images/cast/rhoslc-s6/whitney.png" },
];

const STANDALONE_CATALOG: CatalogEntry[] = [
  { key: "icon-rating", displayName: "Icon Rating (Snowflake)", description: "Partial-fill icon rating using any masked SVG. Click or drag across icons. Supports half-values and text input. Used with snowflakes for RHOSLC.", componentPath: "components/survey/IconRatingInput.tsx", category: "standalone" },
  { key: "flashback-ranker", displayName: "Flashback Ranker (Timeline)", description: "Drag cast members from the bench onto a timeline line (classic mode).", componentPath: "components/flashback-ranker.tsx", category: "standalone" },
];

const PREVIEW_VIEWPORTS: Array<{ key: PreviewViewport; label: string }> = [
  { key: "phone", label: "Phone" },
  { key: "tablet", label: "Tablet" },
  { key: "desktop", label: "Desktop" },
];

const PREVIEW_VIEWPORT_FRAME: Record<PreviewViewport, { width: number; height: number; maxWidthClass: string }> = {
  phone: { width: 390, height: 844, maxWidthClass: "max-w-[390px]" },
  tablet: { width: 768, height: 1024, maxWidthClass: "max-w-[768px]" },
  desktop: { width: 1280, height: 800, maxWidthClass: "max-w-[1280px]" },
};

const TEMPLATE_FONT_OPTIONS: Array<{ label: string; value: string }> = DESIGN_SYSTEM_CDN_FONT_OPTIONS.map((font) => ({
  label: font.name,
  value: font.fontFamily,
}));

function normalizeTemplateFontFamily(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const directMatch = TEMPLATE_FONT_OPTIONS.find((option) => option.value === trimmed);
  if (directMatch) return directMatch.value;

  const resolved = resolveCloudfrontCdnFont(trimmed);
  if (resolved) return resolved.fontFamily;

  const primaryToken = extractPrimaryFontToken(trimmed).toLowerCase();
  const byLabel = TEMPLATE_FONT_OPTIONS.find((option) => {
    const label = option.label.toLowerCase();
    return label === trimmed.toLowerCase() || (primaryToken.length > 0 && label === primaryToken);
  });
  if (byLabel) return byLabel.value;

  return trimmed;
}

const DEFAULT_TITLE_FONT = "\"Sofia Pro\", var(--font-sans), sans-serif";
const DEFAULT_SUBTEXT_FONT = "\"Sofia Pro\", var(--font-sans), sans-serif";
const FIGMA_MATRIX_HEADING_FONT = "\"Gloucester\", var(--font-sans), sans-serif";
const FIGMA_TITLE_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const FIGMA_SUBTEXT_FONT = "\"Plymouth Serial\", var(--font-sans), sans-serif";

const DEFAULT_SURVEY_STYLE_MOBILE: TemplateStyleDefaults = {
  titleColor: "#111111",
  subTextColor: "#111111",
  questionColor: "#111111",
  componentBackgroundColor: "#D9D9D9",
  placeholderShapeColor: "#111111",
  placeholderShapeBorderColor: "#E4E4E7",
  unassignedContainerColor: "#F4F4F5",
  unassignedContainerBorderColor: "#D4D4D8",
  unassignedCastCircleBorderColor: "#D4D4D8",
  titleFontFamily: DEFAULT_TITLE_FONT,
  subTextFontFamily: DEFAULT_SUBTEXT_FONT,
  titleFontSize: 20,
  subTextFontSize: 14,
  shapeScale: 100,
  buttonScale: 100,
  unassignedCastCircleSize: 100,
  canvasBackground: "#FFFFFF",
  frameBackground: "#FFFFFF",
  frameBorderColor: "#E4E4E7",
};

const DEFAULT_SURVEY_STYLE_DESKTOP: TemplateStyleDefaults = {
  titleColor: "#111111",
  subTextColor: "#111111",
  questionColor: "#111111",
  componentBackgroundColor: "#D9D9D9",
  placeholderShapeColor: "#111111",
  placeholderShapeBorderColor: "#E4E4E7",
  unassignedContainerColor: "#F4F4F5",
  unassignedContainerBorderColor: "#D4D4D8",
  unassignedCastCircleBorderColor: "#D4D4D8",
  titleFontFamily: DEFAULT_TITLE_FONT,
  subTextFontFamily: DEFAULT_SUBTEXT_FONT,
  titleFontSize: 24,
  subTextFontSize: 16,
  shapeScale: 100,
  buttonScale: 100,
  unassignedCastCircleSize: 100,
  canvasBackground: "#FFFFFF",
  frameBackground: "#FFFFFF",
  frameBorderColor: "#E4E4E7",
};

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

function resolveColorPalette(rawColors: string[]): string[] {
  const normalized = rawColors
    .map((entry) => normalizeHexColor(entry))
    .filter((entry): entry is string => Boolean(entry));
  const deduped = Array.from(new Set(normalized));
  return deduped.length ? deduped : [...DESIGN_SYSTEM_BASE_COLORS];
}

function buildTemplateEditorDefaults(
  titleText: string,
  subText: string,
  isFigmaRankPreview: boolean,
): TemplatePreviewEditorState {
  return {
    titleText,
    subText,
    titleColor: "#111111",
    subTextColor: "#111111",
    questionColor: "#111111",
    componentBackgroundColor: isFigmaRankPreview ? "#D9D9D9" : "#FFFFFF",
    placeholderShapeColor: isFigmaRankPreview ? "#111111" : "#E4E4E7",
    placeholderShapeBorderColor: "#D4D4D8",
    unassignedContainerColor: isFigmaRankPreview ? "#F4F4F5" : "#FFFFFF",
    unassignedContainerBorderColor: "#D4D4D8",
    unassignedCastCircleBorderColor: "#D4D4D8",
    titleFontFamily: isFigmaRankPreview
      ? FIGMA_TITLE_FONT
      : DEFAULT_TITLE_FONT,
    subTextFontFamily: isFigmaRankPreview
      ? FIGMA_SUBTEXT_FONT
      : DEFAULT_SUBTEXT_FONT,
    titleFontSize: isFigmaRankPreview ? 70 : 24,
    subTextFontSize: isFigmaRankPreview ? 35 : 16,
    shapeScale: 100,
    buttonScale: 100,
    unassignedCastCircleSize: 100,
    canvasBackground: "#FFFFFF",
    frameBackground: "#FFFFFF",
    frameBorderColor: "#E4E4E7",
  };
}

function responsiveFontSize(sizePx: number, enabled: boolean, minPx: number): string {
  if (!enabled) return `${sizePx}px`;
  return `clamp(${minPx}px, 6vw, ${sizePx}px)`;
}

function sanitizeTemplateEditorState(
  value: unknown,
): Partial<TemplatePreviewEditorState> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;

  const stringFields: TemplateEditorStringKey[] = [
    "titleText",
    "subText",
    "titleColor",
    "subTextColor",
    "questionColor",
    "componentBackgroundColor",
    "placeholderShapeColor",
    "placeholderShapeBorderColor",
    "unassignedContainerColor",
    "unassignedContainerBorderColor",
    "unassignedCastCircleBorderColor",
    "titleFontFamily",
    "subTextFontFamily",
    "canvasBackground",
    "frameBackground",
    "frameBorderColor",
  ];
  const numericFields: TemplateEditorNumberKey[] = [
    "titleFontSize",
    "subTextFontSize",
    "shapeScale",
    "buttonScale",
    "unassignedCastCircleSize",
  ];

  const sanitized: Partial<TemplatePreviewEditorState> = {};
  for (const field of stringFields) {
    const raw = candidate[field];
    if (typeof raw === "string") {
      if (field === "titleFontFamily" || field === "subTextFontFamily") {
        sanitized[field] = normalizeTemplateFontFamily(raw);
      } else {
        sanitized[field] = raw;
      }
    }
  }
  for (const field of numericFields) {
    const raw = candidate[field];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      sanitized[field] = raw;
    }
  }

  return sanitized;
}

function sanitizeTemplateStyleDefaults(value: unknown): Partial<TemplateStyleDefaults> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  const sanitized: Partial<TemplateStyleDefaults> = {};

  const stringFields: Array<Exclude<TemplateStyleKey, "titleFontSize" | "subTextFontSize" | "shapeScale" | "buttonScale" | "unassignedCastCircleSize">> = [
    "titleColor",
    "subTextColor",
    "questionColor",
    "componentBackgroundColor",
    "placeholderShapeColor",
    "placeholderShapeBorderColor",
    "unassignedContainerColor",
    "unassignedContainerBorderColor",
    "unassignedCastCircleBorderColor",
    "titleFontFamily",
    "subTextFontFamily",
    "canvasBackground",
    "frameBackground",
    "frameBorderColor",
  ];
  const numberFields: Array<Extract<TemplateStyleKey, "titleFontSize" | "subTextFontSize" | "shapeScale" | "buttonScale" | "unassignedCastCircleSize">> = [
    "titleFontSize",
    "subTextFontSize",
    "shapeScale",
    "buttonScale",
    "unassignedCastCircleSize",
  ];

  for (const field of stringFields) {
    const raw = candidate[field];
    if (typeof raw === "string") {
      if (field === "titleFontFamily" || field === "subTextFontFamily") {
        sanitized[field] = normalizeTemplateFontFamily(raw);
      } else {
        sanitized[field] = raw;
      }
    }
  }

  for (const field of numberFields) {
    const raw = candidate[field];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      sanitized[field] = raw;
    }
  }

  return sanitized;
}

function sanitizeSurveyQuestionDefaultsState(value: unknown): SurveyQuestionDefaultsState {
  const mobile = {
    ...DEFAULT_SURVEY_STYLE_MOBILE,
    ...sanitizeTemplateStyleDefaults(
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>).mobile
        : null,
    ),
  };
  const desktop = {
    ...DEFAULT_SURVEY_STYLE_DESKTOP,
    ...sanitizeTemplateStyleDefaults(
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>).desktop
        : null,
    ),
  };

  return { mobile, desktop };
}

function asConfigRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function withEditorFontOverridesForQuestion(
  question: SurveyQuestion & { options: QuestionOption[] },
  editorState: TemplatePreviewEditorState,
): SurveyQuestion & { options: QuestionOption[] } {
  const baseConfig = asConfigRecord(question.config);
  const uiVariant = typeof baseConfig.uiVariant === "string" ? baseConfig.uiVariant : "";

  if (uiVariant === "cast-decision-card" || uiVariant === "three-choice-slider") {
    const existingFonts = asConfigRecord(baseConfig.fonts);
    return {
      ...question,
      config: {
        ...baseConfig,
        shapeScale: editorState.shapeScale,
        buttonScale: editorState.buttonScale,
        questionTextColor: editorState.questionColor,
        subTextHeadingColor: editorState.subTextColor,
        componentBackgroundColor: editorState.componentBackgroundColor,
        placeholderShapeColor: editorState.placeholderShapeColor,
        placeholderShapeBorderColor: editorState.placeholderShapeBorderColor,
        subTextHeadingFontFamily: editorState.subTextFontFamily,
        questionTextFontFamily: editorState.titleFontFamily,
        optionTextFontFamily: editorState.subTextFontFamily,
        promptFontFamily: editorState.subTextFontFamily,
        castNameFontFamily: editorState.titleFontFamily,
        choiceFontFamily: editorState.subTextFontFamily,
        nextButtonFontFamily: editorState.subTextFontFamily,
        fonts: {
          ...existingFonts,
          subTextHeading: editorState.subTextFontFamily,
          questionText: editorState.titleFontFamily,
          optionText: editorState.subTextFontFamily,
          prompt: editorState.subTextFontFamily,
          castName: editorState.titleFontFamily,
          choice: editorState.subTextFontFamily,
          nextButton: editorState.subTextFontFamily,
        },
      },
    };
  }

  if (uiVariant === "two-choice-slider") {
    const existingFonts = asConfigRecord(baseConfig.fonts);
    return {
      ...question,
      config: {
        ...baseConfig,
        shapeScale: editorState.shapeScale,
        buttonScale: editorState.buttonScale,
        questionTextColor: editorState.questionColor,
        componentBackgroundColor: editorState.componentBackgroundColor,
        placeholderShapeColor: editorState.placeholderShapeColor,
        placeholderShapeBorderColor: editorState.placeholderShapeBorderColor,
        questionTextFontFamily: editorState.titleFontFamily,
        headingFontFamily: editorState.titleFontFamily,
        titleFontFamily: editorState.titleFontFamily,
        neutralOptionFontFamily: editorState.subTextFontFamily,
        optionTextFontFamily: editorState.subTextFontFamily,
        fonts: {
          ...existingFonts,
          questionText: editorState.titleFontFamily,
          heading: editorState.titleFontFamily,
          title: editorState.titleFontFamily,
          neutralOption: editorState.subTextFontFamily,
          optionText: editorState.subTextFontFamily,
        },
      },
    };
  }

  if (
    uiVariant === "person-rankings" ||
    uiVariant === "poster-rankings" ||
    uiVariant === "circle-ranking" ||
    uiVariant === "rectangle-ranking"
  ) {
    const existingFonts = asConfigRecord(baseConfig.fonts);
    return {
      ...question,
      config: {
        ...baseConfig,
        shapeScale: editorState.shapeScale,
        buttonScale: editorState.buttonScale,
        questionTextColor: editorState.questionColor,
        placeholderShapeColor: editorState.placeholderShapeColor,
        placeholderShapeBorderColor: editorState.placeholderShapeBorderColor,
        placeholderTextColor: editorState.questionColor,
        unassignedContainerColor: editorState.unassignedContainerColor,
        unassignedContainerBorderColor: editorState.unassignedContainerBorderColor,
        unassignedCircleBorderColor: editorState.unassignedCastCircleBorderColor,
        unassignedCircleSize: editorState.unassignedCastCircleSize,
        rankNumberFontFamily: editorState.titleFontFamily,
        trayLabelFontFamily: editorState.subTextFontFamily,
        cardLabelFontFamily: editorState.titleFontFamily,
        pickerTitleFontFamily: editorState.subTextFontFamily,
        pickerItemFontFamily: editorState.subTextFontFamily,
        fonts: {
          ...existingFonts,
          rankNumber: editorState.titleFontFamily,
          trayLabel: editorState.subTextFontFamily,
          cardLabel: editorState.titleFontFamily,
          pickerTitle: editorState.subTextFontFamily,
          pickerItem: editorState.subTextFontFamily,
        },
      },
    };
  }

  if (uiVariant === "agree-likert-scale") {
    const existingFonts = asConfigRecord(baseConfig.fonts);
    return {
      ...question,
      config: {
        ...baseConfig,
        shapeScale: editorState.shapeScale,
        buttonScale: editorState.buttonScale,
        questionTextColor: editorState.questionColor,
        subTextHeadingColor: editorState.subTextColor,
        componentBackgroundColor: editorState.componentBackgroundColor,
        optionTextColor: editorState.subTextColor,
        placeholderShapeColor: editorState.placeholderShapeColor,
        placeholderShapeBorderColor: editorState.placeholderShapeBorderColor,
        subTextHeadingFontFamily: FIGMA_MATRIX_HEADING_FONT,
        promptFontFamily: FIGMA_MATRIX_HEADING_FONT,
        headingFontFamily: FIGMA_MATRIX_HEADING_FONT,
        questionTextFontFamily: editorState.titleFontFamily,
        statementFontFamily: editorState.titleFontFamily,
        optionTextFontFamily: editorState.subTextFontFamily,
        scaleLabelFontFamily: editorState.subTextFontFamily,
        optionLabelFontFamily: editorState.subTextFontFamily,
        rowLabelFontFamily: editorState.titleFontFamily,
        columnLabelFontFamily: editorState.subTextFontFamily,
        fonts: {
          ...existingFonts,
          subTextHeading: FIGMA_MATRIX_HEADING_FONT,
          prompt: FIGMA_MATRIX_HEADING_FONT,
          heading: FIGMA_MATRIX_HEADING_FONT,
          questionText: editorState.titleFontFamily,
          optionText: editorState.subTextFontFamily,
          rowLabel: editorState.titleFontFamily,
          statement: editorState.titleFontFamily,
          castName: editorState.titleFontFamily,
          columnLabel: editorState.subTextFontFamily,
          choice: editorState.subTextFontFamily,
          option: editorState.subTextFontFamily,
        },
      },
    };
  }

  if (uiVariant === "two-axis-grid") {
    return {
      ...question,
      config: {
        ...baseConfig,
        shapeScale: editorState.shapeScale,
        buttonScale: editorState.buttonScale,
        questionTextColor: editorState.questionColor,
        componentBackgroundColor: editorState.componentBackgroundColor,
        placeholderShapeColor: editorState.placeholderShapeColor,
        placeholderShapeBorderColor: editorState.placeholderShapeBorderColor,
        unassignedContainerColor: editorState.unassignedContainerColor,
        unassignedContainerBorderColor: editorState.unassignedContainerBorderColor,
        unassignedCircleBorderColor: editorState.unassignedCastCircleBorderColor,
        unassignedCircleSize: editorState.unassignedCastCircleSize,
      },
    };
  }

  return question;
}

function buildStandaloneFontOverrides(editorState: TemplatePreviewEditorState): FlashbackRankerFontOverrides {
  return {
    rankNumberFontFamily: editorState.titleFontFamily,
    trayLabelFontFamily: editorState.subTextFontFamily,
    cardLabelFontFamily: editorState.titleFontFamily,
    pickerTitleFontFamily: editorState.subTextFontFamily,
    pickerItemFontFamily: editorState.subTextFontFamily,
  };
}

function buildStandaloneStyleOverrides(editorState: TemplatePreviewEditorState): FlashbackRankerStyleOverrides {
  return {
    circlePlaceholderFillColor: editorState.placeholderShapeColor,
    circlePlaceholderBorderColor: editorState.placeholderShapeBorderColor,
    circlePlaceholderNumberColor: editorState.questionColor,
    rectanglePlaceholderFillColor: editorState.placeholderShapeColor,
    unassignedContainerFillColor: editorState.unassignedContainerColor,
    unassignedContainerBorderColor: editorState.unassignedContainerBorderColor,
    unassignedItemBorderColor: editorState.unassignedCastCircleBorderColor,
    unassignedItemSizePercent: editorState.unassignedCastCircleSize,
  };
}

/* ------------------------------------------------------------------ */
/*  Shared card header                                                  */
/* ------------------------------------------------------------------ */

function CardHeader({
  entry,
  badge,
  children,
}: {
  entry: CatalogEntry;
  badge: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-5 pt-4 pb-3 border-b border-zinc-100 bg-zinc-50/40">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          {entry.displayName}
        </h3>
        <span className="inline-flex shrink-0 items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {badge}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">{entry.description}</p>
      <p className="mt-1 text-[10px] font-mono text-zinc-300 truncate">{entry.componentPath}</p>
      {children}
    </div>
  );
}

function PreviewViewportToggle({
  value,
  onChange,
}: {
  value: PreviewViewport;
  onChange: (next: PreviewViewport) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Preview</span>
      <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1">
        {PREVIEW_VIEWPORTS.map((option) => {
          const active = option.key === value;
          const viewportMeta = PREVIEW_VIEWPORT_FRAME[option.key];
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
              }`}
              aria-pressed={active}
              title={`${viewportMeta.width}x${viewportMeta.height}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TemplateFontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const selectValue = useMemo(() => {
    const normalized = normalizeTemplateFontFamily(value);
    if (TEMPLATE_FONT_OPTIONS.some((option) => option.value === normalized)) {
      return normalized;
    }
    return value;
  }, [value]);

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>
      <select
        value={selectValue}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
      >
        {TEMPLATE_FONT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TemplateFontSizeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) {
            onChange(parsed);
          }
        }}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-800"
      />
    </div>
  );
}

function TemplateColorSelect({
  label,
  value,
  baseColors,
  onChange,
}: {
  label: string;
  value: string;
  baseColors: string[];
  onChange: (next: string) => void;
}) {
  const options = useMemo(
    () => Array.from(new Set([value, ...baseColors])),
    [baseColors, value],
  );

  return (
    <div className="space-y-1.5 rounded-md border border-zinc-200 bg-white px-2 py-2">
      <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700"
      >
        {options.map((hex) => (
          <option key={hex} value={hex}>
            {hex}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-7 gap-1">
        {baseColors.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            className={`h-5 w-full rounded border ${value === hex ? "border-zinc-900" : "border-zinc-300"}`}
            style={{ backgroundColor: hex }}
            title={hex}
            aria-label={`Set ${label} to ${hex}`}
          />
        ))}
      </div>
    </div>
  );
}

function SurveyDefaultSettingsPanel({
  defaults,
  onChange,
  baseColors,
  previewSource,
  previewSourceOptions,
  onPreviewSourceChange,
}: {
  defaults: SurveyQuestionDefaultsState;
  onChange: (next: SurveyQuestionDefaultsState) => void;
  baseColors: string[];
  previewSource: string;
  previewSourceOptions: string[];
  onPreviewSourceChange: (next: string) => void;
}) {
  const [activeViewport, setActiveViewport] = useState<DefaultViewport>("mobile");
  const [isExpanded, setIsExpanded] = useState(false);
  const activeDefaults = defaults[activeViewport];

  const updateActiveDefaults = useCallback(
    (partial: Partial<TemplateStyleDefaults>) => {
      onChange({
        ...defaults,
        [activeViewport]: {
          ...defaults[activeViewport],
          ...partial,
        },
      });
    },
    [activeViewport, defaults, onChange],
  );

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-zinc-900">Default Settings</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Set baseline styles for all survey question previews. Per-template edits override these defaults.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-expanded={isExpanded}
        >
          {isExpanded ? "Hide Settings" : "Edit Settings"}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="mt-3 max-w-sm space-y-1.5">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              Preview Survey
            </label>
            <select
              value={previewSource}
              onChange={(event) => onPreviewSourceChange(event.target.value)}
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700"
            >
              {previewSourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500">
              Choose which show/survey examples are shown in preview cards.
            </p>
          </div>

          <div className="mt-3 inline-flex rounded-full border border-zinc-300 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveViewport("mobile")}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                activeViewport === "mobile" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
              aria-pressed={activeViewport === "mobile"}
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setActiveViewport("desktop")}
              className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                activeViewport === "desktop" ? "bg-zinc-900 text-white" : "text-zinc-500 hover:bg-zinc-100"
              }`}
              aria-pressed={activeViewport === "desktop"}
            >
              Desktop
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TemplateFontSelect
              label="Title Font"
              value={activeDefaults.titleFontFamily}
              onChange={(titleFontFamily) => updateActiveDefaults({ titleFontFamily })}
            />
            <TemplateFontSelect
              label="Sub-Text Font"
              value={activeDefaults.subTextFontFamily}
              onChange={(subTextFontFamily) => updateActiveDefaults({ subTextFontFamily })}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-sm">
            <TemplateFontSizeInput
              label="Title Size"
              value={activeDefaults.titleFontSize}
              onChange={(titleFontSize) => updateActiveDefaults({ titleFontSize })}
            />
            <TemplateFontSizeInput
              label="Sub-Text Size"
              value={activeDefaults.subTextFontSize}
              onChange={(subTextFontSize) => updateActiveDefaults({ subTextFontSize })}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md">
            <TemplateFontSizeInput
              label="Shape Size (%)"
              value={activeDefaults.shapeScale}
              onChange={(shapeScale) => updateActiveDefaults({ shapeScale })}
            />
            <TemplateFontSizeInput
              label="Button Size (%)"
              value={activeDefaults.buttonScale}
              onChange={(buttonScale) => updateActiveDefaults({ buttonScale })}
            />
            <TemplateFontSizeInput
              label="Unassigned Circle Size (%)"
              value={activeDefaults.unassignedCastCircleSize}
              onChange={(unassignedCastCircleSize) => updateActiveDefaults({ unassignedCastCircleSize })}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <TemplateColorSelect
              label="Title"
              value={activeDefaults.titleColor}
              baseColors={baseColors}
              onChange={(titleColor) => updateActiveDefaults({ titleColor })}
            />
            <TemplateColorSelect
              label="Sub-Text"
              value={activeDefaults.subTextColor}
              baseColors={baseColors}
              onChange={(subTextColor) => updateActiveDefaults({ subTextColor })}
            />
            <TemplateColorSelect
              label="Question Text"
              value={activeDefaults.questionColor}
              baseColors={baseColors}
              onChange={(questionColor) => updateActiveDefaults({ questionColor })}
            />
            <TemplateColorSelect
              label="Component BG"
              value={activeDefaults.componentBackgroundColor}
              baseColors={baseColors}
              onChange={(componentBackgroundColor) => updateActiveDefaults({ componentBackgroundColor })}
            />
            <TemplateColorSelect
              label="Placeholder Fill"
              value={activeDefaults.placeholderShapeColor}
              baseColors={baseColors}
              onChange={(placeholderShapeColor) => updateActiveDefaults({ placeholderShapeColor })}
            />
            <TemplateColorSelect
              label="Placeholder Border"
              value={activeDefaults.placeholderShapeBorderColor}
              baseColors={baseColors}
              onChange={(placeholderShapeBorderColor) => updateActiveDefaults({ placeholderShapeBorderColor })}
            />
            <TemplateColorSelect
              label="Unassigned Container"
              value={activeDefaults.unassignedContainerColor}
              baseColors={baseColors}
              onChange={(unassignedContainerColor) => updateActiveDefaults({ unassignedContainerColor })}
            />
            <TemplateColorSelect
              label="Unassigned Border"
              value={activeDefaults.unassignedContainerBorderColor}
              baseColors={baseColors}
              onChange={(unassignedContainerBorderColor) => updateActiveDefaults({ unassignedContainerBorderColor })}
            />
            <TemplateColorSelect
              label="Unassigned Circle Border"
              value={activeDefaults.unassignedCastCircleBorderColor}
              baseColors={baseColors}
              onChange={(unassignedCastCircleBorderColor) => updateActiveDefaults({ unassignedCastCircleBorderColor })}
            />
            <TemplateColorSelect
              label="Canvas"
              value={activeDefaults.canvasBackground}
              baseColors={baseColors}
              onChange={(canvasBackground) => updateActiveDefaults({ canvasBackground })}
            />
            <TemplateColorSelect
              label="Frame"
              value={activeDefaults.frameBackground}
              baseColors={baseColors}
              onChange={(frameBackground) => updateActiveDefaults({ frameBackground })}
            />
            <TemplateColorSelect
              label="Frame Border"
              value={activeDefaults.frameBorderColor}
              baseColors={baseColors}
              onChange={(frameBorderColor) => updateActiveDefaults({ frameBorderColor })}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Survey Preview Card — matches NormalizedSurveyPlay styling          */
/* ------------------------------------------------------------------ */

function SurveyPreviewCard({
  entry,
  baseColors,
  surveyDefaults,
  selectedPreviewSource,
}: {
  entry: CatalogEntry;
  baseColors: string[];
  surveyDefaults: SurveyQuestionDefaultsState;
  selectedPreviewSource: string;
}) {
  const examples = useMemo(() => {
    const allExamples = entry.examples ?? [];
    if (!allExamples.length) return allExamples;

    const sourceMatched = allExamples.filter((exampleValue) => exampleValue.source === selectedPreviewSource);
    if (sourceMatched.length) return sourceMatched;

    const nonRhopFallback = allExamples.filter((exampleValue) => !/rhop/i.test(exampleValue.source));
    return nonRhopFallback.length ? nonRhopFallback : allExamples;
  }, [entry.examples, selectedPreviewSource]);
  const sourceKey = selectedPreviewSource.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "default";
  const storageKey = `${TEMPLATE_EDITOR_STORAGE_PREFIX}.survey.${entry.key}.${sourceKey}`;
  const [exampleIdx, setExampleIdx] = useState(0);
  const [viewport, setViewport] = useState<PreviewViewport>("phone");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const safeExampleIdx = Math.min(exampleIdx, Math.max(examples.length - 1, 0));
  const example = examples[safeExampleIdx] as QuestionExample;
  const activeVariant = (example.mockQuestion.config as { uiVariant?: string } | null | undefined)?.uiVariant;
  const suppressTemplateHeading = activeVariant === "agree-likert-scale";
  const isRankingVariant =
    activeVariant === "person-rankings" ||
    activeVariant === "poster-rankings" ||
    activeVariant === "circle-ranking" ||
    activeVariant === "rectangle-ranking";
  const isRankOrderPreview =
    (entry.key === "person-rankings" || entry.key === "poster-rankings") &&
    isRankingVariant;
  const [values, setValues] = useState<Record<number, unknown>>(() => {
    const init: Record<number, unknown> = {};
    examples.forEach((ex, i) => {
      init[i] = ex.mockValue ?? null;
    });
    return init;
  });
  const shouldUseGlobalDefaultsForExample = useCallback(
    (exampleValue: QuestionExample) => {
      const variant = (exampleValue.mockQuestion.config as { uiVariant?: string } | null | undefined)?.uiVariant;
      // Keep Figma matrix previews on template fonts by default.
      return variant !== "agree-likert-scale";
    },
    [],
  );
  const buildDefaults = useCallback(
    (exampleValue: QuestionExample) => {
      const variant = (exampleValue.mockQuestion.config as { uiVariant?: string } | null | undefined)?.uiVariant;
      const isRankPreview =
        (entry.key === "person-rankings" || entry.key === "poster-rankings") &&
        (variant === "person-rankings" || variant === "poster-rankings" || variant === "circle-ranking" || variant === "rectangle-ranking");
      const isSeasonPreview =
        (entry.key === "poster-rankings" && (variant === "poster-rankings" || variant === "rectangle-ranking"))
        || variant === "poster-rankings"
        || variant === "rectangle-ranking";
      const isThreeChoice = variant === "three-choice-slider" || variant === "cast-decision-card";
      const isWhoseSide = variant === "two-choice-slider";
      const defaults = buildTemplateEditorDefaults(
        isThreeChoice || isWhoseSide
          ? ""
          : isSeasonPreview
            ? "Rank the Seasons of RHOSLC."
            : isRankPreview
              ? "Rank the Cast of RHOSLC S6."
              : exampleValue.mockQuestion.question_text,
        isThreeChoice || isWhoseSide
          ? ""
          : isSeasonPreview
            ? "Drag-and-Drop the Seasons to their Rank."
            : isRankPreview
              ? "Drag-and-Drop the Cast Members to their Rank."
              : "",
        isRankPreview,
      );
      if (variant === "agree-likert-scale") {
        return {
          ...defaults,
          titleText: "",
          subText: "",
          titleFontFamily: FIGMA_TITLE_FONT,
          subTextFontFamily: FIGMA_SUBTEXT_FONT,
          frameBackground: "#D9D9D9",
          frameBorderColor: "#D9D9D9",
        };
      }
      return defaults;
    },
    [entry.key],
  );
  const [editorStateByExample, setEditorStateByExample] = useState<Record<number, TemplatePreviewEditorState>>(() => {
    const initial: Record<number, TemplatePreviewEditorState> = {};
    examples.forEach((ex, idx) => {
      initial[idx] = buildDefaults(ex);
    });
    return initial;
  });
  const [useGlobalDefaultsByExample, setUseGlobalDefaultsByExample] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    examples.forEach((exampleValue, idx) => {
      initial[idx] = shouldUseGlobalDefaultsForExample(exampleValue);
    });
    return initial;
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      const record = parsed as Record<string, unknown>;
      setEditorStateByExample((prev) => {
        const next: Record<number, TemplatePreviewEditorState> = { ...prev };
        const savedStates = record.states && typeof record.states === "object" && !Array.isArray(record.states)
          ? (record.states as Record<string, unknown>)
          : record;
        examples.forEach((exampleValue, index) => {
          const saved = sanitizeTemplateEditorState(savedStates[String(index)]);
          const merged = {
            ...buildDefaults(exampleValue),
            ...saved,
          };
          const variant = (exampleValue.mockQuestion.config as { uiVariant?: string } | null | undefined)?.uiVariant;
          if (variant === "agree-likert-scale") {
            const savedTitleFont = typeof saved.titleFontFamily === "string"
              ? normalizeTemplateFontFamily(saved.titleFontFamily)
              : "";
            const savedSubTextFont = typeof saved.subTextFontFamily === "string"
              ? normalizeTemplateFontFamily(saved.subTextFontFamily)
              : "";
            const defaultTitleFont = normalizeTemplateFontFamily(DEFAULT_TITLE_FONT);
            const defaultSubTextFont = normalizeTemplateFontFamily(DEFAULT_SUBTEXT_FONT);

            merged.titleFontFamily = !savedTitleFont || savedTitleFont === defaultTitleFont
              ? FIGMA_TITLE_FONT
              : savedTitleFont;
            merged.subTextFontFamily = !savedSubTextFont || savedSubTextFont === defaultSubTextFont
              ? FIGMA_SUBTEXT_FONT
              : savedSubTextFont;
            // The Figma likert template owns its own heading and statement copy.
            merged.titleText = "";
            merged.subText = "";
          }
          next[index] = merged;
        });
        return next;
      });
      setUseGlobalDefaultsByExample((prev) => {
        const next: Record<number, boolean> = { ...prev };
        const savedFlags = record.useGlobal && typeof record.useGlobal === "object" && !Array.isArray(record.useGlobal)
          ? (record.useGlobal as Record<string, unknown>)
          : {};
        examples.forEach((exampleValue, index) => {
          const saved = savedFlags[String(index)];
          const shouldUseGlobal = shouldUseGlobalDefaultsForExample(exampleValue);
          if (!shouldUseGlobal) {
            next[index] = false;
            return;
          }
          next[index] = typeof saved === "boolean" ? saved : shouldUseGlobal;
        });
        return next;
      });
    } catch {
      // Ignore malformed persisted editor settings.
    }
  }, [buildDefaults, examples, shouldUseGlobalDefaultsForExample, storageKey]);

  useEffect(() => {
    try {
      const payload: Record<string, TemplatePreviewEditorState> = {};
      Object.entries(editorStateByExample).forEach(([index, state]) => {
        payload[index] = state;
      });
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          states: payload,
          useGlobal: useGlobalDefaultsByExample,
        }),
      );
    } catch {
      // Ignore persistence failures.
    }
  }, [editorStateByExample, storageKey, useGlobalDefaultsByExample]);

  const handleChange = useCallback((v: unknown) => {
    setValues((prev) => ({ ...prev, [safeExampleIdx]: v }));
  }, [safeExampleIdx]);
  const editorState =
    editorStateByExample[safeExampleIdx] ?? buildDefaults(example);
  const activeSurveyDefaults = useMemo(
    () => (viewport === "phone" ? surveyDefaults.mobile : surveyDefaults.desktop),
    [surveyDefaults.desktop, surveyDefaults.mobile, viewport],
  );
  const isUsingGlobalDefaults =
    useGlobalDefaultsByExample[safeExampleIdx] ?? shouldUseGlobalDefaultsForExample(example);
  const effectiveEditorState = useMemo(
    () => (isUsingGlobalDefaults
      ? {
        ...editorState,
        ...activeSurveyDefaults,
      }
      : editorState),
    [activeSurveyDefaults, editorState, isUsingGlobalDefaults],
  );
  const previewQuestion = useMemo(
    () => withEditorFontOverridesForQuestion(example.mockQuestion, effectiveEditorState),
    [effectiveEditorState, example.mockQuestion],
  );
  const viewportFrame = PREVIEW_VIEWPORT_FRAME[viewport];
  const updateEditorState = useCallback(
    (partial: Partial<TemplatePreviewEditorState>) => {
      const touchesStyleDefaults = Object.keys(partial).some((field) =>
        TEMPLATE_STYLE_FIELDS.includes(field as TemplateStyleKey),
      );
      setEditorStateByExample((prev) => {
        const base = isUsingGlobalDefaults && touchesStyleDefaults
          ? effectiveEditorState
          : prev[safeExampleIdx] ?? buildDefaults(example);
        return {
          ...prev,
          [safeExampleIdx]: { ...base, ...partial },
        };
      });
      if (touchesStyleDefaults) {
        setUseGlobalDefaultsByExample((prev) => ({
          ...prev,
          [safeExampleIdx]: false,
        }));
      }
    },
    [buildDefaults, effectiveEditorState, example, isUsingGlobalDefaults, safeExampleIdx],
  );
  const resetEditorState = useCallback(() => {
    setEditorStateByExample((prev) => ({
      ...prev,
      [safeExampleIdx]: buildDefaults(example),
    }));
    setUseGlobalDefaultsByExample((prev) => ({
      ...prev,
      [safeExampleIdx]: shouldUseGlobalDefaultsForExample(example),
    }));
  }, [buildDefaults, example, safeExampleIdx, shouldUseGlobalDefaultsForExample]);

  const renderPreview = () => (
    <div
      className="rounded-2xl border p-2 sm:p-3"
      style={{
        backgroundColor: effectiveEditorState.canvasBackground,
        borderColor: effectiveEditorState.frameBorderColor,
      }}
    >
      <div className="mx-auto flex w-full justify-center">
        <div
          className={`w-full overflow-hidden rounded-[24px] border shadow-sm ${viewportFrame.maxWidthClass}`}
          style={{
            backgroundColor: effectiveEditorState.frameBackground,
            borderColor: effectiveEditorState.frameBorderColor,
            aspectRatio: `${viewportFrame.width} / ${viewportFrame.height}`,
          }}
        >
          <div className="h-full overflow-auto p-3 sm:p-6">
            {!suppressTemplateHeading && (effectiveEditorState.titleText.trim().length > 0 || effectiveEditorState.subText.trim().length > 0) && (
              <div className="mb-3 sm:mb-4">
                {effectiveEditorState.titleText.trim().length > 0 && (
                  <p
                    className="leading-[1.05] tracking-[0.01em]"
                    style={{
                      color: effectiveEditorState.titleColor,
                      fontFamily: effectiveEditorState.titleFontFamily,
                      fontSize: responsiveFontSize(effectiveEditorState.titleFontSize, isRankOrderPreview, 22),
                      fontWeight: isRankOrderPreview ? 800 : 600,
                    }}
                  >
                    {effectiveEditorState.titleText}
                  </p>
                )}
                {effectiveEditorState.subText.trim().length > 0 && (
                  <p
                    className="mt-2 leading-none"
                    style={{
                      color: effectiveEditorState.subTextColor,
                      fontFamily: effectiveEditorState.subTextFontFamily,
                      fontSize: responsiveFontSize(effectiveEditorState.subTextFontSize, isRankOrderPreview, 14),
                      fontWeight: isRankOrderPreview ? 400 : 500,
                    }}
                  >
                    {effectiveEditorState.subText}
                  </p>
                )}
              </div>
            )}
            <QuestionRenderer
              question={previewQuestion}
              value={values[safeExampleIdx]}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <CardHeader entry={entry} badge={example.source}>
        {examples.length > 1 && (
          <div className="mt-2">
            <select
              value={safeExampleIdx}
              onChange={(e) => setExampleIdx(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            >
              {examples.map((ex, i) => (
                <option key={i} value={i}>
                  {ex.label} — {ex.source}
                </option>
              ))}
            </select>
          </div>
        )}
        <PreviewViewportToggle value={viewport} onChange={setViewport} />
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-9.5 9.5-3.7.6.6-3.7 9.6-9.4Zm1.1 2.3-1.6-1.6-1.2 1.2 1.6 1.6 1.2-1.2ZM12.9 6 6.2 12.7l-.3 1.8 1.8-.3L14.4 7 12.9 6Z" />
          </svg>
          Edit Template
        </button>
        {!isUsingGlobalDefaults && (
          <button
            type="button"
            onClick={resetEditorState}
            className="mt-2 ml-2 inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Use Defaults
          </button>
        )}
      </CardHeader>

      <div className="flex-1 p-3 sm:p-4">
        {renderPreview()}
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${entry.displayName} template editor`}
            className="absolute left-1/2 top-1/2 h-[calc(100vh-3rem)] w-[min(1400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-900">
                  {entry.displayName} Template Editor
                </h3>
                <p className="text-xs text-zinc-500">
                  Preview and tune colors, fonts, text, and sizing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetEditorState}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 hover:bg-zinc-100"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid h-[calc(100%-64px)] grid-cols-1 lg:grid-cols-[340px,minmax(0,1fr)]">
              <aside className="overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4">
                <div className="space-y-4">
                  {examples.length > 1 && (
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Example
                      </label>
                      <select
                        value={safeExampleIdx}
                        onChange={(e) => setExampleIdx(Number(e.target.value))}
                        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                      >
                        {examples.map((ex, i) => (
                          <option key={i} value={i}>
                            {ex.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!suppressTemplateHeading && (
                    <>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Title Text
                        </label>
                        <textarea
                          value={effectiveEditorState.titleText}
                          onChange={(e) => updateEditorState({ titleText: e.target.value })}
                          className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Sub-Text
                        </label>
                        <textarea
                          value={effectiveEditorState.subText}
                          onChange={(e) => updateEditorState({ subText: e.target.value })}
                          className="min-h-16 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                        />
                      </div>
                    </>
                  )}

                  <TemplateFontSelect
                    label="Title Font"
                    value={effectiveEditorState.titleFontFamily}
                    onChange={(titleFontFamily) => updateEditorState({ titleFontFamily })}
                  />

                  <TemplateFontSelect
                    label="Sub-Text Font"
                    value={effectiveEditorState.subTextFontFamily}
                    onChange={(subTextFontFamily) => updateEditorState({ subTextFontFamily })}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <TemplateFontSizeInput
                      label="Title Size"
                      value={effectiveEditorState.titleFontSize}
                      onChange={(titleFontSize) => updateEditorState({ titleFontSize })}
                    />
                    <TemplateFontSizeInput
                      label="Sub-Text Size"
                      value={effectiveEditorState.subTextFontSize}
                      onChange={(subTextFontSize) => updateEditorState({ subTextFontSize })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TemplateFontSizeInput
                      label="Shape Size (%)"
                      value={effectiveEditorState.shapeScale}
                      onChange={(shapeScale) => updateEditorState({ shapeScale })}
                    />
                    <TemplateFontSizeInput
                      label="Button Size (%)"
                      value={effectiveEditorState.buttonScale}
                      onChange={(buttonScale) => updateEditorState({ buttonScale })}
                    />
                    <TemplateFontSizeInput
                      label="Unassigned Circle Size (%)"
                      value={effectiveEditorState.unassignedCastCircleSize}
                      onChange={(unassignedCastCircleSize) => updateEditorState({ unassignedCastCircleSize })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <TemplateColorSelect
                      label="Title"
                      value={effectiveEditorState.titleColor}
                      baseColors={baseColors}
                      onChange={(titleColor) => updateEditorState({ titleColor })}
                    />
                    <TemplateColorSelect
                      label="Sub-Text"
                      value={effectiveEditorState.subTextColor}
                      baseColors={baseColors}
                      onChange={(subTextColor) => updateEditorState({ subTextColor })}
                    />
                    <TemplateColorSelect
                      label="Question Text"
                      value={effectiveEditorState.questionColor}
                      baseColors={baseColors}
                      onChange={(questionColor) => updateEditorState({ questionColor })}
                    />
                    <TemplateColorSelect
                      label="Component BG"
                      value={effectiveEditorState.componentBackgroundColor}
                      baseColors={baseColors}
                      onChange={(componentBackgroundColor) => updateEditorState({ componentBackgroundColor })}
                    />
                    <TemplateColorSelect
                      label="Placeholder Fill"
                      value={effectiveEditorState.placeholderShapeColor}
                      baseColors={baseColors}
                      onChange={(placeholderShapeColor) => updateEditorState({ placeholderShapeColor })}
                    />
                    <TemplateColorSelect
                      label="Placeholder Border"
                      value={effectiveEditorState.placeholderShapeBorderColor}
                      baseColors={baseColors}
                      onChange={(placeholderShapeBorderColor) => updateEditorState({ placeholderShapeBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Container"
                      value={effectiveEditorState.unassignedContainerColor}
                      baseColors={baseColors}
                      onChange={(unassignedContainerColor) => updateEditorState({ unassignedContainerColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Border"
                      value={effectiveEditorState.unassignedContainerBorderColor}
                      baseColors={baseColors}
                      onChange={(unassignedContainerBorderColor) => updateEditorState({ unassignedContainerBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Circle Border"
                      value={effectiveEditorState.unassignedCastCircleBorderColor}
                      baseColors={baseColors}
                      onChange={(unassignedCastCircleBorderColor) => updateEditorState({ unassignedCastCircleBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Canvas"
                      value={effectiveEditorState.canvasBackground}
                      baseColors={baseColors}
                      onChange={(canvasBackground) => updateEditorState({ canvasBackground })}
                    />
                    <TemplateColorSelect
                      label="Frame"
                      value={effectiveEditorState.frameBackground}
                      baseColors={baseColors}
                      onChange={(frameBackground) => updateEditorState({ frameBackground })}
                    />
                    <TemplateColorSelect
                      label="Frame Border"
                      value={effectiveEditorState.frameBorderColor}
                      baseColors={baseColors}
                      onChange={(frameBorderColor) => updateEditorState({ frameBorderColor })}
                    />
                  </div>
                </div>
              </aside>

              <div className="overflow-y-auto p-4 sm:p-5">
                <PreviewViewportToggle value={viewport} onChange={setViewport} />
                <div className="mt-3">
                  {renderPreview()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auth Preview Card — inline renders matching auth/finish styling     */
/* ------------------------------------------------------------------ */

const AUTH_INPUT =
  "w-full h-11 bg-white rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-neutral-900";
const AUTH_LABEL = "text-zinc-900 text-sm font-hamburg font-medium";

function AuthPreviewCard({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <CardHeader entry={entry} badge="Auth / Signup" />
      <div className="flex-1 p-4 max-h-[500px] overflow-y-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <AuthFieldPreview fieldKey={entry.key} />
        </div>
      </div>
    </div>
  );
}

function AuthFieldPreview({ fieldKey }: { fieldKey: string }) {
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [date, setDate] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [countryDropdown, setCountryDropdown] = useState("");
  const [state, setState] = useState("");
  const [selectedShows, setSelectedShows] = useState<string[]>([]);

  switch (fieldKey) {
    case "auth-email":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={AUTH_INPUT}
          />
          <p className="text-xs text-zinc-400">Used for account login and notifications.</p>
        </div>
      );

    case "auth-password":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className={AUTH_INPUT}
          />
          <p className="text-xs text-zinc-400">At least 8 characters recommended.</p>
        </div>
      );

    case "auth-country-dropdown":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Country</label>
          <select
            value={countryDropdown}
            onChange={(e) => setCountryDropdown(e.target.value)}
            className={AUTH_INPUT}
          >
            <option value="">Select country...</option>
            {SAMPLE_COUNTRIES.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">Compact auth variant using native dropdown select.</p>
        </div>
      );

    case "auth-username":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Username</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="e.g. reality_fan123"
            maxLength={20}
            className={AUTH_INPUT}
          />
          <p className="text-xs text-zinc-400">3-20 characters. Lowercase letters, digits, and underscores only.</p>
        </div>
      );

    case "auth-birthday":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Birthday</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
            className={AUTH_INPUT}
          />
          <p className="text-xs text-zinc-400">Must be at least 13 years old.</p>
        </div>
      );

    case "auth-gender":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className={AUTH_INPUT}
          >
            <option value="">Select gender...</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      );

    case "auth-country":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Country</label>
          <input
            type="text"
            list="preview-countries"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Start typing your country..."
            className={AUTH_INPUT}
          />
          <datalist id="preview-countries">
            {SAMPLE_COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="text-xs text-zinc-400">Autocomplete from 196 countries. Showing 10 sample entries.</p>
        </div>
      );

    case "auth-state":
      return (
        <div className="space-y-2">
          <label className={AUTH_LABEL}>State</label>
          <input
            type="text"
            list="preview-states"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Start typing your state..."
            className={AUTH_INPUT}
          />
          <datalist id="preview-states">
            {SAMPLE_STATES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <p className="text-xs text-zinc-400">Only displayed when Country is &quot;United States&quot;. All 50 states.</p>
        </div>
      );

    case "auth-shows":
      return (
        <MultiSelectPills
          title="Which shows do you watch?"
          items={SAMPLE_SHOWS.map((show, index) => ({
            id: show,
            label: show,
            color: SHOW_COLORS[index % SHOW_COLORS.length],
          }))}
          minRequired={3}
          selected={selectedShows}
          onToggle={(id) =>
            setSelectedShows((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
          }
          palette={SHOW_COLORS}
          height={256}
          ariaLabel="Shows multi-select preview"
          footer={
            <p className="pt-1 text-xs font-semibold text-zinc-700 underline underline-offset-2">
              Don&apos;t see a show? Request on here
            </p>
          }
        />
      );

    case "auth-characteristics":
      return (
        <MultiSelectPills
          title="Which of the following characteristics do you think makes for an iconic housewife?"
          items={CHARACTERISTIC_PILLS.map((item, index) => ({
            id: item,
            label: item,
            color: SHOW_COLORS[index % SHOW_COLORS.length],
          }))}
          minRequired={3}
          selected={selectedShows}
          onToggle={(id) =>
            setSelectedShows((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
          }
          palette={SHOW_COLORS}
          height={256}
          ariaLabel="Characteristics multi-select preview"
        />
      );

    default:
      return <p className="text-sm text-red-500">Unknown auth field: {fieldKey}</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Standalone Preview Card — renders components directly               */
/* ------------------------------------------------------------------ */

function StandalonePreviewCard({ entry, baseColors }: { entry: CatalogEntry; baseColors: string[] }) {
  const storageKey = `${TEMPLATE_EDITOR_STORAGE_PREFIX}.standalone.${entry.key}`;
  const [viewport, setViewport] = useState<PreviewViewport>("phone");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const isFigmaRankPreview = false;
  const buildStandaloneDefaults = useCallback(
    () =>
      buildTemplateEditorDefaults(
        entry.key === "flashback-ranker" ? "Rank RHOSLC Flashbacks." : "Rate the season",
        entry.key === "flashback-ranker"
          ? "Drag-and-drop cast members onto the timeline line."
          : "Pick 1 to 5 snowflakes. Halves are allowed.",
        false,
      ),
    [entry.key],
  );
  const [editorState, setEditorState] = useState<TemplatePreviewEditorState>(() => buildStandaloneDefaults());
  const updateEditorState = useCallback(
    (partial: Partial<TemplatePreviewEditorState>) => {
      setEditorState((prev) => ({ ...prev, ...partial }));
    },
    [],
  );
  const resetEditorState = useCallback(() => {
    setEditorState(buildStandaloneDefaults());
  }, [buildStandaloneDefaults]);
  const standaloneFontOverrides = useMemo(
    () => buildStandaloneFontOverrides(editorState),
    [editorState],
  );
  const standaloneStyleOverrides = useMemo(
    () => buildStandaloneStyleOverrides(editorState),
    [editorState],
  );
  const viewportFrame = PREVIEW_VIEWPORT_FRAME[viewport];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      const saved = sanitizeTemplateEditorState(parsed);
      if (!Object.keys(saved).length) return;
      setEditorState({
        ...buildStandaloneDefaults(),
        ...saved,
      });
    } catch {
      // Ignore malformed persisted editor settings.
    }
  }, [buildStandaloneDefaults, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(editorState));
    } catch {
      // Ignore persistence failures.
    }
  }, [editorState, storageKey]);

  const renderPreview = () => (
    <div
      className="rounded-2xl border p-2 sm:p-3"
      style={{
        backgroundColor: editorState.canvasBackground,
        borderColor: editorState.frameBorderColor,
      }}
    >
      <div className="mx-auto flex w-full justify-center">
        <div
          className={`w-full overflow-hidden rounded-[24px] border shadow-sm ${viewportFrame.maxWidthClass}`}
          style={{
            backgroundColor: editorState.frameBackground,
            borderColor: editorState.frameBorderColor,
            aspectRatio: `${viewportFrame.width} / ${viewportFrame.height}`,
          }}
        >
          <div className="h-full overflow-auto p-3 sm:p-6">
            {(editorState.titleText.trim().length > 0 || editorState.subText.trim().length > 0) && (
              <div className="mb-3 sm:mb-4">
                {editorState.titleText.trim().length > 0 && (
                  <p
                    className="leading-[1.05] tracking-[0.01em]"
                    style={{
                      color: editorState.titleColor,
                      fontFamily: editorState.titleFontFamily,
                      fontSize: responsiveFontSize(editorState.titleFontSize, isFigmaRankPreview, 22),
                      fontWeight: isFigmaRankPreview ? 800 : 600,
                    }}
                  >
                    {editorState.titleText}
                  </p>
                )}
                {editorState.subText.trim().length > 0 && (
                  <p
                    className="mt-2 leading-none"
                    style={{
                      color: editorState.subTextColor,
                      fontFamily: editorState.subTextFontFamily,
                      fontSize: responsiveFontSize(editorState.subTextFontSize, isFigmaRankPreview, 14),
                      fontWeight: isFigmaRankPreview ? 400 : 500,
                    }}
                  >
                    {editorState.subText}
                  </p>
                )}
              </div>
            )}
            <StandaloneFieldPreview
              fieldKey={entry.key}
              fontOverrides={standaloneFontOverrides}
              styleOverrides={standaloneStyleOverrides}
              shapeScalePercent={editorState.shapeScale}
              buttonScalePercent={editorState.buttonScale}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <CardHeader entry={entry} badge="Custom Survey">
        <PreviewViewportToggle value={viewport} onChange={setViewport} />
        <button
          type="button"
          onClick={() => setIsEditorOpen(true)}
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-9.5 9.5-3.7.6.6-3.7 9.6-9.4Zm1.1 2.3-1.6-1.6-1.2 1.2 1.6 1.6 1.2-1.2ZM12.9 6 6.2 12.7l-.3 1.8 1.8-.3L14.4 7 12.9 6Z" />
          </svg>
          Edit Template
        </button>
      </CardHeader>
      <div className="flex-1 p-3 sm:p-4">
        {renderPreview()}
      </div>

      {isEditorOpen && (
        <div className="fixed inset-0 z-[90]">
          <div
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${entry.displayName} template editor`}
            className="absolute left-1/2 top-1/2 h-[calc(100vh-3rem)] w-[min(1400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-900">
                  {entry.displayName} Template Editor
                </h3>
                <p className="text-xs text-zinc-500">
                  Preview and tune colors, fonts, text, and sizing.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetEditorState}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 hover:bg-zinc-100"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-zinc-800"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid h-[calc(100%-64px)] grid-cols-1 lg:grid-cols-[340px,minmax(0,1fr)]">
              <aside className="overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Title Text
                    </label>
                    <textarea
                      value={editorState.titleText}
                      onChange={(e) => updateEditorState({ titleText: e.target.value })}
                      className="min-h-20 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Sub-Text
                    </label>
                    <textarea
                      value={editorState.subText}
                      onChange={(e) => updateEditorState({ subText: e.target.value })}
                      className="min-h-16 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800"
                    />
                  </div>

                  <TemplateFontSelect
                    label="Title Font"
                    value={editorState.titleFontFamily}
                    onChange={(titleFontFamily) => updateEditorState({ titleFontFamily })}
                  />

                  <TemplateFontSelect
                    label="Sub-Text Font"
                    value={editorState.subTextFontFamily}
                    onChange={(subTextFontFamily) => updateEditorState({ subTextFontFamily })}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <TemplateFontSizeInput
                      label="Title Size"
                      value={editorState.titleFontSize}
                      onChange={(titleFontSize) => updateEditorState({ titleFontSize })}
                    />
                    <TemplateFontSizeInput
                      label="Sub-Text Size"
                      value={editorState.subTextFontSize}
                      onChange={(subTextFontSize) => updateEditorState({ subTextFontSize })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <TemplateFontSizeInput
                      label="Shape Size (%)"
                      value={editorState.shapeScale}
                      onChange={(shapeScale) => updateEditorState({ shapeScale })}
                    />
                    <TemplateFontSizeInput
                      label="Button Size (%)"
                      value={editorState.buttonScale}
                      onChange={(buttonScale) => updateEditorState({ buttonScale })}
                    />
                    <TemplateFontSizeInput
                      label="Unassigned Circle Size (%)"
                      value={editorState.unassignedCastCircleSize}
                      onChange={(unassignedCastCircleSize) => updateEditorState({ unassignedCastCircleSize })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <TemplateColorSelect
                      label="Title"
                      value={editorState.titleColor}
                      baseColors={baseColors}
                      onChange={(titleColor) => updateEditorState({ titleColor })}
                    />
                    <TemplateColorSelect
                      label="Sub-Text"
                      value={editorState.subTextColor}
                      baseColors={baseColors}
                      onChange={(subTextColor) => updateEditorState({ subTextColor })}
                    />
                    <TemplateColorSelect
                      label="Question Text"
                      value={editorState.questionColor}
                      baseColors={baseColors}
                      onChange={(questionColor) => updateEditorState({ questionColor })}
                    />
                    <TemplateColorSelect
                      label="Component BG"
                      value={editorState.componentBackgroundColor}
                      baseColors={baseColors}
                      onChange={(componentBackgroundColor) => updateEditorState({ componentBackgroundColor })}
                    />
                    <TemplateColorSelect
                      label="Placeholder Fill"
                      value={editorState.placeholderShapeColor}
                      baseColors={baseColors}
                      onChange={(placeholderShapeColor) => updateEditorState({ placeholderShapeColor })}
                    />
                    <TemplateColorSelect
                      label="Placeholder Border"
                      value={editorState.placeholderShapeBorderColor}
                      baseColors={baseColors}
                      onChange={(placeholderShapeBorderColor) => updateEditorState({ placeholderShapeBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Container"
                      value={editorState.unassignedContainerColor}
                      baseColors={baseColors}
                      onChange={(unassignedContainerColor) => updateEditorState({ unassignedContainerColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Border"
                      value={editorState.unassignedContainerBorderColor}
                      baseColors={baseColors}
                      onChange={(unassignedContainerBorderColor) => updateEditorState({ unassignedContainerBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Unassigned Circle Border"
                      value={editorState.unassignedCastCircleBorderColor}
                      baseColors={baseColors}
                      onChange={(unassignedCastCircleBorderColor) => updateEditorState({ unassignedCastCircleBorderColor })}
                    />
                    <TemplateColorSelect
                      label="Canvas"
                      value={editorState.canvasBackground}
                      baseColors={baseColors}
                      onChange={(canvasBackground) => updateEditorState({ canvasBackground })}
                    />
                    <TemplateColorSelect
                      label="Frame"
                      value={editorState.frameBackground}
                      baseColors={baseColors}
                      onChange={(frameBackground) => updateEditorState({ frameBackground })}
                    />
                    <TemplateColorSelect
                      label="Frame Border"
                      value={editorState.frameBorderColor}
                      baseColors={baseColors}
                      onChange={(frameBorderColor) => updateEditorState({ frameBorderColor })}
                    />
                  </div>
                </div>
              </aside>

              <div className="overflow-y-auto p-4 sm:p-5">
                <PreviewViewportToggle value={viewport} onChange={setViewport} />
                <div className="mt-3">
                  {renderPreview()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandaloneFieldPreview({
  fieldKey,
  fontOverrides,
  styleOverrides,
  shapeScalePercent,
  buttonScalePercent,
}: {
  fieldKey: string;
  fontOverrides?: FlashbackRankerFontOverrides;
  styleOverrides?: FlashbackRankerStyleOverrides;
  shapeScalePercent?: number;
  buttonScalePercent?: number;
}) {
  const [rating, setRating] = useState<number | null>(null);

  switch (fieldKey) {
    case "icon-rating":
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <IconRatingInput
            value={rating}
            onChange={setRating}
            min={1}
            max={5}
            step={0.5}
            iconSrc="/icons/snowflake-solid-ice-7.svg"
            iconCount={5}
            sizePx={42}
            fillColor="#0EA5E9"
            emptyColor="#E5E7EB"
            ariaLabel="Season rating"
          />
        </div>
      );

    case "flashback-ranker":
      return (
        <FlashbackRanker
          items={RHOSLC_CAST}
          lineLabelTop="EARLIER"
          lineLabelBottom="LATER"
          variant="classic"
          fontOverrides={fontOverrides}
          styleOverrides={styleOverrides}
          shapeScalePercent={shapeScalePercent}
          buttonScalePercent={buttonScalePercent}
        />
      );

    default:
      return <p className="text-sm text-red-500">Unknown standalone field: {fieldKey}</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Questions Tab                                                      */
/* ------------------------------------------------------------------ */

export default function QuestionsTab({ baseColors }: QuestionsTabProps) {
  const [storedBaseColors, setStoredBaseColors] = useState<string[]>([]);
  const [surveyDefaults, setSurveyDefaults] = useState<SurveyQuestionDefaultsState>(() => ({
    mobile: { ...DEFAULT_SURVEY_STYLE_MOBILE },
    desktop: { ...DEFAULT_SURVEY_STYLE_DESKTOP },
  }));
  const [selectedPreviewSource, setSelectedPreviewSource] = useState(DEFAULT_SURVEY_PREVIEW_SOURCE);

  const previewSourceOptions = useMemo(() => {
    const values = new Set<string>();
    for (const entry of SURVEY_CATALOG) {
      for (const example of entry.examples ?? []) {
        if (/rhop/i.test(example.source)) continue;
        values.add(example.source);
      }
    }
    if (!values.has(DEFAULT_SURVEY_PREVIEW_SOURCE)) {
      values.add(DEFAULT_SURVEY_PREVIEW_SOURCE);
    }
    const ordered = Array.from(values).sort((a, b) => a.localeCompare(b));
    const withoutDefault = ordered.filter((value) => value !== DEFAULT_SURVEY_PREVIEW_SOURCE);
    return [DEFAULT_SURVEY_PREVIEW_SOURCE, ...withoutDefault];
  }, []);

  useEffect(() => {
    if (baseColors?.length) return;
    try {
      const raw = window.localStorage.getItem(DESIGN_SYSTEM_COLORS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const loaded = parsed.filter((entry): entry is string => typeof entry === "string");
      setStoredBaseColors(resolveColorPalette(loaded));
    } catch {
      setStoredBaseColors([]);
    }
  }, [baseColors]);

  const editorBaseColors = useMemo(() => {
    if (baseColors?.length) return resolveColorPalette(baseColors);
    if (storedBaseColors.length) return storedBaseColors;
    return [...DESIGN_SYSTEM_BASE_COLORS];
  }, [baseColors, storedBaseColors]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SURVEY_QUESTION_DEFAULTS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      setSurveyDefaults(sanitizeSurveyQuestionDefaultsState(parsed));
    } catch {
      setSurveyDefaults({
        mobile: { ...DEFAULT_SURVEY_STYLE_MOBILE },
        desktop: { ...DEFAULT_SURVEY_STYLE_DESKTOP },
      });
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SURVEY_QUESTION_DEFAULTS_STORAGE_KEY, JSON.stringify(surveyDefaults));
    } catch {
      // Ignore persistence failures.
    }
  }, [surveyDefaults]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SURVEY_PREVIEW_SOURCE_STORAGE_KEY);
      if (!raw) return;
      if (typeof raw !== "string" || raw.trim().length === 0) return;
      if (/rhop/i.test(raw)) return;
      setSelectedPreviewSource(raw);
    } catch {
      // Ignore persisted preview-source failures.
    }
  }, []);

  useEffect(() => {
    if (!previewSourceOptions.includes(selectedPreviewSource)) {
      setSelectedPreviewSource(previewSourceOptions[0] ?? DEFAULT_SURVEY_PREVIEW_SOURCE);
    }
  }, [previewSourceOptions, selectedPreviewSource]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SURVEY_PREVIEW_SOURCE_STORAGE_KEY, selectedPreviewSource);
    } catch {
      // Ignore persistence failures.
    }
  }, [selectedPreviewSource]);

  const totalCount = SURVEY_CATALOG.length + AUTH_CATALOG.length + STANDALONE_CATALOG.length;

  return (
    <div className="space-y-10">
      {/* Survey Questions Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Survey Questions</h2>
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
            {SURVEY_CATALOG.length}
          </span>
          <span className="text-xs text-zinc-400">
            Interactive previews — click and interact with each component
          </span>
        </div>
        <SurveyDefaultSettingsPanel
          defaults={surveyDefaults}
          onChange={setSurveyDefaults}
          baseColors={editorBaseColors}
          previewSource={selectedPreviewSource}
          previewSourceOptions={previewSourceOptions}
          onPreviewSourceChange={setSelectedPreviewSource}
        />
        <div className="grid grid-cols-1 gap-6">
          {SURVEY_CATALOG.map((entry) => (
            <SurveyPreviewCard
              key={`${entry.key}-${selectedPreviewSource}`}
              entry={entry}
              baseColors={editorBaseColors}
              surveyDefaults={surveyDefaults}
              selectedPreviewSource={selectedPreviewSource}
            />
          ))}
        </div>
      </section>

      {/* Standalone / Custom Survey Components Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Custom Survey Components</h2>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            {STANDALONE_CATALOG.length}
          </span>
          <span className="text-xs text-zinc-400">
            Standalone components used in bespoke survey pages (e.g. RHOSLC S6)
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {STANDALONE_CATALOG.map((entry) => (
            <StandalonePreviewCard key={entry.key} entry={entry} baseColors={editorBaseColors} />
          ))}
        </div>
      </section>

      {/* Auth / Signup Fields Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-zinc-900">Auth / Signup Fields</h2>
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            {AUTH_CATALOG.length}
          </span>
          <span className="text-xs text-zinc-400">
            Form fields from the registration and profile completion flow
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {AUTH_CATALOG.map((entry) => (
            <AuthPreviewCard key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-zinc-300">{totalCount} components cataloged</p>
    </div>
  );
}

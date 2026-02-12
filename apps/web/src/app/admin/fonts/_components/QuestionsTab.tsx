"use client";

import React, { useState, useCallback } from "react";
import QuestionRenderer from "@/components/survey/QuestionRenderer";
import IconRatingInput from "@/components/survey/IconRatingInput";
import FlashbackRanker from "@/components/flashback-ranker";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { SurveyRankingItem } from "@/lib/surveys/types";

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

/* ------------------------------------------------------------------ */
/*  Catalog data – real survey questions with multiple examples         */
/* ------------------------------------------------------------------ */

const SURVEY_CATALOG: CatalogEntry[] = [
  { key: "star-rating", displayName: "Star Rating", description: "10-star rating with partial fill, text input, and slider. 0.1 precision.", componentPath: "components/survey/StarRatingInput.tsx", category: "survey", examples: [
    { label: "Episode Rating", source: "RHOP S10 Survey", mockQuestion: mkQ("star_ep", "Rate this week's episode of RHOP", "numeric", { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 }), mockValue: 7.5 },
    { label: "Season Rating", source: "RHOSLC S6 Survey", mockQuestion: mkQ("star_season", "Rate RHOSLC Season 6 overall", "numeric", { uiVariant: "numeric-ranking", min: 0, max: 10, step: 0.1 }), mockValue: null },
  ]},
  { key: "numeric-slider", displayName: "Numeric Slider", description: "Horizontal range slider with min/max labels for cast or subject ratings.", componentPath: "components/survey/SliderInput.tsx", category: "survey", examples: [
    { label: "Entertainment Factor", source: "Cast Rating Survey", mockQuestion: mkQ("slider_ent", "How entertaining was Lisa Barlow this episode?", "numeric", { uiVariant: "numeric-scale-slider", min: 0, max: 100, step: 1, minLabel: "Boring", maxLabel: "Entertaining" }), mockValue: 65 },
  ]},
  { key: "single-select", displayName: "Single Select (Radio)", description: "Vertical radio button list for single-choice questions.", componentPath: "components/survey/SingleSelectInput.tsx", category: "survey", examples: [
    { label: "Favorite Housewife", source: "RHOSLC Survey", mockQuestion: mkQ("fav_hw", "Who is your favorite RHOSLC housewife this season?", "single_choice", { uiVariant: "text-multiple-choice" }, [{ key: "lisa", text: "Lisa Barlow" }, { key: "heather", text: "Heather Gay" }, { key: "meredith", text: "Meredith Marks" }, { key: "whitney", text: "Whitney Rose" }, { key: "angie", text: "Angie Katsanevas" }]), mockValue: null },
    { label: "Yes / No Question", source: "General Survey", mockQuestion: mkQ("yes_no", "Do you watch the show live or on streaming?", "single_choice", { uiVariant: "text-multiple-choice" }, [{ key: "live", text: "Live on Bravo" }, { key: "streaming", text: "Streaming (Peacock)" }, { key: "both", text: "Both" }]), mockValue: null },
  ]},
  { key: "image-select", displayName: "Image Select (Grid)", description: "Grid of circular image buttons for cast/image-based selection.", componentPath: "components/survey/SingleSelectInput.tsx (grid)", category: "survey", examples: [
    { label: "Cast Member Select", source: "RHOP S10 Survey", mockQuestion: mkQ("cast_img", "Which cast member had the best confessional look?", "single_choice", { uiVariant: "image-multiple-choice" }, [{ key: "gizelle", text: "Gizelle Bryant" }, { key: "karen", text: "Karen Huger" }, { key: "ashley", text: "Ashley Darby" }, { key: "robyn", text: "Robyn Dixon" }]), mockValue: null },
  ]},
  { key: "multi-select", displayName: "Multi-Select (Checkbox)", description: "Checkbox group with optional min/max selection constraints.", componentPath: "components/survey/MultiSelectInput.tsx", category: "survey", examples: [
    { label: "Select Shows", source: "Signup / Onboarding", mockQuestion: mkQ("select_shows", "Which Real Housewives shows do you watch?", "multi_choice", { uiVariant: "multi-select-choice", minSelections: 1, maxSelections: 5 }, [{ key: "rhoslc", text: "RHOSLC" }, { key: "rhobh", text: "RHOBH" }, { key: "rhoa", text: "RHOA" }, { key: "rhop", text: "RHOP" }, { key: "rhonj", text: "RHONJ" }, { key: "rhony", text: "RHONY" }, { key: "rhod", text: "RHOD" }]), mockValue: ["rhoslc", "rhop"] },
    { label: "Favorite Moments", source: "Episode Survey", mockQuestion: mkQ("fav_moments", "Select all the scenes that stood out to you", "multi_choice", { uiVariant: "multi-select-choice", minSelections: 1 }, [{ key: "dinner", text: "The group dinner confrontation" }, { key: "confessional", text: "Lisa's confessional breakdown" }, { key: "trip", text: "The cast trip reveal" }, { key: "reunion", text: "The reunion preview" }]), mockValue: [] },
  ]},
  { key: "dropdown", displayName: "Dropdown Select", description: "Native HTML select dropdown for compact option lists.", componentPath: "components/survey/DropdownInput.tsx", category: "survey", examples: [
    { label: "Country Select", source: "Signup (Auth Finish)", mockQuestion: mkQ("country_survey", "What country are you in?", "single_choice", { uiVariant: "dropdown", placeholder: "Select your country..." }, [{ key: "us", text: "United States" }, { key: "ca", text: "Canada" }, { key: "uk", text: "United Kingdom" }, { key: "au", text: "Australia" }, { key: "other", text: "Other" }]), mockValue: null },
  ]},
  { key: "text-entry", displayName: "Text Entry", description: "Single-line text input with optional validation (pattern, length).", componentPath: "components/survey/TextEntryInput.tsx", category: "survey", examples: [
    { label: "Free Text Response", source: "General Survey", mockQuestion: mkQ("thoughts", "What would you like to see next season?", "free_text", { uiVariant: "text-entry", placeholder: "Share your thoughts...", inputType: "text" }), mockValue: "" },
  ]},
  { key: "email-input", displayName: "Email", description: "Email text input with format validation.", componentPath: "components/survey/TextEntryInput.tsx (email)", category: "survey", examples: [
    { label: "Email Address", source: "Signup / Login", mockQuestion: mkQ("email", "Email address", "free_text", { uiVariant: "text-entry", placeholder: "you@example.com", inputType: "email" }), mockValue: "" },
  ]},
  { key: "password-input", displayName: "Password", description: "Password text input with masked characters.", componentPath: "components/survey/TextEntryInput.tsx (password)", category: "survey", examples: [
    { label: "Password", source: "Signup / Login", mockQuestion: mkQ("password", "Password", "free_text", { uiVariant: "text-entry", placeholder: "Enter your password", inputType: "password" }), mockValue: "" },
  ]},
  { key: "whose-side", displayName: "Whose Side (Head-to-Head)", description: "Two-choice comparison with VS divider and optional neutral option.", componentPath: "components/survey/WhoseSideInput.tsx", category: "survey", examples: [
    { label: "Feud: Lisa vs Meredith", source: "RHOSLC S6 Survey", mockQuestion: mkQ("feud_lm", "Whose side are you on in the Lisa vs. Meredith feud?", "single_choice", { uiVariant: "two-choice-slider", neutralOption: "Neutral" }, [{ key: "lisa", text: "Lisa Barlow" }, { key: "meredith", text: "Meredith Marks" }]), mockValue: null },
    { label: "Feud: Karen vs Gizelle", source: "RHOP S10 Survey", mockQuestion: mkQ("feud_kg", "Whose side are you on in the Karen vs. Gizelle rivalry?", "single_choice", { uiVariant: "two-choice-slider", neutralOption: "Neither" }, [{ key: "karen", text: "Karen Huger" }, { key: "gizelle", text: "Gizelle Bryant" }]), mockValue: null },
  ]},
  { key: "matrix-likert", displayName: "Matrix / Likert Scale", description: "Table-grid with rows (cast members or statements) and columns (verdict options).", componentPath: "components/survey/MatrixLikertInput.tsx", category: "survey", examples: [
    { label: "Cast Verdict (Fire/Demote/Keep)", source: "RHOP S10 Survey", mockQuestion: mkQ("verdict", "What should happen to each cast member next season?", "likert", { uiVariant: "three-choice-slider", choices: [{ value: "fire", label: "Fire" }, { value: "demote", label: "Demote" }, { value: "keep", label: "Keep" }], rows: [{ id: "gizelle", label: "Gizelle Bryant" }, { id: "karen", label: "Karen Huger" }, { id: "ashley", label: "Ashley Darby" }, { id: "robyn", label: "Robyn Dixon" }] }, [{ key: "fire", text: "Fire" }, { key: "demote", text: "Demote" }, { key: "keep", text: "Keep" }]), mockValue: {} },
    { label: "Agree / Disagree", source: "General Survey", mockQuestion: mkQ("agree", "How do you feel about each statement?", "likert", { uiVariant: "agree-likert-scale", rows: [{ id: "s1", label: "The season had too much drama" }, { id: "s2", label: "The cast needs fresh faces" }, { id: "s3", label: "The reunion was satisfying" }] }, [{ key: "strongly_disagree", text: "Strongly Disagree" }, { key: "disagree", text: "Disagree" }, { key: "neutral", text: "Neutral" }, { key: "agree", text: "Agree" }, { key: "strongly_agree", text: "Strongly Agree" }]), mockValue: {} },
  ]},
  { key: "rank-order", displayName: "Rank Order (Drag & Drop)", description: "Drag-and-drop ranking grid with numbered slots and responsive mobile tray.", componentPath: "components/survey/RankOrderInput.tsx + flashback-ranker.tsx", category: "survey", examples: [
    { label: "RHOP Cast Ranking", source: "RHOP S10 Survey", mockQuestion: mkQ("rank_rhop", "Rank the cast of RHOP Season 10", "ranking", { uiVariant: "rectangle-ranking", lineLabelTop: "ICONIC", lineLabelBottom: "SNOOZE" }, [{ key: "gizelle", text: "Gizelle Bryant" }, { key: "karen", text: "Karen Huger" }, { key: "ashley", text: "Ashley Darby" }, { key: "robyn", text: "Robyn Dixon" }]), mockValue: [] },
    { label: "RHOSLC Cast Ranking", source: "RHOSLC S6 Survey", mockQuestion: mkQ("rank_rhoslc", "Rank the RHOSLC Icons", "ranking", { uiVariant: "circle-ranking", lineLabelTop: "ICONIC", lineLabelBottom: "SNOOZE" }, [{ key: "lisa", text: "Lisa Barlow" }, { key: "heather", text: "Heather Gay" }, { key: "meredith", text: "Meredith Marks" }, { key: "whitney", text: "Whitney Rose" }]), mockValue: [] },
  ]},
  { key: "two-axis-grid", displayName: "Two-Axis Grid (2D Map)", description: "Draggable tokens on a 2D grid with labeled axes. Snap-to-grid.", componentPath: "components/survey/TwoAxisGridInput.tsx", category: "survey", examples: [
    { label: "Cast Perception Map", source: "RHOSLC S6 Survey", mockQuestion: mkQ("perception", "Place each housewife on the grid", "likert", { uiVariant: "two-axis-grid", extent: 3, xLabelLeft: "VILLAIN", xLabelRight: "HERO", yLabelTop: "ENTERTAINING", yLabelBottom: "BORING", rows: [{ id: "lisa", label: "Lisa B." }, { id: "heather", label: "Heather G." }, { id: "meredith", label: "Meredith M." }] }), mockValue: {} },
  ]},
];

/* ------------------------------------------------------------------ */
/*  Auth / Signup catalog entries                                       */
/* ------------------------------------------------------------------ */

const AUTH_CATALOG: CatalogEntry[] = [
  { key: "auth-username", displayName: "Username", description: "Text input, 3-20 chars, lowercase + digits + underscores. Checked for uniqueness on blur.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-birthday", displayName: "Birthday (Date)", description: "Native date picker (type=\"date\"). Must be 13+. Required for OAuth users.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-gender", displayName: "Gender (Select)", description: "Dropdown select with 5 options: Male, Female, Non-binary, Prefer not to say, Other.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-country", displayName: "Country (Datalist)", description: "Text input with datalist autocomplete. 196 countries.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-state", displayName: "State (Datalist)", description: "Text input with datalist autocomplete. 50 US states. Only shows if country = United States.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
  { key: "auth-shows", displayName: "Pill Multi Select (Shows)", description: "Scrollable pill-based multi-select with 30+ shows. Each pill has a unique color. Min 3 required.", componentPath: "app/auth/finish/page.tsx", category: "auth" },
];

/* ------------------------------------------------------------------ */
/*  Standalone / custom survey components                               */
/* ------------------------------------------------------------------ */

const RHOSLC_CAST: SurveyRankingItem[] = [
  { id: "lisa", label: "Lisa Barlow", img: "" },
  { id: "whitney", label: "Whitney Rose", img: "" },
  { id: "meredith", label: "Meredith Marks", img: "" },
  { id: "heather", label: "Heather Gay", img: "" },
  { id: "angie", label: "Angie Katsanevas", img: "" },
];

const STANDALONE_CATALOG: CatalogEntry[] = [
  { key: "icon-rating", displayName: "Icon Rating (Snowflake)", description: "Partial-fill icon rating using any masked SVG. Click or drag across icons. Supports half-values and text input. Used with snowflakes for RHOSLC.", componentPath: "components/survey/IconRatingInput.tsx", category: "standalone" },
  { key: "flashback-ranker", displayName: "Flashback Ranker (Drag & Drop)", description: "Drag cast members from the bench onto a ranked line. Supports classic (vertical list) and grid (circle tokens) variants.", componentPath: "components/flashback-ranker.tsx", category: "standalone" },
];

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

/* ------------------------------------------------------------------ */
/*  Survey Preview Card — matches NormalizedSurveyPlay styling          */
/* ------------------------------------------------------------------ */

function SurveyPreviewCard({ entry }: { entry: CatalogEntry }) {
  const examples = entry.examples!;
  const [exampleIdx, setExampleIdx] = useState(0);
  const example = examples[exampleIdx];
  const [values, setValues] = useState<Record<number, unknown>>(() => {
    const init: Record<number, unknown> = {};
    examples.forEach((ex, i) => {
      init[i] = ex.mockValue ?? null;
    });
    return init;
  });

  const handleChange = useCallback((v: unknown) => {
    setValues((prev) => ({ ...prev, [exampleIdx]: v }));
  }, [exampleIdx]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <CardHeader entry={entry} badge={example.source}>
        {examples.length > 1 && (
          <div className="mt-2">
            <select
              value={exampleIdx}
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
      </CardHeader>

      <div className="flex-1 p-4 max-h-[500px] overflow-y-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-lg font-semibold text-gray-900" style={{ fontFamily: "var(--font-sans)" }}>
              {example.mockQuestion.question_text}
            </p>
          </div>
          <QuestionRenderer
            question={example.mockQuestion}
            value={values[exampleIdx]}
            onChange={handleChange}
          />
        </div>
      </div>
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
  const [date, setDate] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [selectedShows, setSelectedShows] = useState<string[]>([]);

  switch (fieldKey) {
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
        <div className="space-y-2">
          <label className={AUTH_LABEL}>Which shows do you watch?</label>
          <p className="text-xs text-zinc-400 mb-1">
            Select at least 3 shows. ({selectedShows.length} selected)
          </p>
          <div className="w-full h-64 overflow-y-auto border border-zinc-200 rounded-lg p-3">
            <div className="flex flex-wrap gap-2">
              {SAMPLE_SHOWS.map((show, i) => {
                const isSelected = selectedShows.includes(show);
                const color = SHOW_COLORS[i % SHOW_COLORS.length];
                return (
                  <button
                    key={show}
                    type="button"
                    onClick={() =>
                      setSelectedShows((prev) =>
                        isSelected ? prev.filter((s) => s !== show) : [...prev, show],
                      )
                    }
                    className="px-3 py-1 h-8 rounded-full text-sm font-normal font-hamburg transition-all"
                    style={{
                      backgroundColor: isSelected ? color : "#000",
                      color: "#fff",
                      border: isSelected ? `1.5px solid ${color}` : "1.5px solid #fff",
                    }}
                  >
                    {show}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-red-500">Unknown auth field: {fieldKey}</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Standalone Preview Card — renders components directly               */
/* ------------------------------------------------------------------ */

function StandalonePreviewCard({ entry }: { entry: CatalogEntry }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <CardHeader entry={entry} badge="Custom Survey" />
      <div className="flex-1 p-4 max-h-[500px] overflow-y-auto">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <StandaloneFieldPreview fieldKey={entry.key} />
        </div>
      </div>
    </div>
  );
}

function StandaloneFieldPreview({ fieldKey }: { fieldKey: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [ranking, setRanking] = useState<SurveyRankingItem[]>([]);

  switch (fieldKey) {
    case "icon-rating":
      return (
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="font-rude-slab font-bold text-2xl uppercase tracking-wide text-rose-900">
            Rate the season
          </h2>
          <p className="text-sm text-rose-700">Pick 1 to 5 snowflakes. Halves are allowed.</p>
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
        <div>
          <h2 className="font-bold text-lg text-zinc-900 mb-2 text-center">
            Rank the RHOSLC Cast
          </h2>
          <p className="text-sm text-zinc-500 mb-4 text-center">
            Drag cast members from the bench onto the ranked line.
          </p>
          <FlashbackRanker
            items={RHOSLC_CAST}
            lineLabelTop="ICONIC"
            lineLabelBottom="SNOOZE"
            onChange={setRanking}
          />
        </div>
      );

    default:
      return <p className="text-sm text-red-500">Unknown standalone field: {fieldKey}</p>;
  }
}

/* ------------------------------------------------------------------ */
/*  Questions Tab                                                      */
/* ------------------------------------------------------------------ */

export default function QuestionsTab() {
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {SURVEY_CATALOG.map((entry) => (
            <SurveyPreviewCard key={entry.key} entry={entry} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {STANDALONE_CATALOG.map((entry) => (
            <StandalonePreviewCard key={entry.key} entry={entry} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {AUTH_CATALOG.map((entry) => (
            <AuthPreviewCard key={entry.key} entry={entry} />
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-zinc-300">{totalCount} components cataloged</p>
    </div>
  );
}

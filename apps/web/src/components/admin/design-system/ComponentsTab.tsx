"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import CastCircleToken from "@/components/survey/CastCircleToken";
import IconRatingInput from "@/components/survey/IconRatingInput";
import type { DesignSystemSubtabId } from "@/lib/admin/design-system-routing";
import { RHOSLC_S6_CAST_MEMBERS, RHOSLC_S6_SNOWFLAKE_ICON_CDN_URL } from "@/lib/surveys/rhoslc-assets";

type ComponentScope = "shared" | "admin-only" | "survey-only";
type ComponentSectionId = "ui" | "admin" | "survey" | "layout" | "overlays";
type ComponentPreviewViewport = "phone" | "tablet" | "desktop";
type PreviewKind =
  | "button"
  | "editable"
  | "admin-header"
  | "side-menu"
  | "breadcrumbs"
  | "modal"
  | "lightbox"
  | "drawer"
  | "multi-select"
  | "question-builder"
  | "survey-editor"
  | "show-tabs"
  | "season-tabs"
  | "question-renderer"
  | "survey-play"
  | "icon-rating"
  | "pill-select"
  | "ranker";

type ComponentCatalogEntry = {
  name: string;
  sourcePath: string;
  usage: string;
  scope: ComponentScope;
  section: ComponentSectionId;
  preview: PreviewKind;
  exampleLabel: string;
};

type PlaceholderEntry = {
  name: string;
  note: string;
  section: ComponentSectionId;
};

type AvatarInventoryEntry = {
  name: string;
  sourcePath: string;
  usage: string;
  states: string[];
  preview: "survey-cast" | "social-handle" | "profile-hero" | "person-crops" | "show-media";
};

const COMPONENT_CATALOG: readonly ComponentCatalogEntry[] = [
  {
    name: "Button",
    sourcePath: "components/ui/button.tsx",
    usage: "Shared button primitive for admin actions and inline editor affordances.",
    scope: "shared",
    section: "ui",
    preview: "button",
    exampleLabel: "Primary and secondary CTA states",
  },
  {
    name: "Editable Suite",
    sourcePath: "components/ui/editable.tsx",
    usage: "Shared inline-edit pattern with preview, input, toolbar, submit, and cancel controls.",
    scope: "shared",
    section: "ui",
    preview: "editable",
    exampleLabel: "Inline text editing with action rail",
  },
  {
    name: "AdminGlobalHeader",
    sourcePath: "components/admin/AdminGlobalHeader.tsx",
    usage: "Top-level admin shell header used across admin routes.",
    scope: "admin-only",
    section: "layout",
    preview: "admin-header",
    exampleLabel: "Header title, metadata, and actions",
  },
  {
    name: "AdminSideMenu",
    sourcePath: "components/admin/AdminSideMenu.tsx",
    usage: "Primary admin navigation drawer with active state handling.",
    scope: "admin-only",
    section: "layout",
    preview: "side-menu",
    exampleLabel: "Section list with active state",
  },
  {
    name: "AdminBreadcrumbs",
    sourcePath: "components/admin/AdminBreadcrumbs.tsx",
    usage: "Shared breadcrumb trail for admin pages and show/season detail surfaces.",
    scope: "admin-only",
    section: "layout",
    preview: "breadcrumbs",
    exampleLabel: "Admin breadcrumb path",
  },
  {
    name: "AdminModal",
    sourcePath: "components/admin/AdminModal.tsx",
    usage: "Reusable modal shell for confirm/edit workflows in admin tooling.",
    scope: "admin-only",
    section: "overlays",
    preview: "modal",
    exampleLabel: "Centered modal with confirm actions",
  },
  {
    name: "ImageLightbox",
    sourcePath: "components/admin/ImageLightbox.tsx",
    usage: "High-density media inspection overlay with navigation, metadata, and controls.",
    scope: "admin-only",
    section: "overlays",
    preview: "lightbox",
    exampleLabel: "Media viewer with metadata rail",
  },
  {
    name: "ImageScrapeDrawer",
    sourcePath: "components/admin/ImageScrapeDrawer.tsx",
    usage: "Drawer-based admin workflow for scraping, labeling, and importing image assets.",
    scope: "admin-only",
    section: "overlays",
    preview: "drawer",
    exampleLabel: "Right-side drawer workflow",
  },
  {
    name: "PeopleSearchMultiSelect",
    sourcePath: "components/admin/PeopleSearchMultiSelect.tsx",
    usage: "Searchable multi-select field used in admin forms and edit flows.",
    scope: "admin-only",
    section: "admin",
    preview: "multi-select",
    exampleLabel: "Search field plus selected pills",
  },
  {
    name: "QuestionBuilder",
    sourcePath: "components/admin/QuestionBuilder.tsx",
    usage: "Admin question builder block for composing survey question definitions.",
    scope: "admin-only",
    section: "admin",
    preview: "question-builder",
    exampleLabel: "Prompt, type, and option rows",
  },
  {
    name: "SurveyQuestionsEditor",
    sourcePath: "components/admin/SurveyQuestionsEditor.tsx",
    usage: "Full CRUD editor for normalized survey questions, options, and previews.",
    scope: "admin-only",
    section: "admin",
    preview: "survey-editor",
    exampleLabel: "Editor rails for list + preview",
  },
  {
    name: "ShowTabsNav",
    sourcePath: "components/admin/show-tabs/ShowTabsNav.tsx",
    usage: "Reusable tab navigation for show detail surfaces.",
    scope: "admin-only",
    section: "layout",
    preview: "show-tabs",
    exampleLabel: "Show tabs with active indicator",
  },
  {
    name: "SeasonTabsNav",
    sourcePath: "components/admin/season-tabs/SeasonTabsNav.tsx",
    usage: "Reusable tab navigation for season detail surfaces.",
    scope: "admin-only",
    section: "layout",
    preview: "season-tabs",
    exampleLabel: "Season tabs with pill navigation",
  },
  {
    name: "QuestionRenderer",
    sourcePath: "components/survey/QuestionRenderer.tsx",
    usage: "Renderer wrapper that selects the correct survey input implementation by config.",
    scope: "survey-only",
    section: "survey",
    preview: "question-renderer",
    exampleLabel: "Prompt with response component slot",
  },
  {
    name: "NormalizedSurveyPlay",
    sourcePath: "components/survey/NormalizedSurveyPlay.tsx",
    usage: "Survey player shell for normalized survey sessions.",
    scope: "survey-only",
    section: "survey",
    preview: "survey-play",
    exampleLabel: "Question progress + footer CTA",
  },
  {
    name: "IconRatingInput",
    sourcePath: "components/survey/IconRatingInput.tsx",
    usage: "Partial-fill icon rating input used in bespoke survey flows.",
    scope: "survey-only",
    section: "survey",
    preview: "icon-rating",
    exampleLabel: "Five-step icon rating row",
  },
  {
    name: "MultiSelectPills",
    sourcePath: "components/survey/MultiSelectPills.tsx",
    usage: "Pill-based selection control used in auth and survey flows.",
    scope: "shared",
    section: "survey",
    preview: "pill-select",
    exampleLabel: "Selectable answer chips",
  },
  {
    name: "FlashbackRanker",
    sourcePath: "components/flashback-ranker.tsx",
    usage: "Standalone drag-and-drop ranking experience used in special survey pages.",
    scope: "survey-only",
    section: "survey",
    preview: "ranker",
    exampleLabel: "Ranked card stack",
  },
] as const;

const PLACEHOLDER_GROUPS: readonly PlaceholderEntry[] = [
  {
    name: "Cards",
    note: "Project uses many bespoke card treatments, but no shared card primitive is cataloged yet.",
    section: "ui",
  },
  {
    name: "Badges",
    note: "Status and count badges exist inline across the app, but there is no unified badge component.",
    section: "ui",
  },
  {
    name: "Tables / Data Rows",
    note: "Admin tables are implemented ad hoc per page rather than through a shared table system.",
    section: "admin",
  },
  {
    name: "Pagination",
    note: "No reusable pagination primitive is documented in the current project surface.",
    section: "admin",
  },
  {
    name: "Shared Tabs Primitive",
    note: "Show and season tab navs exist, but a general tabs primitive is still missing from the shared UI layer.",
    section: "layout",
  },
  {
    name: "Dropdown Menus",
    note: "Dropdown-style controls are embedded inline, not exposed as a documented shared component.",
    section: "overlays",
  },
  {
    name: "Toast / Notification Surfaces",
    note: "ToastHost exists, but notification patterns are not yet cataloged as a reusable design-system surface.",
    section: "overlays",
  },
  {
    name: "Empty States",
    note: "Empty-state messaging is page-specific; there is no shared empty-state component pattern yet.",
    section: "layout",
  },
] as const;

const SAMPLE_CAST = {
  primary: RHOSLC_S6_CAST_MEMBERS[4],
  secondary: RHOSLC_S6_CAST_MEMBERS[3],
  tertiary: RHOSLC_S6_CAST_MEMBERS[6],
  fallback: RHOSLC_S6_CAST_MEMBERS[7],
} as const;

const AVATAR_INVENTORY: readonly AvatarInventoryEntry[] = [
  {
    name: "Survey Cast Circles",
    sourcePath: "components/survey/CastCircleToken.tsx + SingleSelectCastInput.tsx + CastMultiSelectInput.tsx + ReunionSeatingPredictionInput.tsx",
    usage: "Primary circular cast frame used across survey pickers, ranking banks, reunion seating, and survey result rows.",
    states: ["bench", "grid", "selected", "desaturated", "initials fallback"],
    preview: "survey-cast",
  },
  {
    name: "Social Handle Avatars",
    sourcePath: "components/admin/social-week/WeekDetailPageView.tsx",
    usage: "Small circular account avatars used in post headers, mention chips, comment rows, and stacked social account groups.",
    states: ["hosted image", "initials fallback", "stacked overlap", "mention chip"],
    preview: "social-handle",
  },
  {
    name: "Profile Hero Avatar",
    sourcePath: "app/profile/page.tsx",
    usage: "Large framed profile identity treatment with photo or initials, inner dashed ring, and account badge context.",
    states: ["photo", "initials fallback", "membership badge context"],
    preview: "profile-hero",
  },
  {
    name: "Admin Person Crop Chips",
    sourcePath: "app/admin/trr-shows/people/[personId]/PersonPageClient.tsx",
    usage: "Face-crop preview chips for cast/person image QA, including labeled overlays and missing-crop fallback.",
    states: ["cropped face", "overlay label", "missing image fallback"],
    preview: "person-crops",
  },
  {
    name: "Show / Media Tiles",
    sourcePath: "app/admin/trr-shows/page.tsx + components/admin/show-tabs/ShowFeaturedMediaSelectors.tsx",
    usage: "Poster-style show thumbnails and media selector frames used in show admin lists and featured media selectors.",
    states: ["poster present", "poster missing placeholder", "selected media frame"],
    preview: "show-media",
  },
] as const;

const SOCIAL_AVATAR_MODES = [
  { id: "image", label: "Hosted" },
  { id: "fallback", label: "Fallback" },
  { id: "stacked", label: "Stacked" },
  { id: "mention", label: "Mention" },
] as const;

const SECTION_LABELS: Record<ComponentSectionId, string> = {
  ui: "UI Primitives",
  admin: "Admin Forms & Editors",
  survey: "Survey Building Blocks",
  layout: "Shells & Navigation",
  overlays: "Overlays & Drawers",
};

const SCOPE_STYLES: Record<ComponentScope, string> = {
  shared: "bg-emerald-100 text-emerald-800",
  "admin-only": "bg-sky-100 text-sky-800",
  "survey-only": "bg-rose-100 text-rose-800",
};

const SECTION_ORDER: readonly ComponentSectionId[] = ["ui", "admin", "survey", "layout", "overlays"];
const COMPONENT_PREVIEW_VIEWPORTS: readonly ComponentPreviewViewport[] = ["phone", "tablet", "desktop"];
const COMPONENT_PREVIEW_FRAME: Record<ComponentPreviewViewport, { label: string; maxWidthClass: string }> = {
  phone: { label: "Phone", maxWidthClass: "max-w-[390px]" },
  tablet: { label: "Tablet", maxWidthClass: "max-w-[768px]" },
  desktop: { label: "Desktop", maxWidthClass: "max-w-full" },
};

function PreviewChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

function EditablePreviewCard() {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("peacock-logo");
  const [draft, setDraft] = useState(value);

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Editable</div>
      {editing ? (
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800"
        />
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">{value}</div>
      )}
      <div className="flex gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                setValue(draft);
                setEditing(false);
              }}
              className="rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(value);
                setEditing(false);
              }}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

function SideMenuPreview() {
  const [activeItem, setActiveItem] = useState("Shows");
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      {["Shows", "People", "Social Media"].map((label) => (
        <button
          type="button"
          key={label}
          onClick={() => setActiveItem(label)}
          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
            activeItem === label ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function BreadcrumbsPreview() {
  const parts = ["Admin", "Shows", "RHOSLC", "Design System"];
  const [activeIndex, setActiveIndex] = useState(parts.length - 1);
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
      {parts.map((part, index) => (
        <div key={part} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveIndex(index)}
            className={activeIndex === index ? "font-semibold text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}
          >
            {part}
          </button>
          {index < parts.length - 1 ? <span className="text-zinc-400">/</span> : null}
        </div>
      ))}
    </div>
  );
}

function ModalPreview() {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="rounded-xl bg-zinc-900/80 p-4">
      <div className="mx-auto max-w-xs rounded-xl bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">Save changes?</div>
        <div className="mt-1 text-xs text-zinc-500">This updates the current admin configuration.</div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
    >
      Open modal
    </button>
  );
}

function LightboxPreview() {
  const slides = ["Poster A", "Poster B", "Poster C"];
  const [index, setIndex] = useState(0);
  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-3 rounded-xl bg-zinc-950 p-3 text-white">
      <button
        type="button"
        onClick={() => setIndex((current) => (current + 1) % slides.length)}
        className="flex min-h-24 items-end rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 p-3 text-sm font-semibold"
      >
        {slides[index]}
      </button>
      <div className="space-y-2 rounded-lg bg-white/10 p-3">
        <div className="text-xs uppercase tracking-[0.14em] text-zinc-300">Metadata</div>
        <div className="text-xs text-zinc-200">Selected: {slides[index]}</div>
        <button
          type="button"
          onClick={() => setIndex((current) => (current + 1) % slides.length)}
          className="rounded-md bg-white/15 px-2 py-1 text-xs hover:bg-white/25"
        >
          Next image
        </button>
      </div>
    </div>
  );
}

function DrawerPreview() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-zinc-100 p-3">
      <div className="mb-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700"
        >
          {open ? "Close drawer" : "Open drawer"}
        </button>
      </div>
      {open ? (
        <div className="ml-auto max-w-sm rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Image Scrape</div>
          <input className="mt-2 w-full rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs" defaultValue="bravo season 6 premiere" />
          <button type="button" className="mt-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">Run import</button>
        </div>
      ) : null}
    </div>
  );
}

function MultiSelectPreview() {
  const options = ["Lisa Barlow", "Whitney Rose", "Heather Gay"];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(["Lisa Barlow"]);
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search people…"
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {options.map((label) => {
          const active = selected.includes(label);
          return (
            <button
              type="button"
              key={label}
              onClick={() =>
                setSelected((current) =>
                  active ? current.filter((item) => item !== label) : [...current, label],
                )
              }
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                active ? "bg-cyan-100 text-cyan-800" : "border border-zinc-200 bg-white text-zinc-600"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QuestionBuilderPreview() {
  const [required, setRequired] = useState(true);
  const [type, setType] = useState("Single choice");
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <input defaultValue="Question prompt" className="w-full rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700" />
      <div className="flex gap-2">
        {["Single choice", "Ranking"].map((label) => (
          <PreviewChip key={label} active={type === label} onClick={() => setType(label)}>
            {label}
          </PreviewChip>
        ))}
        <button
          type="button"
          onClick={() => setRequired((value) => !value)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${required ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"}`}
        >
          {required ? "Required" : "Optional"}
        </button>
      </div>
    </div>
  );
}

function SurveyEditorPreview() {
  const [panel, setPanel] = useState<"list" | "preview">("preview");
  return (
    <div className="grid grid-cols-[0.9fr_1.1fr] gap-3 rounded-xl border border-zinc-200 bg-white p-3">
      <div className="space-y-2">
        <button type="button" onClick={() => setPanel("list")} className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-left text-xs text-zinc-700">Question list</button>
        <button type="button" onClick={() => setPanel("preview")} className="w-full rounded-lg bg-zinc-100 px-3 py-2 text-left text-xs text-zinc-700">Live preview</button>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500">
        {panel === "list" ? "Editing question order" : "Previewing current question"}
      </div>
    </div>
  );
}

function TabsPreview({ labels }: { labels: string[] }) {
  const [active, setActive] = useState(labels[0] ?? "");
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <PreviewChip key={label} active={active === label} onClick={() => setActive(label)}>
          {label}
        </PreviewChip>
      ))}
    </div>
  );
}

function QuestionRendererPreview() {
  const [selected, setSelected] = useState("Lisa");
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">Who had the strongest reunion?</div>
      <div className="space-y-2">
        {["Lisa", "Whitney", "Heather"].map((label) => (
          <label key={label} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            <input
              type="radio"
              name="question-renderer-preview"
              checked={selected === label}
              onChange={() => setSelected(label)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function SurveyPlayPreview() {
  const [step, setStep] = useState(3);
  const percent = Math.round((step / 10) * 100);
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Question {step} of 10</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100">
        <div className="h-2 rounded-full bg-zinc-900 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <div className="rounded-lg bg-zinc-50 px-3 py-4 text-sm text-zinc-700">Survey content area</div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setStep((current) => (current >= 10 ? 1 : current + 1))}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function IconRatingPreview() {
  const [rating, setRating] = useState<number | null>(4);
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <IconRatingInput
        value={rating}
        onChange={setRating}
        min={0}
        max={5}
        step={0.5}
        iconSrc={RHOSLC_S6_SNOWFLAKE_ICON_CDN_URL}
        iconCount={5}
        sizePx={30}
        fillColor="#0EA5E9"
        emptyColor="#E5E7EB"
        ariaLabel="Component preview rating"
      />
    </div>
  );
}

function PillSelectPreview() {
  const [selected, setSelected] = useState<string[]>(["Bravo"]);
  return (
    <div className="flex flex-wrap gap-2">
      {["Bravo", "Peacock", "Netflix"].map((label) => {
        const active = selected.includes(label);
        return (
          <PreviewChip
            key={label}
            active={active}
            onClick={() =>
              setSelected((current) =>
                active ? current.filter((item) => item !== label) : [...current, label],
              )
            }
          >
            {label}
          </PreviewChip>
        );
      })}
    </div>
  );
}

function RankerPreview() {
  const [items, setItems] = useState(["Lisa", "Whitney", "Heather"]);
  return (
    <div className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      {items.map((item, index) => (
        <button
          type="button"
          key={item}
          onClick={() => setItems([item, ...items.filter((entry) => entry !== item)])}
          className="flex w-full items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-left"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">{index + 1}</div>
          <div className="text-sm text-zinc-700">{item}</div>
        </button>
      ))}
    </div>
  );
}

function SocialHandleAvatarPreview() {
  const [mode, setMode] = useState<"image" | "fallback" | "stacked" | "mention">("image");

  if (mode === "stacked") {
    return (
      <div className="space-y-3">
        <div className="flex -space-x-2">
          {[SAMPLE_CAST.primary, SAMPLE_CAST.secondary, SAMPLE_CAST.tertiary].map((member) => (
            <div key={member.id} className="relative h-8 w-8 overflow-hidden rounded-full border border-white bg-zinc-200 shadow-sm">
              <Image src={member.imagePath} alt={member.fullName} fill sizes="32px" className="object-cover" />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {SOCIAL_AVATAR_MODES.map((option) => (
            <PreviewChip key={option.id} active={mode === option.id} onClick={() => setMode(option.id)}>
              {option.label}
            </PreviewChip>
          ))}
        </div>
      </div>
    );
  }

  if (mode === "mention") {
    return (
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-1 text-xs text-purple-700">
          <div className="relative h-4 w-4 overflow-hidden rounded-full">
            <Image src={SAMPLE_CAST.secondary.imagePath} alt={SAMPLE_CAST.secondary.fullName} fill sizes="16px" className="object-cover" />
          </div>
          <span>@heathergay</span>
        </div>
        <div className="flex gap-2">
          {SOCIAL_AVATAR_MODES.map((option) => (
            <PreviewChip key={option.id} active={mode === option.id} onClick={() => setMode(option.id)}>
              {option.label}
            </PreviewChip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mode === "image" ? (
        <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white bg-zinc-200 shadow-sm">
          <Image src={SAMPLE_CAST.primary.imagePath} alt={SAMPLE_CAST.primary.fullName} fill sizes="32px" className="object-cover" />
        </div>
      ) : (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white bg-rose-100 text-[10px] font-semibold uppercase text-rose-700 shadow-sm">
          BR
        </span>
      )}
      <div className="flex gap-2">
        {SOCIAL_AVATAR_MODES.map((option) => (
          <PreviewChip key={option.id} active={mode === option.id} onClick={() => setMode(option.id)}>
            {option.label}
          </PreviewChip>
        ))}
      </div>
    </div>
  );
}

function ProfileHeroAvatarPreview() {
  const [showPhoto, setShowPhoto] = useState(true);
  return (
    <div className="space-y-3">
      <div className="relative grid size-28 place-items-center rounded-full border-[4px] border-black bg-white text-3xl font-bold uppercase shadow-[0_12px_35px_rgba(15,23,42,0.2)]">
        {showPhoto ? (
          <Image
            src={SAMPLE_CAST.primary.imagePath}
            alt={SAMPLE_CAST.primary.fullName}
            width={104}
            height={104}
            className="size-[6.5rem] rounded-full object-cover"
          />
        ) : (
          "TR"
        )}
        <span className="pointer-events-none absolute inset-3 rounded-full border border-dashed border-black/40" aria-hidden="true" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PreviewChip active={showPhoto} onClick={() => setShowPhoto(true)}>Photo</PreviewChip>
        <PreviewChip active={!showPhoto} onClick={() => setShowPhoto(false)}>Initials</PreviewChip>
        <span className="inline-flex items-center rounded-full border border-black px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]">
          Member
        </span>
      </div>
    </div>
  );
}

function PersonCropAvatarPreview() {
  const [missing, setMissing] = useState(false);
  return (
    <div className="space-y-3">
      <div className="w-20" title="Face crop preview">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/20 bg-zinc-900">
          {missing ? (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/80">H</div>
          ) : (
            <Image src={SAMPLE_CAST.secondary.imagePath} alt={SAMPLE_CAST.secondary.fullName} fill sizes="64px" className="object-cover" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[9px] font-semibold text-white">
            Heather
          </div>
        </div>
        <p className="mt-1 text-center text-[9px] leading-tight text-zinc-500">face 1 • 96 x 96</p>
      </div>
      <div className="flex gap-2">
        <PreviewChip active={!missing} onClick={() => setMissing(false)}>Crop</PreviewChip>
        <PreviewChip active={missing} onClick={() => setMissing(true)}>Fallback</PreviewChip>
      </div>
    </div>
  );
}

function ShowMediaAvatarPreview() {
  const [state, setState] = useState<"poster" | "empty" | "selected">("poster");
  const frameClass =
    state === "selected"
      ? "ring-2 ring-sky-500 ring-offset-2"
      : "";

  return (
    <div className="space-y-3">
      <div className={`relative aspect-[4/5] w-20 overflow-hidden rounded-md bg-zinc-200 ${frameClass}`}>
        {state === "empty" ? (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M7 17l3-4 2 2 4-5 3 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <Image src={SAMPLE_CAST.tertiary.imagePath} alt="Show poster preview" fill sizes="80px" className="object-cover" />
        )}
      </div>
      <div className="flex gap-2">
        <PreviewChip active={state === "poster"} onClick={() => setState("poster")}>Poster</PreviewChip>
        <PreviewChip active={state === "empty"} onClick={() => setState("empty")}>Empty</PreviewChip>
        <PreviewChip active={state === "selected"} onClick={() => setState("selected")}>Selected</PreviewChip>
      </div>
    </div>
  );
}

function SurveyCastAvatarPreview() {
  const [state, setState] = useState<"bench" | "grid" | "selected" | "desaturated" | "fallback">("bench");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <CastCircleToken
          label={SAMPLE_CAST.primary.fullName}
          img={state === "fallback" ? null : SAMPLE_CAST.primary.imagePath}
          sizeVariant={state === "grid" ? "grid" : "bench"}
          selected={state === "selected"}
          desaturated={state === "desaturated"}
        />
        <CastCircleToken
          label={SAMPLE_CAST.secondary.fullName}
          img={state === "fallback" ? null : SAMPLE_CAST.secondary.imagePath}
          sizeVariant="grid"
          selected={state === "selected"}
          desaturated={state === "desaturated"}
        />
        <div className="size-12 overflow-hidden rounded-full border border-rose-100 bg-white">
          <Image src={SAMPLE_CAST.tertiary.imagePath} alt={SAMPLE_CAST.tertiary.fullName} width={48} height={48} className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <PreviewChip active={state === "bench"} onClick={() => setState("bench")}>Bench</PreviewChip>
        <PreviewChip active={state === "grid"} onClick={() => setState("grid")}>Grid</PreviewChip>
        <PreviewChip active={state === "selected"} onClick={() => setState("selected")}>Selected</PreviewChip>
        <PreviewChip active={state === "desaturated"} onClick={() => setState("desaturated")}>Desaturated</PreviewChip>
        <PreviewChip active={state === "fallback"} onClick={() => setState("fallback")}>Fallback</PreviewChip>
      </div>
    </div>
  );
}

function AvatarInventoryPreview({ kind }: { kind: AvatarInventoryEntry["preview"] }) {
  if (kind === "survey-cast") return <SurveyCastAvatarPreview />;
  if (kind === "social-handle") return <SocialHandleAvatarPreview />;
  if (kind === "profile-hero") return <ProfileHeroAvatarPreview />;
  if (kind === "person-crops") return <PersonCropAvatarPreview />;
  return <ShowMediaAvatarPreview />;
}

function ResponsiveComponentPreview({ kind }: { kind: PreviewKind }) {
  const [viewport, setViewport] = useState<ComponentPreviewViewport>("phone");
  const frame = COMPONENT_PREVIEW_FRAME[viewport];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {COMPONENT_PREVIEW_VIEWPORTS.map((option) => (
          <PreviewChip
            key={option}
            active={viewport === option}
            onClick={() => setViewport(option)}
          >
            {COMPONENT_PREVIEW_FRAME[option].label}
          </PreviewChip>
        ))}
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white/70 p-3">
        <div className={`mx-auto w-full ${frame.maxWidthClass}`}>
          <ComponentPreview kind={kind} />
        </div>
      </div>
    </div>
  );
}

function ComponentPreview({ kind }: { kind: PreviewKind }) {
  if (kind === "button") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm">Save</Button>
        <Button size="sm" variant="outline">Cancel</Button>
      </div>
    );
  }

  if (kind === "editable") {
    return <EditablePreviewCard />;
  }

  if (kind === "admin-header") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Admin</div>
            <div className="text-sm font-semibold text-zinc-900">UI Design System</div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600">Hub</button>
            <button type="button" className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white">Admin</button>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "side-menu") {
    return <SideMenuPreview />;
  }

  if (kind === "breadcrumbs") {
    return <BreadcrumbsPreview />;
  }

  if (kind === "modal") {
    return <ModalPreview />;
  }

  if (kind === "lightbox") {
    return <LightboxPreview />;
  }

  if (kind === "drawer") {
    return <DrawerPreview />;
  }

  if (kind === "multi-select") {
    return <MultiSelectPreview />;
  }

  if (kind === "question-builder") {
    return <QuestionBuilderPreview />;
  }

  if (kind === "survey-editor") {
    return <SurveyEditorPreview />;
  }

  if (kind === "show-tabs" || kind === "season-tabs") {
    const labels = kind === "show-tabs" ? ["Overview", "Cast", "Social"] : ["Season", "Media", "Surveys"];
    return <TabsPreview labels={labels} />;
  }

  if (kind === "question-renderer") {
    return <QuestionRendererPreview />;
  }

  if (kind === "survey-play") {
    return <SurveyPlayPreview />;
  }

  if (kind === "icon-rating") {
    return <IconRatingPreview />;
  }

  if (kind === "pill-select") {
    return <PillSelectPreview />;
  }

  return <RankerPreview />;
}

interface ComponentsTabProps {
  activeSubtab: DesignSystemSubtabId | null;
}

export default function ComponentsTab({ activeSubtab }: ComponentsTabProps) {
  const visibleSections = activeSubtab && SECTION_ORDER.includes(activeSubtab as ComponentSectionId)
    ? [activeSubtab as ComponentSectionId]
    : SECTION_ORDER;

  return (
    <div className="space-y-8">
      {visibleSections.map((section) => {
        const entries = COMPONENT_CATALOG.filter((entry) => entry.section === section);
        const placeholders = PLACEHOLDER_GROUPS.filter((entry) => entry.section === section);

        return (
          <section key={section} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">{SECTION_LABELS[section]}</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {entries.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {entries.map((entry) => (
                <article key={`${section}-${entry.name}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900">{entry.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${SCOPE_STYLES[entry.scope]}`}>
                      {entry.scope}
                    </span>
                  </div>
                  <div className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                      Example
                    </div>
                    <ResponsiveComponentPreview kind={entry.preview} />
                    <p className="mt-2 text-xs text-zinc-500">{entry.exampleLabel}</p>
                  </div>
                  <p className="mb-3 text-sm text-zinc-600">{entry.usage}</p>
                  <p className="text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-700">Source:</span> <code>{entry.sourcePath}</code>
                  </p>
                </article>
              ))}
            </div>

            {placeholders.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">Blank Containers</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Missing Shared Patterns
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {placeholders.map((entry) => (
                    <div key={`${section}-${entry.name}`} className="rounded-xl border border-zinc-200 bg-white p-3">
                      <p className="text-sm font-semibold text-zinc-900">{entry.name}</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{entry.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}

      {activeSubtab === null ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-zinc-900">Avatars</h2>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
              {AVATAR_INVENTORY.length}
            </span>
            <span className="text-xs text-zinc-400">People, profiles, shows, surveys, and social states</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {AVATAR_INVENTORY.map((entry) => (
              <article key={entry.name} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">{entry.name}</h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-800">
                    avatar system
                  </span>
                </div>
                <div className="mb-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    States
                  </div>
                  <AvatarInventoryPreview kind={entry.preview} />
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.states.map((state) => (
                      <span
                        key={`${entry.name}-${state}`}
                        className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600"
                      >
                        {state}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mb-3 text-sm text-zinc-600">{entry.usage}</p>
                <p className="text-xs text-zinc-500">
                  <span className="font-semibold text-zinc-700">Source:</span> <code>{entry.sourcePath}</code>
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

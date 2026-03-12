"use client";

import Image from "next/image";
import type { DesignSystemSubtabId } from "@/lib/admin/design-system-routing";
import { RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH } from "@/lib/surveys/rhoslc-assets";

type AssetSectionId = "icons" | "logos" | "illustrations";
type AssetPreviewKind = "brand-mark" | "snowflake" | "social-icons" | "external-links" | "lightbox" | "drag-handle" | "masked-rating";

type PublicAssetEntry = {
  name: string;
  path: string;
  note: string;
  section: AssetSectionId;
  previewClassName?: string;
  previewBackground?: string;
};

type InlineIconEntry = {
  name: string;
  sourcePath: string;
  note: string;
  section: AssetSectionId;
  preview: AssetPreviewKind;
};

type PlaceholderEntry = {
  name: string;
  note: string;
  section: AssetSectionId;
};

const PUBLIC_ASSETS: readonly PublicAssetEntry[] = [
  {
    name: "Bravodle Icon",
    path: "public/icons/Bravodle-Icon.svg",
    note: "Primary game icon used on the hub and Bravodle cover page.",
    section: "icons",
    previewBackground: "bg-[#F7ECF5]",
  },
  {
    name: "Realitease Icon",
    path: "public/icons/Realitease-Icon.svg",
    note: "Primary game icon used on the hub and Realitease cover page.",
    section: "icons",
    previewBackground: "bg-[#EEF6FF]",
  },
  {
    name: "Realations Icon",
    path: "public/icons/realations-icon.svg",
    note: "Side-menu game icon for the Realations entry.",
    section: "icons",
    previewBackground: "bg-[#F4F4F5]",
  },
  {
    name: "Snowflake Icon",
    path: `public${RHOSLC_S6_SNOWFLAKE_ICON_PUBLIC_PATH}`,
    note: "Rating icon used by RHOSLC survey rating patterns.",
    section: "icons",
    previewBackground: "bg-[#EFF6FF]",
  },
  {
    name: "Brand Placeholder",
    path: "public/icons/brand-placeholder.svg",
    note: "Fallback icon used in brand/logo selection tooling.",
    section: "icons",
    previewBackground: "bg-[#FAFAFA]",
  },
  {
    name: "FullName Wordmark",
    path: "public/images/logos/fullname-black.svg",
    note: "Current brand wordmark used in admin show seed data and placeholders.",
    section: "logos",
    previewBackground: "bg-white",
  },
  {
    name: "FullName Raster Wordmark",
    path: "public/images/logos/FullName-Black.png",
    note: "Raster brand wordmark asset currently checked into the repo.",
    section: "logos",
    previewBackground: "bg-white",
  },
  {
    name: "Wordle Icon",
    path: "public/images/realitease/wordle-icon.svg",
    note: "Game-adjacent wordmark/icon asset for the Realitease area.",
    section: "logos",
    previewBackground: "bg-[#EEF6FF]",
  },
] as const;

const INLINE_ASSETS: readonly InlineIconEntry[] = [
  {
    name: "SocialPlatformTabIcon",
    sourcePath: "components/admin/SocialPlatformTabIcon.tsx",
    note: "Inline SVG icon set for overview and social platform tabs.",
    section: "icons",
    preview: "social-icons",
  },
  {
    name: "ExternalLink / TMDb / IMDb Icons",
    sourcePath: "components/admin/ExternalLinks.tsx",
    note: "Inline SVG icons for outbound metadata links and source badges.",
    section: "icons",
    preview: "external-links",
  },
  {
    name: "ImageLightbox Controls",
    sourcePath: "components/admin/ImageLightbox.tsx",
    note: "Inline SVG controls for close, navigation, and metadata disclosure.",
    section: "icons",
    preview: "lightbox",
  },
  {
    name: "RankTextFields Menu Handle",
    sourcePath: "components/survey/RankTextFields.tsx",
    note: "Inline drag handle icon used in ranking field reordering.",
    section: "icons",
    preview: "drag-handle",
  },
  {
    name: "Masked / Partial Fill Survey Icons",
    sourcePath: "components/survey/MaskedSvgIcon.tsx + components/survey/PartialFillIcon.tsx",
    note: "Reusable icon rendering system for masked SVG survey ratings.",
    section: "icons",
    preview: "masked-rating",
  },
] as const;

const PLACEHOLDERS: readonly PlaceholderEntry[] = [
  {
    name: "Status Icons",
    note: "Project uses many inline one-off status marks, but no dedicated reusable status icon set is documented yet.",
    section: "icons",
  },
  {
    name: "Empty-State Illustrations",
    note: "No checked-in illustration library exists yet for empty or onboarding states.",
    section: "illustrations",
  },
  {
    name: "Onboarding / Marketing Illustrations",
    note: "There are no reusable product illustrations checked into the current repo.",
    section: "illustrations",
  },
] as const;

const SECTION_LABELS: Record<AssetSectionId, string> = {
  icons: "Icons",
  logos: "Logos & Wordmarks",
  illustrations: "Illustrations",
};

const SECTION_ORDER: readonly AssetSectionId[] = ["icons", "logos", "illustrations"];

function toPublicAssetUrl(path: string): string {
  return path.startsWith("public/") ? `/${path.slice("public/".length)}` : path;
}

function InlineAssetPreview({ preview }: { preview: AssetPreviewKind }) {
  if (preview === "social-icons") {
    return (
      <div className="flex gap-2">
        {["IG", "TT", "YT"].map((label, index) => (
          <div
            key={label}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold ${
              index === 0 ? "bg-rose-100 text-rose-700" : index === 1 ? "bg-zinc-900 text-white" : "bg-red-100 text-red-700"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  if (preview === "external-links") {
    return (
      <div className="flex flex-wrap gap-2">
        {["TMDb", "IMDb", "Link"].map((label) => (
          <div key={label} className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700">
            {label}
          </div>
        ))}
      </div>
    );
  }

  if (preview === "lightbox") {
    return (
      <div className="grid grid-cols-[1fr_auto] gap-3 rounded-xl bg-zinc-950 p-3 text-white">
        <div className="h-20 rounded-lg bg-white/10" />
        <div className="flex flex-col gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm">×</div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm">›</div>
        </div>
      </div>
    );
  }

  if (preview === "drag-handle") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
        <div className="grid grid-cols-2 gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <span key={index} className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          ))}
        </div>
        <div className="h-2 flex-1 rounded bg-zinc-100" />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className={`h-8 w-8 rounded-full border ${index < 4 ? "border-cyan-400 bg-cyan-200" : "border-zinc-300 bg-white"}`}
        />
      ))}
    </div>
  );
}

interface IconsIllustrationsTabProps {
  activeSubtab: DesignSystemSubtabId | null;
}

export default function IconsIllustrationsTab({ activeSubtab }: IconsIllustrationsTabProps) {
  const visibleSections = activeSubtab && SECTION_ORDER.includes(activeSubtab as AssetSectionId)
    ? [activeSubtab as AssetSectionId]
    : SECTION_ORDER;

  return (
    <div className="space-y-8">
      {visibleSections.map((section) => {
        const publicAssets = PUBLIC_ASSETS.filter((entry) => entry.section === section);
        const inlineAssets = INLINE_ASSETS.filter((entry) => entry.section === section);
        const placeholders = PLACEHOLDERS.filter((entry) => entry.section === section);

        return (
          <section key={section} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-zinc-900">{SECTION_LABELS[section]}</h2>
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-700">
                {publicAssets.length + inlineAssets.length}
              </span>
            </div>

            {publicAssets.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-600">Checked-In Assets</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {publicAssets.map((entry) => (
                    <article key={`${section}-${entry.path}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className={`mb-3 flex min-h-28 items-center justify-center rounded-xl border border-zinc-200 p-4 ${entry.previewBackground ?? "bg-zinc-50"}`}>
                        <Image
                          src={toPublicAssetUrl(entry.path)}
                          alt={`${entry.name} preview`}
                          width={160}
                          height={64}
                          className="max-h-16 w-auto object-contain"
                        />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900">{entry.name}</h4>
                      <p className="mt-2 text-sm text-zinc-600">{entry.note}</p>
                      <p className="mt-3 text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-700">Path:</span> <code>{entry.path}</code>
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {inlineAssets.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-600">Inline SVG / Component Icons</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {inlineAssets.map((entry) => (
                    <article key={`${section}-${entry.name}`} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                      <div className="mb-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Example</div>
                        <InlineAssetPreview preview={entry.preview} />
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900">{entry.name}</h4>
                      <p className="mt-2 text-sm text-zinc-600">{entry.note}</p>
                      <p className="mt-3 text-xs text-zinc-500">
                        <span className="font-semibold text-zinc-700">Source:</span> <code>{entry.sourcePath}</code>
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {placeholders.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-900">Blank Containers</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    Missing Asset Groups
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
    </div>
  );
}

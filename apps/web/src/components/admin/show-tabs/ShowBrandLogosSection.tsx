"use client";

import { useState } from "react";
import Image from "next/image";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { FeaturedLogoDrawer } from "./FeaturedLogoDrawer";

export type ShowLogoVariant = "color" | "black" | "white";

interface ShowBrandLogosSectionProps {
  logoAssets: SeasonAsset[];
  featuredLogoAssetId: string | null;
  featuredLogoSavingAssetId: string | null;
  selectedFeaturedLogoVariant: ShowLogoVariant;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onSelectFeaturedLogoVariant: (asset: SeasonAsset, variant: ShowLogoVariant) => void;
  onSetFeaturedLogo: (asset: SeasonAsset) => void;
}

const VARIANT_PREVIEWS = [
  { key: "color" as const, label: "Color", shellClassName: "border-zinc-200 bg-zinc-100" },
  { key: "black" as const, label: "Black", shellClassName: "border-zinc-200 bg-zinc-100" },
  { key: "white" as const, label: "White", shellClassName: "border-zinc-700 bg-zinc-900" },
] as const;

function getLogoVariantUrl(
  asset: SeasonAsset,
  variant: ShowLogoVariant,
  getAssetDisplayUrl: (asset: SeasonAsset) => string
): string | null {
  if (variant === "color") return getAssetDisplayUrl(asset);
  if (variant === "black") return asset.logo_black_url ?? null;
  if (variant === "white") return asset.logo_white_url ?? null;
  return null;
}

export function ShowBrandLogosSection({
  logoAssets,
  featuredLogoAssetId,
  featuredLogoSavingAssetId,
  selectedFeaturedLogoVariant,
  getAssetDisplayUrl,
  onSelectFeaturedLogoVariant,
  onSetFeaturedLogo,
}: ShowBrandLogosSectionProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const featuredAsset = featuredLogoAssetId
    ? logoAssets.find((a) => a.id === featuredLogoAssetId) ?? null
    : null;

  if (logoAssets.length === 0) {
    return <p className="text-sm text-zinc-500">No show logos found.</p>;
  }

  return (
    <>
      <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Featured Logo
          </p>
          {featuredAsset ? (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              Featured
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
              Not Set
            </span>
          )}
        </div>

        {featuredAsset ? (
          <div className="mb-3">
            <div className="grid gap-2 sm:grid-cols-3">
              {VARIANT_PREVIEWS.map((v) => {
                const url = getLogoVariantUrl(featuredAsset, v.key, getAssetDisplayUrl);
                const isSelected = selectedFeaturedLogoVariant === v.key;
                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => onSelectFeaturedLogoVariant(featuredAsset, v.key)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${v.shellClassName} ${
                      isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
                    }`}
                  >
                    <span className="w-12 shrink-0">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {v.label}
                      </span>
                    </span>
                    {url ? (
                      <Image
                        src={url}
                        alt={`${featuredAsset.caption || "Show logo"} ${v.label.toLowerCase()} variant`}
                        width={320}
                        height={120}
                        unoptimized
                        className="h-12 w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-zinc-400">Missing variant</span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">
              Click variant to update top featured logo.
            </p>
          </div>
        ) : (
          <div className="mb-3 flex h-24 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100">
            <span className="text-xs text-zinc-500">No featured logo selected</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          {featuredAsset ? "Change Featured Logo" : "Set Featured Logo"}
        </button>
      </article>

      <FeaturedLogoDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        logoAssets={logoAssets}
        featuredLogoAssetId={featuredLogoAssetId}
        savingAssetId={featuredLogoSavingAssetId}
        selectedVariant={selectedFeaturedLogoVariant}
        getAssetDisplayUrl={getAssetDisplayUrl}
        onSetFeaturedLogo={onSetFeaturedLogo}
        onSelectVariant={onSelectFeaturedLogoVariant}
      />
    </>
  );
}

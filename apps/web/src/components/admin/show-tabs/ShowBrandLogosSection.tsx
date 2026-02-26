"use client";

import Image from "next/image";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { resolveFeaturedLogoPayload } from "@/lib/admin/show-logo-featured";

export type ShowLogoVariant = "color" | "black" | "white";

interface ShowBrandLogosSectionProps {
  logoAssets: SeasonAsset[];
  featuredLogoAssetId: string | null;
  featuredLogoSavingAssetId: string | null;
  selectedFeaturedLogoVariant: ShowLogoVariant;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onOpenAssetLightbox: (
    asset: SeasonAsset,
    index: number,
    assets: SeasonAsset[],
    trigger: HTMLButtonElement
  ) => void;
  onSelectFeaturedLogoVariant: (asset: SeasonAsset, variant: ShowLogoVariant) => void;
  onSetFeaturedLogo: (asset: SeasonAsset) => void;
}

export function ShowBrandLogosSection({
  logoAssets,
  featuredLogoAssetId,
  featuredLogoSavingAssetId,
  selectedFeaturedLogoVariant,
  getAssetDisplayUrl,
  onOpenAssetLightbox,
  onSelectFeaturedLogoVariant,
  onSetFeaturedLogo,
}: ShowBrandLogosSectionProps) {
  if (logoAssets.length === 0) {
    return <p className="text-sm text-zinc-500">No show logos found.</p>;
  }

  return (
    <div className="space-y-3">
      {logoAssets.map((asset, index) => {
        const isFeatured = featuredLogoAssetId === asset.id;
        const canSetFeatured = Boolean(resolveFeaturedLogoPayload(asset));
        const isSaving = featuredLogoSavingAssetId === asset.id;
        const saveBlocked = featuredLogoSavingAssetId !== null && !isSaving;
        const disableSetFeatured = isFeatured || !canSetFeatured || featuredLogoSavingAssetId !== null;

        const previews = [
          {
            key: "color",
            label: "Color",
            description: "Show logo color variant",
            url: getAssetDisplayUrl(asset),
            shellClassName: "border-zinc-200 bg-zinc-100",
          },
          {
            key: "black",
            label: "Black",
            description: "Show logo black variant",
            url: asset.logo_black_url ?? null,
            shellClassName: "border-zinc-200 bg-zinc-100",
          },
          {
            key: "white",
            label: "White",
            description: "Show logo white variant",
            url: asset.logo_white_url ?? null,
            shellClassName: "border-zinc-700 bg-zinc-900",
          },
        ] as const satisfies ReadonlyArray<{
          key: ShowLogoVariant;
          label: string;
          description: string;
          url: string | null;
          shellClassName: string;
        }>;

        const featuredTitle = isFeatured
          ? "This logo is the current featured show logo."
          : !canSetFeatured
            ? "Featured logo can only be set from show_images or media_assets logo rows."
            : saveBlocked
              ? "Another featured-logo update is currently in progress."
              : undefined;

        return (
          <article key={asset.id} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[170px_1fr_auto] lg:items-center">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {(asset.origin_table ?? "unknown").replace("_", " ")}
                </p>
                {isFeatured ? (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Featured
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                    Logo Row
                  </span>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {previews.map((preview) => (
                  <div key={`${asset.id}-${preview.key}`} className="space-y-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        if (isFeatured) {
                          onSelectFeaturedLogoVariant(asset, preview.key);
                          return;
                        }
                        onOpenAssetLightbox(asset, index, logoAssets, event.currentTarget);
                      }}
                      aria-pressed={isFeatured && selectedFeaturedLogoVariant === preview.key}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${preview.shellClassName} ${
                        isFeatured && selectedFeaturedLogoVariant === preview.key
                          ? "ring-2 ring-blue-500 ring-offset-1"
                          : ""
                      }`}
                    >
                      <span className="w-16 shrink-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {preview.label}
                        </span>
                        <span className="block text-[10px] text-zinc-500">{preview.description}</span>
                      </span>
                      {preview.url ? (
                        <Image
                          src={preview.url}
                          alt={asset.caption || `Show logo ${preview.label.toLowerCase()} variant`}
                          width={320}
                          height={120}
                          unoptimized
                          className="h-12 w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">Missing variant</span>
                      )}
                    </button>
                    {isFeatured && (
                      <p className="text-[10px] text-zinc-500">
                        Click variant to update top featured logo.
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSetFeaturedLogo(asset)}
                disabled={disableSetFeatured}
                title={featuredTitle}
                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : isFeatured ? "Featured Logo" : "Set Featured Logo"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

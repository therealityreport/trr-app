"use client";

import Image from "next/image";
import AdminModal from "@/components/admin/AdminModal";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import type { ShowLogoVariant } from "./ShowBrandLogosSection";
import { resolveFeaturedLogoPayload } from "@/lib/admin/show-logo-featured";

interface FeaturedLogoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logoAssets: SeasonAsset[];
  featuredLogoAssetId: string | null;
  savingAssetId: string | null;
  selectedVariant: ShowLogoVariant;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onSetFeaturedLogo: (asset: SeasonAsset) => void;
  onSelectVariant: (asset: SeasonAsset, variant: ShowLogoVariant) => void;
}

const VARIANTS = [
  {
    key: "color" as const,
    label: "Color",
    description: "Show logo color variant",
    shellClassName: "border-zinc-200 bg-zinc-100",
  },
  {
    key: "black" as const,
    label: "Black",
    description: "Show logo black variant",
    shellClassName: "border-zinc-200 bg-zinc-100",
  },
  {
    key: "white" as const,
    label: "White",
    description: "Show logo white variant",
    shellClassName: "border-zinc-700 bg-zinc-900",
  },
];

function getVariantUrl(
  asset: SeasonAsset,
  variant: ShowLogoVariant,
  getAssetDisplayUrl: (asset: SeasonAsset) => string
): string | null {
  if (variant === "color") return getAssetDisplayUrl(asset);
  if (variant === "black") return asset.logo_black_url ?? null;
  if (variant === "white") return asset.logo_white_url ?? null;
  return null;
}

export function FeaturedLogoDrawer({
  isOpen,
  onClose,
  logoAssets,
  featuredLogoAssetId,
  savingAssetId,
  selectedVariant,
  getAssetDisplayUrl,
  onSetFeaturedLogo,
  onSelectVariant,
}: FeaturedLogoDrawerProps) {
  const featuredAsset = featuredLogoAssetId
    ? logoAssets.find((a) => a.id === featuredLogoAssetId) ?? null
    : null;
  const isSavingAny = savingAssetId !== null;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={isSavingAny}
      closeLabel="Close featured logo drawer"
      ariaLabel="Featured Logo"
      containerClassName="items-stretch justify-end p-0"
      backdropClassName="bg-black/50"
      panelClassName="h-full max-w-3xl overflow-y-auto rounded-none border-l border-zinc-200 p-0"
    >
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Logos
            </p>
            <h3 className="text-lg font-bold text-zinc-900">
              Featured Logo
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {logoAssets.length} {logoAssets.length === 1 ? "logo" : "logos"} available
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingAny}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {logoAssets.length === 0 ? (
          <p className="text-sm text-zinc-500">No show logos found.</p>
        ) : (
          <>
            {/* Featured logo section */}
            {featuredAsset && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-zinc-900">Featured</h4>
                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    Featured
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {VARIANTS.map((v) => {
                      const url = getVariantUrl(featuredAsset, v.key, getAssetDisplayUrl);
                      const isSelected = selectedVariant === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => onSelectVariant(featuredAsset, v.key)}
                          aria-pressed={isSelected}
                          className={`flex w-full flex-col items-center gap-2 rounded-lg border px-3 py-3 text-center transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${v.shellClassName} ${
                            isSelected ? "ring-2 ring-blue-500 ring-offset-1" : ""
                          }`}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            {v.label}
                          </span>
                          {url ? (
                            <Image
                              src={url}
                              alt={`${featuredAsset.caption || "Show logo"} ${v.label.toLowerCase()} variant`}
                              width={320}
                              height={120}
                              unoptimized
                              className="h-16 w-full object-contain"
                            />
                          ) : (
                            <span className="flex h-16 items-center text-xs text-zinc-400">
                              Missing variant
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-500">
                    Click variant to update top featured logo.
                  </p>
                </div>
              </section>
            )}

            {/* All logos section */}
            <section>
              <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                {featuredAsset ? "All Logos" : "Select a Featured Logo"}
              </h4>
              <div className="space-y-3">
                {logoAssets.map((asset) => {
                  const isFeatured = featuredLogoAssetId === asset.id;
                  const canSetFeatured = Boolean(resolveFeaturedLogoPayload(asset));
                  const isSaving = savingAssetId === asset.id;
                  const disableAction = isFeatured || !canSetFeatured || isSavingAny;

                  return (
                    <article
                      key={asset.id}
                      className={`rounded-xl border bg-white p-3 shadow-sm ${
                        isFeatured ? "border-emerald-300" : "border-zinc-200"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
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
                        <button
                          type="button"
                          onClick={() => onSetFeaturedLogo(asset)}
                          disabled={disableAction}
                          title={
                            isFeatured
                              ? "This logo is the current featured show logo."
                              : !canSetFeatured
                                ? "Featured logo can only be set from show_images or media_assets logo rows."
                                : isSavingAny && !isSaving
                                  ? "Another featured-logo update is currently in progress."
                                  : undefined
                          }
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : isFeatured ? "Featured Logo" : "Set Featured Logo"}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {VARIANTS.map((v) => {
                          const url = getVariantUrl(asset, v.key, getAssetDisplayUrl);
                          return (
                            <div
                              key={`${asset.id}-${v.key}`}
                              className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${v.shellClassName}`}
                            >
                              <span className="w-12 shrink-0">
                                <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                  {v.label}
                                </span>
                              </span>
                              {url ? (
                                <Image
                                  src={url}
                                  alt={`${asset.caption || "Show logo"} ${v.label.toLowerCase()} variant`}
                                  width={320}
                                  height={120}
                                  unoptimized
                                  className="h-10 w-full object-contain"
                                />
                              ) : (
                                <span className="text-xs text-zinc-400">Missing</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminModal>
  );
}

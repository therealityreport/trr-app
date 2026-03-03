"use client";

import Image from "next/image";
import AdminModal from "@/components/admin/AdminModal";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

interface FeaturedImageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  assets: SeasonAsset[];
  featuredAssetId: string | null | undefined;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onSelect: (showImageId: string) => void;
  saving: boolean;
  /** Tailwind aspect-ratio class, e.g. "aspect-[2/3]" or "aspect-[16/9]" */
  aspectClassName: string;
  /** Grid columns class, e.g. "grid-cols-2 sm:grid-cols-3" */
  gridClassName?: string;
}

const buildAssetLabel = (asset: SeasonAsset, index: number): string => {
  const caption = (asset.caption ?? "").trim();
  if (caption) return caption;
  const source = (asset.source ?? "").trim();
  if (source) return `${source.toUpperCase()} ${index + 1}`;
  return `Asset ${index + 1}`;
};

export function FeaturedImageDrawer({
  isOpen,
  onClose,
  title,
  assets,
  featuredAssetId,
  getAssetDisplayUrl,
  onSelect,
  saving,
  aspectClassName,
  gridClassName = "grid-cols-2 sm:grid-cols-3",
}: FeaturedImageDrawerProps) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={saving}
      closeLabel={`Close ${title.toLowerCase()} drawer`}
      ariaLabel={title}
      containerClassName="items-stretch justify-end p-0"
      backdropClassName="bg-black/50"
      panelClassName="h-full max-w-3xl overflow-y-auto rounded-none border-l border-zinc-200 p-0"
    >
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              {title}
            </p>
            <h3 className="text-lg font-bold text-zinc-900">
              Select {title}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              {assets.length} {assets.length === 1 ? "image" : "images"} available
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>

      <div className="p-6">
        {assets.length === 0 ? (
          <p className="text-sm text-zinc-500">No images available.</p>
        ) : (
          <div className={`grid gap-4 ${gridClassName}`}>
            {assets.map((asset, index) => {
              const isFeatured = featuredAssetId === asset.id;
              const url = getAssetDisplayUrl(asset);
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    if (!isFeatured && !saving) onSelect(asset.id);
                  }}
                  disabled={saving}
                  className={`group relative overflow-hidden rounded-lg border-2 transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isFeatured
                      ? "border-emerald-500"
                      : "border-zinc-200 hover:border-zinc-400"
                  } ${saving ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <div className={`relative w-full ${aspectClassName}`}>
                    {url ? (
                      <Image
                        src={url}
                        alt={buildAssetLabel(asset, index)}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="420px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                        <span className="text-xs text-zinc-400">No image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    {isFeatured && (
                      <div className="absolute left-2 top-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm">
                        Featured
                      </div>
                    )}
                  </div>
                  <div className="bg-white px-2 py-1.5">
                    <p className="truncate text-xs text-zinc-600">
                      {buildAssetLabel(asset, index)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AdminModal>
  );
}

"use client";

import type { ReactNode } from "react";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

type GalleryRenderArgs = {
  asset: SeasonAsset;
  alt: string;
  sizes: string;
  className?: string;
};

interface ShowAssetsImageSectionsProps {
  backdrops: SeasonAsset[];
  posters: SeasonAsset[];
  featuredBackdropImageId?: string | null;
  featuredPosterImageId?: string | null;
  onOpenAssetLightbox: (
    asset: SeasonAsset,
    index: number,
    assets: SeasonAsset[],
    target: HTMLButtonElement
  ) => void;
  renderGalleryImage: (args: GalleryRenderArgs) => ReactNode;
}

export function ShowAssetsImageSections({
  backdrops,
  posters,
  featuredBackdropImageId,
  featuredPosterImageId,
  onOpenAssetLightbox,
  renderGalleryImage,
}: ShowAssetsImageSectionsProps) {
  return (
    <>
      {backdrops.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Backdrops</h4>
          <div className="grid grid-cols-3 gap-4">
            {backdrops.map((asset, index, assets) => (
              <button
                key={asset.id}
                onClick={(event) => onOpenAssetLightbox(asset, index, assets, event.currentTarget)}
                className="relative aspect-[16/9] cursor-zoom-in overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {renderGalleryImage({
                  asset,
                  alt: asset.caption || "Backdrop",
                  sizes: "300px",
                  className: "object-cover",
                })}
                {asset.origin_table === "show_images" && featuredBackdropImageId === asset.id && (
                  <span className="absolute left-2 top-2 rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                    Featured
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {posters.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Posters</h4>
          <div className="grid grid-cols-4 gap-4">
            {posters.map((asset, index, assets) => (
              <button
                key={asset.id}
                onClick={(event) => onOpenAssetLightbox(asset, index, assets, event.currentTarget)}
                className="relative aspect-[2/3] cursor-zoom-in overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {renderGalleryImage({
                  asset,
                  alt: asset.caption || "Poster",
                  sizes: "200px",
                })}
                {asset.origin_table === "show_images" && featuredPosterImageId === asset.id && (
                  <span className="absolute left-2 top-2 rounded-full bg-zinc-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                    Featured
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

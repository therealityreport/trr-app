"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

type GalleryRenderArgs = {
  asset: SeasonAsset;
  alt: string;
  sizes: string;
  className?: string;
};

interface ShowAssetsImageSectionsProps {
  backdrops: SeasonAsset[];
  banners: SeasonAsset[];
  posters: SeasonAsset[];
  featuredBackdropImageId?: string | null;
  featuredPosterImageId?: string | null;
  hasMoreBackdrops?: boolean;
  hasMoreBanners?: boolean;
  hasMorePosters?: boolean;
  autoAdvanceMode?: "manual" | "auto";
  onLoadMoreBackdrops?: () => void;
  onLoadMoreBanners?: () => void;
  onLoadMorePosters?: () => void;
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
  banners,
  posters,
  featuredBackdropImageId,
  featuredPosterImageId,
  hasMoreBackdrops = false,
  hasMoreBanners = false,
  hasMorePosters = false,
  autoAdvanceMode = "manual",
  onLoadMoreBackdrops,
  onLoadMoreBanners,
  onLoadMorePosters,
  onOpenAssetLightbox,
  renderGalleryImage,
}: ShowAssetsImageSectionsProps) {
  const backdropSentinelRef = useRef<HTMLDivElement | null>(null);
  const posterSentinelRef = useRef<HTMLDivElement | null>(null);
  const backdropAutoAdvanceLockRef = useRef(false);
  const posterAutoAdvanceLockRef = useRef(false);

  useEffect(() => {
    if (autoAdvanceMode !== "auto" || !hasMoreBackdrops || !onLoadMoreBackdrops) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (!backdropSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || backdropAutoAdvanceLockRef.current) return;
        backdropAutoAdvanceLockRef.current = true;
        onLoadMoreBackdrops();
        window.setTimeout(() => {
          backdropAutoAdvanceLockRef.current = false;
        }, 300);
      },
      { rootMargin: "250px 0px 250px 0px", threshold: 0.01 }
    );
    observer.observe(backdropSentinelRef.current);
    return () => observer.disconnect();
  }, [autoAdvanceMode, hasMoreBackdrops, onLoadMoreBackdrops]);

  useEffect(() => {
    if (autoAdvanceMode !== "auto" || !hasMorePosters || !onLoadMorePosters) return;
    if (typeof IntersectionObserver === "undefined") return;
    if (!posterSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || posterAutoAdvanceLockRef.current) return;
        posterAutoAdvanceLockRef.current = true;
        onLoadMorePosters();
        window.setTimeout(() => {
          posterAutoAdvanceLockRef.current = false;
        }, 300);
      },
      { rootMargin: "250px 0px 250px 0px", threshold: 0.01 }
    );
    observer.observe(posterSentinelRef.current);
    return () => observer.disconnect();
  }, [autoAdvanceMode, hasMorePosters, onLoadMorePosters]);

  return (
    <>
      {backdrops.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Backdrops</h4>
          <div className="grid grid-cols-3 gap-4">
            {backdrops.map((asset, index, assets) => (
              <button
                key={asset.id}
                type="button"
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
          {hasMoreBackdrops && onLoadMoreBackdrops && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={onLoadMoreBackdrops}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Load More Backdrops
              </button>
            </div>
          )}
          {hasMoreBackdrops && autoAdvanceMode === "auto" && (
            <div ref={backdropSentinelRef} className="h-1 w-full" aria-hidden="true" />
          )}
        </section>
      )}

      {posters.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Posters</h4>
          <div className="grid grid-cols-4 gap-4">
            {posters.map((asset, index, assets) => (
              <button
                key={asset.id}
                type="button"
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
          {hasMorePosters && onLoadMorePosters && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={onLoadMorePosters}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Load More Posters
              </button>
            </div>
          )}
          {hasMorePosters && autoAdvanceMode === "auto" && (
            <div ref={posterSentinelRef} className="h-1 w-full" aria-hidden="true" />
          )}
        </section>
      )}

      {banners.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-zinc-900">Banners</h4>
          <div className="grid grid-cols-3 gap-4">
            {banners.map((asset, index, assets) => (
              <button
                key={asset.id}
                type="button"
                onClick={(event) => onOpenAssetLightbox(asset, index, assets, event.currentTarget)}
                className="relative aspect-[16/9] cursor-zoom-in overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {renderGalleryImage({
                  asset,
                  alt: asset.caption || "Banner",
                  sizes: "300px",
                  className: "object-cover",
                })}
              </button>
            ))}
          </div>
          {hasMoreBanners && onLoadMoreBanners && (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={onLoadMoreBanners}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Load More Banners
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

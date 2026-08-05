"use client";

import type { ReactNode } from "react";

import { BravotvImageRunPanel } from "@/components/admin/BravotvImageRunPanel";
import ShowBrandEditor, {
  type TrrCastMemberLike,
  type TrrSeasonLike,
} from "@/components/admin/ShowBrandEditor";
import { ShowAssetsImageSections } from "@/components/admin/show-tabs/ShowAssetsImageSections";
import {
  ShowBrandLogosSection,
  type ShowLogoVariant,
} from "@/components/admin/show-tabs/ShowBrandLogosSection";
import { ShowFeaturedMediaSelectors } from "@/components/admin/show-tabs/ShowFeaturedMediaSelectors";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

type MaybeAsyncResult = void | Promise<void>;

type ShowAssetsView = "images" | "videos" | "branding";

type ShowAssetsSeasonOption = {
  id: string;
  season_number: number;
};

type ShowAssetsProgress = {
  stage?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
};

type ShowAssetsFallbackTelemetry = {
  fallbackRecoveredCount: number;
  allCandidatesFailedCount: number;
  totalImageAttempts: number;
};

type ShowAssetsMirrorTelemetry = {
  mirroredCount: number;
  totalCount: number;
  mirroredRatio: number;
};

type ShowAssetsSourceFailure = {
  sourceId: string;
  label: string;
  message: string;
  status: number;
  retryable: boolean;
  code?: string;
  reason?: string;
  detail?: Record<string, unknown>;
};

type ShowAssetsGallerySections = {
  backdrops: SeasonAsset[];
  banners: SeasonAsset[];
  posters: SeasonAsset[];
  profile_pictures: SeasonAsset[];
  hasMoreBySection: {
    backdrops?: boolean;
    banners?: boolean;
    posters?: boolean;
    profile_pictures?: boolean;
    cast_photos?: boolean;
  };
};

type ShowAssetsVideo = {
  title?: string | null;
  runtime?: string | null;
  kicker?: string | null;
  image_url?: string | null;
  hosted_image_url?: string | null;
  original_image_url?: string | null;
  media_asset_id?: string | null;
  thumbnail_sync_status?: string | null;
  thumbnail_sync_error?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
};

export type ShowAssetsImageRenderArgs = {
  asset: SeasonAsset;
  alt: string;
  sizes: string;
  className?: string;
  useResolvedUrl?: boolean;
};

export type ShowAssetsVideoThumbnailRenderArgs = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
};

type ShowAssetsImagesProps = {
  selectedSeason: "all" | number;
  seasonOptions: ShowAssetsSeasonOption[];
  refreshCenterButtonLabel: string;
  autoAdvanceMode: "manual" | "auto";
  hasActiveAdvancedFilters: boolean;
  activeAdvancedFilterCount: number;
  refreshingGetImages: boolean;
  photosNotice: string | null | undefined;
  photosError: string | null | undefined;
  getImagesNotice: string | null | undefined;
  getImagesError: string | null | undefined;
  getImagesProgress: ShowAssetsProgress | null | undefined;
  batchJobsNotice: string | null;
  batchJobsError: string | null;
  batchJobsRunning: boolean;
  batchJobsProgress: ShowAssetsProgress | null | undefined;
  truncatedWarning: string | null;
  fallbackTelemetry: ShowAssetsFallbackTelemetry;
  mirrorTelemetry: ShowAssetsMirrorTelemetry;
  sourceFailures: ShowAssetsSourceFailure[];
  loading: boolean;
  filteredAssetCount: number;
  sections: ShowAssetsGallerySections;
  castPromoAssets: SeasonAsset[];
  onRunCompleted: () => MaybeAsyncResult;
  onSelectSeason: (value: string) => void;
  onOpenRefreshCenter: () => void;
  onOpenFilters: () => void;
  onToggleAutoAdvance: () => void;
  onClearFilters: () => void;
  onOpenBatchJobs: () => void;
  onGetImages: () => MaybeAsyncResult;
  onOpenImport: () => void;
  onLoadMoreBackdrops: () => void;
  onLoadMoreBanners: () => void;
  onLoadMorePosters: () => void;
  onLoadMoreProfilePictures: () => void;
  onLoadMoreCastPromos: () => void;
  onOpenAssetLightbox: (
    asset: SeasonAsset,
    index: number,
    assets: SeasonAsset[],
    target: HTMLButtonElement,
  ) => void;
  formatSourceFailure: (failure: ShowAssetsSourceFailure) => string;
};

type ShowAssetsVideosProps = {
  error: string | null;
  loading: boolean;
  thumbnailSyncing: boolean;
  thumbnailSyncWarning: string | null;
  rows: ShowAssetsVideo[];
  getThumbnailUrl: (video: ShowAssetsVideo) => string | null;
  formatPublishedDate: (value?: string | null) => string | null;
};

type ShowAssetsBrandingProps = {
  posterAssets: SeasonAsset[];
  backdropAssets: SeasonAsset[];
  featuredPosterImageId: string | null | undefined;
  featuredBackdropImageId: string | null | undefined;
  logoAssets: SeasonAsset[];
  featuredLogoAssetId: string | null;
  featuredLogoSavingAssetId: string | null;
  featuredLogoVariant: ShowLogoVariant;
  seasons: TrrSeasonLike[];
  cast: TrrCastMemberLike[];
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onSetFeaturedPoster: (showImageId: string | null) => void;
  onSetFeaturedBackdrop: (showImageId: string | null) => void;
  onSelectFeaturedLogoVariant: (asset: SeasonAsset, variant: ShowLogoVariant) => void;
  onSetFeaturedLogo: (asset: SeasonAsset) => void;
};

export type ShowAssetsTabProps = {
  assetsView: ShowAssetsView;
  showId: string;
  showName: string;
  featuredPosterImageId: string | null | undefined;
  featuredBackdropImageId: string | null | undefined;
  images: ShowAssetsImagesProps;
  videos: ShowAssetsVideosProps;
  branding: ShowAssetsBrandingProps;
  renderProgress: (progress: ShowAssetsProgress & { show: boolean }) => ReactNode;
  renderAssetImage: (args: ShowAssetsImageRenderArgs) => ReactNode;
  renderVideoThumbnail: (args: ShowAssetsVideoThumbnailRenderArgs) => ReactNode;
};

export default function ShowAssetsTab({
  assetsView,
  showId,
  showName,
  featuredPosterImageId,
  featuredBackdropImageId,
  images,
  videos,
  branding,
  renderProgress,
  renderAssetImage,
  renderVideoThumbnail,
}: ShowAssetsTabProps) {
  return (
    <section
      id="show-tabpanel-assets"
      role="tabpanel"
      aria-labelledby="show-tab-assets"
    >
      {assetsView === "images" && (
        <div className="mb-6">
          <BravotvImageRunPanel
            mode="show"
            targetId={showId}
            title={`BRAVOTV Get Images for ${showName}`}
            season={images.selectedSeason === "all" ? null : images.selectedSeason}
            onCompleted={images.onRunCompleted}
          />
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {assetsView === "images" ? (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="show-assets-season-filter"
                  className="text-sm font-medium text-zinc-700"
                >
                  Filter by season:
                </label>
                <select
                  id="show-assets-season-filter"
                  value={images.selectedSeason}
                  onChange={(event) => images.onSelectSeason(event.target.value)}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
                >
                  <option value="all">All Seasons</option>
                  {images.seasonOptions.map((season) => (
                    <option key={season.id} value={season.season_number}>
                      Season {season.season_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={images.onOpenRefreshCenter}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4"
                    />
                  </svg>
                  {images.refreshCenterButtonLabel}
                </button>

                <button
                  type="button"
                  onClick={images.onOpenFilters}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 6h18M7 12h10M10 18h4"
                    />
                  </svg>
                  Filters
                </button>

                <button
                  type="button"
                  onClick={images.onToggleAutoAdvance}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Auto-Load: {images.autoAdvanceMode === "auto" ? "On" : "Off"}
                </button>

                {images.hasActiveAdvancedFilters && (
                  <button
                    type="button"
                    onClick={images.onClearFilters}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                  >
                    Clear Filters ({images.activeAdvancedFilterCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={images.onOpenBatchJobs}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Batch Jobs
                </button>

                <button
                  type="button"
                  disabled={images.refreshingGetImages}
                  onClick={images.onGetImages}
                  className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {images.refreshingGetImages ? "Getting Images..." : "Get Images"}
                </button>

                <button
                  type="button"
                  onClick={images.onOpenImport}
                  className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Import Images
                </button>
              </div>
            </div>

            {(images.photosNotice || images.photosError) && (
              <p className={`mb-4 text-sm ${images.photosError ? "text-red-600" : "text-zinc-500"}`}>
                {images.photosError || images.photosNotice}
              </p>
            )}

            {(images.getImagesNotice || images.getImagesError || images.refreshingGetImages) && (
              <div className="mb-4">
                {images.getImagesProgress &&
                  images.refreshingGetImages &&
                  renderProgress({ show: true, ...images.getImagesProgress })}
                {(images.getImagesNotice || images.getImagesError) && (
                  <p className={`text-sm ${images.getImagesError ? "text-red-600" : "text-indigo-600"}`}>
                    {images.getImagesError || images.getImagesNotice}
                  </p>
                )}
              </div>
            )}

            {(images.batchJobsNotice || images.batchJobsError) && (
              <p className={`mb-4 text-sm ${images.batchJobsError ? "text-red-600" : "text-zinc-500"}`}>
                {images.batchJobsError || images.batchJobsNotice}
              </p>
            )}

            {renderProgress({ show: images.batchJobsRunning, ...images.batchJobsProgress })}

            {images.truncatedWarning && (
              <p className="mb-4 text-xs font-medium text-amber-700">{images.truncatedWarning}</p>
            )}

            <p className="mb-4 text-xs text-zinc-500">
              Fallback diagnostics: {images.fallbackTelemetry.fallbackRecoveredCount} recovered,{" "}
              {images.fallbackTelemetry.allCandidatesFailedCount} failed,{" "}
              {images.fallbackTelemetry.totalImageAttempts} attempted. Mirrored URL usage:{" "}
              {images.mirrorTelemetry.mirroredCount}/{images.mirrorTelemetry.totalCount} ({Math.round(
                images.mirrorTelemetry.mirroredRatio * 100,
              )}
              %).
            </p>

            {process.env.NODE_ENV === "development" && images.sourceFailures.length > 0 && (
              <details className="mb-4 rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                <summary className="cursor-pointer font-medium text-zinc-900">
                  Gallery source debug
                </summary>
                <ul className="mt-2 space-y-1">
                  {images.sourceFailures.map((failure) => (
                    <li key={failure.sourceId}>{images.formatSourceFailure(failure)}</li>
                  ))}
                </ul>
              </details>
            )}

            {images.loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-blue-500" />
              </div>
            ) : images.filteredAssetCount === 0 ? (
              <p className="py-8 text-center text-zinc-500">
                No images found for this selection.
              </p>
            ) : (
              <div className="space-y-8">
                <ShowAssetsImageSections
                  backdrops={images.sections.backdrops}
                  banners={images.sections.banners}
                  posters={images.sections.posters}
                  featuredBackdropImageId={featuredBackdropImageId}
                  featuredPosterImageId={featuredPosterImageId}
                  autoAdvanceMode={images.autoAdvanceMode}
                  hasMoreBackdrops={Boolean(images.sections.hasMoreBySection.backdrops)}
                  hasMoreBanners={Boolean(images.sections.hasMoreBySection.banners)}
                  hasMorePosters={Boolean(images.sections.hasMoreBySection.posters)}
                  onLoadMoreBackdrops={images.onLoadMoreBackdrops}
                  onLoadMoreBanners={images.onLoadMoreBanners}
                  onLoadMorePosters={images.onLoadMorePosters}
                  onOpenAssetLightbox={images.onOpenAssetLightbox}
                  renderGalleryImage={(args) => renderAssetImage(args)}
                />

                {images.sections.profile_pictures.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">
                      Profile Pictures
                    </h4>
                    <div className="grid grid-cols-5 gap-4">
                      {images.sections.profile_pictures.map((asset, index, assets) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={(event) =>
                            images.onOpenAssetLightbox(asset, index, assets, event.currentTarget)
                          }
                          className="relative aspect-[2/3] cursor-zoom-in overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {renderAssetImage({
                            asset,
                            alt: asset.caption || "Profile picture",
                            sizes: "180px",
                          })}
                          {asset.person_name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="truncate text-xs text-white">{asset.person_name}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {images.sections.hasMoreBySection.profile_pictures && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={images.onLoadMoreProfilePictures}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Load More Profile Pictures
                        </button>
                      </div>
                    )}
                  </section>
                )}

                {images.castPromoAssets.length > 0 && (
                  <section>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-900">Cast Promos</h4>
                    <div className="grid grid-cols-5 gap-4">
                      {images.castPromoAssets.map((asset, index, assets) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={(event) =>
                            images.onOpenAssetLightbox(asset, index, assets, event.currentTarget)
                          }
                          className="relative aspect-[2/3] cursor-zoom-in overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {renderAssetImage({
                            asset,
                            alt: asset.caption || "Cast photo",
                            sizes: "180px",
                            useResolvedUrl: true,
                          })}
                          {asset.person_name && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="truncate text-xs text-white">{asset.person_name}</p>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {images.sections.hasMoreBySection.cast_photos && (
                      <div className="mt-3 flex justify-center">
                        <button
                          type="button"
                          onClick={images.onLoadMoreCastPromos}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Load More Cast Promos
                        </button>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </>
        ) : assetsView === "videos" ? (
          <div className="space-y-4">
            {(videos.error || videos.loading) && (
              <p className={`text-sm ${videos.error ? "text-red-600" : "text-zinc-500"}`}>
                {videos.error || "Loading Bravo videos..."}
              </p>
            )}
            {videos.thumbnailSyncing && (
              <p className="text-sm text-zinc-500">Syncing high-quality video thumbnails...</p>
            )}
            {videos.thumbnailSyncWarning && !videos.error && (
              <p className="text-sm text-amber-700">{videos.thumbnailSyncWarning}</p>
            )}
            {!videos.loading && videos.rows.length === 0 && !videos.error && (
              <p className="text-sm text-zinc-500">
                No persisted Bravo videos found for this show.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.rows.map((video) => {
                const thumbnailUrl = videos.getThumbnailUrl(video);
                const publishedDate = videos.formatPublishedDate(video.published_at);
                return (
                  <article
                    key={`${video.clip_url}-${video.published_at ?? "unknown"}`}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3"
                  >
                    <a
                      href={video.clip_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="relative mb-3 aspect-video overflow-hidden rounded-lg bg-zinc-200">
                        {thumbnailUrl ? (
                          renderVideoThumbnail({
                            src: thumbnailUrl,
                            alt: video.title || "Bravo video",
                            sizes: "400px",
                            className: "object-cover transition group-hover:scale-105",
                          })
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            No image
                          </div>
                        )}
                      </div>
                      <h4 className="text-sm font-semibold text-zinc-900 group-hover:text-blue-700">
                        {video.title || "Untitled video"}
                      </h4>
                    </a>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {video.runtime && <span>{video.runtime}</span>}
                      {typeof video.season_number === "number" && (
                        <span>Season {video.season_number}</span>
                      )}
                      {video.kicker && <span>{video.kicker}</span>}
                      {publishedDate && <span>Posted {publishedDate}</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <section>
              <h4 className="mb-3 text-sm font-semibold text-zinc-900">Featured Images</h4>
              <ShowFeaturedMediaSelectors
                posterAssets={branding.posterAssets}
                backdropAssets={branding.backdropAssets}
                featuredPosterImageId={branding.featuredPosterImageId}
                featuredBackdropImageId={branding.featuredBackdropImageId}
                getAssetDisplayUrl={branding.getAssetDisplayUrl}
                onSetFeaturedPoster={branding.onSetFeaturedPoster}
                onSetFeaturedBackdrop={branding.onSetFeaturedBackdrop}
              />
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold text-zinc-900">Logos</h4>
              <ShowBrandLogosSection
                logoAssets={branding.logoAssets}
                featuredLogoAssetId={branding.featuredLogoAssetId}
                featuredLogoSavingAssetId={branding.featuredLogoSavingAssetId}
                selectedFeaturedLogoVariant={branding.featuredLogoVariant}
                getAssetDisplayUrl={branding.getAssetDisplayUrl}
                onSelectFeaturedLogoVariant={branding.onSelectFeaturedLogoVariant}
                onSetFeaturedLogo={branding.onSetFeaturedLogo}
              />
            </section>

            <ShowBrandEditor
              trrShowId={showId}
              trrShowName={showName}
              trrSeasons={branding.seasons}
              trrCast={branding.cast}
              showDefaultMediaSection={false}
            />
          </div>
        )}
      </div>
    </section>
  );
}

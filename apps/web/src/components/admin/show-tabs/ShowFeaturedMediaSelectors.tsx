"use client";

import Image from "next/image";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

interface ShowFeaturedMediaSelectorsProps {
  posterAssets: SeasonAsset[];
  backdropAssets: SeasonAsset[];
  featuredPosterImageId: string | null | undefined;
  featuredBackdropImageId: string | null | undefined;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onSetFeaturedPoster: (showImageId: string | null) => void;
  onSetFeaturedBackdrop: (showImageId: string | null) => void;
}

interface FeaturedMediaCardProps {
  title: string;
  emptyLabel: string;
  assets: SeasonAsset[];
  selectedAssetId: string | null | undefined;
  getAssetDisplayUrl: (asset: SeasonAsset) => string;
  onChange: (showImageId: string | null) => void;
}

const buildOptionLabel = (asset: SeasonAsset, index: number): string => {
  const caption = (asset.caption ?? "").trim();
  if (caption) return caption;
  const source = (asset.source ?? "").trim();
  if (source) return `${source.toUpperCase()} ${index + 1}`;
  return `Asset ${index + 1}`;
};

function FeaturedMediaCard({
  title,
  emptyLabel,
  assets,
  selectedAssetId,
  getAssetDisplayUrl,
  onChange,
}: FeaturedMediaCardProps) {
  const selectedAsset =
    assets.find((asset) => selectedAssetId && asset.id === selectedAssetId) ??
    null;
  const selectedAssetUrl = selectedAsset
    ? getAssetDisplayUrl(selectedAsset)
    : null;

  return (
    <article className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {title}
        </p>
        {selectedAsset ? (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Featured
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
            Not Set
          </span>
        )}
      </div>

      <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
        {selectedAssetUrl ? (
          <Image
            src={selectedAssetUrl}
            alt={title}
            width={460}
            height={180}
            unoptimized
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-zinc-500">{emptyLabel}</span>
        )}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          Select
        </span>
        <select
          value={selectedAssetId ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
        >
          <option value="">{emptyLabel}</option>
          {assets.map((asset, index) => (
            <option key={asset.id} value={asset.id}>
              {buildOptionLabel(asset, index)}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

export function ShowFeaturedMediaSelectors({
  posterAssets,
  backdropAssets,
  featuredPosterImageId,
  featuredBackdropImageId,
  getAssetDisplayUrl,
  onSetFeaturedPoster,
  onSetFeaturedBackdrop,
}: ShowFeaturedMediaSelectorsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <FeaturedMediaCard
        title="Featured Poster"
        emptyLabel="No featured poster selected"
        assets={posterAssets}
        selectedAssetId={featuredPosterImageId}
        getAssetDisplayUrl={getAssetDisplayUrl}
        onChange={onSetFeaturedPoster}
      />
      <FeaturedMediaCard
        title="Featured Backdrop"
        emptyLabel="No featured backdrop selected"
        assets={backdropAssets}
        selectedAssetId={featuredBackdropImageId}
        getAssetDisplayUrl={getAssetDisplayUrl}
        onChange={onSetFeaturedBackdrop}
      />
    </div>
  );
}

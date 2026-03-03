"use client";

import { useState } from "react";
import Image from "next/image";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";
import { FeaturedImageDrawer } from "./FeaturedImageDrawer";

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
  aspectClassName: string;
  gridClassName: string;
}

function FeaturedMediaCard({
  title,
  emptyLabel,
  assets,
  selectedAssetId,
  getAssetDisplayUrl,
  onChange,
  aspectClassName,
  gridClassName,
}: FeaturedMediaCardProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedAsset =
    assets.find((asset) => selectedAssetId && asset.id === selectedAssetId) ??
    null;
  const selectedAssetUrl = selectedAsset
    ? getAssetDisplayUrl(selectedAsset)
    : null;

  return (
    <>
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

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          disabled={assets.length === 0}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {assets.length === 0
            ? "No images available"
            : selectedAsset
              ? `Change ${title}`
              : `Select ${title}`}
        </button>
      </article>

      <FeaturedImageDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={title}
        assets={assets}
        featuredAssetId={selectedAssetId ?? null}
        getAssetDisplayUrl={getAssetDisplayUrl}
        onSelect={(id) => {
          setSaving(true);
          onChange(id);
          // Reset saving after a tick — the parent re-renders with new featured ID
          setTimeout(() => setSaving(false), 500);
        }}
        saving={saving}
        aspectClassName={aspectClassName}
        gridClassName={gridClassName}
      />
    </>
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
        aspectClassName="aspect-[2/3]"
        gridClassName="grid-cols-2 sm:grid-cols-3"
      />
      <FeaturedMediaCard
        title="Featured Backdrop"
        emptyLabel="No featured backdrop selected"
        assets={backdropAssets}
        selectedAssetId={featuredBackdropImageId}
        getAssetDisplayUrl={getAssetDisplayUrl}
        onChange={onSetFeaturedBackdrop}
        aspectClassName="aspect-[16/9]"
        gridClassName="grid-cols-1 sm:grid-cols-2"
      />
    </div>
  );
}

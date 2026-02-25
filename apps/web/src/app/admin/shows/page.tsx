"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { shows, type ShowAssets, type SeasonAssets } from "@/lib/admin/shows/data";

const showOptions = shows.map((show) => ({
  key: show.key,
  title: show.title,
  shortTitle: show.shortTitle ?? show.title,
}));

function ColorBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/70 px-3 py-2 shadow-sm">
      <span className="h-6 w-6 rounded-full border border-white shadow" style={{ background: value }} aria-hidden />
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">{label}</p>
        <p className="text-sm font-mono text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function CastGrid({ season }: { season: SeasonAssets }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {season.cast.map((member) => (
        <div key={member.name} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md">
          <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-zinc-50">
            <Image src={member.image} alt={member.name} fill sizes="200px" className="object-cover" />
          </div>
          <p className="text-base font-semibold text-zinc-900">{member.name}</p>
          {member.role ? <p className="text-sm text-zinc-500">{member.role}</p> : null}
          {member.status ? (
            <span className="mt-2 inline-flex rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              {member.status}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function AdminShowsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [selectedShowKey, setSelectedShowKey] = useState(showOptions[0]?.key ?? null);
  const activeShow = useMemo<ShowAssets | null>(
    () => (selectedShowKey ? shows.find((show) => show.key === selectedShowKey) ?? null : null),
    [selectedShowKey],
  );
  const [selectedSeasonId, setSelectedSeasonId] = useState(activeShow?.seasons[0]?.id ?? null);
  const activeSeason = useMemo<SeasonAssets | null>(
    () => (activeShow && selectedSeasonId ? activeShow.seasons.find((season) => season.id === selectedSeasonId) ?? null : null),
    [activeShow, selectedSeasonId],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Loading admin access...</p>
      </div>
    );
  }

  if (!user || !hasAccess || !activeShow || !activeSeason) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Brands", "/admin/brands")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">{activeShow.title}</h1>
              <p className="text-sm text-zinc-500">{activeShow.logline}</p>
              <BrandsTabs activeTab="shows" className="mt-4" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedShowKey ?? undefined}
                onChange={(event) => {
                  setSelectedShowKey(event.target.value);
                  const show = shows.find((entry) => entry.key === event.target.value);
                  setSelectedSeasonId(show?.seasons[0]?.id ?? null);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              >
                {showOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.shortTitle}
                  </option>
                ))}
              </select>
              <select
                value={selectedSeasonId ?? undefined}
                onChange={(event) => setSelectedSeasonId(event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              >
                {activeShow.seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
          <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-400">{activeShow.network}</p>
                  <h2 className="text-2xl font-bold text-zinc-900">{activeSeason.label}</h2>
                  {activeSeason.description ? <p className="mt-1 text-sm text-zinc-600">{activeSeason.description}</p> : null}
                </div>
                {activeSeason.showIcon ? (
                  <div className="relative h-16 w-16">
                    <Image src={activeSeason.showIcon} alt={`${activeShow.shortTitle} icon`} fill sizes="64px" className="object-contain" />
                  </div>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap gap-4">
                <ColorBadge label="Primary" value={activeSeason.colors.primary} />
                <ColorBadge label="Accent" value={activeSeason.colors.accent} />
                <ColorBadge label="Neutral" value={activeSeason.colors.neutral} />
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900">Notes</h3>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-600">
                {(activeSeason.notes ?? []).map((note) => (
                  <li key={note}>{note}</li>
                ))}
                {activeSeason.notes?.length ? null : <li>No season notes yet. Add color references or brand guidelines here.</li>}
              </ul>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Cast Icons</p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {activeShow.shortTitle} · {activeSeason.label}
                </h3>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {activeSeason.cast.length} assets
              </span>
            </div>
            <CastGrid season={activeSeason} />
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}

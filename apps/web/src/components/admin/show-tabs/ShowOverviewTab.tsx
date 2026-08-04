"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";

import { ExternalLinks } from "@/components/admin/ExternalLinks";
import type {
  OverviewRedditCommunityRow,
  OverviewRedditGroup,
  OverviewSeasonCoverageRow,
  OverviewWatchProviderRegionOption,
  OverviewWatchProviderRegionRow,
} from "@/lib/admin/show-page/overview-display";

type ShowOverviewRecord = {
  id: string;
  name: string;
  description?: string | null;
  premiere_date?: string | null;
  external_ids?: Record<string, unknown> | null;
  tmdb_id?: number | null;
  imdb_id?: string | null;
  derived_external_links?: {
    justwatch_url?: string | null;
  } | null;
  genres?: string[] | null;
  tags?: string[] | null;
};

type OverviewExternalIdLink = {
  id: string;
  url: string;
};

type OverviewSocialHandleLink = {
  id: string;
};

type OverviewRefreshProgressProps = {
  show: boolean;
  stage?: string | null;
  message?: string | null;
  current?: number | null;
  total?: number | null;
};

export interface ShowOverviewTabProps<
  TExternalIdLink extends OverviewExternalIdLink = OverviewExternalIdLink,
  TSocialHandleLink extends OverviewSocialHandleLink = OverviewSocialHandleLink,
  TSeasonCoverageRow extends OverviewSeasonCoverageRow = OverviewSeasonCoverageRow,
> {
  show: ShowOverviewRecord;
  nickname: string;
  alternativeNamesText: string;
  refreshCenterButtonLabel: string;
  refreshNotice?: string | null;
  refreshError?: string | null;
  refreshing: boolean;
  refreshProgress?: Omit<OverviewRefreshProgressProps, "show"> | null;
  renderRefreshProgress: (props: OverviewRefreshProgressProps) => ReactNode;
  detailsNotice: string | null;
  detailsError: string | null;
  externalIdLinks: TExternalIdLink[];
  getExternalIdLinkTitle: (link: TExternalIdLink) => string;
  renderExternalIdLinkBadge: (link: TExternalIdLink) => ReactNode;
  socialHandleLinks: TSocialHandleLink[];
  renderSocialHandlePill: (pill: TSocialHandleLink) => ReactNode;
  redditLoading: boolean;
  redditError: string | null;
  redditGroups: OverviewRedditGroup[];
  getRedditCommunityHref: (community: OverviewRedditCommunityRow) => string;
  seasonUrlCoverageRows: TSeasonCoverageRow[];
  renderSeasonCoverageBadge: (
    link: TSeasonCoverageRow["links"][number]
  ) => ReactNode;
  networks: string[];
  watchProviderRegions: OverviewWatchProviderRegionRow[];
  watchProviderRegionOptions: OverviewWatchProviderRegionOption[];
  selectedAvailabilityRegion: OverviewWatchProviderRegionRow | null;
  fallbackWatchProviders: string[];
  isCovered: boolean;
  coverageLoading: boolean;
  coverageError: string | null;
  onOpenSettings: () => void;
  onOpenRefreshLog: () => void;
  onSelectAvailabilityRegion: (regionCode: string) => void;
  onAddToCoveredShows: () => void;
  onRemoveFromCoveredShows: () => void;
}

export default function ShowOverviewTab<
  TExternalIdLink extends OverviewExternalIdLink,
  TSocialHandleLink extends OverviewSocialHandleLink,
  TSeasonCoverageRow extends OverviewSeasonCoverageRow,
>({
  show,
  nickname,
  alternativeNamesText,
  refreshCenterButtonLabel,
  refreshNotice,
  refreshError,
  refreshing,
  refreshProgress,
  renderRefreshProgress,
  detailsNotice,
  detailsError,
  externalIdLinks,
  getExternalIdLinkTitle,
  renderExternalIdLinkBadge,
  socialHandleLinks,
  renderSocialHandlePill,
  redditLoading,
  redditError,
  redditGroups,
  getRedditCommunityHref,
  seasonUrlCoverageRows,
  renderSeasonCoverageBadge,
  networks,
  watchProviderRegions,
  watchProviderRegionOptions,
  selectedAvailabilityRegion,
  fallbackWatchProviders,
  isCovered,
  coverageLoading,
  coverageError,
  onOpenSettings,
  onOpenRefreshLog,
  onSelectAvailabilityRegion,
  onAddToCoveredShows,
  onRemoveFromCoveredShows,
}: ShowOverviewTabProps<
  TExternalIdLink,
  TSocialHandleLink,
  TSeasonCoverageRow
>) {
  return (
    <section
      id="show-tabpanel-details"
      role="tabpanel"
      aria-labelledby="show-tab-details"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Show Overview
            </p>
            <h3 className="text-xl font-bold text-zinc-900">
              Details and Metadata
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Open Settings
            </button>
            <button
              type="button"
              onClick={onOpenRefreshLog}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {refreshCenterButtonLabel}
            </button>
          </div>
        </div>

        {(refreshNotice || refreshError) && (
          <p
            className={`mb-4 text-sm ${
              refreshError ? "text-red-600" : "text-zinc-500"
            }`}
          >
            {refreshError || refreshNotice}
          </p>
        )}
        {renderRefreshProgress({
          show: refreshing,
          stage: refreshProgress?.stage,
          message: refreshProgress?.message,
          current: refreshProgress?.current,
          total: refreshProgress?.total,
        })}
        {(detailsNotice || detailsError) && (
          <p className={`mb-4 text-sm ${detailsError ? "text-red-600" : "text-zinc-500"}`}>
            {detailsError || detailsNotice}
          </p>
        )}

        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">Show Info</h4>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Display Name
                  </p>
                  <p className="text-sm text-zinc-900">{show.name || "Not set"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Nickname
                  </p>
                  <p className="text-sm text-zinc-900">{nickname || "Not set"}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Premiere Date
                  </p>
                  <p className="text-sm text-zinc-900">
                    {show.premiere_date
                      ? new Date(show.premiere_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "Not set"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Alt Names
                  </p>
                  <p className="text-sm text-zinc-900 whitespace-pre-line">
                    {alternativeNamesText || "None"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Description
                  </p>
                  <p className="text-sm leading-6 text-zinc-900">
                    {show.description || "No description available."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">External IDs</h4>
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <ExternalLinks
                externalIds={(show.external_ids as Record<string, unknown> | null) ?? null}
                tmdbId={show.tmdb_id}
                imdbId={show.imdb_id}
                derivedLinks={show.derived_external_links ?? null}
                type="show"
              />
              {externalIdLinks.length > 0 ? (
                <div className="space-y-2">
                  {externalIdLinks.map((link) => (
                    <a
                      key={`overview-external-id-link-${link.id}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    >
                      {renderExternalIdLinkBadge(link)}
                      <span className="text-zinc-300">|</span>
                      <span className="truncate">{getExternalIdLinkTitle(link)}</span>
                    </a>
                  ))}
                </div>
              ) : (
                !show.tmdb_id &&
                !show.imdb_id && (
                  <p className="text-sm text-zinc-500">No external IDs available for this show.</p>
                )
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">Social Handles</h4>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {socialHandleLinks.length === 0 ? (
                <p className="text-sm text-zinc-500">No show-level social handles discovered yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {socialHandleLinks.map((pill) => (
                    <Fragment key={`overview-social-link-${pill.id}`}>
                      {renderSocialHandlePill(pill)}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-zinc-700">Reddit</h4>
              <Link
                href={"/admin/social/reddit"}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Open Reddit Admin
              </Link>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {redditLoading ? (
                <p className="text-sm text-zinc-500">Loading Reddit communities...</p>
              ) : redditError ? (
                <p className="text-sm text-red-600">{redditError}</p>
              ) : redditGroups.length === 0 ? (
                <p className="text-sm text-zinc-500">No relevant Reddit communities configured for this show.</p>
              ) : (
                <div className="space-y-4">
                  {redditGroups.map((group) => (
                    <div key={`overview-reddit-group-${group.key}`} className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {group.label}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {group.communities.map((community) => (
                          <div
                            key={`overview-reddit-community-${community.id}`}
                            className="rounded-lg border border-zinc-200 bg-white p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-zinc-900">{community.displayName}</p>
                                <p className="text-xs text-zinc-500">r/{community.subreddit}</p>
                              </div>
                              <Link
                                href={getRedditCommunityHref(community)}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                              >
                                Open Community
                              </Link>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {community.assignedFlairs.length > 0 ? (
                                community.assignedFlairs.map((flair) => (
                                  <span
                                    key={`overview-reddit-flair-${community.id}-${flair}`}
                                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                  >
                                    {flair}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-zinc-500">No assigned flairs</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">Season URL Coverage</h4>
            <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              {seasonUrlCoverageRows.length === 0 ? (
                <p className="text-sm text-zinc-500">No seasons available for URL coverage yet.</p>
              ) : (
                seasonUrlCoverageRows.map((row) => (
                  <div
                    key={`overview-season-url-coverage-${row.seasonNumber}`}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Season {row.seasonNumber}
                    </p>
                    {row.links.length === 0 ? (
                      <p className="mt-1 text-sm text-zinc-500">No validated season-scoped URLs discovered.</p>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {row.links.map((link) => (
                          <a
                            key={`overview-season-url-pill-${row.seasonNumber}-${link.id}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                            title={`${link.sourceLabel} | ${link.linkTitle || `Season ${row.seasonNumber}`}`}
                          >
                            {renderSeasonCoverageBadge(link)}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Genres */}
          {show.genres && show.genres.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                Genres
              </h4>
              <div className="flex flex-wrap gap-2">
                {show.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">
              Networks & Streaming
            </h4>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Networks
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {networks.length > 0 ? (
                  networks.map((network) => (
                    <span
                      key={network}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                    >
                      {network}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">No network metadata.</p>
                )}
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Availability
              </p>
              {watchProviderRegions.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Region
                    </span>
                    <div className="relative inline-flex">
                      <select
                        aria-label="Availability region"
                        className="appearance-none rounded-full border border-zinc-200 bg-white px-3 py-1 pr-8 text-sm font-medium text-zinc-700 shadow-sm"
                        value={selectedAvailabilityRegion?.regionCode ?? ""}
                        onChange={(event) => onSelectAvailabilityRegion(event.target.value)}
                      >
                        {watchProviderRegionOptions.map((option) => (
                          <option key={`availability-region-${option.regionCode}`} value={option.regionCode}>
                            {option.regionCode} · {option.regionLabel}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">
                        ▾
                      </span>
                    </div>
                  </div>
                  {selectedAvailabilityRegion ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-sm font-semibold text-zinc-900">
                        {selectedAvailabilityRegion.regionLabel}
                      </p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Stream
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {selectedAvailabilityRegion.stream.length > 0 ? (
                              selectedAvailabilityRegion.stream.map((provider) => (
                                <span
                                  key={`overview-watch-stream-${selectedAvailabilityRegion.regionCode}-${provider}`}
                                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-700"
                                >
                                  {provider}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Free
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {selectedAvailabilityRegion.free.length > 0 ? (
                              selectedAvailabilityRegion.free.map((provider) => (
                                <span
                                  key={`overview-watch-free-${selectedAvailabilityRegion.regionCode}-${provider}`}
                                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                                >
                                  {provider}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                            Rent / Buy
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {selectedAvailabilityRegion.buyRent.length > 0 ? (
                              selectedAvailabilityRegion.buyRent.map((provider) => (
                                <span
                                  key={`overview-watch-buy-rent-${selectedAvailabilityRegion.regionCode}-${provider}`}
                                  className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                                >
                                  {provider}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-zinc-500">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {fallbackWatchProviders.length > 0 ? (
                      fallbackWatchProviders.map((provider) => (
                        <span
                          key={`overview-watch-fallback-${provider}`}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm text-zinc-700"
                        >
                          {provider}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">No streaming providers on this record.</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Typed TMDb availability is unavailable for this show.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {show.tags && show.tags.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {show.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-sm text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Premiere Date */}
          {show.premiere_date && (
            <div>
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                Premiere Date
              </h4>
              <p className="text-sm text-zinc-700">
                {new Date(show.premiere_date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          )}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm text-zinc-700">
              Link management and role catalog tools are now on the <span className="font-semibold">Settings</span> tab.
            </p>
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-3 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              Open Settings
            </button>
          </div>

          {/* Internal ID */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-zinc-700">
              Internal ID
            </h4>
            <code className="text-xs bg-zinc-100 rounded px-2 py-1 text-zinc-600 font-mono">
              {show.id}
            </code>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Show Visibility
            </p>
            {isCovered ? (
              <button type="button"
                onClick={onRemoveFromCoveredShows}
                disabled={coverageLoading}
                className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {coverageLoading ? "..." : "Remove from Shows"}
              </button>
            ) : (
              <button type="button"
                onClick={onAddToCoveredShows}
                disabled={coverageLoading}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {coverageLoading ? "..." : "Add to Shows"}
              </button>
            )}
            {coverageError && (
              <p className="mt-2 text-xs font-medium text-rose-700">{coverageError}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

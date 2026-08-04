"use client";

import { GalleryImage } from "@/app/admin/trr-shows/[showId]/ShowPageMedia";

export type BravoImportImageKind =
  | "poster"
  | "backdrop"
  | "logo"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";

export type BravoSyncRunMode = "full" | "cast-only";

export type BravoSyncCandidateResult = {
  url: string;
  name?: string | null;
  status?: string;
  error?: string | null;
};

export type BravoSyncCandidateSummary = {
  tested: number;
  valid: number;
  missing: number;
  errors: number;
};

export type BravoSyncProfileCard = {
  url: string;
  name: string | null;
  bio: string | null;
  heroImageUrl: string | null;
  socialLinks: Array<{
    key: string;
    label: string;
    url: string;
    handle: string | null;
  }>;
};

export type BravoSyncCandidateIssue = {
  url: string;
  status: "missing" | "error";
  reason: string | null;
};

export type BravoSyncImage = {
  url: string;
  alt?: string | null;
};

export type BravoSyncCastLink = {
  name: string | null;
  url: string;
};

export type BravoSyncNewsItem = {
  headline?: string | null;
  image_url?: string | null;
  article_url: string;
  published_at?: string | null;
};

export type BravoSyncVideoItem = {
  title?: string | null;
  runtime?: string | null;
  image_url?: string | null;
  clip_url: string;
  season_number?: number | null;
  published_at?: string | null;
};

export type BravoSyncSelectedImageSummary = {
  url: string;
  alt: string | null;
  kind: BravoImportImageKind;
};

export type ShowBravoSyncPreviewStepProps = {
  runMode: BravoSyncRunMode;
  loading: boolean;
  previewLoading: boolean;
  showName: string;
  bravoUrl: string | null;
  error: string | null;
  notice: string | null;
  description: string;
  airs: string;
  applyDescriptionToShow: boolean;
  images: ReadonlyArray<BravoSyncImage>;
  selectedImages: ReadonlySet<string>;
  imageKinds: Readonly<Record<string, BravoImportImageKind>>;
  personCandidateResults: ReadonlyArray<BravoSyncCandidateResult>;
  fandomPersonCandidateResults: ReadonlyArray<BravoSyncCandidateResult>;
  probeSummary: BravoSyncCandidateSummary;
  fandomProbeSummary: BravoSyncCandidateSummary;
  probeStatusMessage: string | null;
  probeActive: boolean;
  probeTotal: number;
  validProfileCards: ReadonlyArray<BravoSyncProfileCard>;
  fandomValidProfileCards: ReadonlyArray<BravoSyncProfileCard>;
  candidateIssues: ReadonlyArray<BravoSyncCandidateIssue>;
  fandomCandidateIssues: ReadonlyArray<BravoSyncCandidateIssue>;
  fandomDomainsUsed: ReadonlyArray<string>;
  castLinks: ReadonlyArray<BravoSyncCastLink>;
  newsItems: ReadonlyArray<BravoSyncNewsItem>;
  videos: ReadonlyArray<BravoSyncVideoItem>;
  videoSeasonFilter: "all" | number;
  videoSeasonOptions: ReadonlyArray<number>;
  onRefreshPreview: () => void | Promise<void>;
  onDescriptionChange: (value: string) => void;
  onAirsChange: (value: string) => void;
  onApplyDescriptionChange: (value: boolean) => void;
  onImageSelectionChange: (url: string, selected: boolean) => void;
  onImageKindChange: (url: string, kind: BravoImportImageKind) => void;
  onVideoSeasonFilterChange: (value: "all" | number) => void;
  inferImageKind: (image: BravoSyncImage) => BravoImportImageKind;
  formatPublishedDate: (value: string | null | undefined) => string | null;
};

const BRAVO_IMPORT_IMAGE_KIND_OPTIONS: Array<{
  value: BravoImportImageKind;
  label: string;
}> = [
  { value: "poster", label: "Poster" },
  { value: "backdrop", label: "Backdrop" },
  { value: "logo", label: "Logo" },
  { value: "episode_still", label: "Episode Still" },
  { value: "cast", label: "Cast" },
  { value: "promo", label: "Promo" },
  { value: "intro", label: "Intro" },
  { value: "reunion", label: "Reunion" },
  { value: "other", label: "Other" },
];

export default function ShowBravoSyncPreviewStep({
  runMode: syncBravoRunMode,
  loading: syncBravoLoading,
  previewLoading: syncBravoPreviewLoading,
  showName,
  bravoUrl,
  error: syncBravoError,
  notice: syncBravoNotice,
  description: syncBravoDescription,
  airs: syncBravoAirs,
  applyDescriptionToShow: syncBravoApplyDescriptionToShow,
  images: syncBravoImages,
  selectedImages: syncBravoSelectedImages,
  imageKinds: syncBravoImageKinds,
  personCandidateResults: syncBravoPersonCandidateResults,
  fandomPersonCandidateResults: syncFandomPersonCandidateResults,
  probeSummary: syncBravoProbeSummary,
  fandomProbeSummary: syncFandomProbeSummary,
  probeStatusMessage: syncBravoProbeStatusMessage,
  probeActive: syncBravoProbeActive,
  probeTotal: syncBravoProbeTotal,
  validProfileCards: syncBravoValidProfileCards,
  fandomValidProfileCards: syncFandomValidProfileCards,
  candidateIssues: syncBravoCandidateIssues,
  fandomCandidateIssues: syncFandomCandidateIssues,
  fandomDomainsUsed: syncFandomDomainsUsed,
  castLinks: syncBravoPreviewCastLinks,
  newsItems: syncBravoPreviewNews,
  videos: syncBravoFilteredPreviewVideos,
  videoSeasonFilter: syncBravoPreviewSeasonFilter,
  videoSeasonOptions: syncBravoPreviewSeasonOptions,
  onRefreshPreview,
  onDescriptionChange,
  onAirsChange,
  onApplyDescriptionChange,
  onImageSelectionChange,
  onImageKindChange,
  onVideoSeasonFilterChange,
  inferImageKind: inferBravoImportImageKind,
  formatPublishedDate: formatBravoPublishedDate,
}: ShowBravoSyncPreviewStepProps) {
  return (
    <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Show Name
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">{showName}</p>
                  <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Bravo Show URL
                  </p>
                  {bravoUrl ? (
                    <a
                      href={bravoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-all text-xs text-blue-700 hover:underline"
                    >
                      {bravoUrl}
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500">Could not infer URL yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onRefreshPreview()}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {syncBravoPreviewLoading
                    ? "Refreshing..."
                    : syncBravoRunMode === "cast-only"
                      ? "Refresh Cast Preview"
                      : "Refresh Preview"}
                </button>
              </div>

              {(syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              {syncBravoRunMode === "cast-only" && (
                <p className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                  Cast-only mode probes canonical Bravo (`/people/*`) and Fandom (`/wiki/*`) cast profile URLs and reports
                  valid, missing, and error candidates for each source.
                </p>
              )}

              {syncBravoRunMode !== "cast-only" && (
                <>
                  <div className="mb-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Description
                      </span>
                      <textarea
                        value={syncBravoDescription}
                        onChange={(event) => onDescriptionChange(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Airs / Tune-In
                      </span>
                      <textarea
                        value={syncBravoAirs}
                        onChange={(event) => onAirsChange(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                      />
                    </label>
                  </div>
                  <label className="mb-4 flex items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={syncBravoApplyDescriptionToShow}
                      onChange={(event) => onApplyDescriptionChange(event.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      Apply Bravo description to show profile.
                      <span className="ml-1 text-xs text-zinc-500">
                        Off by default. When off, commit keeps canonical show bio sources (IMDb/TMDb/Knowledge/Fandom).
                      </span>
                    </span>
                  </label>

                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Images
                    </p>
                    {syncBravoImages.length === 0 ? (
                      <p className="text-sm text-zinc-500">Run preview to load image candidates.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {syncBravoImages.map((image) => {
                          const checked = syncBravoSelectedImages.has(image.url);
                          const selectedKind =
                            syncBravoImageKinds[image.url] ?? inferBravoImportImageKind(image);
                          return (
                            <div key={image.url} className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  onImageSelectionChange(image.url, event.target.checked)
                                }
                                className="mt-1"
                              />
                              <div className="relative h-16 w-28 overflow-hidden rounded bg-zinc-100">
                                <GalleryImage src={image.url} alt={image.alt || "Bravo image"} sizes="120px" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-xs text-zinc-600">{image.alt || image.url}</span>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                    Type
                                  </span>
                                  <select
                                    value={selectedKind}
                                    onChange={(event) =>
                                      onImageKindChange(
                                        image.url,
                                        event.target.value as BravoImportImageKind
                                      )
                                    }
                                    className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                                  >
                                    {BRAVO_IMPORT_IMAGE_KIND_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Cast Member URLs
                  </p>
                  {syncBravoRunMode === "cast-only" && (
                    <div className="text-right text-[11px] font-semibold text-zinc-500">
                      <p>
                        Bravo tested {syncBravoProbeSummary.tested} / valid {syncBravoProbeSummary.valid} /
                        missing {syncBravoProbeSummary.missing} / error {syncBravoProbeSummary.errors}
                      </p>
                      <p>
                        Fandom tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                        missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                      </p>
                    </div>
                  )}
                </div>
                {syncBravoRunMode === "cast-only" && syncBravoProbeStatusMessage && (
                  <p className="mb-2 text-xs text-zinc-500">
                    {syncBravoProbeStatusMessage}
                    {syncBravoProbeActive && syncBravoProbeTotal > 30 ? " This may take several minutes." : ""}
                  </p>
                )}

                {syncBravoRunMode === "cast-only" ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Probe Queue
                      </p>
                      {syncBravoPersonCandidateResults.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500">
                          Preparing canonical `/people/*` candidate probes...
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {syncBravoPersonCandidateResults.map((result) => {
                            const status = String(result.status || "pending").trim().toLowerCase();
                            const badgeClass =
                              status === "ok"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "missing"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : status === "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-zinc-200 text-zinc-700";
                            return (
                              <article
                                key={`candidate-${result.url}`}
                                className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-800">
                                      {result.name || "Unresolved cast member"}
                                    </p>
                                    <a
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                    >
                                      {result.url}
                                    </a>
                                  </div>
                                </div>
                                {result.error && (
                                  <p className="mt-1 text-xs text-zinc-600">{result.error}</p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {syncBravoValidProfileCards.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No valid Bravo profile pages resolved from canonical `/people/*` probes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoValidProfileCards.map((person) => (
                          <article
                            key={person.url}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {person.heroImageUrl ? (
                                  <GalleryImage
                                    src={person.heroImageUrl}
                                    alt={person.name || "Bravo profile"}
                                    sizes="96px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {person.name || "Unresolved cast member"}
                                </p>
                                <a
                                  href={person.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                                >
                                  {person.url}
                                </a>
                                {person.bio && (
                                  <p className="mt-2 line-clamp-3 text-xs text-zinc-600">{person.bio}</p>
                                )}
                                {person.socialLinks.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {person.socialLinks.map((social) => (
                                      <a
                                        key={`${person.url}-${social.key}-${social.url}`}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100"
                                      >
                                        {social.label}
                                        {social.handle ? ` ${social.handle}` : ""}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {syncBravoCandidateIssues.length > 0 && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Missing / Error Profiles
                        </p>
                        <div className="mt-2 space-y-2">
                          {syncBravoCandidateIssues.map((result) => (
                            <article
                              key={`${result.status}-${result.url}`}
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                    result.status === "missing"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {result.status}
                                </span>
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                >
                                  {result.url}
                                </a>
                              </div>
                              {result.reason && (
                                <p className="mt-1 text-xs text-zinc-600">{result.reason}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Fandom Probe Queue
                        </p>
                        <p className="text-[11px] font-semibold text-zinc-500">
                          tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                          missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                        </p>
                      </div>
                      {syncFandomDomainsUsed.length > 0 && (
                        <p className="mt-1 text-[11px] text-zinc-500">
                          Domains: {syncFandomDomainsUsed.join(", ")}
                        </p>
                      )}
                      {syncFandomPersonCandidateResults.length === 0 ? (
                        <p className="mt-2 text-sm text-zinc-500">
                          Preparing canonical `/wiki/*` candidate probes...
                        </p>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {syncFandomPersonCandidateResults.map((result) => {
                            const status = String(result.status || "pending").trim().toLowerCase();
                            const badgeClass =
                              status === "ok"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "missing"
                                  ? "bg-amber-100 text-amber-700"
                                  : status === "error"
                                    ? "bg-red-100 text-red-700"
                                    : status === "in_progress"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-zinc-200 text-zinc-700";
                            return (
                              <article
                                key={`fandom-candidate-${result.url}`}
                                className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${badgeClass}`}
                                  >
                                    {status}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-800">
                                      {result.name || "Unresolved cast member"}
                                    </p>
                                    <a
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                    >
                                      {result.url}
                                    </a>
                                  </div>
                                </div>
                                {result.error && (
                                  <p className="mt-1 text-xs text-zinc-600">{result.error}</p>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {syncFandomValidProfileCards.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No valid Fandom profile pages resolved from canonical `/wiki/*` probes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {syncFandomValidProfileCards.map((person) => (
                          <article
                            key={`fandom-profile-${person.url}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {person.heroImageUrl ? (
                                  <GalleryImage
                                    src={person.heroImageUrl}
                                    alt={person.name || "Fandom profile"}
                                    sizes="96px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-zinc-900">
                                  {person.name || "Unresolved cast member"}
                                </p>
                                <a
                                  href={person.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                                >
                                  {person.url}
                                </a>
                                {person.bio && (
                                  <p className="mt-2 line-clamp-3 text-xs text-zinc-600">{person.bio}</p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {syncFandomCandidateIssues.length > 0 && (
                      <div className="rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Fandom Missing / Error Profiles
                        </p>
                        <div className="mt-2 space-y-2">
                          {syncFandomCandidateIssues.map((result) => (
                            <article
                              key={`fandom-${result.status}-${result.url}`}
                              className="rounded-md border border-zinc-200 bg-zinc-50 p-2"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                                    result.status === "missing"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {result.status}
                                </span>
                                <a
                                  href={result.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="min-w-0 break-all text-xs text-blue-700 hover:underline"
                                >
                                  {result.url}
                                </a>
                              </div>
                              {result.reason && (
                                <p className="mt-1 text-xs text-zinc-600">{result.reason}</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : syncBravoPreviewCastLinks.length === 0 ? (
                  <p className="text-sm text-zinc-500">No cast member URLs found in this preview.</p>
                ) : (
                  <div className="space-y-2">
                    {syncBravoPreviewCastLinks.map((person) => (
                      <article
                        key={person.url}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                      >
                        <p className="text-sm font-semibold text-zinc-900">
                          {person.name || "Unresolved cast member"}
                        </p>
                        <a
                          href={person.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                        >
                          {person.url}
                        </a>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {syncBravoRunMode !== "cast-only" && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Fandom Cast Coverage
                    </p>
                    <p className="text-[11px] font-semibold text-zinc-500">
                      tested {syncFandomProbeSummary.tested} / valid {syncFandomProbeSummary.valid} /
                      missing {syncFandomProbeSummary.missing} / error {syncFandomProbeSummary.errors}
                    </p>
                  </div>
                  {syncFandomDomainsUsed.length > 0 && (
                    <p className="mb-2 text-xs text-zinc-500">
                      Domains used: {syncFandomDomainsUsed.join(", ")}
                    </p>
                  )}
                  {syncFandomValidProfileCards.length === 0 ? (
                    <p className="text-sm text-zinc-500">No valid Fandom cast profiles found in this preview.</p>
                  ) : (
                    <div className="space-y-2">
                      {syncFandomValidProfileCards.map((person) => (
                        <article
                          key={`full-fandom-${person.url}`}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                        >
                          <p className="text-sm font-semibold text-zinc-900">
                            {person.name || "Unresolved cast member"}
                          </p>
                          <a
                            href={person.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                          >
                            {person.url}
                          </a>
                          {person.bio && (
                            <p className="mt-2 line-clamp-2 text-xs text-zinc-600">{person.bio}</p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                  {syncFandomCandidateIssues.length > 0 && (
                    <div className="mt-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Fandom Missing / Error Profiles
                      </p>
                      <div className="mt-2 space-y-1">
                        {syncFandomCandidateIssues.map((result) => (
                          <p key={`full-fandom-issue-${result.url}`} className="text-xs text-zinc-600">
                            {result.status.toUpperCase()}: {result.url}
                            {result.reason ? ` (${result.reason})` : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {syncBravoRunMode !== "cast-only" && (
                <>
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      News
                    </p>
                    {syncBravoPreviewNews.length === 0 ? (
                      <p className="text-sm text-zinc-500">No news items found in this preview.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoPreviewNews.map((item) => (
                          <article
                            key={`${item.article_url}-${item.published_at ?? "unknown"}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {item.image_url ? (
                                  <GalleryImage
                                    src={item.image_url}
                                    alt={item.headline || "Bravo news"}
                                    sizes="120px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={item.article_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                                >
                                  {item.headline || "Untitled story"}
                                </a>
                                {formatBravoPublishedDate(item.published_at) && (
                                  <p className="mt-1 text-xs text-zinc-500">
                                    Posted {formatBravoPublishedDate(item.published_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Videos
                      </p>
                      {syncBravoPreviewSeasonOptions.length > 0 && (
                        <label className="flex items-center gap-2 text-xs text-zinc-600">
                          <span>Season</span>
                          <select
                            value={syncBravoPreviewSeasonFilter}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              onVideoSeasonFilterChange(
                                nextValue === "all" ? "all" : Number.parseInt(nextValue, 10)
                              );
                            }}
                            className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                          >
                            <option value="all">All</option>
                            {syncBravoPreviewSeasonOptions.map((season) => (
                              <option key={season} value={season}>
                                Season {season}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    {syncBravoFilteredPreviewVideos.length === 0 ? (
                      <p className="text-sm text-zinc-500">No videos found for this preview/season filter.</p>
                    ) : (
                      <div className="space-y-2">
                        {syncBravoFilteredPreviewVideos.map((video) => (
                          <article
                            key={`${video.clip_url}-${video.published_at ?? "unknown"}`}
                            className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                          >
                            <div className="flex gap-3">
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                {video.image_url ? (
                                  <GalleryImage
                                    src={video.image_url}
                                    alt={video.title || "Bravo video"}
                                    sizes="120px"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                                    No image
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={video.clip_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-blue-700"
                                >
                                  {video.title || "Untitled video"}
                                </a>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                                  {video.runtime && <span>{video.runtime}</span>}
                                  {typeof video.season_number === "number" && (
                                    <span>Season {video.season_number}</span>
                                  )}
                                  {formatBravoPublishedDate(video.published_at) && (
                                    <span>Posted {formatBravoPublishedDate(video.published_at)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
    </>
  );
}

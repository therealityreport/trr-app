"use client";

import { GalleryImage } from "@/app/admin/trr-shows/[showId]/ShowPageMedia";
import AdminModal from "@/components/admin/AdminModal";
import ShowBravoSyncPreviewStep, {
  type BravoSyncRunMode,
  type BravoSyncSelectedImageSummary,
  type ShowBravoSyncPreviewStepProps,
} from "@/components/admin/ShowBravoSyncPreviewStep";

export type ShowBravoSyncModalProps = {
  modePicker: {
    open: boolean;
    onClose: () => void;
    onStart: (mode: BravoSyncRunMode) => void;
  };
  dialog: {
    open: boolean;
    step: "preview" | "confirm";
    modeSummaryLabel: string;
    previewSignature: string | null;
    commitLoading: boolean;
    onClose: () => void;
    onBack: () => void;
    onCancel: () => void;
    onNext: () => void;
    onCommit: () => void | Promise<void>;
  };
  season: {
    targetSeasonNumber: number | null;
    defaultSeasonNumber: number | null;
    options: ReadonlyArray<number>;
    onChange: (seasonNumber: number | null) => void;
  };
  preview: ShowBravoSyncPreviewStepProps;
  confirm: {
    castSyncCount: number;
    selectedImageSummaries: ReadonlyArray<BravoSyncSelectedImageSummary>;
  };
};

export default function ShowBravoSyncModal({
  modePicker,
  dialog,
  season,
  preview,
  confirm,
}: ShowBravoSyncModalProps) {
  const {
    open: syncBravoModePickerOpen,
    onClose: closeModePicker,
    onStart: startSyncBravoFlow,
  } = modePicker;
  const {
    open: syncBravoOpen,
    step: syncBravoStep,
    modeSummaryLabel: syncBravoModeSummaryLabel,
    previewSignature: syncBravoPreviewSignature,
    commitLoading: syncBravoCommitLoading,
    onNext: openSyncBravoConfirmStep,
    onCommit: commitSyncByBravo,
  } = dialog;
  const {
    targetSeasonNumber: syncBravoTargetSeasonNumber,
    defaultSeasonNumber: defaultSyncBravoSeasonNumber,
    options: syncBravoSeasonOptions,
    onChange: setSyncBravoTargetSeasonNumber,
  } = season;
  const {
    runMode: syncBravoRunMode,
    loading: syncBravoLoading,
    showName,
    bravoUrl,
    error: syncBravoError,
    notice: syncBravoNotice,
    description: syncBravoDescription,
    airs: syncBravoAirs,
    applyDescriptionToShow: syncBravoApplyDescriptionToShow,
    probeSummary: syncBravoProbeSummary,
    fandomProbeSummary: syncFandomProbeSummary,
    fandomDomainsUsed: syncFandomDomainsUsed,
    validProfileCards: syncBravoValidProfileCards,
    fandomValidProfileCards: syncFandomValidProfileCards,
    castLinks: syncBravoPreviewCastLinks,
  } = preview;
  const {
    castSyncCount: syncBravoCastSyncCount,
    selectedImageSummaries: syncBravoSelectedImageSummaries,
  } = confirm;

  return (
    <>
        <AdminModal
          isOpen={syncBravoModePickerOpen}
          onClose={() => closeModePicker()}
          closeLabel="Close sync mode picker"
          ariaLabel="Sync by Bravo mode picker"
          panelClassName="max-w-md"
        >
              <h3 className="text-lg font-bold text-zinc-900">Sync by Bravo</h3>
              <p className="mt-1 text-sm text-zinc-600">
                Choose what to sync from Bravo for this run.
              </p>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => startSyncBravoFlow("full")}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Sync All Info
                </button>
                <button
                  type="button"
                  onClick={() => startSyncBravoFlow("cast-only")}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cast Info only
                </button>
              </div>
              <button
                type="button"
                onClick={() => closeModePicker()}
                className="mt-4 w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
        </AdminModal>

        <AdminModal
          isOpen={syncBravoOpen}
          onClose={dialog.onClose}
          disableClose={syncBravoLoading}
          closeLabel="Close Bravo sync dialog"
          ariaLabel="Import by Bravo"
          panelClassName="max-h-[90vh] max-w-3xl overflow-y-auto"
        >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900">
                    Import by Bravo {syncBravoRunMode === "cast-only" ? "(Cast Info only)" : ""}
                  </h3>
                  <p className="text-sm text-zinc-500">Preview and commit persisted Bravo snapshots for this show.</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Step {syncBravoStep === "preview" ? "1" : "2"} of 2
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Selected Mode: {syncBravoModeSummaryLabel}
                  </p>
                  {syncBravoPreviewSignature && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Preview Signature: {syncBravoPreviewSignature.slice(0, 12)}...
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dialog.onClose}
                  disabled={syncBravoLoading}
                  className="rounded-md border border-zinc-200 px-3 py-1 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Close
                </button>
              </div>

              <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Sync Season
                  <select
                    value={syncBravoTargetSeasonNumber ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      const parsed = Number.parseInt(raw, 10);
                      setSyncBravoTargetSeasonNumber(
                        Number.isFinite(parsed) ? parsed : defaultSyncBravoSeasonNumber
                      );
                    }}
                    disabled={syncBravoLoading || syncBravoSeasonOptions.length === 0}
                    className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-zinc-800 disabled:opacity-50"
                  >
                    {syncBravoSeasonOptions.length === 0 ? (
                      <option value="">No eligible seasons</option>
                    ) : (
                      syncBravoSeasonOptions.map((seasonNumber) => (
                        <option key={seasonNumber} value={seasonNumber}>
                          Season {seasonNumber}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <p className="mt-2 text-xs text-zinc-500">
                  Bravo profile images from this run will be assigned as season promos for the selected season. Eligible seasons require more than 1 episode or a premiere date.
                </p>
              </div>

              {syncBravoStep === "preview" ? (
                <ShowBravoSyncPreviewStep {...preview} />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Show Name
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-800">{showName}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Bravo Show URL
                    </p>
                    {bravoUrl ? (
                      <a
                        href={bravoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-xs text-blue-700 hover:underline"
                      >
                        {bravoUrl}
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-zinc-500">Could not infer URL yet.</p>
                    )}
                    {syncBravoRunMode !== "cast-only" && syncBravoDescription.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Description
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoDescription.trim()}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {syncBravoApplyDescriptionToShow
                            ? "Will be applied to show profile."
                            : "Will not overwrite show profile unless enabled in preview step."}
                        </p>
                      </>
                    )}
                    {syncBravoRunMode !== "cast-only" && syncBravoAirs.trim() && (
                      <>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                          Airs / Tune-In
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{syncBravoAirs.trim()}</p>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Cast Members Being Synced ({syncBravoCastSyncCount})
                    </p>
                    {syncBravoRunMode === "cast-only" && (
                      <>
                        <p className="mb-1 text-xs text-zinc-500">
                          Bravo summary: tested {syncBravoProbeSummary.tested}, valid{" "}
                          {syncBravoProbeSummary.valid}, missing {syncBravoProbeSummary.missing},
                          errors {syncBravoProbeSummary.errors}.
                        </p>
                        <p className="mb-2 text-xs text-zinc-500">
                          Fandom summary: tested {syncFandomProbeSummary.tested}, valid{" "}
                          {syncFandomProbeSummary.valid}, missing {syncFandomProbeSummary.missing},
                          errors {syncFandomProbeSummary.errors}.
                        </p>
                        {syncFandomDomainsUsed.length > 0 && (
                          <p className="mb-2 text-xs text-zinc-500">
                            Fandom domains used: {syncFandomDomainsUsed.join(", ")}
                          </p>
                        )}
                      </>
                    )}
                    {syncBravoRunMode === "cast-only" ? (
                      <div className="space-y-3">
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Bravo Profiles ({syncBravoValidProfileCards.length})
                          </p>
                          {syncBravoValidProfileCards.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                              No valid Bravo cast profile URLs were detected in this preview.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {syncBravoValidProfileCards.map((person) => (
                                <article
                                  key={person.url}
                                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {person.name || "Unresolved cast member"}
                                  </p>
                                  <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                            Fandom Profiles ({syncFandomValidProfileCards.length})
                          </p>
                          {syncFandomValidProfileCards.length === 0 ? (
                            <p className="text-sm text-zinc-500">
                              No valid Fandom cast profile URLs were detected in this preview.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {syncFandomValidProfileCards.map((person) => (
                                <article
                                  key={`confirm-fandom-${person.url}`}
                                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                                >
                                  <p className="text-sm font-semibold text-zinc-900">
                                    {person.name || "Unresolved cast member"}
                                  </p>
                                  <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
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
                            <p className="mt-1 break-all text-xs text-zinc-600">{person.url}</p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  {syncBravoRunMode !== "cast-only" && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        Show Images Being Synced ({syncBravoSelectedImageSummaries.length})
                      </p>
                      {syncBravoSelectedImageSummaries.length === 0 ? (
                        <p className="text-sm text-zinc-500">No show images selected for sync.</p>
                      ) : (
                        <div className="space-y-2">
                          {syncBravoSelectedImageSummaries.map((image) => (
                            <article
                              key={image.url}
                              className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                            >
                              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded bg-zinc-100">
                                <GalleryImage src={image.url} alt={image.alt || "Selected show image"} sizes="120px" />
                              </div>
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                                  {image.alt || "Show image"}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                  Type: {image.kind}
                                </p>
                                <p className="mt-1 break-all text-xs text-zinc-600">{image.url}</p>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {syncBravoStep === "confirm" && (syncBravoError || syncBravoNotice) && (
                <p className={`mb-4 text-sm ${syncBravoError ? "text-red-600" : "text-zinc-600"}`}>
                  {syncBravoError || syncBravoNotice}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={syncBravoStep === "confirm" ? dialog.onBack : dialog.onCancel}
                  disabled={syncBravoLoading}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  {syncBravoStep === "confirm" ? "Back" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={syncBravoStep === "confirm" ? commitSyncByBravo : openSyncBravoConfirmStep}
                  disabled={syncBravoLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {syncBravoStep === "confirm"
                    ? syncBravoCommitLoading
                      ? "Syncing..."
                      : syncBravoRunMode === "cast-only"
                        ? "Sync Cast Info only"
                        : "Sync All Info"
                    : "Next"}
                </button>
              </div>
        </AdminModal>
    </>
  );
}

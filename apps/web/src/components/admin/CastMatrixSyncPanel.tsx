"use client";

export interface CastMatrixSyncResult {
  show_id: string;
  source_urls?: {
    wikipedia?: string | null;
    fandom?: string | null;
  };
  counts?: {
    season_role_assignments_upserted?: number;
    relationship_role_assignments_upserted?: number;
    global_kid_assignments_upserted?: number;
    auto_assignments_replaced?: number;
    bravo_links_upserted?: number;
    bravo_images_imported?: number;
    bravo_images_skipped?: number;
  };
  unmatched?: {
    cast_names?: string[];
    relationship_names?: string[];
    missing_season_evidence?: string[];
  };
}

interface CastMatrixSyncPanelProps {
  loading: boolean;
  error: string | null;
  result: CastMatrixSyncResult | null;
  scopeLabel: string;
  onSync: () => void;
}

const countValue = (value: unknown): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const listValue = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
};

const CountTile = ({ label, value }: { label: string; value: number }) => {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-zinc-900">{value}</p>
    </div>
  );
};

export function CastMatrixSyncPanel({
  loading,
  error,
  result,
  scopeLabel,
  onSync,
}: CastMatrixSyncPanelProps) {
  const counts = result?.counts ?? {};
  const unmatchedCast = listValue(result?.unmatched?.cast_names);
  const unmatchedRelationships = listValue(result?.unmatched?.relationship_names);
  const missingSeasonEvidence = listValue(result?.unmatched?.missing_season_evidence);

  return (
    <section className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Cast Matrix Sync</p>
          <p className="text-xs text-zinc-600">{scopeLabel}</p>
        </div>
        <button
          type="button"
          onClick={onSync}
          disabled={loading}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync Cast Roles (Wiki/Fandom)"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <CountTile
              label="Season Roles"
              value={countValue(counts.season_role_assignments_upserted)}
            />
            <CountTile
              label="Relationship Roles"
              value={countValue(counts.relationship_role_assignments_upserted)}
            />
            <CountTile
              label="Global Kid Roles"
              value={countValue(counts.global_kid_assignments_upserted)}
            />
            <CountTile
              label="Auto Replaced"
              value={countValue(counts.auto_assignments_replaced)}
            />
            <CountTile
              label="Bravo Links"
              value={countValue(counts.bravo_links_upserted)}
            />
            <CountTile
              label="Bravo Images Imported"
              value={countValue(counts.bravo_images_imported)}
            />
            <CountTile
              label="Bravo Images Skipped"
              value={countValue(counts.bravo_images_skipped)}
            />
          </div>

          {(unmatchedCast.length > 0 || unmatchedRelationships.length > 0 || missingSeasonEvidence.length > 0) && (
            <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
              {unmatchedCast.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Unmatched Cast Names</p>
                  <p className="mt-1 text-xs text-zinc-700">{unmatchedCast.join(", ")}</p>
                </div>
              )}
              {unmatchedRelationships.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Unmatched Relationship Names</p>
                  <p className="mt-1 text-xs text-zinc-700">{unmatchedRelationships.join(", ")}</p>
                </div>
              )}
              {missingSeasonEvidence.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Missing Season Evidence</p>
                  <p className="mt-1 text-xs text-zinc-700">{missingSeasonEvidence.join("; ")}</p>
                </div>
              )}
            </div>
          )}

          {(result.source_urls?.wikipedia || result.source_urls?.fandom) && (
            <p className="text-[11px] text-zinc-500">
              Sources:
              {result.source_urls?.wikipedia ? ` Wikipedia (${result.source_urls.wikipedia})` : ""}
              {result.source_urls?.fandom ? ` | Fandom (${result.source_urls.fandom})` : ""}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

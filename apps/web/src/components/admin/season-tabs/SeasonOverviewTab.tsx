import { ExternalLinks, ImdbLinkIcon, TmdbLinkIcon } from "@/components/admin/ExternalLinks";

type SeasonOverviewShow = {
  name: string;
  tmdb_id: number | null;
  imdb_id: string | null;
};

type SeasonOverviewSeason = {
  id: string;
  season_number: number;
  air_date: string | null;
};

type SeasonOverviewTabProps = {
  show: SeasonOverviewShow;
  season: SeasonOverviewSeason;
  showId: string;
};

export default function SeasonOverviewTab({ show, season, showId }: SeasonOverviewTabProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Overview</p>
          <h3 className="text-xl font-bold text-zinc-900">
            {show.name} · Season {season.season_number}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {show.tmdb_id && (
            <TmdbLinkIcon showTmdbId={show.tmdb_id} seasonNumber={season.season_number} type="season" />
          )}
          {show.imdb_id && <ImdbLinkIcon imdbId={show.imdb_id} type="title" />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">TRR Show ID:</span>
            <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{showId}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">TRR Season ID:</span>
            <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{season.id}</code>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">Season Number:</span>
            <span className="font-semibold text-zinc-900">{season.season_number}</span>
          </div>
          {season.air_date && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-500">First Air Date:</span>
              <span className="text-zinc-900">{new Date(season.air_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div>
          <ExternalLinks externalIds={null} tmdbId={show.tmdb_id} imdbId={show.imdb_id} type="show" />
        </div>
      </div>
    </div>
  );
}

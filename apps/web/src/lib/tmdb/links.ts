/**
 * Helper functions to generate TMDb URLs for shows, seasons, episodes, and people.
 */

export const tmdbLinks = {
  /**
   * Link to a TV show page on TMDb.
   */
  show: (tmdbId: number) => `https://www.themoviedb.org/tv/${tmdbId}`,

  /**
   * Link to a specific season of a TV show on TMDb.
   */
  season: (showTmdbId: number, seasonNumber: number) =>
    `https://www.themoviedb.org/tv/${showTmdbId}/season/${seasonNumber}`,

  /**
   * Link to a specific episode of a TV show on TMDb.
   */
  episode: (showTmdbId: number, seasonNumber: number, episodeNumber: number) =>
    `https://www.themoviedb.org/tv/${showTmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,

  /**
   * Link to a person/cast member page on TMDb.
   */
  person: (tmdbId: number) => `https://www.themoviedb.org/person/${tmdbId}`,
};

/**
 * Helper functions to generate IMDb URLs.
 */
export const imdbLinks = {
  /**
   * Link to a title (movie/show) on IMDb.
   */
  title: (imdbId: string) => `https://www.imdb.com/title/${imdbId}`,

  /**
   * Link to a person on IMDb.
   */
  person: (imdbId: string) => `https://www.imdb.com/name/${imdbId}`,
};

/**
 * Helper functions to generate TVDb URLs.
 */
export const tvdbLinks = {
  /**
   * Link to a series on TVDb.
   */
  series: (tvdbId: number) => `https://thetvdb.com/series/${tvdbId}`,

  /**
   * Link to a person on TVDb.
   */
  person: (tvdbId: number) => `https://thetvdb.com/people/${tvdbId}`,
};

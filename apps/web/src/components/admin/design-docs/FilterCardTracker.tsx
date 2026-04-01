"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";

import type { FilterCardPlayerData, FilterCardTrackerData } from "./chart-data";
import styles from "./FilterCardTracker.module.css";

const GREEN = { imgBg: "#3C5634", statBg: "#4EAB75", rankBg: "#3C5634" };
const DEFAULT = { imgBg: "#121212", statBg: "#386C92", rankBg: "#121212" };

type FilterCardTrackerPlayer = FilterCardPlayerData & { howHeFits?: string };

interface FilterCardTrackerProps {
  data: FilterCardTrackerData;
  colorScheme?: string;
  filters: readonly { label: string; options: readonly string[] }[];
}

function getColors(scheme: string) {
  return scheme === "green" ? GREEN : DEFAULT;
}

function decodeHtmlEntities(value: string | undefined) {
  if (!value) return "";

  return value
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function splitCopy(text: string | undefined) {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function CardSvgBg() {
  return (
    <>
      <svg
        width="249"
        height="66"
        viewBox="0 0 249 66"
        aria-hidden="true"
        className={styles.desktopShape}
      >
        <polygon
          className={styles.imageBg}
          points="98.71 66 0 66 34 0 132.71 0 98.71 66"
        />
        <polyline
          className={styles.statBg}
          points="248.27 66 98.71 66 132.71 0 248.27 0"
        />
      </svg>
      <svg
        width="218"
        height="66"
        viewBox="0 0 218 66"
        aria-hidden="true"
        className={styles.mobileShape}
      >
        <polyline
          className={styles.statBg}
          points="218.27 66 118.71 66 152.71 0 218.27 0"
        />
      </svg>
    </>
  );
}

function PlayerCard({
  player,
  expanded,
  onToggle,
}: {
  player: FilterCardTrackerPlayer;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isSigned = player.status === "Agreed";
  const scoutingParagraphs = splitCopy(player.scouting);
  const howHeFitsParagraphs = splitCopy(player.howHeFits);
  const displayName = decodeHtmlEntities(player.name);
  const displayFromTeam = decodeHtmlEntities(player.fromTeam);
  const displayToTeam = decodeHtmlEntities(player.toTeam);
  const displayContractYears = decodeHtmlEntities(player.contractYears);
  const displayContractValue = decodeHtmlEntities(player.contractValue);
  const displayContractProjection = decodeHtmlEntities(player.contractProjection);
  const displayReportedContract = decodeHtmlEntities(player.reportedContract);

  return (
    <article
      className={[
        styles.card,
        expanded ? styles.cardExpanded : "",
        isSigned ? styles.cardSigned : "",
      ].join(" ")}
    >
      <div className={styles.outerContainer}>
        <button
          type="button"
          className={styles.header}
          aria-expanded={expanded}
          aria-controls={`fc-copy-${player.rank}`}
          onClick={onToggle}
        >
          <div className={styles.rank}>
            <span className={styles.rankText}>{player.rank}</span>
          </div>

          <div className={styles.playerDetails}>
            <div className={styles.headlineContainer}>
              <h3 className={styles.playerHeadline}>{displayName}</h3>
            </div>
          </div>

          {isSigned ? (
            <>
              <div className={styles.imageBgContainer}>
                <CardSvgBg />
              </div>
              <div className={styles.logoContainer}>
                {player.teamLogoUrl ? (
                  <img
                    src={player.teamLogoUrl}
                    alt={displayToTeam || displayFromTeam}
                    loading="lazy"
                    className={styles.logoImage}
                  />
                ) : null}
              </div>
              {player.contractYears ? (
                <div className={styles.spotlight}>
                  <div className={styles.spotlightStat}>{displayContractYears}</div>
                  <div className={styles.spotlightDesc}>{displayContractValue}</div>
                </div>
              ) : null}
            </>
          ) : null}
        </button>

        <div
          id={`fc-copy-${player.rank}`}
          className={styles.copy}
          style={{ maxHeight: expanded ? "2400px" : "0px" }}
        >
          <div className={styles.copyGrid}>
            <section className={styles.copyColumn}>
              <div className={styles.copyItem}>
                {player.contractProjection ? (
                  <p className={styles.metaParagraph}>
                    <strong className={styles.metaLabel}>Contract projection: </strong>
                    {displayContractProjection}
                  </p>
                ) : null}
                {player.reportedContract ? (
                  <p className={styles.metaParagraph}>
                    <strong className={styles.metaLabel}>Reported contract: </strong>
                    {displayReportedContract}
                  </p>
                ) : null}
                <p className={styles.metaLine}>
                  <strong className={styles.metaLabel}>Age: </strong>
                  {player.age}
                  <strong className={styles.metaSpacer}>Height: </strong>
                  {player.height}
                  <strong className={styles.metaSpacer}>Weight: </strong>
                  {player.weight}
                </p>
                {(scoutingParagraphs.length ? scoutingParagraphs : [player.scouting]).map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className={styles.bodyParagraph}>
                    {decodeHtmlEntities(paragraph)}
                  </p>
                ))}
              </div>
            </section>

            <aside className={styles.copyColumn}>
              {player.howHeFits ? (
                <div className={`${styles.copyItem} ${styles.copyItemCompact}`}>
                  <div className={styles.sectionTitle}>How he fits</div>
                  {(howHeFitsParagraphs.length ? howHeFitsParagraphs : [player.howHeFits]).map((paragraph) => (
                    <p key={paragraph.slice(0, 24)} className={styles.bodyParagraph}>
                      {decodeHtmlEntities(paragraph)}
                    </p>
                  ))}
                </div>
              ) : null}

              {player.headshot ? (
                <div className={`${styles.copyItem} ${styles.copyItemCompact}`}>
                  <img
                    src={player.headshot}
                    alt={displayName}
                    loading="lazy"
                    className={styles.headshot}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              ) : null}

              {player.stats.length > 0 ? (
                <div className={`${styles.copyItem} ${styles.copyItemCompact}`}>
                  <div className={styles.statsCard}>
                    <div className={styles.statsTitle}>Stats</div>
                    {player.stats.map((stat) => (
                      <div key={stat.label} className={styles.statsRow}>
                        <span className={styles.statsLabel}>{decodeHtmlEntities(stat.label)}</span>
                        <span className={styles.statsValue}>{decodeHtmlEntities(stat.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>

          <button type="button" className={styles.drawer} onClick={onToggle}>
            <div className={styles.pills}>
              <span className={styles.pill}>{decodeHtmlEntities(player.position)}</span>
              <span className={styles.pill}>{decodeHtmlEntities(player.status)}</span>
              {player.fromTeam ? <span className={styles.pill}>From {displayFromTeam}</span> : null}
              {player.toTeam ? <span className={styles.pill}>To {displayToTeam}</span> : null}
            </div>
            <div className={styles.drawerToggle}>
              <span className={styles.drawerLabel}>{expanded ? "Collapse" : "Expand"}</span>
              <span
                aria-hidden="true"
                className={[
                  styles.arrow,
                  expanded ? styles.arrowExpanded : "",
                ].join(" ")}
              />
            </div>
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FilterCardTracker({
  data,
  colorScheme = "green",
  filters,
}: FilterCardTrackerProps) {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const filteredPlayers = useMemo(() => {
    return (data.players as readonly FilterCardTrackerPlayer[]).filter((player) => {
      if (
        searchQuery &&
        !decodeHtmlEntities(player.name).toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      const position = filterValues.Position;
      if (
        position &&
        position !== "all" &&
        player.position.toLowerCase() !== position.toLowerCase()
      ) {
        return false;
      }

      const availability = filterValues.Availability;
      if (availability && availability !== "all" && player.status !== availability) {
        return false;
      }

      const previousTeam = filterValues["Previous team"];
      if (previousTeam && previousTeam !== "all" && player.fromTeam !== previousTeam) {
        return false;
      }

      const newTeam = filterValues["New team"];
      if (newTeam && newTeam !== "all" && player.toTeam !== newTeam) {
        return false;
      }

      return true;
    });
  }, [data.players, filterValues, searchQuery]);

  const colors = getColors(colorScheme);

  return (
    <div
      className={styles.root}
      style={
        {
          "--fc-img-bg": colors.imgBg,
          "--fc-stat-bg": colors.statBg,
          "--fc-rank-bg": colors.rankBg,
        } as React.CSSProperties
      }
    >
      <div className={styles.filterContainer}>
        {filters.map((filter) => (
          <label key={filter.label} className={styles.filterWrapper}>
            <span className={styles.srOnly}>{filter.label}</span>
            <select
              aria-label={filter.label}
              className={styles.filterSelect}
              value={filterValues[filter.label] ?? "all"}
              onChange={(event) =>
                setFilterValues((current) => ({
                  ...current,
                  [filter.label]: event.target.value,
                }))
              }
            >
              <option value="all">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
        <div className={styles.expandContainer}>
          <button type="button" className={styles.expandButton} onClick={() => {
            setExpandedCards(new Set(filteredPlayers.map((player) => player.rank)));
          }}>
            Expand all
          </button>
          <button type="button" className={styles.expandButton} onClick={() => {
            setExpandedCards(new Set());
          }}>
            Collapse all
          </button>
        </div>
      </div>

      <div className={styles.cardsContainer}>
        <div className={styles.searchRow}>
          <input
            type="search"
            aria-label="Search players"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.searchInput}
          />
        </div>

        {filteredPlayers.length === 0 ? (
          <div className={styles.noResults}>
            <div className={styles.noResultsBadge}>No Player Results</div>
            <div className={styles.noResultsDirections}>
              Try changing or resetting your filters to see more.
            </div>
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <PlayerCard
              key={player.rank}
              player={player}
              expanded={expandedCards.has(player.rank)}
              onToggle={() => {
                setExpandedCards((current) => {
                  const next = new Set(current);
                  if (next.has(player.rank)) {
                    next.delete(player.rank);
                  } else {
                    next.add(player.rank);
                  }
                  return next;
                });
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

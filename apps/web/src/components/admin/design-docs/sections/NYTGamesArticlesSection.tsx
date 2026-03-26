"use client";

import Link from "next/link";
import { GAME_ARTICLES } from "@/lib/admin/design-docs-config";
import { GAME_META } from "./games/game-palettes";

export default function NYTGamesArticlesSection() {
  return (
    <div className="nytg-scope">
      <div className="dd-section-label">NYT Games</div>
      <h2 className="dd-section-title">Games</h2>
      <p className="dd-section-desc">
        Per-game design breakdowns &mdash; each game has its own page with palette,
        typography, component specimens, tech stack, and A/B test details extracted
        from live nytimes.com source.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginTop: 32,
        }}
      >
        {GAME_ARTICLES.map((game) => {
          const meta = GAME_META.find((m) => m.id === game.id);
          return (
            <Link
              key={game.id}
              href={`/admin/design-docs/nyt-games-articles/${game.id}` as never}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  background: "var(--dd-paper-white)",
                  border: "1px solid var(--dd-paper-grey)",
                  borderRadius: 8,
                  borderTop: `4px solid ${game.themeColor}`,
                  padding: "20px 18px 18px",
                  cursor: "pointer",
                  transition:
                    "transform 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), box-shadow 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 4px 23px rgba(0,0,0,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--dd-font-ui)",
                    fontWeight: 700,
                    fontSize: 18,
                    color: "var(--dd-ink-black)",
                    marginBottom: 6,
                  }}
                >
                  {game.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--dd-font-sans)",
                    fontSize: 13,
                    color: "var(--dd-ink-soft)",
                    lineHeight: 1.5,
                    marginBottom: 12,
                  }}
                >
                  {game.description}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {meta && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "var(--dd-font-sans)",
                        color: "#fff",
                        background:
                          meta.status === "Core"
                            ? "#4f85e5"
                            : meta.status === "New"
                              ? "#6aaa64"
                              : meta.status === "Original"
                                ? "#787C7E"
                                : "#ba81c5",
                        borderRadius: 4,
                        padding: "2px 8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {meta.status}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--dd-font-mono)",
                      color: "var(--dd-ink-light)",
                      background: "var(--dd-paper-cool)",
                      borderRadius: 4,
                      padding: "2px 8px",
                    }}
                  >
                    {game.cssChunks.length} CSS + {game.jsChunkCount} JS chunks
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        {/* Placeholder cards for games not yet documented */}
        {GAME_META.filter((m) => !GAME_ARTICLES.find((g) => g.id === m.id) && m.status !== "Unlisted").map((meta) => (
          <div
            key={meta.id}
            style={{
              background: "var(--dd-paper-cool)",
              border: "1px dashed var(--dd-paper-grey)",
              borderRadius: 8,
              borderTop: `4px solid ${meta.color}`,
              padding: "20px 18px 18px",
              opacity: 0.6,
            }}
          >
            <div
              style={{
                fontFamily: "var(--dd-font-ui)",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--dd-ink-soft)",
                marginBottom: 6,
              }}
            >
              {meta.name}
            </div>
            <div
              style={{
                fontFamily: "var(--dd-font-sans)",
                fontSize: 13,
                color: "var(--dd-ink-light)",
                lineHeight: 1.5,
              }}
            >
              {meta.description} &mdash; Coming soon
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

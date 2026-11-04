"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import {
  TWITTER_RESEARCH_ENDPOINT,
  type TwitterResearchRequest,
  type TwitterResearchResponse,
} from "@/lib/admin/twitter-research";

const controlClass = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50";

export default function TwitterResearchPanel({ user }: { user: User }) {
  const [enabled, setEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"latest" | "top">("latest");
  const [maxPages, setMaxPages] = useState(1);
  const [maxItems, setMaxItems] = useState(20);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<TwitterResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || pending || !query.trim()) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    setResult(null);
    setError(null);
    const body: TwitterResearchRequest = {
      mode: "anonymous_research", provider: "lurkbird", query: query.trim(),
      sort, max_pages: maxPages, max_items: maxItems,
    };
    try {
      const response = await fetchAdminWithAuth(TWITTER_RESEARCH_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal,
      }, { preferredUser: user });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Research search request failed.");
      if (!Array.isArray(data.tweets) || data.retrieval_meta?.retrieval_mode !== "anonymous_research") {
        throw new Error("Research search returned an unsupported response.");
      }
      if (!controller.signal.aborted) setResult(data as TwitterResearchResponse);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Research search request failed.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  return (
    <details className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer font-semibold text-zinc-900">X research search</summary>
      <p className="mt-3 text-sm text-zinc-600">
        Provider: Lurkbird. Run one anonymous research query at a time. Limit: two pages and 40 posts.
        Coverage, freshness, and the provider&apos;s upstream authentication are unknown.
        The provider prohibits automated bulk collection.
      </p>
      <form onSubmit={search} className="mt-4 space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={enabled} disabled={pending}
            onChange={(event) => setEnabled(event.target.checked)} />
          Anonymous research
        </label>
        <p className="text-xs text-zinc-500">
          No X login is used. Results stay in this panel. Date filters, reply filters, saved results,
          media downloads, and scheduled collection are unavailable in this mode.
        </p>
        <fieldset disabled={!enabled || pending} className="flex flex-wrap items-end gap-3 disabled:opacity-60">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            Search query
            <input className={controlClass} value={query} maxLength={300} required
              onChange={(event) => setQuery(event.target.value)} placeholder="Phrase or hashtag" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Sort
            <select className={controlClass} value={sort}
              onChange={(event) => setSort(event.target.value as "latest" | "top")}>
              <option value="latest">Latest</option><option value="top">Top</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Page limit
            <select className={controlClass} value={maxPages} onChange={(event) => setMaxPages(Number(event.target.value))}>
              <option value={1}>1</option><option value={2}>2</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Post limit
            <input className={`${controlClass} w-20`} type="number" min={1} max={40} step={1} required
              value={maxItems} onChange={(event) => setMaxItems(Number(event.target.value))} />
          </label>
          <button type="submit" disabled={!query.trim()} className={`${controlClass} font-semibold`}>
            {pending ? "Searching…" : "Search public posts"}
          </button>
        </fieldset>
      </form>
      {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
      {result ? (
        <div className="mt-4 space-y-3" aria-live="polite">
          <p role="status" className="text-sm font-medium text-amber-800">
            {result.tweets.length ? `Partial results: ${result.tweets.length} posts` : "Search unavailable or unverified"}
            {` for “${result.query}”. Full search coverage is unknown.`}
          </p>
          <p className="text-xs text-zinc-600">
            Lurkbird · {result.retrieval_meta.pages_scanned} pages read · Stop: {result.retrieval_meta.stop_reason}.
            {" "}{result.retrieval_meta.coverage}. Display text can be truncated or omit media links.
            Engagement, verification, and reply relationships are unavailable.
          </p>
          {result.error ? <p role="alert" className="text-sm text-red-700">{result.error}</p> : null}
          {!result.tweets.length ? <p className="text-sm text-zinc-600">This does not prove there are no matching posts.</p> : null}
          <ol className="space-y-3">
            {result.tweets.map((post) => (
              <li key={post.tweet_id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                <a href={post.url} target="_blank" rel="noreferrer noopener" className="font-medium text-cyan-800 underline">
                  @{post.username} · {post.date_time}
                </a>
                <p className="mt-2 whitespace-pre-wrap break-words">{post.text}</p>
                <p className="mt-2 text-xs text-zinc-500">Engagement: unavailable</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </details>
  );
}

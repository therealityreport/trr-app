"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import {
  BrandShowFranchiseRow,
  FranchiseRule,
  FranchiseRuleApplyResult,
} from "@/lib/admin/brands-shows-franchises";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type RuleDraft = {
  name: string;
  primary_url: string;
  review_allpages_url: string;
  match_terms_csv: string;
  aliases_csv: string;
  network_terms_csv: string;
  source_rank: string;
  include_allpages_scan: boolean;
  is_active: boolean;
};

const SHOWS_FRANCHISES_ENABLED =
  (process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED ??
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED ??
    "true") !== "false";

const csvToList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const listToCsv = (value: string[] | null | undefined): string => (Array.isArray(value) ? value.join(", ") : "");

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string; message?: string };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
    return fallback;
  } catch {
    return fallback;
  }
};

const toDraft = (rule: FranchiseRule): RuleDraft => ({
  name: rule.name ?? "",
  primary_url: rule.primary_url ?? "",
  review_allpages_url: rule.review_allpages_url ?? "",
  match_terms_csv: listToCsv(rule.match_terms),
  aliases_csv: listToCsv(rule.aliases),
  network_terms_csv: listToCsv(rule.network_terms),
  source_rank: String(rule.source_rank ?? 100),
  include_allpages_scan: Boolean(rule.include_allpages_scan),
  is_active: Boolean(rule.is_active),
});

export default function BrandsShowsAndFranchisesPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [showQueryDraft, setShowQueryDraft] = useState("");
  const [showQuery, setShowQuery] = useState("");

  const [rows, setRows] = useState<BrandShowFranchiseRow[]>([]);
  const [rowsCount, setRowsCount] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [rules, setRules] = useState<FranchiseRule[]>([]);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, RuleDraft>>({});
  const [suggestedFranchises, setSuggestedFranchises] = useState<string[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);
  const [applyRunningKey, setApplyRunningKey] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<FranchiseRuleApplyResult | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  const loadShows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const query = new URLSearchParams({
        limit: "300",
      });
      if (showQuery.trim().length > 0) {
        query.set("q", showQuery.trim());
      }
      const response = await fetchWithAuth(`/api/admin/trr-api/brands/shows-franchises?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setRowsError(await parseErrorPayload(response));
        setRows([]);
        setRowsCount(0);
        return;
      }
      const payload = (await response.json()) as {
        rows?: BrandShowFranchiseRow[];
        count?: number;
      };
      const nextRows = Array.isArray(payload.rows) ? payload.rows : [];
      setRows(nextRows);
      setRowsCount(typeof payload.count === "number" ? payload.count : nextRows.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load shows & franchises";
      setRowsError(message);
      setRows([]);
      setRowsCount(0);
    } finally {
      setRowsLoading(false);
    }
  }, [fetchWithAuth, showQuery]);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/franchise-rules", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setRulesError(await parseErrorPayload(response));
        setRules([]);
        setSuggestedFranchises([]);
        return;
      }
      const payload = (await response.json()) as {
        rules?: FranchiseRule[];
        suggested_franchises?: string[];
      };
      const nextRules = Array.isArray(payload.rules) ? payload.rules : [];
      setRules(nextRules);
      setSuggestedFranchises(Array.isArray(payload.suggested_franchises) ? payload.suggested_franchises : []);
      setRuleDrafts((previous) => {
        const next = { ...previous };
        for (const rule of nextRules) {
          if (!next[rule.key]) {
            next[rule.key] = toDraft(rule);
          }
        }
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load franchise rules";
      setRulesError(message);
      setRules([]);
      setSuggestedFranchises([]);
    } finally {
      setRulesLoading(false);
    }
  }, [fetchWithAuth]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRules(), loadShows()]);
  }, [loadRules, loadShows]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !SHOWS_FRANCHISES_ENABLED) return;
    void refreshAll();
  }, [checking, hasAccess, refreshAll, user]);

  const onChangeRuleDraft = useCallback((key: string, patch: Partial<RuleDraft>) => {
    setRuleDrafts((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        ...patch,
      },
    }));
  }, []);

  const onSaveRule = useCallback(
    async (key: string) => {
      const draft = ruleDrafts[key];
      if (!draft) return;
      if (!draft.primary_url.trim()) {
        setRulesError("Primary Fandom URL is required before saving a rule.");
        return;
      }

      setSavingRuleKey(key);
      setRulesError(null);
      try {
        const response = await fetchWithAuth(`/api/admin/trr-api/brands/franchise-rules/${encodeURIComponent(key)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: draft.name.trim(),
            primary_url: draft.primary_url.trim(),
            review_allpages_url: draft.review_allpages_url.trim() || null,
            match_terms: csvToList(draft.match_terms_csv),
            aliases: csvToList(draft.aliases_csv),
            network_terms: csvToList(draft.network_terms_csv),
            include_allpages_scan: draft.include_allpages_scan,
            source_rank: Math.max(0, Number.parseInt(draft.source_rank, 10) || 0),
            is_active: draft.is_active,
          }),
        });
        if (!response.ok) {
          setRulesError(await parseErrorPayload(response));
          return;
        }
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save rule";
        setRulesError(message);
      } finally {
        setSavingRuleKey(null);
      }
    },
    [fetchWithAuth, refreshAll, ruleDrafts],
  );

  const onApplyRule = useCallback(
    async (key: string, dryRun: boolean) => {
      setApplyRunningKey(`${key}:${dryRun ? "dry" : "apply"}`);
      setRulesError(null);
      try {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/franchise-rules/${encodeURIComponent(key)}/apply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              missing_only: true,
              dry_run: dryRun,
            }),
          },
        );
        if (!response.ok) {
          setRulesError(await parseErrorPayload(response));
          return;
        }
        const payload = (await response.json()) as FranchiseRuleApplyResult;
        setApplyResult(payload);
        await refreshAll();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to apply franchise rule";
        setRulesError(message);
      } finally {
        setApplyRunningKey(null);
      }
    },
    [fetchWithAuth, refreshAll],
  );

  const onSubmitShowSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setShowQuery(showQueryDraft);
    },
    [showQueryDraft],
  );

  const effectiveCounts = useMemo(() => {
    let explicit = 0;
    let fallback = 0;
    let ruleDefault = 0;
    for (const row of rows) {
      if (row.effective_source === "explicit") explicit += 1;
      if (row.effective_source === "fallback") fallback += 1;
      if (row.effective_source === "rule_default") ruleDefault += 1;
    }
    return { explicit, fallback, ruleDefault };
  }, [rows]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing shows & franchises workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (!SHOWS_FRANCHISES_ENABLED) {
    return (
      <ClientOnly>
        <div className="min-h-screen bg-zinc-50">
          <AdminGlobalHeader bodyClassName="px-6 py-6">
            <div className="mx-auto max-w-6xl">
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Shows & Franchises", "/brands/shows-and-franchises")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Shows & Franchises</h1>
              <p className="break-words text-sm text-zinc-500">
                This page is currently disabled. Enable `BRANDS_SHOWS_FRANCHISES_ENABLED` to use it.
              </p>
              <BrandsTabs activeTab="shows" className="mt-4" />
            </div>
          </AdminGlobalHeader>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Shows & Franchises", "/brands/shows-and-franchises")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Shows & Franchises</h1>
              <p className="break-words text-sm text-zinc-500">
                Franchise fallback rules for Fandom links and show-level effective source coverage.
              </p>
              <BrandsTabs activeTab="shows" className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={rowsLoading || rulesLoading}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rowsLoading || rulesLoading ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          {rulesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{rulesError}</div>
          ) : null}
          {rowsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{rowsError}</div>
          ) : null}

          {applyResult ? (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="text-sm font-semibold text-green-900">Latest Rule Apply Result</h2>
              <p className="mt-1 text-sm text-green-800">
                {applyResult.rule_name} ({applyResult.franchise_key}): matched {applyResult.matched_show_count}, targeted{" "}
                {applyResult.applied_show_count}, links upserted {applyResult.links_upserted}, skipped explicit{" "}
                {applyResult.skipped_explicit}, skipped existing fallback {applyResult.skipped_already_fallback}.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Franchise Rules</h2>
                <p className="text-sm text-zinc-600">
                  Configure fallback Fandom URLs. Apply writes only to shows missing explicit approved Fandom links.
                </p>
                {suggestedFranchises.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-600">Suggested franchises: {suggestedFranchises.join(", ")}</p>
                ) : null}
              </div>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                {rulesLoading ? "Loading..." : `${rules.length} rules`}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {rules.map((rule) => {
                const draft = ruleDrafts[rule.key] ?? toDraft(rule);
                const saveBusy = savingRuleKey === rule.key;
                const previewBusy = applyRunningKey === `${rule.key}:dry`;
                const applyBusy = applyRunningKey === `${rule.key}:apply`;
                return (
                  <article key={rule.key} className="rounded-lg border border-zinc-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900">{rule.name}</h3>
                      <div className="flex flex-wrap gap-1 text-xs">
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700">
                          key: {rule.key}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700">
                          matched: {rule.matched_show_count}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-zinc-700">
                          fallback rows: {rule.applied_fallback_count}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <label className="text-xs font-semibold text-zinc-700">
                        Rule Name
                        <input
                          value={draft.name}
                          onChange={(event) => onChangeRuleDraft(rule.key, { name: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Source Rank
                        <input
                          value={draft.source_rank}
                          onChange={(event) => onChangeRuleDraft(rule.key, { source_rank: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Primary Fandom URL
                        <input
                          value={draft.primary_url}
                          onChange={(event) => onChangeRuleDraft(rule.key, { primary_url: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Review `Special:AllPages` URL
                        <input
                          value={draft.review_allpages_url}
                          onChange={(event) => onChangeRuleDraft(rule.key, { review_allpages_url: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Match Terms (comma separated)
                        <input
                          value={draft.match_terms_csv}
                          onChange={(event) => onChangeRuleDraft(rule.key, { match_terms_csv: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Aliases (comma separated)
                        <input
                          value={draft.aliases_csv}
                          onChange={(event) => onChangeRuleDraft(rule.key, { aliases_csv: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Network Terms (comma separated)
                        <input
                          value={draft.network_terms_csv}
                          onChange={(event) => onChangeRuleDraft(rule.key, { network_terms_csv: event.target.value })}
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.include_allpages_scan}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { include_allpages_scan: event.target.checked })
                          }
                        />
                        Include `Special:AllPages` candidate scan
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) => onChangeRuleDraft(rule.key, { is_active: event.target.checked })}
                        />
                        Rule active
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void onSaveRule(rule.key)}
                        disabled={saveBusy}
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-500"
                      >
                        {saveBusy ? "Saving..." : "Save Rule"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onApplyRule(rule.key, true)}
                        disabled={previewBusy || applyBusy}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {previewBusy ? "Previewing..." : "Preview Apply (Dry Run)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onApplyRule(rule.key, false)}
                        disabled={previewBusy || applyBusy}
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {applyBusy ? "Applying..." : "Apply Missing-Only"}
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      <a href={rule.primary_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                        Primary Fandom
                      </a>
                      {rule.review_allpages_url ? (
                        <a
                          href={rule.review_allpages_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
                          Review `Special:AllPages`
                        </a>
                      ) : null}
                      {(rule.candidate_urls ?? []).map((candidate) => (
                        <a key={candidate} href={candidate} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                          Candidate URL
                        </a>
                      ))}
                    </div>
                  </article>
                );
              })}
              {!rulesLoading && rules.length === 0 ? (
                <p className="text-sm text-zinc-500">No franchise rules were returned.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Shows From Supabase</h2>
                <p className="text-sm text-zinc-600">
                  Effective Fandom URL precedence: explicit approved link, then fallback rule link, then rule candidate.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 text-xs text-zinc-700">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">rows: {rowsCount}</span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  explicit: {effectiveCounts.explicit}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  fallback: {effectiveCounts.fallback}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                  rule default: {effectiveCounts.ruleDefault}
                </span>
              </div>
            </div>

            <form onSubmit={onSubmitShowSearch} className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={showQueryDraft}
                onChange={(event) => setShowQueryDraft(event.target.value)}
                placeholder="Search show name..."
                className="min-w-[260px] rounded border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQueryDraft("");
                  setShowQuery("");
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Clear
              </button>
            </form>

            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Show</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Franchise</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Effective Source</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Effective URL</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Rule Candidates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {rowsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                        Loading shows...
                      </td>
                    </tr>
                  ) : null}
                  {!rowsLoading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                        No shows found.
                      </td>
                    </tr>
                  ) : null}
                  {!rowsLoading
                    ? rows.map((row) => {
                        const showSlug = row.canonical_slug || row.show_id;
                        return (
                          <tr key={row.show_id}>
                            <td className="max-w-[300px] px-3 py-2 font-medium text-zinc-900 [overflow-wrap:anywhere]">
                              <Link href={`/shows/${encodeURIComponent(showSlug)}`} className="underline-offset-2 hover:underline">
                                {row.show_name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-zinc-700">{row.franchise_name ?? row.franchise_key ?? "Unassigned"}</td>
                            <td className="px-3 py-2 text-zinc-700">{row.effective_source}</td>
                            <td className="max-w-[320px] px-3 py-2 [overflow-wrap:anywhere]">
                              {row.effective_fandom_url ? (
                                <a href={row.effective_fandom_url} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                                  {row.effective_fandom_url}
                                </a>
                              ) : (
                                <span className="text-zinc-500">Missing</span>
                              )}
                            </td>
                            <td className="max-w-[320px] px-3 py-2 [overflow-wrap:anywhere]">
                              {row.rule_candidates.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {row.rule_candidates.map((candidate) => (
                                    <a
                                      key={candidate}
                                      href={candidate}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-700 underline"
                                    >
                                      {candidate}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-zinc-500">None</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}

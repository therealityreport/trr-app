"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import {
  FranchiseRule,
  FranchiseRuleApplyResult,
  GenericLinkRule,
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

type BrandFamilySummary = {
  id: string;
  family_key: string;
  display_name: string;
};

type FamilyLinkRuleDraft = {
  link_group: "official" | "social" | "knowledge" | "cast_announcements" | "other";
  link_kind: string;
  label: string;
  url: string;
  coverage_type:
    | "family_all_shows"
    | "family_network_shows"
    | "family_streaming_shows"
    | "franchise_rule"
    | "show_wikidata_exact"
    | "show_name_contains";
  coverage_value: string;
  auto_apply: boolean;
  is_active: boolean;
  priority: string;
};

type FamilyLinksApplyResult = {
  family_id: string;
  rule_count: number;
  matched_show_count: number;
  applied_show_count: number;
  skipped_existing_manual: number;
  updated_derived_count: number;
  dry_run: boolean;
  errors: Array<Record<string, unknown>>;
};

const SHOWS_FRANCHISES_ENABLED =
  (process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED ??
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED ??
    "true") !== "false";

const DEFAULT_FAMILY_LINK_RULE_DRAFT: FamilyLinkRuleDraft = {
  link_group: "knowledge",
  link_kind: "wikipedia",
  label: "",
  url: "",
  coverage_type: "family_all_shows",
  coverage_value: "",
  auto_apply: true,
  is_active: true,
  priority: "100",
};

const csvToList = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const listToCsv = (value: string[] | null | undefined): string =>
  Array.isArray(value) ? value.join(", ") : "";

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

export default function ShowsSettingsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [rules, setRules] = useState<FranchiseRule[]>([]);
  const [ruleDrafts, setRuleDrafts] = useState<Record<string, RuleDraft>>({});
  const [suggestedFranchises, setSuggestedFranchises] = useState<string[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [savingRuleKey, setSavingRuleKey] = useState<string | null>(null);
  const [applyRunningKey, setApplyRunningKey] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<FranchiseRuleApplyResult | null>(null);

  const [familyRows, setFamilyRows] = useState<BrandFamilySummary[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [selectedFamilyRuleId, setSelectedFamilyRuleId] = useState("");
  const [familyRules, setFamilyRules] = useState<GenericLinkRule[]>([]);
  const [familyRuleDraft, setFamilyRuleDraft] = useState<FamilyLinkRuleDraft>(
    DEFAULT_FAMILY_LINK_RULE_DRAFT,
  );
  const [familyRulesLoading, setFamilyRulesLoading] = useState(false);
  const [familyRulesError, setFamilyRulesError] = useState<string | null>(null);
  const [familyRuleCreateBusy, setFamilyRuleCreateBusy] = useState(false);
  const [familyRuleApplyBusy, setFamilyRuleApplyBusy] = useState<string | null>(null);
  const [familyApplyResult, setFamilyApplyResult] = useState<FamilyLinksApplyResult | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        allowDevAdminBypass: true,
        preferredUser: user,
      }),
    [user],
  );

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
      setSuggestedFranchises(
        Array.isArray(payload.suggested_franchises) ? payload.suggested_franchises : [],
      );
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

  const loadFamilies = useCallback(async () => {
    setFamilyRulesError(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/families?active_only=true", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setFamilyRows([]);
        setSelectedFamilyId("");
        setFamilyRules([]);
        setFamilyRulesError(await parseErrorPayload(response));
        return;
      }
      const payload = (await response.json()) as { rows?: BrandFamilySummary[] };
      const nextRows = Array.isArray(payload.rows) ? payload.rows : [];
      setFamilyRows(nextRows);
      setSelectedFamilyId((previous) => {
        if (previous && nextRows.some((row) => row.id === previous)) return previous;
        return nextRows[0]?.id ?? "";
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load brand families";
      setFamilyRows([]);
      setSelectedFamilyId("");
      setFamilyRules([]);
      setFamilyRulesError(message);
    }
  }, [fetchWithAuth]);

  const loadSelectedFamilyRules = useCallback(
    async (familyId: string) => {
      if (!familyId) {
        setFamilyRulesLoading(false);
        setFamilyRules([]);
        setSelectedFamilyRuleId("");
        return;
      }
      setFamilyRulesLoading(true);
      setFamilyRulesError(null);
      try {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/families/${encodeURIComponent(familyId)}/links`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!response.ok) {
          setFamilyRules([]);
          setSelectedFamilyRuleId("");
          setFamilyRulesError(await parseErrorPayload(response));
          return;
        }
        const payload = (await response.json()) as { rows?: GenericLinkRule[] };
        const nextRows = Array.isArray(payload.rows) ? payload.rows : [];
        setFamilyRules(nextRows);
        setSelectedFamilyRuleId((previous) => {
          if (previous && nextRows.some((row) => row.id === previous)) return previous;
          return "";
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load family link rules";
        setFamilyRules([]);
        setSelectedFamilyRuleId("");
        setFamilyRulesError(message);
      } finally {
        setFamilyRulesLoading(false);
      }
    },
    [fetchWithAuth],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRules(), loadFamilies()]);
  }, [loadFamilies, loadRules]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !SHOWS_FRANCHISES_ENABLED) return;
    void refreshAll();
  }, [checking, hasAccess, refreshAll, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !SHOWS_FRANCHISES_ENABLED) return;
    void loadSelectedFamilyRules(selectedFamilyId);
  }, [checking, hasAccess, loadSelectedFamilyRules, selectedFamilyId, user]);

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
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/franchise-rules/${encodeURIComponent(key)}`,
          {
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
          },
        );
        if (!response.ok) {
          setRulesError(await parseErrorPayload(response));
          return;
        }
        await loadRules();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save rule";
        setRulesError(message);
      } finally {
        setSavingRuleKey(null);
      }
    },
    [fetchWithAuth, loadRules, ruleDrafts],
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
        await loadRules();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to apply franchise rule";
        setRulesError(message);
      } finally {
        setApplyRunningKey(null);
      }
    },
    [fetchWithAuth, loadRules],
  );

  const onCreateFamilyRule = useCallback(async () => {
    if (!selectedFamilyId) {
      setFamilyRulesError("Select a family before creating a rule.");
      return;
    }
    if (!familyRuleDraft.url.trim()) {
      setFamilyRulesError("URL is required.");
      return;
    }
    if (!familyRuleDraft.link_kind.trim()) {
      setFamilyRulesError("Link kind is required.");
      return;
    }

    setFamilyRuleCreateBusy(true);
    setFamilyRulesError(null);
    try {
      const response = await fetchWithAuth(
        `/api/admin/trr-api/brands/families/${encodeURIComponent(selectedFamilyId)}/links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            link_group: familyRuleDraft.link_group,
            link_kind: familyRuleDraft.link_kind.trim(),
            label: familyRuleDraft.label.trim() || null,
            url: familyRuleDraft.url.trim(),
            coverage_type: familyRuleDraft.coverage_type,
            coverage_value: familyRuleDraft.coverage_value.trim() || null,
            auto_apply: familyRuleDraft.auto_apply,
            is_active: familyRuleDraft.is_active,
            priority: Math.max(0, Number.parseInt(familyRuleDraft.priority, 10) || 0),
            source: "manual",
          }),
        },
      );
      if (!response.ok) {
        setFamilyRulesError(await parseErrorPayload(response));
        return;
      }
      setFamilyRuleDraft((previous) => ({
        ...previous,
        url: "",
        label: "",
        coverage_value: "",
      }));
      await loadSelectedFamilyRules(selectedFamilyId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create family link rule";
      setFamilyRulesError(message);
    } finally {
      setFamilyRuleCreateBusy(false);
    }
  }, [familyRuleDraft, fetchWithAuth, loadSelectedFamilyRules, selectedFamilyId]);

  const onApplyFamilyRules = useCallback(
    async (dryRun: boolean) => {
      if (!selectedFamilyId) {
        setFamilyRulesError("Select a family before running apply.");
        return;
      }
      setFamilyRuleApplyBusy(dryRun ? "dry_run" : "apply");
      setFamilyRulesError(null);
      try {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/families/${encodeURIComponent(selectedFamilyId)}/links/apply`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              dry_run: dryRun,
              rule_ids: selectedFamilyRuleId ? [selectedFamilyRuleId] : undefined,
            }),
          },
        );
        if (!response.ok) {
          setFamilyRulesError(await parseErrorPayload(response));
          return;
        }
        const payload = (await response.json()) as FamilyLinksApplyResult;
        setFamilyApplyResult(payload);
        await loadSelectedFamilyRules(selectedFamilyId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to apply family rules";
        setFamilyRulesError(message);
      } finally {
        setFamilyRuleApplyBusy(null);
      }
    },
    [fetchWithAuth, loadSelectedFamilyRules, selectedFamilyId, selectedFamilyRuleId],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing show settings workspace...</p>
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
                items={[
                  ...buildAdminSectionBreadcrumb("Shows", "/shows"),
                  { label: "Settings", href: "/shows/settings" },
                ]}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Shows Settings</h1>
              <p className="break-words text-sm text-zinc-500">
                This workspace is currently disabled. Enable `BRANDS_SHOWS_FRANCHISES_ENABLED` to use it.
              </p>
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
                items={[
                  ...buildAdminSectionBreadcrumb("Shows", "/shows"),
                  { label: "Settings", href: "/shows/settings" },
                ]}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Shows Settings</h1>
              <p className="break-words text-sm text-zinc-500">
                Manage franchise defaults and shared link rules used by show discovery.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={rulesLoading || familyRulesLoading}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rulesLoading || familyRulesLoading ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/brands/shows-and-franchises"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Open Show Branding
              </Link>
              <Link
                href="/shows"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Back to Shows
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Global Controls
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Show Link Automation</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Show and franchise brand assets now live on the Brands page. This workspace keeps the
              shared link rules and franchise defaults that feed those logo imports and show-level
              discovery flows.
            </p>
          </section>

          {rulesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {rulesError}
            </div>
          ) : null}
          {familyRulesError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {familyRulesError}
            </div>
          ) : null}

          {applyResult ? (
            <section className="rounded-xl border border-green-200 bg-green-50 p-4">
              <h2 className="text-sm font-semibold text-green-900">Latest Franchise Apply Result</h2>
              <p className="mt-1 text-sm text-green-800">
                {applyResult.rule_name} ({applyResult.franchise_key}): matched{" "}
                {applyResult.matched_show_count}, targeted {applyResult.applied_show_count},
                links upserted {applyResult.links_upserted}, skipped explicit{" "}
                {applyResult.skipped_explicit}, skipped existing fallback{" "}
                {applyResult.skipped_already_fallback}, skipped manual{" "}
                {applyResult.skipped_existing_manual ?? 0}, updated derived{" "}
                {applyResult.updated_derived_count ?? 0}.
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Family Coverage Link Rules</h2>
                <p className="text-sm text-zinc-600">
                  Create and apply shared links by family coverage type for show-level discovery.
                </p>
              </div>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">
                families: {familyRows.length} / rules: {familyRules.length}
              </span>
            </div>

            {familyApplyResult ? (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                {familyApplyResult.dry_run ? "Dry run" : "Apply"} matched{" "}
                {familyApplyResult.matched_show_count}, applied{" "}
                {familyApplyResult.applied_show_count}, skipped manual{" "}
                {familyApplyResult.skipped_existing_manual}, updated derived{" "}
                {familyApplyResult.updated_derived_count}, errors{" "}
                {familyApplyResult.errors?.length ?? 0}.
              </div>
            ) : null}

            {familyRows.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">
                No active brand families found yet. Create a family from a network or streaming
                detail page first.
              </p>
            ) : (
              <>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold text-zinc-700">
                    Family
                    <select
                      value={selectedFamilyId}
                      onChange={(event) => {
                        setSelectedFamilyId(event.target.value);
                        setFamilyApplyResult(null);
                      }}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    >
                      {familyRows.map((family) => (
                        <option key={family.id} value={family.id}>
                          {family.display_name} ({family.family_key})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Scope For Apply
                    <select
                      value={selectedFamilyRuleId}
                      onChange={(event) => setSelectedFamilyRuleId(event.target.value)}
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    >
                      <option value="">All active rules in family</option>
                      {familyRules.map((rule) => (
                        <option key={rule.id} value={rule.id}>
                          {rule.link_group}/{rule.link_kind} - {rule.coverage_type}
                          {rule.coverage_value ? ` (${rule.coverage_value})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="text-xs font-semibold text-zinc-700">
                    Link Group
                    <select
                      value={familyRuleDraft.link_group}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          link_group: event.target.value as FamilyLinkRuleDraft["link_group"],
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    >
                      <option value="official">official</option>
                      <option value="social">social</option>
                      <option value="knowledge">knowledge</option>
                      <option value="cast_announcements">cast_announcements</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Link Kind
                    <input
                      value={familyRuleDraft.link_kind}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          link_kind: event.target.value,
                        }))
                      }
                      placeholder="wikipedia | fandom | instagram | tiktok"
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                    URL
                    <input
                      value={familyRuleDraft.url}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          url: event.target.value,
                        }))
                      }
                      placeholder="https://..."
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Coverage Type
                    <select
                      value={familyRuleDraft.coverage_type}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          coverage_type: event.target.value as FamilyLinkRuleDraft["coverage_type"],
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    >
                      <option value="family_all_shows">family_all_shows</option>
                      <option value="family_network_shows">family_network_shows</option>
                      <option value="family_streaming_shows">family_streaming_shows</option>
                      <option value="franchise_rule">franchise_rule</option>
                      <option value="show_wikidata_exact">show_wikidata_exact</option>
                      <option value="show_name_contains">show_name_contains</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Coverage Value
                    <input
                      value={familyRuleDraft.coverage_value}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          coverage_value: event.target.value,
                        }))
                      }
                      placeholder="optional by coverage type"
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Label
                    <input
                      value={familyRuleDraft.label}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          label: event.target.value,
                        }))
                      }
                      placeholder="Display label (optional)"
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    />
                  </label>
                  <label className="text-xs font-semibold text-zinc-700">
                    Priority
                    <input
                      value={familyRuleDraft.priority}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          priority: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                    />
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={familyRuleDraft.auto_apply}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          auto_apply: event.target.checked,
                        }))
                      }
                    />
                    auto_apply
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={familyRuleDraft.is_active}
                      onChange={(event) =>
                        setFamilyRuleDraft((previous) => ({
                          ...previous,
                          is_active: event.target.checked,
                        }))
                      }
                    />
                    is_active
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onCreateFamilyRule()}
                    disabled={familyRuleCreateBusy || !selectedFamilyId}
                    className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-500"
                  >
                    {familyRuleCreateBusy ? "Creating..." : "Create Rule"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApplyFamilyRules(true)}
                    disabled={familyRuleApplyBusy !== null || !selectedFamilyId}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {familyRuleApplyBusy === "dry_run" ? "Running..." : "Dry Run Apply"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApplyFamilyRules(false)}
                    disabled={familyRuleApplyBusy !== null || !selectedFamilyId}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {familyRuleApplyBusy === "apply" ? "Applying..." : "Apply"}
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">Kind</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">
                          Coverage
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">Source</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-zinc-700">URL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {familyRulesLoading ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                            Loading family rules...
                          </td>
                        </tr>
                      ) : null}
                      {!familyRulesLoading && familyRules.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                            No rules for selected family.
                          </td>
                        </tr>
                      ) : null}
                      {!familyRulesLoading
                        ? familyRules.map((rule) => (
                            <tr key={rule.id}>
                              <td className="px-3 py-2 text-zinc-700">
                                {rule.link_group}/{rule.link_kind}
                              </td>
                              <td className="px-3 py-2 text-zinc-700">
                                {rule.coverage_type}
                                {rule.coverage_value ? ` (${rule.coverage_value})` : ""}
                              </td>
                              <td className="px-3 py-2 text-zinc-700">{rule.source}</td>
                              <td className="px-3 py-2 text-zinc-700">
                                {rule.is_active ? "active" : "inactive"} /{" "}
                                {rule.auto_apply ? "auto" : "manual"}
                              </td>
                              <td className="max-w-[320px] px-3 py-2 [overflow-wrap:anywhere]">
                                <a
                                  href={rule.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-700 underline"
                                >
                                  {rule.url}
                                </a>
                              </td>
                            </tr>
                          ))
                        : null}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Franchise Rules</h2>
                <p className="text-sm text-zinc-600">
                  Configure fallback Fandom URLs. Apply writes only to shows missing explicit
                  approved Fandom links.
                </p>
                {suggestedFranchises.length > 0 ? (
                  <p className="mt-2 text-xs text-zinc-600">
                    Suggested franchises: {suggestedFranchises.join(", ")}
                  </p>
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
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { name: event.target.value })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Source Rank
                        <input
                          value={draft.source_rank}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { source_rank: event.target.value })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Primary Fandom URL
                        <input
                          value={draft.primary_url}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { primary_url: event.target.value })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Review `Special:AllPages` URL
                        <input
                          value={draft.review_allpages_url}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, {
                              review_allpages_url: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Match Terms (comma separated)
                        <input
                          value={draft.match_terms_csv}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, {
                              match_terms_csv: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700">
                        Aliases (comma separated)
                        <input
                          value={draft.aliases_csv}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { aliases_csv: event.target.value })
                          }
                          className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm font-normal"
                        />
                      </label>
                      <label className="text-xs font-semibold text-zinc-700 md:col-span-2">
                        Network Terms (comma separated)
                        <input
                          value={draft.network_terms_csv}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, {
                              network_terms_csv: event.target.value,
                            })
                          }
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
                            onChangeRuleDraft(rule.key, {
                              include_allpages_scan: event.target.checked,
                            })
                          }
                        />
                        Include `Special:AllPages` candidate scan
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.is_active}
                          onChange={(event) =>
                            onChangeRuleDraft(rule.key, { is_active: event.target.checked })
                          }
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
                      <a
                        href={rule.primary_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 underline"
                      >
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
                        <a
                          key={candidate}
                          href={candidate}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-700 underline"
                        >
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
        </main>
      </div>
    </ClientOnly>
  );
}

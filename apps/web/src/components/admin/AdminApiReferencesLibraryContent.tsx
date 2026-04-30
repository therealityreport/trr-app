"use client";

import { useMemo, useState } from "react";
import {
  ADMIN_API_REFERENCE_INVENTORY,
  buildInventoryGraph,
  buildSourceHref,
  formatNodeKindLabel,
  isComponentNode,
  isPageNode,
} from "@/lib/admin/api-references/catalog";
import { ADMIN_ROOT_PATH } from "@/lib/admin/admin-route-paths";
import type {
  AdminApiReferenceInventory,
  AdminApiReferenceNode,
  AdminApiReferenceUsageTier,
} from "@/lib/admin/api-references/types";

type BooleanFilter = "all" | "yes" | "no";
type KindFilter = "all" | "page" | "component" | "api_route" | "backend_endpoint" | "repository_surface" | "polling_loop";
type PostgresFilter = "all" | "direct" | "indirect" | "none";

type AdminApiReferencesLibraryContentProps = {
  inventory?: AdminApiReferenceInventory;
};

const ACCENT = "#7A0307";

function getFilterPillClassName(active: boolean): string {
  return `rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] transition ${
    active
      ? "border-black bg-black text-white"
      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
  }`;
}

function formatBooleanLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatUsageTierLabel(value: AdminApiReferenceUsageTier): string {
  return value === "manual" ? "Manual" : value.charAt(0).toUpperCase() + value.slice(1);
}

function derivePageUrlSlug(pathPattern: string | null): string {
  if (!pathPattern) return "n/a";
  const normalized = pathPattern.replace(/^\/admin\/?/, "");
  return normalized.length > 0 ? normalized : "(root)";
}

function isConcreteRouteHref(pathPattern: string | null): pathPattern is string {
  return Boolean(pathPattern && !/\[[^\]]+\]/.test(pathPattern));
}

function describeKind(node: AdminApiReferenceNode): string {
  if (isPageNode(node)) return "page";
  if (isComponentNode(node)) return "component";
  return node.kind;
}

function getVisibleNodes(
  inventory: AdminApiReferenceInventory,
  filters: {
    kind: KindFilter;
    polls: BooleanFilter;
    automatic: BooleanFilter;
    largeDataset: BooleanFilter;
    pagination: BooleanFilter;
    widePayload: BooleanFilter;
    fanout: BooleanFilter;
    postgres: PostgresFilter;
    usageTier: AdminApiReferenceUsageTier | "all";
  },
): AdminApiReferenceNode[] {
  return inventory.nodes.filter((node) => {
    const nodeKind = describeKind(node);
    if (filters.kind !== "all" && nodeKind !== filters.kind) return false;
    if (filters.polls !== "all" && formatBooleanLabel(node.polls).toLowerCase() !== filters.polls) return false;
    if (filters.automatic !== "all" && formatBooleanLabel(node.automatic).toLowerCase() !== filters.automatic) {
      return false;
    }
    if (
      filters.largeDataset !== "all" &&
      formatBooleanLabel(node.loadsLargeDatasets).toLowerCase() !== filters.largeDataset
    ) {
      return false;
    }
    if (filters.pagination !== "all" && formatBooleanLabel(node.usesPagination).toLowerCase() !== filters.pagination) {
      return false;
    }
    if (
      filters.widePayload !== "all" &&
      formatBooleanLabel(node.returnsWideRowsOrBlobsOrRawJson).toLowerCase() !== filters.widePayload
    ) {
      return false;
    }
    if (filters.fanout !== "all" && formatBooleanLabel(node.fansOutQueries).toLowerCase() !== filters.fanout) {
      return false;
    }
    if (filters.postgres !== "all" && node.postgresAccess !== filters.postgres) return false;
    if (filters.usageTier !== "all" && node.usageTier !== filters.usageTier) return false;
    return true;
  });
}

export function AdminApiReferencesLibraryContent({
  inventory = ADMIN_API_REFERENCE_INVENTORY,
}: AdminApiReferencesLibraryContentProps) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [polls, setPolls] = useState<BooleanFilter>("all");
  const [automatic, setAutomatic] = useState<BooleanFilter>("all");
  const [largeDataset, setLargeDataset] = useState<BooleanFilter>("all");
  const [pagination, setPagination] = useState<BooleanFilter>("all");
  const [widePayload, setWidePayload] = useState<BooleanFilter>("all");
  const [fanout, setFanout] = useState<BooleanFilter>("all");
  const [postgres, setPostgres] = useState<PostgresFilter>("all");
  const [usageTier, setUsageTier] = useState<AdminApiReferenceUsageTier | "all">("all");

  const graph = useMemo(() => buildInventoryGraph(inventory), [inventory]);
  const visibleNodes = useMemo(
    () =>
      getVisibleNodes(inventory, {
        kind,
        polls,
        automatic,
        largeDataset,
        pagination,
        widePayload,
        fanout,
        postgres,
        usageTier,
      }),
    [automatic, fanout, inventory, kind, largeDataset, pagination, polls, postgres, usageTier, widePayload],
  );
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const adminPageDocs = useMemo(
    () =>
      inventory.nodes
        .filter((node) => isPageNode(node))
        .sort((left, right) => (left.pathPattern ?? "").localeCompare(right.pathPattern ?? "")),
    [inventory.nodes],
  );
  const adminRouteDocs = useMemo(
    () =>
      inventory.nodes
        .filter((node) => node.kind === "api_route")
        .sort((left, right) => (left.pathPattern ?? "").localeCompare(right.pathPattern ?? "")),
    [inventory.nodes],
  );
  const sections = [
    {
      key: "pages",
      title: "Admin Pages",
      description: "Canonical admin entry surfaces, including static reference routes and linked request origins.",
      nodes: visibleNodes.filter((node) => isPageNode(node)),
    },
    {
      key: "components",
      title: "Request-Originating Components",
      description: "Nested admin components that directly initiate fetches, streams, or refresh loops.",
      nodes: visibleNodes.filter((node) => isComponentNode(node)),
    },
    {
      key: "routes",
      title: "Admin API Routes",
      description: "Next.js admin routes under /api/admin, including direct Postgres access and backend proxies.",
      nodes: visibleNodes.filter((node) => node.kind === "api_route"),
    },
    {
      key: "backend",
      title: "Backend Endpoints",
      description: "TRR-Backend admin endpoints reached from admin routes or backend proxy helpers.",
      nodes: visibleNodes.filter((node) => node.kind === "backend_endpoint"),
    },
    {
      key: "repositories",
      title: "Repository / Query Surfaces",
      description: "Server-side repository and query surfaces discovered from admin route import graphs or manual mapping.",
      nodes: visibleNodes.filter((node) => node.kind === "repository_surface"),
    },
    {
      key: "polling",
      title: "Polling / Background Refreshes",
      description: "Explicit intervals, streams, EventSource consumers, and refresh loops tied to admin views.",
      nodes: visibleNodes.filter((node) => node.kind === "polling_loop"),
    },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="rounded-[1.9rem] border-2 border-black bg-white p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
              Admin Request Path Reference Library
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-black sm:text-4xl">
              Best-effort admin request path inventory with explicit manual augmentation.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-black/75">
              This page reads a generated catalog built from TRR-APP source plus checked-in overrides. It inventories
              admin pages, request-origin components, admin routes, backend endpoints, repository surfaces, and polling
              loops without doing any runtime filesystem analysis.
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-black/45">
              Generated {new Date(inventory.generatedAt).toLocaleString()} · Commit {inventory.sourceCommitSha.slice(0, 12)} ·
              Override digest {inventory.overrideDigest.slice(0, 12)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Nodes", inventory.indexes.summary.totalNodes.toString()],
              ["Edges", inventory.indexes.summary.totalEdges.toString()],
              ["Visible", visibleNodes.length.toString()],
              ["Automatic", inventory.indexes.summary.automaticNodes.toString()],
              ["Polling", inventory.indexes.summary.pollingNodes.toString()],
              ["Direct PG", inventory.indexes.summary.directPostgresNodes.toString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.3rem] border border-black px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[1.8rem] border border-black bg-white p-6">
        <div className="flex flex-col gap-2 border-b border-black pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
            Docs
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-black">Admin Routes & URL Slugs</h2>
          <p className="text-sm leading-7 text-black/70">
            Canonical page routes and admin API paths from the generated inventory. Use this ledger when you need the
            exact slug or route surface before drilling into the cost-chain cards below.
          </p>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-end justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                  Page routes
                </p>
                <h3 className="mt-2 text-lg font-semibold text-black">Canonical admin page URLs</h3>
              </div>
              <p className="text-sm text-zinc-600">{adminPageDocs.length} pages</p>
            </div>

            <div className="mt-4 max-h-[28rem] overflow-auto">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 border-b border-zinc-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <p>Page</p>
                <p>Route</p>
                <p>URL slug</p>
              </div>
              <div className="divide-y divide-zinc-200">
                {adminPageDocs.map((node) => (
                  <div key={`page-doc-${node.id}`} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 py-3 text-sm text-zinc-700">
                    <p className="font-semibold text-zinc-900">{node.title}</p>
                    <p className="break-all font-mono text-xs">{node.pathPattern}</p>
                    <p className="break-all font-mono text-xs">{derivePageUrlSlug(node.pathPattern)}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-end justify-between gap-3 border-b border-zinc-200 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                  Admin API routes
                </p>
                <h3 className="mt-2 text-lg font-semibold text-black">Exact route patterns under /api/admin</h3>
              </div>
              <p className="text-sm text-zinc-600">{adminRouteDocs.length} routes</p>
            </div>

            <div className="mt-4 max-h-[28rem] overflow-auto">
              <div className="grid grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] gap-3 border-b border-zinc-200 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                <p>Method</p>
                <p>Route</p>
              </div>
              <div className="divide-y divide-zinc-200">
                {adminRouteDocs.map((node) => (
                  <div key={`route-doc-${node.id}`} className="grid grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] gap-3 py-3 text-sm text-zinc-700">
                    <p className="font-semibold text-zinc-900">{node.symbol}</p>
                    <p className="break-all font-mono text-xs">{node.pathPattern}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="mt-8 rounded-[1.8rem] border border-black bg-white p-6">
        <div className="flex flex-col gap-2 border-b border-black pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
            Filters
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-black">Slice the catalog by behavior and cost shape</h2>
          <p className="text-sm leading-7 text-black/70">
            Every filter reads from the generated graph artifact. Presentational grouping happens here at runtime; the
            source scan does not.
          </p>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Surface</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", `All (${inventory.nodes.length})`],
                ["page", `Pages (${inventory.nodes.filter((node) => isPageNode(node)).length})`],
                ["component", `Components (${inventory.nodes.filter((node) => isComponentNode(node)).length})`],
                ["api_route", `Routes (${inventory.indexes.summary.nodesByKind.api_route})`],
                ["backend_endpoint", `Backend (${inventory.indexes.summary.nodesByKind.backend_endpoint})`],
                ["repository_surface", `Repository (${inventory.indexes.summary.nodesByKind.repository_surface})`],
                ["polling_loop", `Polling (${inventory.indexes.summary.nodesByKind.polling_loop})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={getFilterPillClassName(kind === value)}
                  aria-pressed={kind === value}
                  onClick={() => setKind(value as KindFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Behavior</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All polling"],
                ["yes", "Polls"],
                ["no", "No polling"],
              ].map(([value, label]) => (
                <button
                  key={`polls-${value}`}
                  type="button"
                  className={getFilterPillClassName(polls === value)}
                  aria-pressed={polls === value}
                  onClick={() => setPolls(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
              {[
                ["all", "All trigger modes"],
                ["yes", "Automatic"],
                ["no", "User-triggered"],
              ].map(([value, label]) => (
                <button
                  key={`automatic-${value}`}
                  type="button"
                  className={getFilterPillClassName(automatic === value)}
                  aria-pressed={automatic === value}
                  onClick={() => setAutomatic(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Postgres</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All access modes"],
                ["direct", "Direct"],
                ["indirect", "Indirect"],
                ["none", "None"],
              ].map(([value, label]) => (
                <button
                  key={`postgres-${value}`}
                  type="button"
                  className={getFilterPillClassName(postgres === value)}
                  aria-pressed={postgres === value}
                  onClick={() => setPostgres(value as PostgresFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Payload</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All sizes"],
                ["yes", "Large datasets"],
                ["no", "Not large"],
              ].map(([value, label]) => (
                <button
                  key={`large-${value}`}
                  type="button"
                  className={getFilterPillClassName(largeDataset === value)}
                  aria-pressed={largeDataset === value}
                  onClick={() => setLargeDataset(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
              {[
                ["all", "All payloads"],
                ["yes", "Wide / blob / raw JSON"],
                ["no", "Compact"],
              ].map(([value, label]) => (
                <button
                  key={`wide-${value}`}
                  type="button"
                  className={getFilterPillClassName(widePayload === value)}
                  aria-pressed={widePayload === value}
                  onClick={() => setWidePayload(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Query shape</p>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All pagination"],
                ["yes", "Paginated"],
                ["no", "Unpaginated"],
              ].map(([value, label]) => (
                <button
                  key={`pagination-${value}`}
                  type="button"
                  className={getFilterPillClassName(pagination === value)}
                  aria-pressed={pagination === value}
                  onClick={() => setPagination(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
              {[
                ["all", "All fan-out"],
                ["yes", "Fan-out"],
                ["no", "Single path"],
              ].map(([value, label]) => (
                <button
                  key={`fanout-${value}`}
                  type="button"
                  className={getFilterPillClassName(fanout === value)}
                  aria-pressed={fanout === value}
                  onClick={() => setFanout(value as BooleanFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">Usage tier</p>
            <div className="flex flex-wrap gap-2">
              {(["all", "continuous", "high", "medium", "low", "manual"] as const).map((value) => (
                <button
                  key={`usage-${value}`}
                  type="button"
                  className={getFilterPillClassName(usageTier === value)}
                  aria-pressed={usageTier === value}
                  onClick={() => setUsageTier(value)}
                >
                  {value === "all" ? "All tiers" : formatUsageTierLabel(value)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[1.3rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Showing <span className="font-semibold text-zinc-900">{visibleNodes.length}</span> of{" "}
          <span className="font-semibold text-zinc-900">{inventory.nodes.length}</span> catalog nodes
        </div>
      </section>

      <div className="mt-8 space-y-10">
        {sections.map((section) => (
          <section key={section.key}>
            <div className="flex flex-col gap-2 border-b border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                  {section.title}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">{section.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-black/70">{section.description}</p>
              </div>
              <p className="text-sm text-black/60">
                {section.nodes.length} visible {section.nodes.length === 1 ? "entry" : "entries"}
              </p>
            </div>

            {section.nodes.length === 0 ? (
              <div className="mt-5 rounded-[1.4rem] border border-dashed border-zinc-300 bg-white px-5 py-8 text-sm text-zinc-600">
                No entries match the current filters in this section.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {section.nodes.map((node) => {
                  const outbound = graph.outboundByNode.get(node.id) ?? [];
                  const inbound = graph.inboundByNode.get(node.id) ?? [];
                  const sourceHref = buildSourceHref(node.sourceFile, node.sourceLocator?.line ?? 1);

                  return (
                    <details key={node.id} className="rounded-[1.5rem] border border-black bg-white open:shadow-sm">
                      <summary className="cursor-pointer list-none px-5 py-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap gap-2">
                              <span
                                className="rounded-full border border-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                                style={{ color: ACCENT }}
                              >
                                {formatNodeKindLabel(node)}
                              </span>
                              <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                                {formatUsageTierLabel(node.usageTier)}
                              </span>
                              <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                                {node.provenance.replace(/_/g, " ")}
                              </span>
                              <span className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                                {node.verificationStatus.replace(/_/g, " ")}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-black">{node.title}</h3>
                            <p className="mt-2 break-all font-mono text-xs text-zinc-600">{node.id}</p>
                            {node.pathPattern ? (
                              <p className="mt-2 break-all font-mono text-xs text-zinc-500">{node.pathPattern}</p>
                            ) : null}
                          </div>

                          <div className="grid shrink-0 gap-2 text-right sm:grid-cols-2 lg:grid-cols-3">
                            {[
                              ["Polls", formatBooleanLabel(node.polls)],
                              ["Automatic", formatBooleanLabel(node.automatic)],
                              ["Large dataset", formatBooleanLabel(node.loadsLargeDatasets)],
                              ["Pagination", formatBooleanLabel(node.usesPagination)],
                              ["Wide/blob/raw", formatBooleanLabel(node.returnsWideRowsOrBlobsOrRawJson)],
                              ["Fan-out", formatBooleanLabel(node.fansOutQueries)],
                              ["Postgres", node.postgresAccess],
                              ["Payload risk", node.payloadRisk],
                              ["Fanout risk", node.fanoutRisk],
                            ].map(([label, value]) => (
                              <div key={`${node.id}-${label}`} className="rounded-[1rem] border border-zinc-200 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                                <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-zinc-200 px-5 py-5">
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
                          <div className="space-y-5">
                            <div className="rounded-[1.2rem] border border-zinc-200 bg-zinc-50 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Evidence</p>
                              <p className="mt-3 text-sm leading-7 text-zinc-700">{node.basis.join(" · ")}</p>
                              <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-zinc-600">
                                <span>Confidence {node.confidence}</span>
                                {node.pollCadenceMs ? <span>Cadence {node.pollCadenceMs}ms</span> : null}
                                {node.viewKinds.length > 0 ? <span>Views {node.viewKinds.join(", ")}</span> : null}
                              </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                              <div className="rounded-[1.2rem] border border-zinc-200 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Upstream surfaces</p>
                                <div className="mt-3 space-y-3">
                                  {inbound.length === 0 ? (
                                    <p className="text-sm text-zinc-500">No upstream links recorded.</p>
                                  ) : (
                                    inbound.map((edge) => {
                                      const upstream = graph.nodeMap.get(edge.from);
                                      if (!upstream || !visibleIds.has(upstream.id)) return null;
                                      return (
                                        <div key={edge.id} className="rounded-[1rem] border border-zinc-200 bg-zinc-50 p-3">
                                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{edge.kind.replace(/_/g, " ")}</p>
                                          <p className="mt-1 text-sm font-semibold text-zinc-900">{upstream.title}</p>
                                          <p className="mt-1 break-all font-mono text-[11px] text-zinc-600">{upstream.id}</p>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>

                              <div className="rounded-[1.2rem] border border-zinc-200 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Downstream chain</p>
                                <div className="mt-3 space-y-3">
                                  {outbound.length === 0 ? (
                                    <p className="text-sm text-zinc-500">No downstream links recorded.</p>
                                  ) : (
                                    outbound.map((edge) => {
                                      const downstream = graph.nodeMap.get(edge.to);
                                      if (!downstream || !visibleIds.has(downstream.id)) return null;
                                      return (
                                        <div key={edge.id} className="rounded-[1rem] border border-zinc-200 bg-zinc-50 p-3">
                                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{edge.kind.replace(/_/g, " ")}</p>
                                          <p className="mt-1 text-sm font-semibold text-zinc-900">{downstream.title}</p>
                                          <p className="mt-1 break-all font-mono text-[11px] text-zinc-600">{downstream.id}</p>
                                          <p className="mt-2 text-xs text-zinc-500">{edge.basis.join(" · ")}</p>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <aside className="space-y-4">
                            <div className="rounded-[1.2rem] border border-zinc-200 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Source link</p>
                              {node.sourceFile ? (
                                <div className="mt-3 space-y-2">
                                  <p className="break-all font-mono text-xs text-zinc-700">{node.sourceFile}</p>
                                  {sourceHref ? (
                                    <a
                                      href={sourceHref}
                                      className="inline-flex rounded-full border border-black px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-black"
                                    >
                                      Open in editor
                                    </a>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-3 text-sm text-zinc-500">Manual backend seed without a direct source file.</p>
                              )}
                            </div>

                            <div className="rounded-[1.2rem] border border-zinc-200 p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Inventory status</p>
                              <div className="mt-3 space-y-3 text-sm text-zinc-700">
                                <p>Provenance: {node.provenance.replace(/_/g, " ")}</p>
                                <p>Verification: {node.verificationStatus.replace(/_/g, " ")}</p>
                                <p>Confidence: {node.confidence}</p>
                                <p>Kind: {formatNodeKindLabel(node)}</p>
                              </div>
                            </div>

                            {isPageNode(node) ? (
                              <div className="rounded-[1.2rem] border border-zinc-200 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Route & URL slug</p>
                                <div className="mt-3 space-y-2">
                                  {node.pathPattern == null ? (
                                    <a href={ADMIN_ROOT_PATH} className="text-sm font-semibold text-black underline decoration-zinc-300 underline-offset-4">
                                      {ADMIN_ROOT_PATH}
                                    </a>
                                  ) : isConcreteRouteHref(node.pathPattern) ? (
                                    <a href={node.pathPattern} className="text-sm font-semibold text-black underline decoration-zinc-300 underline-offset-4">
                                      {node.pathPattern}
                                    </a>
                                  ) : (
                                    <p className="break-all text-sm font-semibold text-black">{node.pathPattern}</p>
                                  )}
                                  <p className="break-all font-mono text-xs text-zinc-600">{derivePageUrlSlug(node.pathPattern)}</p>
                                </div>
                              </div>
                            ) : null}
                          </aside>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

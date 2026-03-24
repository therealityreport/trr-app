"use client";

import {
  ADMIN_ROUTE_FORWARDER_AUDIT,
  ADMIN_ROUTE_MATRIX_GROUPS,
  type AdminRouteVariantStatus,
} from "@/lib/admin/admin-route-audit";

const VARIANT_COPY: Record<
  AdminRouteVariantStatus,
  {
    label: string;
    badgeClassName: string;
  }
> = {
  canonical: {
    label: "Canonical",
    badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  legacy_alias: {
    label: "Legacy alias",
    badgeClassName: "border-rose-200 bg-rose-50 text-rose-700",
  },
  wrong_order: {
    label: "Wrong order",
    badgeClassName: "border-amber-200 bg-amber-50 text-amber-700",
  },
  internal_only: {
    label: "Internal only",
    badgeClassName: "border-sky-200 bg-sky-50 text-sky-700",
  },
};

export default function AdminIASection() {
  return (
    <div className="space-y-10">
      <section>
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Admin Route Matrix
        </div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Admin labels and route structure review
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
          This page is the route-testing ledger for the TRR-APP admin dashboard. It shows each admin-home tool family,
          every show tab, and every season tab as a shallow-to-deep path ladder so we can verify canonical URLs,
          document legacy aliases, and spot context-sensitive slug differences before they become routing regressions.
        </p>
      </section>

      {ADMIN_ROUTE_MATRIX_GROUPS.map((group) => (
        <section key={group.id} className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
                {group.kicker}
              </div>
              <h3 className="text-2xl font-semibold text-zinc-950">{group.title}</h3>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              {group.entries.length} route families
            </div>
          </div>

          <p className="mt-3 max-w-4xl text-sm text-zinc-600">{group.description}</p>

          <div className="mt-6 space-y-4">
            {group.entries.map((entry) => (
              <article key={`${group.id}-${entry.key}`} className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-semibold text-zinc-950">{entry.label}</h4>
                    <p className="mt-1 text-sm text-zinc-600">
                      Final testable state:
                      {" "}
                      <code className="rounded bg-white px-1.5 py-0.5 text-xs text-zinc-900">{entry.finalStatePath}</code>
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                    {entry.canonicalPathSteps.length} steps
                  </span>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Canonical Path Ladder
                    </div>
                    <ol className="mt-3 space-y-2">
                      {entry.canonicalPathSteps.map((path, index) => (
                        <li key={`${entry.key}-${path}`} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600">
                            {index + 1}
                          </span>
                          <code className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900">
                            {path}
                          </code>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                        Deepest State
                      </div>
                      <code className="mt-3 block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-900">
                        {entry.finalStatePath}
                      </code>
                    </div>

                    {entry.notes.length > 0 ? (
                      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                          Notes
                        </div>
                        <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                          {entry.notes.map((note) => (
                            <li key={note} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400" />
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                {entry.variantPaths.length > 0 ? (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
                    <div className="grid grid-cols-1 border-b border-zinc-200 bg-zinc-100 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 md:grid-cols-[0.9fr,1.3fr,2fr]">
                      <div className="px-4 py-3">Variant</div>
                      <div className="px-4 py-3">Path</div>
                      <div className="px-4 py-3">Why it matters</div>
                    </div>
                    {entry.variantPaths.map((variant) => {
                      const status = VARIANT_COPY[variant.status];
                      return (
                        <div
                          key={`${entry.key}-${variant.path}`}
                          className="grid grid-cols-1 border-t border-zinc-200 bg-white text-sm text-zinc-700 md:grid-cols-[0.9fr,1.3fr,2fr]"
                        >
                          <div className="px-4 py-4">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${status.badgeClassName}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="px-4 py-4 font-mono text-xs text-zinc-900">{variant.path}</div>
                          <div className="px-4 py-4 text-sm text-zinc-600">{variant.note}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
          Legacy forwarding
        </div>
        <h3 className="text-2xl font-semibold text-zinc-950">Redirectors and structurally wrong links</h3>
        <p className="mt-2 text-sm text-zinc-600">
          These paths may still be useful as compatibility layers, but they should not define the long-term structure
          of the admin dashboard.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
          <div className="grid grid-cols-1 border-b border-zinc-200 bg-zinc-100 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500 md:grid-cols-[1.2fr,1.2fr,1.2fr,2fr]">
            <div className="px-4 py-3">Source</div>
            <div className="px-4 py-3">Current target</div>
            <div className="px-4 py-3">Ideal target</div>
            <div className="px-4 py-3">Why it is wrong</div>
          </div>
          {ADMIN_ROUTE_FORWARDER_AUDIT.map((finding) => (
            <div
              key={finding.sourcePath}
              className="grid grid-cols-1 border-t border-zinc-200 bg-white text-sm text-zinc-700 md:grid-cols-[1.2fr,1.2fr,1.2fr,2fr]"
            >
              <div className="px-4 py-4 font-mono text-xs text-zinc-900">{finding.sourcePath}</div>
              <div className="px-4 py-4 font-mono text-xs text-zinc-900">{finding.currentTarget}</div>
              <div className="px-4 py-4 font-mono text-xs text-zinc-900">{finding.idealTarget}</div>
              <div className="px-4 py-4 text-sm text-zinc-600">{finding.issue}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

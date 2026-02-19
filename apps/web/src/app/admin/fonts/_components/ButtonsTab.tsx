"use client";

import { useMemo } from "react";
import { BUTTON_CATALOG, BUTTON_GROUPS, type ButtonCatalogEntry } from "./button-catalog";

function ButtonStatePreview({ entry }: { entry: ButtonCatalogEntry }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Default</p>
        <button type="button" className={entry.defaultClassName}>
          {entry.name}
        </button>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Hover</p>
        <button type="button" className={entry.hoverClassName}>
          {entry.name}
        </button>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Disabled</p>
        <button type="button" className={entry.disabledClassName} disabled>
          {entry.name}
        </button>
      </div>
    </div>
  );
}

export default function ButtonsTab() {
  const grouped = useMemo(() => {
    return BUTTON_GROUPS.map((group) => ({
      group,
      entries: BUTTON_CATALOG.filter((entry) => entry.group === group),
    })).filter((group) => group.entries.length > 0);
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900">Buttons</h2>
          <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-semibold text-cyan-800">
            {BUTTON_CATALOG.length}
          </span>
          <span className="text-xs text-zinc-400">Grouped button styles used across the app</span>
        </div>

        <div className="space-y-8">
          {grouped.map(({ group, entries }) => (
            <div key={group} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-700">{group}</h3>
              <div className="grid grid-cols-1 gap-4">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    data-testid={`buttons-catalog-${entry.id}`}
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-zinc-900">{entry.name}</h4>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                        {entry.usage}
                      </span>
                    </div>

                    <p className="mb-3 text-sm text-zinc-600">{entry.description}</p>
                    <ButtonStatePreview entry={entry} />

                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-zinc-500 sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-zinc-700">Source:</span>{" "}
                        <code>{entry.sourcePath}</code>
                      </p>
                      <p>
                        <span className="font-semibold text-zinc-700">Signature:</span>{" "}
                        <code>{entry.signature}</code>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

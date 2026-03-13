import type { ReactNode } from "react";
import Link from "next/link";

export type PublicRouteDetail = {
  label: string;
  value: ReactNode;
};

export type PublicRouteLink = {
  href: string;
  label: string;
};

export function formatRouteValue(value: string | string[] | null | undefined): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join("/") : "index";
  }
  const normalized = `${value ?? ""}`.trim();
  return normalized.length > 0 ? normalized : "index";
}

type PublicRouteShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  details?: PublicRouteDetail[];
  links?: PublicRouteLink[];
};

export default function PublicRouteShell({
  eyebrow,
  title,
  description,
  details = [],
  links = [],
}: PublicRouteShellProps) {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
          {details.length > 0 ? (
            <dl className="mt-6 grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {detail.label}
                  </dt>
                  <dd className="mt-1 break-all text-sm text-zinc-800">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

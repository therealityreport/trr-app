"use client";

import type { ReactNode } from "react";
import {
  type FandomDynamicSection,
  fandomSectionBucket,
  normalizeFandomBioCard,
  normalizeFandomDynamicSections,
} from "@/lib/admin/fandom-sync-types";

export function FandomSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function FandomField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-zinc-500 w-28 flex-shrink-0">{label}:</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

export function FandomList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

export function FandomJsonList({ title, data }: { title: string; data: Record<string, unknown> | unknown[] }) {
  const items: string[] = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === "string") {
        items.push(item);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (obj.name) {
          const relation = obj.relation ? ` (${obj.relation})` : "";
          items.push(`${obj.name}${relation}`);
        } else {
          const firstVal = Object.values(obj).find((v) => typeof v === "string");
          if (firstVal) items.push(firstVal as string);
        }
      }
    }
  } else {
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        items.push(`${key}: ${value}`);
      } else if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        if (obj.name) {
          items.push(`${key}: ${obj.name}`);
        }
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function fandomValueToText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((item) => fandomValueToText(item)).filter(Boolean).join(", ");
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => `${key}: ${fandomValueToText(entry)}`)
      .join(" | ");
  }
  return "—";
}

function toFandomStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" && item.trim() ? item.trim() : null))
    .filter((item): item is string => Boolean(item));
}

function FandomDynamicSectionCard({ title, section }: { title: string; section: FandomDynamicSection }) {
  const paragraphs = toFandomStringList(section.paragraphs);
  const bullets = toFandomStringList(section.bullets);
  const tableRows = Array.isArray(section.table_rows) ? section.table_rows : [];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <h4 className="mb-2 text-sm font-semibold text-zinc-700">{title}</h4>
      {paragraphs.length > 0 && (
        <div className="space-y-2 text-sm text-zinc-700">
          {paragraphs.map((paragraph, idx) => (
            <p key={`${title}-paragraph-${idx}`}>{paragraph}</p>
          ))}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700">
          {bullets.map((bullet, idx) => (
            <li key={`${title}-bullet-${idx}`}>{bullet}</li>
          ))}
        </ul>
      )}
      {tableRows.length > 0 && (
        <pre className="mt-2 overflow-auto text-xs text-zinc-700">{JSON.stringify(tableRows, null, 2)}</pre>
      )}
    </div>
  );
}

export function FandomBioCard({ card }: { card: unknown }) {
  const normalizedCard = normalizeFandomBioCard(card);
  if (!normalizedCard) return null;
  const groups: Array<{ key: string; label: string }> = [
    { key: "general", label: "General" },
    { key: "appearance", label: "Appearance" },
    { key: "relationships", label: "Relationships" },
    { key: "production", label: "Production" },
  ];
  const visibleGroups = groups.filter(({ key }) => normalizedCard[key] && typeof normalizedCard[key] === "object");
  if (visibleGroups.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 text-sm font-semibold text-zinc-700">Bio Card</h4>
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleGroups.map(({ key, label }) => {
          const section = normalizedCard[key];
          if (!section) return null;
          return (
            <div key={key} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</p>
              <div className="space-y-1.5">
                {Object.entries(section).map(([field, value]) => (
                  <div key={field} className="text-sm text-zinc-700">
                    <span className="font-medium text-zinc-900">{field.replaceAll("_", " ")}:</span>{" "}
                    {fandomValueToText(value)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FandomDynamicSections({ sections }: { sections: unknown }) {
  const normalized = normalizeFandomDynamicSections(sections);
  if (normalized.length === 0) return null;

  const casting = normalized.find((section) => fandomSectionBucket(section) === "casting");
  const biography = normalized.find((section) => fandomSectionBucket(section) === "biography");
  const taglines = normalized.find((section) => fandomSectionBucket(section) === "taglines");
  const reunion = normalized.find((section) => fandomSectionBucket(section) === "reunion");
  const otherSections = normalized.filter((section) => fandomSectionBucket(section) === "other");

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {casting && <FandomDynamicSectionCard title="Casting" section={casting} />}
        {biography && <FandomDynamicSectionCard title="Biography" section={biography} />}
        {taglines && <FandomDynamicSectionCard title="Taglines" section={taglines} />}
        {reunion && <FandomDynamicSectionCard title="Reunion Seating" section={reunion} />}
      </div>
      {otherSections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-zinc-700">Other Sections</h4>
          <div className="grid gap-4 lg:grid-cols-2">
            {otherSections.map((section, idx) => (
              <FandomDynamicSectionCard
                key={`${section.title ?? section.canonical_title ?? "section"}-${idx}`}
                title={String(section.title ?? section.canonical_title ?? `Section ${idx + 1}`)}
                section={section}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FandomTaglines({ taglines }: { taglines: Record<string, unknown> | unknown[] }) {
  const items: { season: string; tagline: string }[] = [];

  if (Array.isArray(taglines)) {
    for (const item of taglines) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const season = obj.season ? String(obj.season) : obj.year ? String(obj.year) : `#${items.length + 1}`;
        const rawTagline = obj.tagline || obj.quote || obj.text;
        if (rawTagline) {
          let tagline = String(rawTagline);
          if (tagline.startsWith('"') && tagline.endsWith('"')) {
            tagline = tagline.slice(1, -1);
          }
          items.push({ season, tagline });
        }
      } else if (typeof item === "string") {
        items.push({ season: `#${items.length + 1}`, tagline: item });
      }
    }
  } else {
    for (const [season, tagline] of Object.entries(taglines)) {
      if (typeof tagline === "string") {
        items.push({ season, tagline });
      } else if (tagline && typeof tagline === "object") {
        const obj = tagline as Record<string, unknown>;
        const text = obj.tagline || obj.quote || obj.text;
        if (text) items.push({ season, tagline: String(text) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Taglines</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded h-fit">
              {item.season}
            </span>
            <p className="text-sm text-amber-900 italic">&ldquo;{item.tagline}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FandomTrivia({ trivia }: { trivia: Record<string, unknown> | unknown[] }) {
  const items: string[] = [];

  if (Array.isArray(trivia)) {
    for (const item of trivia) {
      if (typeof item === "string") {
        items.push(item);
      } else if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  } else {
    for (const value of Object.values(trivia)) {
      if (typeof value === "string") {
        items.push(value);
      } else if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Trivia</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-600 pl-4 border-l-2 border-zinc-200">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FandomReunionSeating({ seating }: { seating: Record<string, unknown> | unknown[] }) {
  const items: { reunion: string; position: string }[] = [];

  if (Array.isArray(seating)) {
    for (const item of seating) {
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const season = obj.season;
        const seatOrder = obj.seat_order ?? obj.position ?? obj.seat;
        if (season !== undefined && seatOrder) {
          items.push({ reunion: `Season ${season} Reunion`, position: String(seatOrder) });
        }
      }
    }
  } else {
    for (const [reunion, position] of Object.entries(seating)) {
      if (typeof position === "string" || typeof position === "number") {
        items.push({ reunion, position: String(position) });
      } else if (position && typeof position === "object") {
        const obj = position as Record<string, unknown>;
        const pos = obj.position || obj.seat || obj.order;
        if (pos !== undefined) items.push({ reunion, position: String(pos) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Reunion Seating</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between p-2 rounded bg-zinc-50 text-sm">
            <span className="text-zinc-600">{item.reunion}</span>
            <span className="font-medium text-zinc-900">{item.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

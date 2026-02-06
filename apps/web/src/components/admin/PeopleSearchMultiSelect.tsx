"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PersonOption = { id: string; name: string };

export function PeopleSearchMultiSelect({
  value,
  onChange,
  getAuthHeaders,
  disabled,
  placeholder = "Type to search people...",
  minQueryLength = 2,
  limit = 8,
}: {
  value: PersonOption[];
  onChange: (next: PersonOption[]) => void;
  getAuthHeaders: () => Promise<{ Authorization: string }>;
  disabled?: boolean;
  placeholder?: string;
  minQueryLength?: number;
  limit?: number;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; full_name: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimerRef = useRef<number | null>(null);

  const selectedIds = useMemo(() => new Set(value.map((p) => p.id)), [value]);

  useEffect(() => {
    if (disabled) return;
    const trimmed = query.trim();
    if (trimmed.length < minQueryLength) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=${limit}`,
          { headers }
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = await response.json();
        const next = Array.isArray(data.people) ? data.people : [];
        setResults(
          next
            .map((p: { id?: string; full_name?: string }) => ({
              id: p.id ?? "",
              full_name: p.full_name ?? "",
            }))
            .filter((p: { id: string; full_name: string }) => Boolean(p.id && p.full_name))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, disabled, minQueryLength, limit, getAuthHeaders]);

  const addPerson = (person: { id: string; full_name: string }) => {
    if (disabled) return;
    if (selectedIds.has(person.id)) return;
    onChange([...value, { id: person.id, name: person.full_name }]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const removePerson = (id: string) => {
    if (disabled) return;
    onChange(value.filter((p) => p.id !== id));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700"
          >
            {p.name}
            <button
              type="button"
              onClick={() => removePerson(p.id)}
              disabled={disabled}
              className="text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
              aria-label={`Remove ${p.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="relative mt-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current);
            setOpen(true);
          }}
          onBlur={() => {
            // Delay to allow clicking a result.
            blurTimerRef.current = window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
        />
        {searching && (
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
          </div>
        )}

        {open && !disabled && results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
            {results.map((person) => {
              const isSelected = selectedIds.has(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  disabled={isSelected}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addPerson(person)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  <span className="font-semibold">{person.full_name}</span>
                  {isSelected && (
                    <span className="ml-2 text-xs text-zinc-500">(selected)</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


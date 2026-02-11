export interface SectionGroupItem<T> {
  item: T;
  /** Original index in the input array (useful for global numbering). */
  index: number;
}

export interface SectionGroup<T> {
  /** Normalized key: lowercased section label, or "~~ungrouped". */
  key: string;
  /** Display label: original section text, or "Ungrouped". */
  label: string;
  /** Index of the first item in this group (for stable ordering). */
  firstIndex: number;
  items: Array<SectionGroupItem<T>>;
}

export function groupBySection<T>(
  items: T[],
  getSectionLabel: (item: T) => string,
): Array<SectionGroup<T>> {
  const map = new Map<
    string,
    { label: string; firstIndex: number; items: Array<SectionGroupItem<T>> }
  >();

  for (const [index, item] of items.entries()) {
    const section = getSectionLabel(item).trim();
    const key = section ? section.toLowerCase() : "~~ungrouped";
    const existing = map.get(key);
    if (existing) {
      existing.items.push({ item, index });
      continue;
    }
    map.set(key, {
      label: section || "Ungrouped",
      firstIndex: index,
      items: [{ item, index }],
    });
  }

  const groups: Array<SectionGroup<T>> = Array.from(map.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    firstIndex: value.firstIndex,
    items: value.items,
  }));

  groups.sort((a, b) => {
    if (a.key === "~~ungrouped") return 1;
    if (b.key === "~~ungrouped") return -1;
    return a.firstIndex - b.firstIndex;
  });

  return groups;
}


"use client";

import { useRef, type KeyboardEvent } from "react";

interface ShowTab<TTab extends string = string> {
  id: TTab;
  label: string;
}

interface ShowTabsNavProps<TTab extends string = string> {
  tabs: ReadonlyArray<ShowTab<TTab>>;
  activeTab: TTab;
  onSelect: (tabId: TTab) => void;
}

export function ShowTabsNav<TTab extends string>({
  tabs,
  activeTab,
  onSelect,
}: ShowTabsNavProps<TTab>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusIndex = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    tabRefs.current[index]?.focus();
    onSelect(tab.id);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusIndex((index + 1) % tabs.length);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusIndex((index - 1 + tabs.length) % tabs.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      focusIndex(tabs.length - 1);
    }
  };

  return (
    <nav className="flex flex-wrap gap-2" role="tablist" aria-label="Show tabs">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
          ref={(node) => {
            tabRefs.current[index] = node;
          }}
          id={`show-tab-${tab.id}`}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`show-tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

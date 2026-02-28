"use client";

import { useRef, type KeyboardEvent } from "react";

interface SeasonTab<TTab extends string = string> {
  id: TTab;
  label: string;
  icon?: "home";
}

interface SeasonTabsNavProps<TTab extends string = string> {
  tabs: ReadonlyArray<SeasonTab<TTab>>;
  activeTab: TTab;
  onSelect: (tabId: TTab) => void;
}

export function SeasonTabsNav<TTab extends string>({
  tabs,
  activeTab,
  onSelect,
}: SeasonTabsNavProps<TTab>) {
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
    <nav className="flex flex-wrap gap-2 py-4" role="tablist" aria-label="Season tabs">
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
          ref={(node) => {
            tabRefs.current[index] = node;
          }}
          id={`season-tab-${tab.id}`}
          role="tab"
          aria-label={tab.icon === "home" ? tab.label : undefined}
          aria-selected={activeTab === tab.id}
          aria-controls={`season-tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          {tab.icon === "home" ? (
            <span className="inline-flex items-center">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M3 11.5L12 4l9 7.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.5 10.5V20h11v-9.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="sr-only">{tab.label}</span>
            </span>
          ) : (
            tab.label
          )}
        </button>
      ))}
    </nav>
  );
}

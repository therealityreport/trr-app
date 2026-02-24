"use client";

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
  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
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

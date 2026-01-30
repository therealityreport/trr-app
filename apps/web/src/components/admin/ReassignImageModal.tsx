"use client";

import { useState, useEffect, useCallback } from "react";
import type { ImageType } from "./ImageLightbox";

// Inline SVG icons
const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const AlertTriangleIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

interface SearchResult {
  id: string;
  label: string;
}

interface ReassignImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (toType: ImageType, toEntityId: string) => Promise<void>;
  currentType: ImageType;
  currentEntityId: string;
  currentEntityLabel?: string;
}

const TYPE_LABELS: Record<ImageType, string> = {
  cast: "Person (Cast Photo)",
  episode: "Episode",
  season: "Season",
};

export default function ReassignImageModal({
  isOpen,
  onClose,
  onSubmit,
  currentType,
  currentEntityId,
  currentEntityLabel,
}: ReassignImageModalProps) {
  const [targetType, setTargetType] = useState<ImageType>(currentType);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<SearchResult | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTypeChanging = targetType !== currentType;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetType(currentType);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedEntity(null);
      setError(null);
    }
  }, [isOpen, currentType]);

  // Debounced search
  const searchEntities = useCallback(
    async (query: string, type: ImageType) => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let endpoint: string;
        switch (type) {
          case "cast":
            endpoint = `/api/admin/trr-api/people/search?q=${encodeURIComponent(query)}`;
            break;
          case "episode":
            endpoint = `/api/admin/trr-api/episodes/search?q=${encodeURIComponent(query)}`;
            break;
          case "season":
            endpoint = `/api/admin/trr-api/seasons/search?q=${encodeURIComponent(query)}`;
            break;
        }

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          // API returns different shapes - normalize to { id, label }
          const results: SearchResult[] = (data.results || data.people || [])
            .slice(0, 10)
            .map((item: { id: string; full_name?: string; label?: string; name?: string }) => ({
              id: item.id,
              label: item.full_name || item.label || item.name || item.id,
            }));
          setSearchResults(results);
        } else {
          setError("Search failed. Please try again.");
          setSearchResults([]);
        }
      } catch {
        setError("Network error. Please try again.");
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchEntities(searchQuery, targetType);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, targetType, searchEntities]);

  const handleSubmit = async () => {
    if (!selectedEntity) return;

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(targetType, selectedEntity.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reassign image."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Re-assign Image
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 rounded transition-colors"
          >
            <XIcon className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        {/* Current assignment */}
        <div className="mb-4 p-3 bg-zinc-50 rounded-lg">
          <span className="text-xs text-zinc-500">Currently assigned to:</span>
          <p className="text-sm font-medium text-zinc-900 capitalize">
            {currentType} •{" "}
            {currentEntityLabel || `${currentEntityId.slice(0, 8)}...`}
          </p>
        </div>

        {/* Target type selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Destination type:
          </label>
          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as ImageType);
              setSelectedEntity(null);
              setSearchQuery("");
              setSearchResults([]);
            }}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(Object.keys(TYPE_LABELS) as ImageType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Warning for type change */}
        {isTypeChanging && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Changing image type will <strong>copy</strong> this image to the
              new destination and <strong>archive</strong> the original.
            </p>
          </div>
        )}

        {/* Entity search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-700 mb-1">
            Search for{" "}
            {targetType === "cast"
              ? "person"
              : targetType === "episode"
                ? "episode"
                : "season"}
            :
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Start typing to search..."
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {loading && (
            <p className="text-xs text-zinc-500 mt-1">Searching...</p>
          )}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-zinc-200 rounded-md">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedEntity(result)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 transition-colors ${
                    selectedEntity?.id === result.id
                      ? "bg-blue-50 text-blue-900"
                      : "text-zinc-700"
                  }`}
                >
                  {result.label}
                </button>
              ))}
            </div>
          )}

          {searchQuery.length >= 2 &&
            !loading &&
            searchResults.length === 0 && (
              <p className="text-xs text-zinc-500 mt-1">No results found.</p>
            )}
        </div>

        {/* Selected entity */}
        {selectedEntity && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-600">Selected:</span>
            <p className="text-sm font-medium text-blue-900">
              {selectedEntity.label}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEntity || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? "Reassigning..."
              : isTypeChanging
                ? "Copy & Archive Original"
                : "Reassign"}
          </button>
        </div>
      </div>
    </div>
  );
}

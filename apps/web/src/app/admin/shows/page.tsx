"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

// ============================================================================
// Types
// ============================================================================

interface CastMember {
  name: string;
  image: string;
  role?: string;
  instagram?: string;
  status?: "main" | "friend" | "new" | "alum";
}

interface SeasonColors {
  primary: string;
  accent: string;
  neutral: string;
}

interface Season {
  id: string;
  show_id: string;
  season_number: number;
  label: string;
  year: string | null;
  description: string | null;
  colors: SeasonColors | null;
  show_icon_url: string | null;
  wordmark_url: string | null;
  hero_url: string | null;
  cast_members: CastMember[];
  notes: string[];
  is_active: boolean;
  is_current: boolean;
}

interface ShowPalette {
  primary: string;
  accent: string;
  dark: string;
  light: string;
}

interface Show {
  id: string;
  key: string;
  title: string;
  short_title: string | null;
  network: string | null;
  status: string | null;
  logline: string | null;
  palette: ShowPalette | null;
  icon_url: string | null;
  wordmark_url: string | null;
  hero_url: string | null;
  tags: string[];
  is_active: boolean;
  seasons?: Season[];
}

// ============================================================================
// API Helpers
// ============================================================================

async function getAuthToken(): Promise<string | null> {
  return auth.currentUser?.getIdToken() ?? null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not authenticated");

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

// ============================================================================
// Components
// ============================================================================

function ColorBadge({
  label,
  value,
  editable,
  onChange,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/70 px-3 py-2 shadow-sm">
      <label
        className="h-6 w-6 rounded-full border border-white shadow cursor-pointer overflow-hidden"
        style={{ background: value }}
      >
        {editable && (
          <input
            type="color"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        )}
      </label>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">{label}</p>
        {editable ? (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="text-sm font-mono text-zinc-900 bg-transparent border-b border-zinc-200 focus:border-zinc-400 outline-none w-20"
          />
        ) : (
          <p className="text-sm font-mono text-zinc-900">{value}</p>
        )}
      </div>
    </div>
  );
}

function CastCard({
  member,
  onEdit,
  onDelete,
}: {
  member: CastMember;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg bg-white/90 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-white/90 border border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-red-50"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-zinc-50">
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            fill
            sizes="200px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-base font-semibold text-zinc-900">{member.name}</p>
      {member.role && <p className="text-sm text-zinc-500">{member.role}</p>}
      {member.instagram && (
        <p className="text-xs text-zinc-400 mt-1">{member.instagram}</p>
      )}
      {member.status && (
        <span className="mt-2 inline-flex rounded-full border border-zinc-200 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-600">
          {member.status}
        </span>
      )}
    </div>
  );
}

function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function CastMemberModal({
  isOpen,
  onClose,
  member,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  member: CastMember | null;
  onSave: (member: CastMember) => void;
}) {
  const [form, setForm] = useState<CastMember>(
    member ?? { name: "", image: "", role: "", instagram: "", status: "main" }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={member ? "Edit Cast Member" : "Add Cast Member"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Image URL</label>
          <input
            type="text"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="/images/shows/rhoslc/season-6/name.png"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Role</label>
          <input
            type="text"
            value={form.role ?? ""}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="OG Wife, Friend, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Instagram</label>
          <input
            type="text"
            value={form.instagram ?? ""}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="@username"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Status</label>
          <select
            value={form.status ?? "main"}
            onChange={(e) => setForm({ ...form, status: e.target.value as CastMember["status"] })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            <option value="main">Main</option>
            <option value="friend">Friend</option>
            <option value="new">New</option>
            <option value="alum">Alum</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {member ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SeasonColorsModal({
  isOpen,
  onClose,
  colors,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  colors: SeasonColors;
  onSave: (colors: SeasonColors) => void;
}) {
  const [form, setForm] = useState<SeasonColors>(colors);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Season Colors">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Primary Color</label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={form.primary}
              onChange={(e) => setForm({ ...form, primary: e.target.value })}
              className="w-12 h-10 rounded-lg border border-zinc-200 cursor-pointer"
            />
            <input
              type="text"
              value={form.primary}
              onChange={(e) => setForm({ ...form, primary: e.target.value })}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Accent Color</label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={form.accent}
              onChange={(e) => setForm({ ...form, accent: e.target.value })}
              className="w-12 h-10 rounded-lg border border-zinc-200 cursor-pointer"
            />
            <input
              type="text"
              value={form.accent}
              onChange={(e) => setForm({ ...form, accent: e.target.value })}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Neutral Color</label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={form.neutral}
              onChange={(e) => setForm({ ...form, neutral: e.target.value })}
              className="w-12 h-10 rounded-lg border border-zinc-200 cursor-pointer"
            />
            <input
              type="text"
              value={form.neutral}
              onChange={(e) => setForm({ ...form, neutral: e.target.value })}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save Colors
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NotesModal({
  isOpen,
  onClose,
  notes,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  notes: string[];
  onSave: (notes: string[]) => void;
}) {
  const [form, setForm] = useState<string[]>(notes.length > 0 ? notes : [""]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form.filter((n) => n.trim() !== ""));
    onClose();
  };

  const addNote = () => setForm([...form, ""]);
  const removeNote = (index: number) => setForm(form.filter((_, i) => i !== index));
  const updateNote = (index: number, value: string) => {
    const updated = [...form];
    updated[index] = value;
    setForm(updated);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Notes">
      <form onSubmit={handleSubmit} className="space-y-4">
        {form.map((note, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={(e) => updateNote(index, e.target.value)}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Add a note..."
            />
            <button
              type="button"
              onClick={() => removeNote(index)}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addNote}
          className="w-full rounded-lg border border-dashed border-zinc-300 px-4 py-2 text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-600"
        >
          + Add Note
        </button>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Save Notes
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateShowModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (show: { key: string; title: string; shortTitle?: string; network?: string; logline?: string }) => void;
}) {
  const [form, setForm] = useState({
    key: "",
    title: "",
    shortTitle: "",
    network: "Bravo",
    logline: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      key: form.key,
      title: form.title,
      shortTitle: form.shortTitle || undefined,
      network: form.network || undefined,
      logline: form.logline || undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Show">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Show Key</label>
          <input
            type="text"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="rhoslc"
            required
          />
          <p className="text-xs text-zinc-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="The Real Housewives of Salt Lake City"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Short Title</label>
          <input
            type="text"
            value={form.shortTitle}
            onChange={(e) => setForm({ ...form, shortTitle: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="RHOSLC"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Network</label>
          <input
            type="text"
            value={form.network}
            onChange={(e) => setForm({ ...form, network: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Bravo"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Logline</label>
          <textarea
            value={form.logline}
            onChange={(e) => setForm({ ...form, logline: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="A brief description of the show..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Create Show
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateSeasonModal({
  isOpen,
  onClose,
  showKey,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  showKey: string;
  onSave: (season: { seasonNumber: number; label: string; year?: string; description?: string }) => void;
}) {
  const [form, setForm] = useState({
    seasonNumber: 1,
    label: "Season 1",
    year: new Date().getFullYear().toString(),
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      seasonNumber: form.seasonNumber,
      label: form.label,
      year: form.year || undefined,
      description: form.description || undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Season">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Season Number</label>
          <input
            type="number"
            value={form.seasonNumber}
            onChange={(e) => {
              const num = parseInt(e.target.value) || 1;
              setForm({ ...form, seasonNumber: num, label: `Season ${num}` });
            }}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            min={1}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Season 1"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Year</label>
          <input
            type="text"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="2025"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            rows={2}
            placeholder="A brief description of this season..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Create Season
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function AdminShowsPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  // Manual state management instead of SWR
  const [shows, setShows] = useState<Show[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const showOptions = shows.map((show) => ({
    key: show.key,
    title: show.title,
    shortTitle: show.short_title ?? show.title,
  }));

  const [selectedShowKey, setSelectedShowKey] = useState<string | null>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Modal states
  const [showCreateShowModal, setShowCreateShowModal] = useState(false);
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [showColorsModal, setShowColorsModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [editingCastMember, setEditingCastMember] = useState<CastMember | null>(null);
  const [editingCastIndex, setEditingCastIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch shows function
  const fetchShows = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetchWithAuth("/api/admin/shows?includeSeasons=true");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setShows(data.shows ?? []);
    } catch (err) {
      console.error("Failed to fetch shows:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch shows"));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refetch helper (replaces SWR mutate)
  const mutate = useCallback(() => {
    fetchShows();
  }, [fetchShows]);

  // Fetch on mount and when user changes
  useEffect(() => {
    if (hasAccess && user) {
      fetchShows();
    }
  }, [hasAccess, user, fetchShows]);

  // Set initial selection when data loads
  useEffect(() => {
    if (shows.length > 0 && !selectedShowKey) {
      setSelectedShowKey(shows[0].key);
      const firstShow = shows[0];
      if (firstShow.seasons && firstShow.seasons.length > 0) {
        setSelectedSeasonId(firstShow.seasons[0].id);
      }
    }
  }, [shows, selectedShowKey]);

  const activeShow = useMemo<Show | null>(
    () => (selectedShowKey ? shows.find((show) => show.key === selectedShowKey) ?? null : null),
    [selectedShowKey, shows]
  );

  const activeSeason = useMemo<Season | null>(
    () =>
      activeShow && selectedSeasonId && activeShow.seasons
        ? activeShow.seasons.find((season) => season.id === selectedSeasonId) ?? null
        : null,
    [activeShow, selectedSeasonId]
  );

  // API handlers
  const createShow = useCallback(
    async (showData: { key: string; title: string; shortTitle?: string; network?: string; logline?: string }) => {
      setIsSaving(true);
      try {
        const res = await fetchWithAuth("/api/admin/shows", {
          method: "POST",
          body: JSON.stringify(showData),
        });
        if (!res.ok) throw new Error("Failed to create show");
        mutate();
        setSelectedShowKey(showData.key);
      } catch (err) {
        console.error("Failed to create show:", err);
        alert("Failed to create show");
      } finally {
        setIsSaving(false);
      }
    },
    [mutate]
  );

  const createSeason = useCallback(
    async (seasonData: { seasonNumber: number; label: string; year?: string; description?: string }) => {
      if (!selectedShowKey) return;
      setIsSaving(true);
      try {
        const res = await fetchWithAuth(`/api/admin/shows/${selectedShowKey}/seasons`, {
          method: "POST",
          body: JSON.stringify({
            ...seasonData,
            colors: { primary: "#1E3A5F", accent: "#87CEEB", neutral: "#E8F4FC" },
          }),
        });
        if (!res.ok) throw new Error("Failed to create season");
        const data = await res.json();
        mutate();
        setSelectedSeasonId(data.season.id);
      } catch (err) {
        console.error("Failed to create season:", err);
        alert("Failed to create season");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedShowKey, mutate]
  );

  const updateSeasonColors = useCallback(
    async (colors: SeasonColors) => {
      if (!selectedShowKey || !selectedSeasonId) return;
      setIsSaving(true);
      try {
        const res = await fetchWithAuth(`/api/admin/shows/${selectedShowKey}/seasons/${selectedSeasonId}`, {
          method: "PUT",
          body: JSON.stringify({ colors }),
        });
        if (!res.ok) throw new Error("Failed to update colors");
        mutate();
      } catch (err) {
        console.error("Failed to update colors:", err);
        alert("Failed to update colors");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedShowKey, selectedSeasonId, mutate]
  );

  const updateSeasonNotes = useCallback(
    async (notes: string[]) => {
      if (!selectedShowKey || !selectedSeasonId) return;
      setIsSaving(true);
      try {
        const res = await fetchWithAuth(`/api/admin/shows/${selectedShowKey}/seasons/${selectedSeasonId}`, {
          method: "PUT",
          body: JSON.stringify({ notes }),
        });
        if (!res.ok) throw new Error("Failed to update notes");
        mutate();
      } catch (err) {
        console.error("Failed to update notes:", err);
        alert("Failed to update notes");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedShowKey, selectedSeasonId, mutate]
  );

  const saveCastMember = useCallback(
    async (member: CastMember) => {
      if (!selectedShowKey || !selectedSeasonId || !activeSeason) return;
      setIsSaving(true);
      try {
        const updatedCast = [...(activeSeason.cast_members ?? [])];
        if (editingCastIndex !== null) {
          updatedCast[editingCastIndex] = member;
        } else {
          updatedCast.push(member);
        }

        const res = await fetchWithAuth(`/api/admin/shows/${selectedShowKey}/seasons/${selectedSeasonId}`, {
          method: "PUT",
          body: JSON.stringify({ castMembers: updatedCast }),
        });
        if (!res.ok) throw new Error("Failed to update cast");
        await mutate();
      } catch (err) {
        console.error("Failed to update cast:", err);
        alert("Failed to update cast");
      } finally {
        setIsSaving(false);
        setEditingCastMember(null);
        setEditingCastIndex(null);
      }
    },
    [selectedShowKey, selectedSeasonId, activeSeason, editingCastIndex, mutate]
  );

  const deleteCastMember = useCallback(
    async (index: number) => {
      if (!selectedShowKey || !selectedSeasonId || !activeSeason) return;
      if (!confirm("Are you sure you want to remove this cast member?")) return;

      setIsSaving(true);
      try {
        const updatedCast = activeSeason.cast_members.filter((_, i) => i !== index);
        const res = await fetchWithAuth(`/api/admin/shows/${selectedShowKey}/seasons/${selectedSeasonId}`, {
          method: "PUT",
          body: JSON.stringify({ castMembers: updatedCast }),
        });
        if (!res.ok) throw new Error("Failed to delete cast member");
        mutate();
      } catch (err) {
        console.error("Failed to delete cast member:", err);
        alert("Failed to delete cast member");
      } finally {
        setIsSaving(false);
      }
    },
    [selectedShowKey, selectedSeasonId, activeSeason, mutate]
  );

  // Loading / auth states
  if (checking || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-600">Loading...</p>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Failed to load shows</p>
          <p className="text-xs text-zinc-500">{error.message || "Check browser console for details"}</p>
          <button
            onClick={() => mutate()}
            className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (shows.length === 0) {
    return (
      <ClientOnly>
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">No Shows Yet</h1>
            <p className="text-zinc-500 mb-6">Create your first show to get started.</p>
            <button
              onClick={() => setShowCreateShowModal(true)}
              className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              + Add Show
            </button>
          </div>
          <CreateShowModal
            isOpen={showCreateShowModal}
            onClose={() => setShowCreateShowModal(false)}
            onSave={createShow}
          />
        </div>
      </ClientOnly>
    );
  }

  if (!activeShow) {
    return null;
  }

  const seasonColors = activeSeason?.colors ?? { primary: "#1E3A5F", accent: "#87CEEB", neutral: "#E8F4FC" };
  const seasonNotes = activeSeason?.notes ?? [];
  const castMembers = activeSeason?.cast_members ?? [];

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Shows · Assets</p>
              <h1 className="text-3xl font-bold text-zinc-900">{activeShow.title}</h1>
              <p className="text-sm text-zinc-500">{activeShow.logline}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedShowKey ?? undefined}
                onChange={(event) => {
                  const key = event.target.value;
                  setSelectedShowKey(key);
                  const show = shows.find((entry) => entry.key === key);
                  setSelectedSeasonId(show?.seasons?.[0]?.id ?? null);
                }}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
              >
                {showOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.shortTitle}
                  </option>
                ))}
              </select>
              <select
                value={selectedSeasonId ?? undefined}
                onChange={(event) => setSelectedSeasonId(event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800"
                disabled={!activeShow.seasons || activeShow.seasons.length === 0}
              >
                {activeShow.seasons?.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                )) ?? <option>No seasons</option>}
              </select>
              <button
                onClick={() => setShowCreateShowModal(true)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                + Show
              </button>
              <button
                onClick={() => setShowCreateSeasonModal(true)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                disabled={!selectedShowKey}
              >
                + Season
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
          {activeSeason ? (
            <>
              {/* Season Info & Colors */}
              <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-400">
                        {activeShow.network}
                      </p>
                      <h2 className="text-2xl font-bold text-zinc-900">{activeSeason.label}</h2>
                      {activeSeason.description && (
                        <p className="mt-1 text-sm text-zinc-600">{activeSeason.description}</p>
                      )}
                    </div>
                    {activeSeason.show_icon_url && (
                      <div className="relative h-16 w-16">
                        <Image
                          src={activeSeason.show_icon_url}
                          alt={`${activeShow.short_title} icon`}
                          fill
                          sizes="64px"
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <ColorBadge label="Primary" value={seasonColors.primary} />
                    <ColorBadge label="Accent" value={seasonColors.accent} />
                    <ColorBadge label="Neutral" value={seasonColors.neutral} />
                    <button
                      onClick={() => setShowColorsModal(true)}
                      className="self-center rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Edit Colors
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-zinc-900">Notes</h3>
                    <button
                      onClick={() => setShowNotesModal(true)}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                    >
                      Edit
                    </button>
                  </div>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600">
                    {seasonNotes.length > 0 ? (
                      seasonNotes.map((note) => <li key={note}>{note}</li>)
                    ) : (
                      <li className="text-zinc-400">No season notes yet. Add color references or brand guidelines here.</li>
                    )}
                  </ul>
                </div>
              </section>

              {/* Cast Section */}
              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Cast Icons</p>
                    <h3 className="text-xl font-bold text-zinc-900">
                      {activeShow.short_title} · {activeSeason.label}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                      {castMembers.length} assets
                    </span>
                    <button
                      onClick={() => {
                        setEditingCastMember(null);
                        setEditingCastIndex(null);
                        setShowCastModal(true);
                      }}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      + Add Cast
                    </button>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {castMembers.map((member, index) => (
                    <CastCard
                      key={`${member.name}-${index}`}
                      member={member}
                      onEdit={() => {
                        setEditingCastMember(member);
                        setEditingCastIndex(index);
                        setShowCastModal(true);
                      }}
                      onDelete={() => deleteCastMember(index)}
                    />
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500 mb-4">No seasons yet for this show.</p>
              <button
                onClick={() => setShowCreateSeasonModal(true)}
                className="rounded-lg bg-zinc-900 px-6 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                + Add Season
              </button>
            </div>
          )}
        </main>

        {/* Modals */}
        <CreateShowModal
          isOpen={showCreateShowModal}
          onClose={() => setShowCreateShowModal(false)}
          onSave={createShow}
        />
        <CreateSeasonModal
          isOpen={showCreateSeasonModal}
          onClose={() => setShowCreateSeasonModal(false)}
          showKey={selectedShowKey ?? ""}
          onSave={createSeason}
        />
        <SeasonColorsModal
          isOpen={showColorsModal}
          onClose={() => setShowColorsModal(false)}
          colors={seasonColors}
          onSave={updateSeasonColors}
        />
        <NotesModal
          isOpen={showNotesModal}
          onClose={() => setShowNotesModal(false)}
          notes={seasonNotes}
          onSave={updateSeasonNotes}
        />
        <CastMemberModal
          isOpen={showCastModal}
          onClose={() => {
            setShowCastModal(false);
            setEditingCastMember(null);
            setEditingCastIndex(null);
          }}
          member={editingCastMember}
          onSave={saveCastMember}
        />

        {/* Saving indicator */}
        {isSaving && (
          <div className="fixed bottom-4 right-4 bg-zinc-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
            Saving...
          </div>
        )}
      </div>
    </ClientOnly>
  );
}

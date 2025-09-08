"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserByUsername, getUserProfile, upsertUserProfile } from "@/lib/db/users";
import { validateBirthday, validateUsername, parseShows, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";

type FieldErrors = Partial<Record<"username" | "birthday" | "shows", string>>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [showSelections, setShowSelections] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  // Load current user and check if profile exists
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace("/auth/register");
        return;
      }
      const existing = await getUserProfile(u.uid);
      if (existing) {
        router.replace("/realitease");
        return;
      }
      // Pre-fill username hint from email prefix if available and sane
      if (u.email) {
        const base = u.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (base && base.length >= 3 && base.length <= 20) setUsername(base);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const selectedShows = useMemo(() => Object.keys(showSelections).filter((s) => showSelections[s]), [showSelections]);

  const toggleShow = (name: string) =>
    setShowSelections((prev) => ({ ...prev, [name]: !prev[name] }));

  const validateAll = async (): Promise<boolean> => {
    const next: FieldErrors = {};
    const uErr = validateUsername(username);
    if (uErr) next.username = uErr;
    const bErr = validateBirthday(birthday);
    if (bErr) next.birthday = bErr;
    if (selectedShows.length === 0) next.shows = "Select at least one show.";

    if (!next.username) {
      const existing = await getUserByUsername(username);
      if (existing) next.username = "That username is taken. Try another.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const ok = await validateAll();
      if (!ok) return;
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      // Ensure session cookie exists
      try {
        const idToken = await u.getIdToken();
        await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
      } catch {}
      const provider = u.providerData?.[0]?.providerId ?? "password";
      const payload: Partial<UserProfile> = {
        uid: u.uid,
        email: u.email ?? null,
        username: username.trim(),
        birthday: birthday.trim(),
        shows: parseShows(selectedShows),
        provider,
      };
      await upsertUserProfile(u.uid, payload);
      sessionStorage.setItem("toastMessage", "Profile completed");
      router.replace("/realitease");
    } catch (err: unknown) {
      setFormError(getFriendlyError(err));
    } finally {
      setPending(false);
    }
  };

  if (loading) return null;

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-serif text-3xl">Complete your profile</h1>
      <p className="text-gray-600 mt-1">Just a few details to finish setup.</p>

      <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
        {formError && (
          <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium">Username</label>
          <input
            id="username"
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={pending}
            placeholder="e.g. reality_fan123"
            required
          />
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
        </div>

        <div>
          <label htmlFor="birthday" className="block text-sm font-medium">Birthday</label>
          <input
            id="birthday"
            type="date"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            disabled={pending}
            required
          />
          {errors.birthday && <p className="mt-1 text-sm text-red-600">{errors.birthday}</p>}
        </div>

        <div>
          <p className="block text-sm font-medium">Which shows do you watch?</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ALL_SHOWS.map((name) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!showSelections[name]}
                  onChange={() => toggleShow(name)}
                  disabled={pending}
                />
                <span>{name}</span>
              </label>
            ))}
          </div>
          {errors.shows && <p className="mt-1 text-sm text-red-600">{errors.shows}</p>}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 border rounded bg-black text-white disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Saving…" : "Finish"}
          </button>
        </div>
      </form>
    </main>
  );
}

function getFriendlyError(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

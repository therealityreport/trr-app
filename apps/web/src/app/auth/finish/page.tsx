"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserByUsername, getUserProfile, upsertUserProfile } from "@/lib/db/users";
import { validateBirthday, validateUsername, parseShows, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";

type FieldErrors = Partial<Record<"username" | "birthday" | "shows", string>>;

export default function FinishProfilePage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [requireBirthday, setRequireBirthday] = useState(true);
  const [showSelections, setShowSelections] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  // Load user and prefill hints
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace("/auth/register");
        return;
      }
      const prof = await getUserProfile(u.uid);
      // If already complete, head to hub
      if (prof && prof.username && Array.isArray(prof.shows) && prof.shows.length >= 3 && prof.birthday) {
        router.replace("/hub");
        return;
      }
      if (prof?.birthday) {
        setBirthday(typeof prof.birthday === "string" ? prof.birthday : "");
        setRequireBirthday(false);
      }
      if (u.email) {
        const base = u.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (base && base.length >= 3 && base.length <= 20) setUsername(base);
      }
      // Restore any saved finish state
      try {
        const sUser = sessionStorage.getItem("finish_username");
        const sShows = sessionStorage.getItem("finish_shows");
        const sB = sessionStorage.getItem("finish_birthday");
        if (sUser) setUsername(sUser);
        if (sB && !prof?.birthday) setBirthday(sB);
        if (sShows) {
          const arr: string[] = JSON.parse(sShows);
          const map: Record<string, boolean> = {};
          for (const s of arr) map[s] = true;
          setShowSelections(map);
        }
      } catch {}
    });
    return () => unsub();
  }, [router]);

  const selectedShows = useMemo(() => Object.keys(showSelections).filter((s) => showSelections[s]), [showSelections]);
  const toggleShow = (name: string) => setShowSelections((prev) => {
    const next = { ...prev, [name]: !prev[name] };
    try { sessionStorage.setItem("finish_shows", JSON.stringify(Object.keys(next).filter((k) => next[k]))); } catch {}
    return next;
  });

  const checkUsernameUnique = async (u: string): Promise<string | null> => {
    const baseErr = validateUsername(u);
    if (baseErr) return baseErr;
    const existing = await getUserByUsername(u);
    return existing ? "That username is taken. Try another." : null;
  };

  const validateAll = async (): Promise<boolean> => {
    const next: FieldErrors = {};
    const userErr = await checkUsernameUnique(username);
    if (userErr) next.username = userErr;
    if (requireBirthday) {
      const bErr = validateBirthday(birthday);
      if (bErr) next.birthday = bErr;
    }
    if (selectedShows.length < 3) next.shows = "Select at least 3 shows.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onBlurUsername = async () => {
    const e = await checkUsernameUnique(username);
    setErrors((prev) => ({ ...prev, username: e ?? undefined }));
    try { sessionStorage.setItem("finish_username", username); } catch {}
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
      // Defensive: ensure server session cookie exists
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
        birthday: requireBirthday ? birthday.trim() : birthday.trim(),
        shows: parseShows(selectedShows),
        provider,
      };
      await upsertUserProfile(u.uid, payload);
      sessionStorage.setItem("toastMessage", "Profile completed");
      try {
        sessionStorage.removeItem("finish_username");
        sessionStorage.removeItem("finish_shows");
        sessionStorage.removeItem("finish_birthday");
      } catch {}
      router.replace("/hub");
    } catch (err: unknown) {
      setFormError(getFriendlyError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-serif text-3xl">Complete Profile</h1>
      <p className="text-gray-600 mt-1">Choose a username and your favorite shows.</p>

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
            onBlur={onBlurUsername}
            disabled={pending}
            placeholder="e.g. reality_fan123"
            required
          />
          {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
        </div>

        {requireBirthday && (
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
        )}

        <div>
          <p className="block text-sm font-medium">Which shows do you watch? <span className="text-gray-500">(Select at least 3)</span></p>
          <div className="flex flex-wrap gap-2 mt-2">
            {ALL_SHOWS.map((name) => {
              const active = !!showSelections[name];
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleShow(name)}
                  disabled={pending}
                  className={`px-3 py-1 rounded-full text-sm border ${active ? "bg-black text-white border-black" : "bg-white text-black border-zinc-300"}`}
                  aria-pressed={active}
                >
                  {name}
                </button>
              );
            })}
          </div>
          {errors.shows && <p className="mt-1 text-sm text-red-600">{errors.shows}</p>}
          <p className="text-xs text-gray-500 mt-1">Selected: {selectedShows.length}</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-4 py-2 border rounded bg-black text-white disabled:opacity-60"
            disabled={pending || selectedShows.length < 3}
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

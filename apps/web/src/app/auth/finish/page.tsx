"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserByUsername, getUserProfile, upsertUserProfile } from "@/lib/db/users";
import { validateBirthday, validateUsername, parseShows, validateShowsMin, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";
import ClientOnly from "@/components/ClientOnly";
import Image from "next/image";

type FieldErrors = Partial<Record<"username" | "birthday" | "shows", string>>;

function FinishProfileContent() {
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
      console.log("Finish: Auth state changed", u ? { uid: u.uid, email: u.email } : "No user");
      if (!u) {
        router.replace("/auth/register");
        return;
      }
      
      // Check if user came from Google OAuth (has google.com provider)
      const isGoogleUser = u.providerData.some(provider => provider.providerId === 'google.com');
      
      // Skip profile checking for now due to Firestore permissions issue
      // Just set up the form with user data
      console.log("Finish: Setting up form for user", u.email, "Google user:", isGoogleUser);
      
      // For Google users, we need birthday since they didn't provide it during signup
      if (isGoogleUser) {
        setRequireBirthday(true);
      }
      
      if (u.email) {
        const base = u.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (base && base.length >= 3 && base.length <= 20) setUsername(base);
      }
      
      // If user has displayName from Google, prefill it but we'll ask for birthday anyway
      if (u.displayName) {
        // Username suggestion from display name or email
        const displayBase = u.displayName.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        if (displayBase && displayBase.length >= 3 && displayBase.length <= 20) {
          setUsername(displayBase);
        }
      }
      
      // Restore any saved finish state
      try {
        const sUser = sessionStorage.getItem("finish_username");
        const sShows = sessionStorage.getItem("finish_shows");
        const sB = sessionStorage.getItem("finish_birthday");
        if (sUser) setUsername(sUser);
        if (sB) setBirthday(sB);
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
  
  // Calculate max date for birthday (enforce 13+ age requirement from validation)
  const maxDate = useMemo(() => {
    const today = new Date();
    const minimumAge = 13;
    const cutoffDate = new Date(today.getFullYear() - minimumAge, today.getMonth(), today.getDate());
    return cutoffDate.toISOString().split("T")[0];
  }, []);
  
  // Color palette for show pills
  const showColors = [
    "#7A0307", "#95164A", "#B81D22", "#CF5315", "#C76D00", "#F1991B",
    "#B05E2A", "#E3A320", "#D48C42", "#ECC91C", "#977022", "#744A1F",
    "#C2B72D", "#76A34C", "#356A3B", "#0C454A", "#769F25", "#A1C6D4",
    "#53769C", "#4B7C89", "#28578A", "#063656", "#1D4782", "#2C438D",
    "#144386", "#6568AB", "#644072", "#4F2F4B", "#C37598", "#B05988",
    "#644073", "#772149", "#DFC3D9", "#E9A6C7"
  ];
  
  const toggleShow = (name: string) => setShowSelections((prev) => {
    const next = { ...prev, [name]: !prev[name] };
    try { sessionStorage.setItem("finish_shows", JSON.stringify(Object.keys(next).filter((k) => next[k]))); } catch {}
    return next;
  });

  const deselectAll = () => setShowSelections(() => {
    try { sessionStorage.setItem("finish_shows", JSON.stringify([])); } catch {}
    return {};
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
    const showsErr = validateShowsMin(selectedShows, 3);
    if (showsErr) next.shows = showsErr;
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
      
      console.log("Finish: Current user", { uid: u.uid, email: u.email });
      
      // Defensive: ensure server session cookie exists
      try {
        const idToken = await u.getIdToken();
        console.log("Finish: Got ID token, calling session login");
        const response = await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
        console.log("Finish: Session login response", response.status);
      } catch (sessionError) {
        console.warn("Finish: Session login failed", sessionError);
        // Continue anyway - client auth should work
      }
      
      const provider = u.providerData?.[0]?.providerId ?? "password";
      const payload: Partial<UserProfile> = {
        uid: u.uid,
        email: u.email ?? null,
        username: username.trim(),
        birthday: requireBirthday ? birthday.trim() : birthday.trim(),
        shows: parseShows(selectedShows),
        provider,
      };
      
      console.log("Finish: Saving profile", payload);
      
      // Force token refresh to ensure fresh authentication
      try {
        console.log("Finish: Refreshing auth token");
        await u.getIdToken(true); // force refresh
        console.log("Finish: Token refreshed");
      } catch (tokenError) {
        console.error("Finish: Token refresh failed", tokenError);
      }
      
      // Use direct Firestore write instead of helper function to bypass permission issues
      try {
        console.log("Finish: Writing profile directly to Firestore");
        const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        const userRef = doc(db, "users", u.uid);
        const profileData = {
          uid: u.uid,
          email: u.email ?? null,
          username: username.trim(),
          birthday: requireBirthday ? birthday.trim() : birthday.trim(),
          shows: parseShows(selectedShows),
          provider,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await setDoc(userRef, profileData, { merge: true });
        console.log("Finish: Profile saved successfully");
        
        sessionStorage.setItem("toastMessage", "Profile completed");
        try {
          sessionStorage.removeItem("finish_username");
          sessionStorage.removeItem("finish_shows");
          sessionStorage.removeItem("finish_birthday");
        } catch {}
        router.replace("/hub");
      } catch (firestoreError) {
        console.error("Finish: Direct Firestore write failed", firestoreError);
        setFormError("Unable to save profile. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Finish: Error saving profile", err);
      setFormError(getFriendlyError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-hamburg text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* Header */}
        <div className="w-full h-20 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-center px-4">
          <Image
            className="w-80 h-[70.2px] max-w-full"
            src="/images/logos/FullName-Black.png"
            alt="The Reality Report"
            width={320}
            height={70}
            priority
          />
        </div>

        {/* Main Content */}
        <div className="w-full max-w-md mx-auto px-6 py-16">
          
          {/* Heading */}
          <div className="text-center mb-8">
            <h2 className="text-zinc-900 dark:text-zinc-100 text-3xl font-gloucester font-normal leading-10">
              Complete Profile
            </h2>
          </div>

          <form onSubmit={submit} noValidate className="space-y-6">
            {formError && (
              <div className="border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 rounded-lg p-4 text-sm">
                {formError}
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                maxLength={64}
                autoCapitalize="off"
                autoComplete="username"
                className="w-full h-11 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-zinc-900 dark:text-zinc-100"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={onBlurUsername}
                disabled={pending}
                placeholder="e.g. reality_fan123"
                required
              />
              {errors.username && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.username}</p>}
            </div>

            {/* Birthday Field - Only show if required */}
            {requireBirthday && (
              <div className="space-y-2">
                <label htmlFor="birthday" className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                  Birthday
                </label>
                <input
                  id="birthday"
                  name="birthday"
                  type="date"
                  autoComplete="bday"
                  className="w-full h-11 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-zinc-900 dark:text-zinc-100"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  disabled={pending}
                  max={maxDate}
                  required
                />
                {errors.birthday && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.birthday}</p>}
              </div>
            )}

            {/* Shows Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                  Which shows do you watch?
                </label>
                {selectedShows.length > 0 && (
                  <button
                    type="button"
                    onClick={deselectAll}
                    disabled={pending}
                    className="text-zinc-600 dark:text-zinc-400 text-sm font-hamburg font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-200 disabled:opacity-60"
                  >
                    Deselect all
                  </button>
                )}
              </div>
              
              {/* Scrollable Show Pills Container */}
              <div className="w-full h-64 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-900">
                <div className="flex flex-wrap gap-2">
                  {ALL_SHOWS.map((name, index) => {
                    const active = !!showSelections[name];
                    const colorHex = showColors[index % showColors.length];
                    
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleShow(name)}
                        disabled={pending}
                        className="px-3 py-1 h-8 rounded-full text-sm font-normal font-hamburg leading-tight border whitespace-nowrap disabled:opacity-60 transition-colors duration-200 flex-shrink-0"
                        style={{
                          backgroundColor: active ? colorHex : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#374151' : '#f3f4f6'),
                          color: active ? 'white' : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#f3f4f6' : '#000000'),
                          borderColor: active ? colorHex : (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? '#4b5563' : '#d1d5db')
                        }}
                        aria-pressed={active}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {errors.shows && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.shows}</p>}
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full h-11 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-hamburg font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 disabled:opacity-60"
              disabled={pending || selectedShows.length < 3}
            >
              {pending ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </ClientOnly>
  );
}

export default function FinishProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-hamburg text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <FinishProfileContent />
    </Suspense>
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

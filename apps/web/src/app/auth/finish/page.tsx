"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserByUsername } from "@/lib/db/users";
import { validateBirthday, validateUsername, parseShows, validateShowsMin, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";
import { COUNTRIES } from "@/lib/data/countries";
import { US_STATES, GENDER_OPTIONS } from "@/lib/data/states";
import ClientOnly from "@/components/ClientOnly";
import Image from "next/image";
import MultiSelectPills from "@/components/survey/MultiSelectPills";

type FieldErrors = Partial<Record<"username" | "birthday" | "shows" | "gender" | "country" | "state", string>>;

const FINISH_SHOW_REQUESTS_STORAGE_KEY = "finish_show_requests";

// Explicit overrides only. If a show is not listed here, render raw show name.
const SHOW_DISPLAY_NAME_OVERRIDES: Record<string, string> = {};

function FinishProfileContent() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [requireBirthday, setRequireBirthday] = useState(true);
  const [showSelections, setShowSelections] = useState<Record<string, boolean>>({});
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showsLoading, setShowsLoading] = useState(true);
  const [showRequestOpen, setShowRequestOpen] = useState(false);
  const [showRequestInput, setShowRequestInput] = useState("");
  const [showRequests, setShowRequests] = useState<string[]>([]);

  // Fetch shows with alternative names from API
  useEffect(() => {
    const fetchShows = async () => {
      try {
        const response = await fetch("/api/shows/list");
        if (response.ok) {
          await response.json();
        }
      } catch (error) {
        console.error("Failed to fetch shows:", error);
      } finally {
        setShowsLoading(false);
      }
    };
    fetchShows();
  }, []);

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
        const sShowRequests = sessionStorage.getItem(FINISH_SHOW_REQUESTS_STORAGE_KEY);
        if (sShowRequests) {
          const arr: string[] = JSON.parse(sShowRequests);
          setShowRequests(parseShows(arr));
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

  // Use assigned display-name overrides only; otherwise keep the raw show name.
  const getDisplayName = (showName: string): string => {
    return SHOW_DISPLAY_NAME_OVERRIDES[showName] ?? showName;
  };

  const addShowRequest = () => {
    const next = showRequestInput.trim();
    if (!next) return;
    setShowRequests((prev) => {
      const merged = parseShows([...prev, next]);
      try {
        sessionStorage.setItem(FINISH_SHOW_REQUESTS_STORAGE_KEY, JSON.stringify(merged));
      } catch {}
      return merged;
    });
    setShowRequestInput("");
  };

  const removeShowRequest = (request: string) => {
    setShowRequests((prev) => {
      const next = prev.filter((item) => item !== request);
      try {
        sessionStorage.setItem(FINISH_SHOW_REQUESTS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
    if (!gender) next.gender = "Gender is required.";
    if (!country) next.country = "Country is required.";
    if (country === "United States" && !state) next.state = "State is required.";
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
        showRequests: parseShows(showRequests),
        gender: gender.trim(),
        livesInUS: country.trim() === "United States",
        state: country.trim() === "United States" ? state.trim() : undefined,
        country: country.trim() !== "United States" ? country.trim() : undefined,
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
          showRequests: parseShows(showRequests),
          gender: gender.trim(),
          livesInUS: country.trim() === "United States",
          state: country.trim() === "United States" ? state.trim() : undefined,
          country: country.trim() !== "United States" ? country.trim() : undefined,
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
          sessionStorage.removeItem(FINISH_SHOW_REQUESTS_STORAGE_KEY);
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

            {/* Gender Field */}
            <div className="space-y-2">
              <label htmlFor="gender" className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                Gender
              </label>
              <select
                id="gender"
                name="gender"
                className="w-full h-11 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-zinc-900 dark:text-zinc-100"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                disabled={pending}
                required
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.gender && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.gender}</p>}
            </div>

            {/* Country Field */}
            <div className="space-y-2">
              <label htmlFor="country" className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                list="countries-list"
                autoComplete="off"
                className="w-full h-11 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-zinc-900 dark:text-zinc-100"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  // Clear state if not US
                  if (e.target.value !== "United States") {
                    setState("");
                  }
                }}
                disabled={pending}
                placeholder="Type to search..."
                required
              />
              <datalist id="countries-list">
                {COUNTRIES.map((countryName) => (
                  <option key={countryName} value={countryName} />
                ))}
              </datalist>
              {errors.country && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.country}</p>}
            </div>

            {/* State Field - Only show if United States is selected */}
            {country === "United States" && (
              <div className="space-y-2">
                <label htmlFor="state" className="block text-zinc-900 dark:text-zinc-100 text-sm font-hamburg font-medium">
                  State
                </label>
                <input
                  id="state"
                  name="state"
                  type="text"
                  list="states-list"
                  autoComplete="off"
                  className="w-full h-11 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 text-zinc-900 dark:text-zinc-100"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={pending}
                  placeholder="Type to search..."
                  required
                />
                <datalist id="states-list">
                  {US_STATES.map((stateName) => (
                    <option key={stateName} value={stateName} />
                  ))}
                </datalist>
                {errors.state && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.state}</p>}
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
              {showsLoading ? (
                <div className="w-full h-64 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-900 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <MultiSelectPills
                  title="Which shows do you watch?"
                  items={ALL_SHOWS.map((name, index) => ({
                    id: name,
                    label: getDisplayName(name),
                    color: showColors[index % showColors.length],
                  }))}
                  minRequired={3}
                  selected={selectedShows}
                  onToggle={toggleShow}
                  palette={showColors}
                  height={256}
                  disabled={pending}
                  ariaLabel="Shows multi-select"
                  footer={
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRequestOpen((prev) => !prev)}
                        disabled={pending}
                        className="text-xs font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900 disabled:opacity-60"
                      >
                        Don&apos;t see a show? Request on here
                      </button>
                      {showRequestOpen && (
                        <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={showRequestInput}
                              onChange={(event) => setShowRequestInput(event.target.value)}
                              placeholder="Type a show name..."
                              className="h-9 w-full rounded border border-zinc-300 bg-white px-3 text-sm text-zinc-900"
                              disabled={pending}
                            />
                            <button
                              type="button"
                              onClick={addShowRequest}
                              disabled={pending || showRequestInput.trim().length === 0}
                              className="rounded border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 disabled:opacity-50"
                            >
                              Add
                            </button>
                          </div>
                          {showRequests.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {showRequests.map((request) => (
                                <button
                                  key={request}
                                  type="button"
                                  onClick={() => removeShowRequest(request)}
                                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-2.5 py-1 text-xs text-zinc-700"
                                  aria-label={`Remove requested show ${request}`}
                                >
                                  {request}
                                  <span aria-hidden>×</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  }
                />
              )}
              
              {errors.shows && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.shows}</p>}
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full h-11 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-hamburg font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-200 disabled:opacity-60"
              disabled={pending || selectedShows.length < 3 || !gender || !country || (country === "United States" && !state)}
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

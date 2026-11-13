"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, isUsernameAvailable, upsertUserProfile } from "@/lib/db/users";
import { clearProfileDraft, readProfileDraft, writeProfileDraft, type ProfileDraft } from "@/lib/profile-draft";
import { validateBirthday, validateUsername, parseShows, validateShowsMin, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";
import { COUNTRIES } from "@/lib/data/countries";
import { US_STATES, GENDER_OPTIONS } from "@/lib/data/states";
import ClientOnly from "@/components/ClientOnly";
import Image from "next/image";
import MultiSelectPills from "@/components/survey/MultiSelectPills";

type FieldErrors = Partial<Record<"username" | "birthday" | "shows" | "gender" | "country" | "state", string>>;
type ShowListResponse = {
  shows?: Array<{ name?: unknown }>;
};

type ProfileLoad =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      uid: string;
      savedUsername: string;
      draft: ProfileDraft;
      isActive: () => boolean;
    };

function suggestUsername(user: User): string {
  for (const source of [user.displayName, user.email?.split("@")[0]]) {
    if (!source) continue;
    const candidate = source.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!validateUsername(candidate)) return candidate;
  }
  return "";
}

function savedProfileDraft(user: User, profile: UserProfile | null): ProfileDraft {
  return {
    username: profile?.username || suggestUsername(user),
    birthday: profile?.birthday ?? "",
    gender: profile?.gender ?? "",
    country: profile?.livesInUS ? "United States" : (profile?.country ?? ""),
    state: profile?.state ?? "",
    shows: parseShows(profile?.shows ?? []),
    showRequests: parseShows(profile?.showRequests ?? []),
    showRequestInput: "",
  };
}

function FinishProfileContent() {
  const router = useRouter();
  const [load, setLoad] = useState<ProfileLoad>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;
      const currentRevision = ++revision;
      setLoad({ status: "loading" });
      if (!user) {
        router.replace("/auth/register");
        return;
      }
      const uid = user.uid;
      const isActive = () => active && revision === currentRevision && auth.currentUser?.uid === uid;
      try {
        const profile = await getUserProfile(uid);
        if (!isActive()) return;
        setLoad({
          status: "ready",
          uid,
          savedUsername: profile?.username ?? "",
          draft: readProfileDraft(uid) ?? savedProfileDraft(user, profile),
          isActive,
        });
      } catch {
        if (isActive()) setLoad({ status: "error" });
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [router, attempt]);

  if (load.status === "error") {
    return (
      <main className="mx-auto max-w-md space-y-4 px-6 py-16">
        <p role="alert">Unable to load your profile. Try again to continue.</p>
        <button type="button" onClick={() => {
          setLoad({ status: "loading" });
          setAttempt((previous) => previous + 1);
        }}>Retry</button>
      </main>
    );
  }

  return load.status === "ready" && load.isActive() ? (
    <FinishProfileForm key={load.uid} uid={load.uid} savedUsername={load.savedUsername} initialDraft={load.draft} isActive={load.isActive} />
  ) : <ProfileLoading />;
}

function FinishProfileForm({
  uid, savedUsername, initialDraft, isActive,
}: {
  uid: string;
  savedUsername: string;
  initialDraft: ProfileDraft;
  isActive: () => boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialDraft);
  const { username, birthday, gender, country, state, shows: selectedShows, showRequests, showRequestInput } = draft;
  const [errors, setErrors] = useState<FieldErrors>({});
  const [usernameAdvisory, setUsernameAdvisory] = useState<string | null>(null);
  const [showsLoading, setShowsLoading] = useState(true);
  const [apiShows, setApiShows] = useState<string[]>([]);
  const [showRequestOpen, setShowRequestOpen] = useState(Boolean(showRequestInput));
  const usernameCheck = useRef(0);
  const saving = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchShows = async () => {
      try {
        const response = await fetch("/api/shows/list", { signal: controller.signal });
        if (response.ok) {
          const data = (await response.json()) as ShowListResponse;
          const names = parseShows(
            (data.shows ?? []).flatMap((show) => (typeof show.name === "string" ? [show.name] : [])),
          );
          if (!controller.signal.aborted) setApiShows(names);
        }
      } catch {
        // The bundled show list is available if the request fails.
      } finally {
        if (!controller.signal.aborted) setShowsLoading(false);
      }
    };
    void fetchShows();
    return () => controller.abort();
  }, []);

  // Keep saved selections editable even if the current show list no longer contains them.
  const showOptions = parseShows([...(apiShows.length > 0 ? apiShows : ALL_SHOWS), ...initialDraft.shows]);
  const isUS = country.trim() === "United States";

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
  
  const updateDraft = (patch: Partial<ProfileDraft>) => {
    if (!isActive() || saving.current) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    writeProfileDraft(uid, next);
  };

  const toggleShow = (name: string) => updateDraft({
    shows: selectedShows.includes(name)
      ? selectedShows.filter((show) => show !== name)
      : [...selectedShows, name],
  });

  const addShowRequest = () => {
    const requested = showRequestInput.trim();
    if (!requested) return;
    updateDraft({ showRequests: parseShows([...showRequests, requested]), showRequestInput: "" });
  };

  const onBlurUsername = async () => {
    if (!isActive() || saving.current) return;
    const revision = ++usernameCheck.current;
    const candidate = username.trim();
    if (savedUsername.trim() && username === savedUsername) return;
    const error = validateUsername(candidate);
    setErrors((previous) => ({ ...previous, username: error ?? undefined }));
    if (error) return;
    try {
      const available = await isUsernameAvailable(candidate);
      if (isActive() && revision === usernameCheck.current) {
        setUsernameAdvisory(available ? null : "That username may be taken.");
      }
    } catch {
      // Saving checks availability on the server.
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isActive() || saving.current) return;
    const submissionUid = uid;
    usernameCheck.current += 1;
    setUsernameAdvisory(null);
    setFormError(null);

    const next: FieldErrors = {};
    const candidate = username.trim();
    const keepSavedUsername = Boolean(savedUsername.trim() && username === savedUsername);
    const usernameError = keepSavedUsername ? null : validateUsername(candidate);
    const birthdayError = validateBirthday(birthday);
    const showsError = validateShowsMin(selectedShows);
    if (usernameError) next.username = usernameError;
    if (birthdayError) next.birthday = birthdayError;
    if (showsError) next.shows = showsError;
    if (!gender) next.gender = "Gender is required.";
    if (!country.trim()) next.country = "Country is required.";
    if (isUS && !state.trim()) next.state = "State is required.";
    setErrors(next);
    if (Object.keys(next).length) return;

    saving.current = true;
    setPending(true);
    writeProfileDraft(submissionUid, draft);
    try {
      await upsertUserProfile(submissionUid, {
        ...(keepSavedUsername ? {} : { username: candidate }),
        birthday: birthday.trim(),
        shows: parseShows(selectedShows),
        showRequests: parseShows(showRequests),
        gender: gender.trim(),
        livesInUS: isUS,
        state: isUS ? state.trim() : "",
        country: isUS ? "" : country.trim(),
      });
      clearProfileDraft(submissionUid, draft);
      if (!isActive()) return;
      try { sessionStorage.setItem("toastMessage", "Profile completed"); } catch {}
      router.replace("/hub");
    } catch (error) {
      if (!isActive()) return;
      const code = (error as { code?: unknown } | null)?.code;
      if (code === "profile/username-taken") {
        setErrors({ username: "That username is taken. Try another." });
      } else {
        setFormError("Unable to save your profile. Try again.");
      }
    } finally {
      saving.current = false;
      if (isActive()) setPending(false);
    }
  };

  return (
    <ClientOnly fallback={<ProfileLoading />}>
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
              <div role="alert" className="border border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 rounded-lg p-4 text-sm">
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
                onChange={(event) => {
                  usernameCheck.current += 1;
                  setUsernameAdvisory(null);
                  setErrors((previous) => ({ ...previous, username: undefined }));
                  updateDraft({ username: event.target.value });
                }}
                onBlur={onBlurUsername}
                disabled={pending}
                placeholder="e.g. reality_fan123"
                required
              />
              {errors.username && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.username}</p>}
              {usernameAdvisory && !errors.username && <p className="text-sm text-zinc-600 dark:text-zinc-400">{usernameAdvisory}</p>}
            </div>

            {/* Birthday Field */}
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
                onChange={(event) => updateDraft({ birthday: event.target.value })}
                disabled={pending}
                max={maxDate}
                required
              />
              {errors.birthday && <p className="text-sm text-red-600 dark:text-red-400 font-hamburg">{errors.birthday}</p>}
            </div>

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
                onChange={(event) => updateDraft({ gender: event.target.value })}
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
                onChange={(event) => {
                  const next = event.target.value;
                  updateDraft({ country: next, state: next.trim() === "United States" ? state : "" });
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
            {isUS && (
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
                  onChange={(event) => updateDraft({ state: event.target.value })}
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
                    onClick={() => updateDraft({ shows: [] })}
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
                  items={showOptions.map((name, index) => ({
                    id: name,
                    label: name,
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
                              onChange={(event) => updateDraft({ showRequestInput: event.target.value })}
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
                                  onClick={() => updateDraft({ showRequests: showRequests.filter((item) => item !== request) })}
                                  disabled={pending}
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
              disabled={pending || selectedShows.length < 3 || !gender || !country.trim() || (isUS && !state.trim())}
            >
              {pending ? "Saving…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </ClientOnly>
  );
}

function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
      <div className="text-center" role="status">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-hamburg text-sm text-gray-600 dark:text-gray-400">Loading your profile…</p>
      </div>
    </div>
  );
}

export default function FinishProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <FinishProfileContent />
    </Suspense>
  );
}

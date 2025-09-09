"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserByUsername, getUserProfile, upsertUserProfile } from "@/lib/db/users";
import { validateBirthday, validateUsername, parseShows, validateShowsMin, type UserProfile } from "@/lib/validation/user";
import { ALL_SHOWS } from "@/lib/data/shows";
import ClientOnly from "@/components/ClientOnly";

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
  
  // Calculate max date for birthday (18+ years ago)
  const maxDate = useMemo(() => {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return eighteenYearsAgo.toISOString().split('T')[0];
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
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-hamburg text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen w-full relative bg-white">
      {/* Header → Banner */}
      <div className="w-full h-20 border-b border-black flex items-center justify-center">
        <img 
          className="w-80 h-[70.2px]" 
          src="/images/logos/FullName-Black.png" 
          alt="The Reality Report"
        />
      </div>

      {/* Main → Form Container */}
      <div className="w-full max-w-md mx-auto mt-16 px-4">
        
        {/* Heading Container */}
        <div className="w-full flex items-center justify-center mb-6">
          <h2 className="text-black text-3xl font-gloucester font-normal leading-10 text-center">
            Complete Profile
          </h2>
        </div>

        <form onSubmit={submit} noValidate className="space-y-4">
          {formError && (
            <div className="w-full border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm mb-4 transition-all duration-300">
              {formError}
            </div>
          )}

          {/* Username Field */}
          <div className="w-full">
            <div className="h-[21px] mb-2">
              <label htmlFor="username" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                Username
              </label>
            </div>
            <div className="h-11 mb-1 relative">
              <input
                id="username"
                name="username"
                type="text"
                maxLength={64}
                autoCapitalize="off"
                autoComplete="username"
                tabIndex={0}
                className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={onBlurUsername}
                disabled={pending}
                placeholder="e.g. reality_fan123"
                required
              />
            </div>
            {errors.username && <p className="text-sm text-red-600 font-hamburg">{errors.username}</p>}
          </div>

          {/* Birthday Field - Only show if required */}
          {requireBirthday && (
            <>
              <div className="w-[450px] left-[-27px] absolute" style={{ top: formError ? "225px" : "145px" }}>
                <div className="h-[21px] mb-2">
                  <label htmlFor="birthday" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    Birthday
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <input
                    id="birthday"
                    name="birthday"
                    type="date"
                    autoComplete="bday"
                    tabIndex={0}
                    className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    disabled={pending}
                    max={maxDate}
                    required
                  />
                </div>
                {errors.birthday && <p className="text-sm text-red-600 font-hamburg">{errors.birthday}</p>}
              </div>
            </>
          )}

          {/* Shows Selection */}
          <div className="w-[450px] left-[-27px] absolute" style={{ top: requireBirthday ? (formError ? "310px" : "230px") : (formError ? "225px" : "145px") }}>
            <div className="h-[21px] mb-2 flex justify-between items-center">
              <label className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                Which shows do you watch?
              </label>
              {selectedShows.length > 0 && (
                <button
                  type="button"
                  onClick={deselectAll}
                  disabled={pending}
                  className="text-gray-600 text-sm font-hamburg font-medium leading-[21px] hover:text-black transition-colors duration-200 disabled:opacity-60"
                  style={{letterSpacing: '0.1px'}}
                >
                  Deselect all
                </button>
              )}
            </div>
            
            {/* Scrollable Show Pills Container */}
            <div 
              className="w-full overflow-y-auto scrollbar-hide" 
              style={{ 
                height: '280px',
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex flex-wrap gap-2 pr-2">
                {ALL_SHOWS.map((name, index) => {
                  const active = !!showSelections[name];
                  const colorHex = showColors[index % showColors.length];
                  
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleShow(name)}
                      disabled={pending}
                      className={`px-3 py-1 h-8 rounded-full text-sm font-normal font-['HamburgSerial'] leading-tight border whitespace-nowrap disabled:opacity-60 transition-colors duration-200 touch-manipulation text-center flex-shrink-0`}
                      style={{
                        backgroundColor: active ? colorHex : '#f3f4f6',
                        color: active ? 'white' : '#000000',
                        borderColor: active ? colorHex : '#d1d5db'
                      }}
                      aria-pressed={active}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Only show error message when there's an actual error */}
            {errors.shows && <p className="mt-2 text-sm text-red-600">{errors.shows}</p>}
          </div>

          {/* Continue Button */}
          <div className={`w-[450px] h-11 left-[-27px] absolute bg-neutral-900 rounded-[3px] border border-black transition-all duration-300 ease-in-out hover:bg-black transform hover:scale-[1.02] ${requireBirthday ? "top-[560px]" : "top-[452px]"}`}>
            <button
              type="submit"
              className="w-full h-full bg-transparent text-center justify-center text-white text-base font-hamburg font-bold leading-9 disabled:opacity-60 transition-all duration-200"
              disabled={pending || selectedShows.length < 3}
            >
              {pending ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ClientOnly>
  );
}

export default function FinishProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-hamburg text-sm text-gray-600">Loading...</p>
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

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, OAuthProvider, signInWithPopup } from "firebase/auth";
import { signInWithGoogle } from "@/lib/firebase";
import { getUserByUsername, createUserProfile, upsertUserProfile } from "@/lib/db/users";
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validateBirthday,
  parseShows,
  type UserProfile,
} from "@/lib/validation/user";

const ENABLE_APPLE = (process.env.NEXT_PUBLIC_ENABLE_APPLE ?? "false").toLowerCase() === "true";

type FieldErrors = Partial<Record<
  | "email"
  | "password"
  | "username"
  | "birthday"
  | "shows"
  | "tos"
, string>>;

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [shows, setShows] = useState("");
  const [tos, setTos] = useState(false);

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Apple sign-in flow state
  const [appleFlow, setAppleFlow] = useState<{ uid: string; email: string | null } | null>(null);
  const holdRedirect = !!appleFlow; // avoid redirecting while completing Apple profile

  // Redirect signed-in users away from register
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u && !holdRedirect) {
        router.replace("/hub");
      }
    });
    return () => unsub();
  }, [router, holdRedirect]);

  const validateAll = async (): Promise<boolean> => {
    const next: FieldErrors = {};
    if (!appleFlow) {
      const emailErr = validateEmail(email);
      if (emailErr) next.email = emailErr;
      const passErr = validatePassword(password);
      if (passErr) next.password = passErr;
    }

    const userErr = validateUsername(username);
    if (userErr) next.username = userErr;
    const bErr = validateBirthday(birthday);
    if (bErr) next.birthday = bErr;
    const parsedShows = parseShows(shows);
    if (parsedShows.length === 0) next.shows = "Add at least one show.";
    if (!tos) next.tos = "You must accept the Terms of Service.";

    // Unique username check (only if username basic validation passed)
    if (!next.username) {
      const existing = await getUserByUsername(username);
      if (existing) next.username = "That username is taken. Try another.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const ok = await validateAll();
      if (!ok) return;

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Establish server session cookie
      try {
        const idToken = await cred.user.getIdToken();
        await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
      } catch {}
      const user = cred.user;
      const profile: Omit<UserProfile, "uid" | "createdAt" | "updatedAt"> = {
        email: user.email ?? email.trim(),
        username: username.trim(),
        birthday: birthday.trim(),
        shows: parseShows(shows),
        provider: "password",
      };
      await createUserProfile(user.uid, profile);
      sessionStorage.setItem("toastMessage", "Account created");
      router.replace("/hub");
    } catch (err: unknown) {
      const message = getFriendlyError(err);
      setFormError(message);
    } finally {
      setPending(false);
    }
  };

  const startApple = async () => {
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const provider = new OAuthProvider("apple.com");
      // provider.addScope("name");
      // provider.addScope("email");
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      setAppleFlow({ uid: u.uid, email: u.email ?? null });
      if (u.email) setEmail(u.email);
    } catch (err: unknown) {
      const message = getFriendlyError(err);
      setFormError(message);
    } finally {
      setPending(false);
    }
  };

  const completeAppleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appleFlow) return;
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      const ok = await validateAll();
      if (!ok) return;
      await upsertUserProfile(appleFlow.uid, {
        uid: appleFlow.uid,
        email: appleFlow.email ?? email.trim(),
        username: username.trim(),
        birthday: birthday.trim(),
        shows: parseShows(shows),
        provider: "apple",
      });
      sessionStorage.setItem("toastMessage", "Account created");
      router.replace("/realitease");
    } catch (err: unknown) {
      setFormError(getFriendlyError(err));
    } finally {
      setPending(false);
    }
  };

  const emailDisabled = !!appleFlow; // during Apple completion, hide/disable email-specific fields

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-serif text-3xl">Create your account</h1>
      <p className="text-gray-600 mt-1">Join the community of Reality TV fans.</p>

      {/* Top-level auth options */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          type="button"
          className="px-4 py-2 border rounded disabled:opacity-60"
          onClick={async () => { if (!pending) { setPending(true); setFormError(null); try { await signInWithGoogle(); router.replace("/auth/complete"); } catch (e) { setFormError(getFriendlyError(e)); } finally { setPending(false); } }}}
          disabled={pending}
        >
          {pending ? "Opening Google…" : "Continue with Google"}
        </button>
        {ENABLE_APPLE && !appleFlow && (
          <button
            type="button"
            className="px-4 py-2 border rounded disabled:opacity-60"
            onClick={startApple}
            disabled={pending}
          >
            {pending ? "Opening Apple…" : "Continue with Apple"}
          </button>
        )}
        <div className="text-xs text-gray-500">or continue with email</div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={appleFlow ? completeAppleProfile : handleEmailSignup} noValidate>
        {formError && (
          <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            {formError}
          </div>
        )}

        {!appleFlow && (
          <>
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={emailDisabled || pending}
                required
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={emailDisabled || pending}
                required
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
          </>
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
          <label htmlFor="shows" className="block text-sm font-medium">Favorite shows</label>
          <input
            id="shows"
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
            value={shows}
            onChange={(e) => setShows(e.target.value)}
            disabled={pending}
            placeholder="Comma-separated, e.g. Below Deck, Survivor"
            required
          />
          {errors.shows && <p className="mt-1 text-sm text-red-600">{errors.shows}</p>}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="tos"
            type="checkbox"
            className="mt-1"
            checked={tos}
            onChange={(e) => setTos(e.target.checked)}
            disabled={pending}
            required
          />
          <label htmlFor="tos" className="text-sm text-gray-700">I accept the Terms of Service</label>
        </div>
        {errors.tos && <p className="-mt-2 text-sm text-red-600">{errors.tos}</p>}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            className="px-4 py-2 border rounded bg-black text-white disabled:opacity-60"
            disabled={pending}
          >
            {pending ? (appleFlow ? "Completing…" : "Creating…") : (appleFlow ? "Complete Profile" : "Sign up with email")}
          </button>

          {/* Apple button moved to top options */}
        </div>
      </form>
    </main>
  );
}

function getFriendlyError(err: unknown): string {
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: unknown }).code;
    const message = (err as { message?: unknown }).message;
    if (typeof code === "string") {
      switch (code) {
        case "auth/email-already-in-use":
          return "Email is already in use.";
        case "auth/invalid-email":
          return "Invalid email address.";
        case "auth/weak-password":
          return "Password is too weak.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
          return "Sign-in was cancelled.";
      }
    }
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

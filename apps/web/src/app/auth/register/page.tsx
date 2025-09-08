"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { createUserWithEmailAndPassword, OAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { upsertUserProfile } from "@/lib/db/users";
import { validateEmail, validatePassword, validateBirthday } from "@/lib/validation/user";

const ENABLE_APPLE = (process.env.NEXT_PUBLIC_ENABLE_APPLE ?? "false").toLowerCase() === "true";

type FieldErrors = Partial<Record<"email" | "password" | "birthday" | "name" | "confirm", string>>;

export default function RegisterPage() {
  const router = useRouter();
  type Stage = "email" | "details";
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Redirect signed-in users away from register
  useEffect(() => {
    // Restore any saved form state (client-only)
    try {
      const savedStage = sessionStorage.getItem("reg_stage");
      if (savedStage === "details") setStage("details");
      const sEmail = sessionStorage.getItem("reg_email");
      const sName = sessionStorage.getItem("reg_name");
      const sBirthday = sessionStorage.getItem("reg_birthday");
      if (sEmail) setEmail(sEmail);
      if (sName) setName(sName);
      if (sBirthday) setBirthday(sBirthday);
    } catch {}
  }, []);

  const goDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setErrors({ email: emailErr });
      return;
    }
    setErrors({});
    setStage("details");
    try {
      sessionStorage.setItem("reg_stage", "details");
      sessionStorage.setItem("reg_email", email);
    } catch {}
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      // Stage handling
      if (stage === "email") {
        const emailErr = validateEmail(email);
        if (emailErr) { setErrors({ email: emailErr }); return; }
        setStage("details");
        return;
      }

      // Details stage validation
      const emailErr = validateEmail(email);
      const bErr = validateBirthday(birthday);
      const passErr = validatePassword(password) || (/[^0-9\W]/.test(password) && !/[0-9\W]/.test(password) ? "Include a number or symbol." : null);
      const matchErr = password !== confirm ? "Passwords do not match." : null;
      const nameErr = !name.trim() || name.trim().length < 2 ? "Enter your name." : null;
      const next: FieldErrors = {};
      if (emailErr) next.email = emailErr;
      if (bErr) next.birthday = bErr;
      if (passErr) next.password = passErr;
      if (matchErr) next.confirm = matchErr;
      if (nameErr) next.name = nameErr;
      setErrors(next);
      if (Object.keys(next).length) return;

      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;
      if (name.trim()) {
        try { await updateProfile(user, { displayName: name.trim() }); } catch {}
      }
      // Establish server session cookie
      try {
        const idToken = await user.getIdToken();
        await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
      } catch {}
      // Partial profile (finish later)
      await upsertUserProfile(user.uid, {
        uid: user.uid,
        email: user.email ?? email.trim(),
        name: name.trim(),
        birthday: birthday.trim(),
        provider: "password",
      });
      sessionStorage.setItem("toastMessage", "Account created");
      try {
        sessionStorage.removeItem("reg_stage");
        sessionStorage.removeItem("reg_email");
        sessionStorage.removeItem("reg_name");
        sessionStorage.removeItem("reg_birthday");
      } catch {}
      router.replace("/auth/finish");
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
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      router.replace("/auth/complete");
    } catch (err: unknown) {
      const message = getFriendlyError(err);
      setFormError(message);
    } finally {
      setPending(false);
    }
  };

  const emailDisabled = false;

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-serif text-3xl">Log in or create an account</h1>
      <p className="text-gray-600 mt-1">Use Google or continue with email.</p>

      {/* Top-level auth options (only in Stage A) */}
      {stage === "email" && (
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
      )}

      <form className="mt-6 space-y-4" onSubmit={stage === "email" ? goDetails : handleEmailSignup} noValidate>
        {formError && (
          <div className="border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm">
            {formError}
          </div>
        )}

        {stage === "email" && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring"
              value={email}
              onChange={(e) => { setEmail(e.target.value); try { sessionStorage.setItem("reg_email", e.target.value); } catch {} }}
              disabled={emailDisabled || pending}
              required
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
        )}

        {stage === "details" && (
          <>
            <div className="text-sm text-gray-700">{email} <button type="button" className="ml-2 underline" onClick={() => setStage("email")}>Edit</button></div>
            <div>
              <label htmlFor="name" className="block text-sm font-medium">Name</label>
              <input id="name" type="text" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring" value={name} onChange={(e) => { setName(e.target.value); try { sessionStorage.setItem("reg_name", e.target.value); } catch {} }} disabled={pending} required />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="birthday" className="block text-sm font-medium">Birthday</label>
              <input id="birthday" type="date" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring" value={birthday} onChange={(e) => { setBirthday(e.target.value); try { sessionStorage.setItem("reg_birthday", e.target.value); } catch {} }} disabled={pending} required />
              {errors.birthday && <p className="mt-1 text-sm text-red-600">{errors.birthday}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input id="password" type="password" autoComplete="new-password" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring" value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} required />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-medium">Re-enter password</label>
              <input id="confirm" type="password" autoComplete="new-password" className="mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={pending} required />
              {(errors.password || errors.confirm) && <p className="mt-1 text-sm text-red-600">{errors.password ?? errors.confirm}</p>}
            </div>
          </>
        )}

        {/* Username/Shows moved to /auth/finish */}

        <div className="flex flex-col gap-3 pt-2">
          <button type="submit" className="px-4 py-2 border rounded bg-black text-white disabled:opacity-60" disabled={pending}>
            {pending ? "Continuing…" : (stage === "email" ? "Continue" : "Continue")}
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

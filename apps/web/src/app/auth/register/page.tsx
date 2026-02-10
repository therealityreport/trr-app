"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, OAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { upsertUserProfile, getUserProfile, checkUserExists } from "@/lib/db/users";
import { validateEmail, validatePassword } from "@/lib/validation/user";

const ENABLE_APPLE = (process.env.NEXT_PUBLIC_ENABLE_APPLE ?? "false").toLowerCase() === "true";

type FieldErrors = Partial<Record<"email" | "password" | "birthday" | "name" | "confirm", string>>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  type Stage = "email" | "details" | "login";
  const [stage, setStage] = useState<Stage>("email");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [email, setEmail] = useState("");
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Handle email parameter and check if user exists
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setEmailLocked(true);
      checkIfUserExists(emailParam);
    } else {
      // Restore any saved form state (client-only) if no email param
      try {
        const savedStage = sessionStorage.getItem("reg_stage");
        if (savedStage === "details") setStage("details");
        const sEmail = sessionStorage.getItem("reg_email");
        const sName = sessionStorage.getItem("reg_name");
        if (sEmail) setEmail(sEmail);
        if (sName) setName(sName);
      } catch {}
    }
  }, [searchParams]);

  const checkIfUserExists = async (emailToCheck: string) => {
    try {
      const exists = await checkUserExists(emailToCheck);
      setIsExistingUser(exists);
      setStage(exists ? "login" : "details");
    } catch (error) {
      console.error("Error checking user:", error);
      setStage("details"); // Default to signup on error
    }
  };

  // Smooth transition function
  const transitionToStage = (newStage: Stage) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setStage(newStage);
      setIsTransitioning(false);
    }, 150);
  };


  // Redirect signed-in users with complete profiles away from register
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Check if user has a complete profile
          const profile = await getUserProfile(user.uid);
          const complete = !!profile && !!profile.username && Array.isArray(profile.shows) && profile.shows.length >= 3 && !!profile.birthday;
          
          // Only redirect if profile is complete AND we're not already handling form submission
          if (complete && !pending) {
            router.replace("/hub");
          }
          // If profile is incomplete, let them stay on register/finish flow
        } catch (error) {
          console.error("Error checking profile completeness:", error);
          // On error, don't redirect to avoid breaking the flow
        }
      }
    });
    return unsub;
  }, [router, pending]);


  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setFormError(null);
    try {
      // Stage handling
      if (stage === "email") {
        const emailErr = validateEmail(email);
        if (emailErr) { 
          setErrors({ email: emailErr }); 
          return; 
        }
        
        if (!emailLocked) {
          setIsTransitioning(true);
          setTimeout(async () => {
            await checkIfUserExists(email);
            setEmailLocked(true); // Lock email after checking
            setIsTransitioning(false);
          }, 150);
        } else {
          transitionToStage(isExistingUser ? "login" : "details");
        }
        
        setErrors({});
        try {
          sessionStorage.setItem("reg_stage", "details");
          sessionStorage.setItem("reg_email", email);
        } catch {}
        return;
      }

      // For login stage, only validate email and password
      if (stage === "login") {
        const emailErr = validateEmail(email);
        const passErr = !password ? "Password is required." : null;
        const next: FieldErrors = {};
        if (emailErr) next.email = emailErr;
        if (passErr) next.password = passErr;
        setErrors(next);
        if (Object.keys(next).length) return;

        // Try to sign in
        const signInCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = signInCred.user;

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

        // Check if they have a complete profile
        try {
          const profile = await getUserProfile(user.uid);
          if (profile && profile.username && Array.isArray(profile.shows) && profile.shows.length >= 3 && profile.birthday) {
            // Complete profile exists, go to hub
            sessionStorage.setItem("toastMessage", "Welcome back!");
            router.replace("/hub");
          } else {
            // Incomplete profile, go to finish page
            router.replace("/auth/finish");
          }
        } catch {
          // If we can't get profile, assume incomplete and go to finish
          router.replace("/auth/finish");
        }
        return;
      }

      // Details stage validation (for new user signup)
      const emailErr = validateEmail(email);
      const passErr = validatePassword(password);
      const matchErr = password !== confirm ? "Passwords do not match." : null;
      const nameErr = !name.trim() || name.trim().length < 2 ? "Enter your name." : null;
      const next: FieldErrors = {};
      if (emailErr) next.email = emailErr;
      if (passErr) next.password = passErr;
      if (matchErr) next.confirm = matchErr;
      if (nameErr) next.name = nameErr;
      setErrors(next);
      if (Object.keys(next).length) return;

      // Create new user
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

  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Header → Banner */}
      <div className="w-full h-20 border-b border-black flex items-center justify-center">
        <Image
          className="w-80 h-[70.2px]"
          src="/images/logos/FullName-Black.png"
          alt="The Reality Report"
          width={320}
          height={70}
          priority
        />
      </div>

      {/* Main Form Container */}
      <div className={`w-full max-w-md mx-auto mt-16 px-4 transition-all duration-300 ease-in-out ${isTransitioning ? 'opacity-50 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
        {/* Title */}
        <div className="w-full text-center mb-6">
          <h2 className="text-black text-3xl font-gloucester font-normal leading-10 text-center">
            {stage === "email" ? "Create an Account" : 
             stage === "details" ? "Create an Account" : 
             "Welcome back! Please enter your password to continue."}
          </h2>
        </div>

        {/* Error Display */}
        {formError && (
          <div className="w-full border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm mb-4 transition-all duration-300">
            {formError}
          </div>
        )}

        {/* Welcome Back Message for Login Stage */}
        {stage === "login" && !formError && (
          <div className="w-full border border-blue-300 bg-blue-50 text-blue-800 rounded p-3 text-sm mb-4 transition-all duration-300 animate-in slide-in-from-top-2">
            Welcome back! Please enter your password to continue.
          </div>
        )}

        <form onSubmit={handleEmailSignup} noValidate className="space-y-4">
          {/* Email Field */}
          {(stage === "email" || stage === "login") && (
            <>
              <div className="w-full">
                <div className="h-[21px] mb-2">
                  <label htmlFor="email" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    Email address
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    maxLength={64}
                    autoCapitalize="off"
                    autoComplete="username"
                    tabIndex={0}
                    className="w-full h-full bg-white rounded-[3px] border border-zinc-500 px-3 pr-12 text-black text-base font-hamburg font-medium outline-none"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); try { sessionStorage.setItem("reg_email", e.target.value); } catch {} }}
                    disabled={emailLocked || pending}
                    required
                  />
                  {emailLocked && (
                    <button 
                      type="button" 
                      className="absolute right-3 top-3 text-sm text-gray-500 font-hamburg hover:text-black transition-colors"
                      onClick={() => {
                        sessionStorage.clear();
                        router.push("/");
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {errors.email && <p className="text-sm text-red-600 font-hamburg">{errors.email}</p>}
              </div>
            </>
          )}

          {/* Email Display for Details Stage */}
          {stage === "details" && (
            <>
              <div className="w-[450px] left-[-27px] absolute" style={{ top: "60px" }}>
                <div className="h-[21px] mb-2">
                  <label htmlFor="email-display" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    Email address
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <div className="w-full h-11 bg-gray-50 rounded-[3px] border border-black px-3 py-2 flex items-center justify-between">
                    <span className="text-gray-600 font-hamburg text-sm">{email}</span>
                    <button 
                      type="button" 
                      className="text-sm text-gray-500 font-hamburg hover:text-black transition-colors"
                      onClick={() => {
                        sessionStorage.clear();
                        router.push("/");
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* First Name & Last Name Fields - Only for details stage */}
          {stage === "details" && (
            <>
              <div className="w-[450px] left-[-27px] absolute" style={{ top: "145px" }}>
                <div className="h-[21px] mb-2">
                  <label htmlFor="firstName" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    First Name
                  </label>
                  <label htmlFor="lastName" className="text-black text-sm font-hamburg font-medium leading-[21px] absolute left-[225px]" style={{letterSpacing: '0.1px'}}>
                    Last Name
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <div className="w-[218px] h-11 left-[0px] top-0 absolute">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      maxLength={32}
                      autoCapitalize="words"
                      autoComplete="given-name"
                      tabIndex={0}
                      className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                      value={name.split(' ')[0] || ''}
                      onChange={(e) => {
                        const lastName = name.split(' ').slice(1).join(' ');
                        const newName = lastName ? `${e.target.value} ${lastName}` : e.target.value;
                        setName(newName);
                        try { sessionStorage.setItem("reg_name", newName); } catch {}
                      }}
                      disabled={pending}
                      required
                    />
                  </div>
                  <div className="w-[218px] h-11 left-[225px] top-0 absolute">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      maxLength={32}
                      autoCapitalize="words"
                      autoComplete="family-name"
                      tabIndex={0}
                      className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                      value={name.split(' ').slice(1).join(' ')}
                      onChange={(e) => {
                        const firstName = name.split(' ')[0] || '';
                        const newName = firstName ? `${firstName} ${e.target.value}` : e.target.value;
                        setName(newName);
                        try { sessionStorage.setItem("reg_name", newName); } catch {}
                      }}
                      disabled={pending}
                    />
                  </div>
                </div>
                {errors.name && <p className="text-sm text-red-600 font-hamburg">{errors.name}</p>}
              </div>
            </>
          )}

          {/* Password Field */}
          {(stage === "details" || stage === "login") && (
            <>
              <div className={`w-[450px] left-[-27px] absolute`} style={{ top: stage === "details" ? "230px" : (formError ? "225px" : "145px") }}>
                <div className="h-[21px] mb-2">
                  <label htmlFor="password" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    Password
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    maxLength={128}
                    autoComplete={stage === "login" ? "current-password" : "new-password"}
                    tabIndex={0}
                    className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={pending}
                    required
                  />
                </div>
                {errors.password && <p className="text-sm text-red-600 font-hamburg">{errors.password}</p>}
              </div>
            </>
          )}

          {/* Confirm Password Field - Only for details stage */}
          {stage === "details" && (
            <>
              <div className="w-[450px] left-[-27px] absolute" style={{ top: "315px" }}>
                <div className="h-[21px] mb-2">
                  <label htmlFor="confirm" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                    Re-enter password
                  </label>
                </div>
                <div className="h-11 mb-1 relative">
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    maxLength={128}
                    autoComplete="new-password"
                    tabIndex={0}
                    className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={pending}
                    required
                  />
                </div>
                {errors.confirm && <p className="text-sm text-red-600 font-hamburg">{errors.confirm}</p>}
              </div>
            </>
          )}

          {/* Continue Button */}
          <div className={`w-[450px] h-11 left-[-27px] absolute bg-neutral-900 rounded-[3px] border border-black transition-all duration-300 ease-in-out hover:bg-black transform hover:scale-[1.02]`} style={{ 
            top: stage === "email" ? (formError ? "205px" : "125px") : 
                 stage === "login" ? (formError ? "290px" : "210px") : 
                 "400px"
          }}>
            <button
              type="submit"
              className="w-full h-full bg-transparent text-center justify-center text-white text-base font-hamburg font-bold leading-9 disabled:opacity-60 transition-all duration-200"
              disabled={pending || isTransitioning}
            >
              {pending || isTransitioning ? "Continuing…" : (
                stage === "email" ? "Continue" : 
                stage === "login" ? "Log in" : 
                "Continue"
              )}
            </button>
          </div>
        </form>

        {/* Google/Apple Sign In Options - Show in email and login stages */}
        {(stage === "email" || stage === "login") && (
          <>
            <div className={`w-[450px] h-[21px] left-[-27px] absolute flex items-center`} style={{ 
              top: stage === "email" ? (formError ? "269px" : "189px") : (formError ? "354px" : "274px")
            }}>
              <div className="flex-1 h-px bg-neutral-200"></div>
              <div className="px-4 text-black text-sm font-hamburg font-medium leading-[21px]">or</div>
              <div className="flex-1 h-px bg-neutral-200"></div>
            </div>
            <button
              type="button"
              className={`w-[450px] h-11 left-[-27px] absolute bg-white rounded-[3px] border border-black disabled:opacity-60 flex items-center justify-center gap-3`}
              style={{ 
                top: stage === "email" ? (formError ? "310px" : "230px") : (formError ? "395px" : "315px")
              }}
              onClick={async () => { 
                if (!pending) { 
                  setPending(true); 
                  setFormError(null); 
                  try { 
                    const ok = await signInWithGoogle(); 
                    if (ok) router.replace("/auth/complete"); 
                  } catch (e) { 
                    setFormError(getFriendlyError(e)); 
                  } finally { 
                    setPending(false); 
                  } 
                }
              }}
              disabled={pending}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-center justify-center text-black text-base font-hamburg font-normal leading-9">
                {pending ? "Opening Google…" : "Continue with Google"}
              </span>
            </button>
            {ENABLE_APPLE && (
              <button
                type="button"
                className={`w-[450px] h-11 left-[-27px] absolute bg-white rounded-[3px] border border-black disabled:opacity-60`}
                style={{ 
                  top: stage === "email" ? (formError ? "354px" : "274px") : (formError ? "439px" : "359px")
                }}
                onClick={startApple}
                disabled={pending}
              >
                <span className="text-center justify-center text-black text-base font-hamburg font-normal leading-9">
                  {pending ? "Opening Apple…" : "Continue with Apple"}
                </span>
              </button>
            )}
            
            {/* Terms and Privacy */}
            <div className={`w-[450px] left-[-27px] absolute text-center`} style={{ 
              top: stage === "email" ? (formError ? "398px" : "318px") : (formError ? "483px" : "403px")
            }}>
              <p className="text-sm text-gray-600 font-hamburg">
                By continuing, you agree to the{" "}
                <a href="/terms-of-sale" className="text-black underline hover:no-underline">
                  Terms of Sale
                </a>
                ,{" "}
                <a href="/terms-of-service" className="text-black underline hover:no-underline">
                  Terms of Service
                </a>
                , and{" "}
                <a href="/privacy-policy" className="text-black underline hover:no-underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </>
        )}
      </div>
    </div>
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
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "Incorrect password. Please try again.";
        case "auth/user-not-found":
          return "No account found with this email.";
        case "auth/too-many-requests":
          return "Too many failed attempts. Please try again later.";
        case "auth/popup-closed-by-user":
        case "auth/cancelled-popup-request":
          return "Sign-in was cancelled.";
      }
    }
    if (typeof message === "string") return message;
  }
  return "Something went wrong. Please try again.";
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}

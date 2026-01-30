"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, signInWithGoogle } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const welcomeParam = searchParams.get("welcome");
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (welcomeParam === "true") {
      setWelcomeMessage("Welcome back! Please enter your password or Sign in with Google to continue.");
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setFormError(null);
    setErrors({});

    try {
      // Basic validation
      const emailErr = !email ? "Email is required." : null;
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

      {/* Main → Form Container */}
      <div className="w-full max-w-md mx-auto mt-16 px-4">
        
        {/* Heading Container */}
        <div className="w-full flex items-center justify-center mb-6">
          <h2 className="text-black text-3xl font-gloucester font-normal leading-10 text-center">
            Log in to your account
          </h2>
        </div>

        {/* Welcome Message */}
        {welcomeMessage && (
          <div className="w-full border border-blue-300 bg-blue-50 text-blue-800 rounded p-3 text-sm mb-4">
            {welcomeMessage}
          </div>
        )}

        {/* Error Display */}
        {formError && (
          <div className="w-full border border-red-300 bg-red-50 text-red-800 rounded p-3 text-sm mb-4">
            {formError}
          </div>
        )}

        <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
          {/* Email Field Container */}
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
                className="w-full h-full bg-white rounded-[3px] border border-zinc-500 px-3 pr-12 text-black text-base font-hamburg font-medium outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-sm text-gray-500 font-hamburg hover:text-black transition-colors"
                onClick={() => router.push("/")}
              >
                Edit
              </button>
            </div>
            {errors.email && <p className="text-sm text-red-600 font-hamburg">{errors.email}</p>}
          </div>

          {/* Password Field Container */}
          <div className="w-full">
            <div className="h-[21px] mb-2">
              <label htmlFor="password" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
                Password
              </label>
            </div>
            <div className="h-11 mb-1">
              <input
                id="password"
                name="password"
                type="password"
                maxLength={128}
                autoComplete="current-password"
                className="w-full h-full bg-white rounded-[3px] border border-zinc-500 px-3 text-black text-base font-hamburg font-medium outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                required
              />
            </div>
            {errors.password && <p className="text-sm text-red-600 font-hamburg">{errors.password}</p>}
          </div>

          {/* Log In Button Container */}
          <button 
            type="submit"
            className="w-full h-11 bg-neutral-900 rounded-[3px] text-white text-base font-hamburg font-bold leading-[38px] hover:bg-neutral-800 transition-colors flex items-center justify-center disabled:opacity-60"
            disabled={pending}
          >
            {pending ? "Logging in…" : "Log in"}
          </button>

          {/* OR Separator Container */}
          <div className="w-full flex items-center my-4">
            <div className="flex-1 h-px bg-neutral-200"></div>
            <div className="px-4 text-black text-sm font-hamburg font-medium leading-[21px]">or</div>
            <div className="flex-1 h-px bg-neutral-200"></div>
          </div>
        </form>

        {/* Google Button Container */}
        <button
          type="button"
          className="w-full h-[52px] bg-white rounded-[3px] border border-black hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 disabled:opacity-60 mb-4"
          onClick={async () => { 
            if (!pending) { 
              setPending(true); 
              setFormError(null); 
              try { 
                await signInWithGoogle(); 
                router.replace("/auth/complete"); 
              } catch (e) { 
                setFormError(getFriendlyError(e)); 
              } finally { 
                setPending(false); 
              } 
            }
          }}
          disabled={pending}
        >
          <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M17.77 9.64468C17.77 9.0065 17.7127 8.39286 17.6064 7.80377H9.13V11.2851H13.9736C13.765 12.4101 13.1309 13.3633 12.1777 14.0015V16.2597H15.0864C16.7882 14.6929 17.77 12.3856 17.77 9.64468Z" fill="#4285F4"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M9.12976 18.44C11.5598 18.44 13.597 17.6341 15.0861 16.2595L12.1775 14.0013C11.3716 14.5413 10.3407 14.8604 9.12976 14.8604C6.78567 14.8604 4.80159 13.2772 4.09386 11.15H1.08704V13.4818C2.56795 16.4231 5.61158 18.44 9.12976 18.44Z" fill="#34A853"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M4.09409 11.1498C3.91409 10.6098 3.81182 10.033 3.81182 9.43983C3.81182 8.84664 3.91409 8.26983 4.09409 7.72983V5.39801H1.08728C0.477732 6.61301 0.130005 7.98755 0.130005 9.43983C0.130005 10.8921 0.477732 12.2666 1.08728 13.4816L4.09409 11.1498Z" fill="#FBBC05"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M9.12976 4.01955C10.4511 4.01955 11.6375 4.47364 12.5702 5.36545L15.1516 2.78409C13.5929 1.33182 11.5557 0.440002 9.12976 0.440002C5.61158 0.440002 2.56795 2.45682 1.08704 5.39818L4.09386 7.73C4.80159 5.60273 6.78567 4.01955 9.12976 4.01955Z" fill="#EA4335"/>
          </svg>
          <span className="text-neutral-900 text-base font-hamburg font-normal leading-6">
            {pending ? "Opening Google…" : "Continue with Google"}
          </span>
        </button>

        {/* Forgot Password Link */}
        <div className="w-full text-center mb-4">
          <button
            type="button"
            onClick={() => router.push(`/auth/forgot-password?email=${encodeURIComponent(email)}`)}
            className="text-black text-sm font-hamburg font-normal underline hover:no-underline"
          >
            Forgot password?
          </button>
        </div>

        {/* Link to register */}
        <div className="w-full text-center">
          <p className="text-black text-sm font-hamburg font-normal leading-[21px]">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="text-black underline hover:no-underline"
              onClick={() => router.push("/auth/register")}
            >
              Create one here
            </button>
          </p>
        </div>
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
        case "auth/invalid-email":
          return "Invalid email address.";
        case "auth/wrong-password":
        case "auth/invalid-credential":
          return "Incorrect password. If you signed up with Google, please use the 'Continue with Google' button below.";
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

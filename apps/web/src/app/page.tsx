"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import type { User } from "firebase/auth";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { checkUserExists } from "@/lib/db/users";
import { AuthDebugger, EnvUtils } from "@/lib/debug";

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    AuthDebugger.log("Main page: Component mounted", {
      environment: EnvUtils.getEnvironmentInfo(),
    });

    // initialize analytics (no-op on unsupported envs) and log a page_view
    (async () => {
      try {
        const a = await initAnalytics();
        if (a) {
          logEvent(a, "page_view");
          AuthDebugger.log("Main page: Analytics initialized and page_view logged");
        }
      } catch (error) {
        AuthDebugger.log("Main page: Analytics init error (expected in some environments)", { error: error?.toString() });
      }
    })();

    const unsub = onUser(async (currentUser) => {
      AuthDebugger.log("Main page: User state changed", { 
        hasUser: !!currentUser, 
        email: currentUser?.email,
        uid: currentUser?.uid?.substring(0, 8) + '...',
        environment: EnvUtils.isProduction() ? 'production' : 'local',
      });
      
      setUser(currentUser);
      
      // Don't automatically redirect - let users navigate manually to prevent glitching
      // The hub page will handle its own authentication requirements
      AuthDebugger.log("Main page: No automatic redirects - manual navigation only");
    });

    return () => {
      AuthDebugger.log("Main page: Component unmounting, cleaning up user listener");
      unsub();
    };
  }, [router]);

  const handleGoogle = async () => {
    try {
      AuthDebugger.log("Main page: Starting Google sign-in");
      await signInWithGoogle();
      AuthDebugger.log("Main page: Google sign-in successful, redirecting to complete");
      router.replace("/auth/complete");
    } catch (error) {
      AuthDebugger.log("Main page: Google sign-in error", { error: error?.toString() });
      // ignored: signInWithGoogle filters benign errors
    }
  };

  const handleApple = async () => {
    try {
      AuthDebugger.log("Main page: Starting Apple sign-in");
      const provider = new OAuthProvider("apple.com");
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      AuthDebugger.log("Main page: Apple sign-in successful, redirecting to complete");
      router.replace("/auth/complete");
    } catch (error) {
      AuthDebugger.log("Main page: Apple sign-in error", { error: error?.toString() });
      // noop; user may cancel
    }
  };

  const handleHubNavigation = () => {
    AuthDebugger.log("Main page: User clicked 'Go to Hub' button");
    AuthDebugger.log("Main page: Attempting navigation to /hub");
    try {
      router.push("/hub");
      AuthDebugger.log("Main page: router.push('/hub') called successfully");
    } catch (error) {
      AuthDebugger.log("Main page: Navigation error", { error: error?.toString() });
    }
  };

  const handleProfileNavigation = () => {
    AuthDebugger.log("Main page: User clicked 'Complete Profile' button");
    AuthDebugger.log("Main page: Attempting navigation to /auth/finish");
    try {
      router.push("/auth/finish");
      AuthDebugger.log("Main page: router.push('/auth/finish') called successfully");
    } catch (error) {
      AuthDebugger.log("Main page: Profile navigation error", { error: error?.toString() });
    }
  };

  const handleSignOut = async () => {
    try {
      AuthDebugger.log("Main page: User initiated sign out");
      await logout();
      setUser(null);
      AuthDebugger.log("Main page: Sign out successful");
    } catch (error) {
      AuthDebugger.log("Main page: Sign out error", { error: error?.toString() });
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-white">
      {/* Header → Banner */}
      <div className="w-full h-20 border-b border-black flex items-center justify-center">
        <img 
          className="w-80 h-[70.2px]" 
          src="/images/logos/FullName-Black.png" 
          alt="The Reality Report"
        />
      </div>

      {/* Main Content */}
      {user ? (
        // Authenticated user - show welcome message and navigation
        <div className="w-full max-w-md mx-auto mt-16 px-4 text-center">
          <h2 className="text-black text-3xl font-gloucester font-normal leading-10 mb-6">
            Welcome back!
          </h2>
          <p className="text-gray-600 font-hamburg mb-8">
            You&apos;re signed in as {user.email}
          </p>
          <div className="space-y-4">
            <button
              onClick={handleHubNavigation}
              className="w-full h-11 bg-neutral-900 rounded-[3px] text-white text-base font-hamburg font-bold leading-[38px] hover:bg-neutral-800 transition-colors flex items-center justify-center"
            >
              Go to Hub
            </button>
            <button
              onClick={handleProfileNavigation}
              className="w-full h-11 bg-white rounded-[3px] border border-black text-black text-base font-hamburg font-normal hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              Complete Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full h-11 bg-white rounded-[3px] border border-gray-300 text-gray-600 text-base font-hamburg font-normal hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        // Unauthenticated user - show login/register form
        <form onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        if (email?.trim()) {
          try {
            // Check if user exists first
            const userExists = await checkUserExists(email.trim());
            if (userExists) {
              // User exists, redirect to login
              router.push(`/login?email=${encodeURIComponent(email.trim())}`);
            } else {
              // New user, redirect to register
              router.push(`/auth/register?email=${encodeURIComponent(email.trim())}`);
            }
          } catch (error) {
            console.error("Error checking user existence:", error);
            // On error, default to register flow
            router.push(`/auth/register?email=${encodeURIComponent(email.trim())}`);
          }
        }
      }} noValidate className="w-full max-w-md mx-auto mt-16 px-4">
        
        {/* Heading Container */}
        <div className="w-full flex items-center justify-center mb-6">
          <h2 className="text-black text-3xl font-gloucester font-normal leading-10 text-center">
            Log in or create an account
          </h2>
        </div>

        {/* Email Field */}
        <div className="w-full mb-4">
          <div className="h-[21px] mb-2">
            <label htmlFor="email" className="text-black text-sm font-hamburg font-medium leading-[21px]" style={{letterSpacing: '0.1px'}}>
              Email address
            </label>
          </div>
          <div className="h-11 mb-1 relative">
            <input 
              type="email"
              name="email"
              id="email"
              required
              className="w-full h-full bg-white rounded-[3px] border border-black px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black text-black"
              placeholder="your.email@example.com"
            />
          </div>
        </div>

        {/* Continue Button Container */}
        <button 
          type="submit"
          className="w-full h-11 bg-neutral-900 rounded-[3px] text-white text-base font-hamburg font-bold leading-[38px] hover:bg-neutral-800 transition-colors flex items-center justify-center mb-4"
        >
          Continue
        </button>

        {/* OR Separator Container */}
        <div className="w-full flex items-center mb-4">
          <div className="flex-1 h-px bg-neutral-200"></div>
          <div className="px-4 text-black text-sm font-hamburg font-medium leading-[21px]">or</div>
          <div className="flex-1 h-px bg-neutral-200"></div>
        </div>

        {/* Google Button Container */}
        <button 
          type="button"
          onClick={handleGoogle}
          className="w-full h-[52px] bg-white rounded-[3px] border border-black hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 mb-6"
        >
          <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M17.77 9.64468C17.77 9.0065 17.7127 8.39286 17.6064 7.80377H9.13V11.2851H13.9736C13.765 12.4101 13.1309 13.3633 12.1777 14.0015V16.2597H15.0864C16.7882 14.6929 17.77 12.3856 17.77 9.64468Z" fill="#4285F4"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M9.12976 18.44C11.5598 18.44 13.597 17.6341 15.0861 16.2595L12.1775 14.0013C11.3716 14.5413 10.3407 14.8604 9.12976 14.8604C6.78567 14.8604 4.80159 13.2772 4.09386 11.15H1.08704V13.4818C2.56795 16.4231 5.61158 18.44 9.12976 18.44Z" fill="#34A853"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M4.09409 11.1498C3.91409 10.6098 3.81182 10.033 3.81182 9.43983C3.81182 8.84664 3.91409 8.26983 4.09409 7.72983V5.39801H1.08728C0.477732 6.61301 0.130005 7.98755 0.130005 9.43983C0.130005 10.8921 0.477732 12.2666 1.08728 13.4816L4.09409 11.1498Z" fill="#FBBC05"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M9.12976 4.01955C10.4511 4.01955 11.6375 4.47364 12.5702 5.36545L15.1516 2.78409C13.5929 1.33182 11.5557 0.440002 9.12976 0.440002C5.61158 0.440002 2.56795 2.45682 1.08704 5.39818L4.09386 7.73C4.80159 5.60273 6.78567 4.01955 9.12976 4.01955Z" fill="#EA4335"/>
          </svg>
          <span className="text-neutral-900 text-base font-hamburg font-normal leading-6">
            Continue with Google
          </span>
        </button>

        {/* Terms Text Container */}
        <div className="w-full flex items-center justify-center">
          <p className="text-black text-sm font-hamburg font-normal leading-[21px] text-center">
            By continuing, you agree to the{" "}
            <span className="underline">Terms of Sale</span>, <span className="underline">Terms of Service</span>, and{" "}
            <span className="underline">Privacy Policy</span>.
          </p>
        </div>
        </form>
      )}
    </div>
  );
}

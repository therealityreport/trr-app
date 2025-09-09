"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile, upsertUserProfile } from "@/lib/db/users";

function OAuthCallbackRedirectContent() {
  const router = useRouter();
  const search = useSearchParams();
  const ran = useRef(false); // neutralize StrictMode double invoke in dev
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    
    console.log("Auth complete: Setting up auth state listener");
    
    // Force redirect after 2 seconds if auth state doesn't trigger
    const forceRedirectTimer = setTimeout(() => {
      console.log("Auth complete: Force redirecting to finish after timeout");
      router.replace("/auth/finish");
    }, 2000);
    
    // If we already have a current user, trigger auth state change immediately
    if (auth.currentUser) {
      console.log("Auth complete: Current user already exists, triggering immediate profile check");
      clearTimeout(forceRedirectTimer);
      // Don't return here - let the auth state handler below run the profile check
      setTimeout(() => {
        // Manually trigger the auth state handler with current user
        const handleUser = async (u: any) => {
          console.log("Auth complete: Processing existing user", u ? { uid: u.uid, email: u.email } : "No user");
          
          if (!u) {
            router.replace("/auth/register");
            return;
          }
          
          try {
            const idToken = await u.getIdToken();
            console.log("Auth complete: Got ID token, calling session login");
            const sessionResponse = await fetch("/api/session/login", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ idToken }),
              credentials: "include",
            });
            console.log("Auth complete: Session login response", sessionResponse.status);
          } catch (error) {
            console.error("Auth complete: Session login failed", error);
          }
          
          // Check if user has a complete profile
          try {
            console.log("Auth complete: Checking user profile for uid:", u.uid);
            const profile = await getUserProfile(u.uid);
            console.log("Auth complete: Profile check result:", profile);
            
            // More explicit check for complete profile
            const hasUsername = profile && profile.username && profile.username.trim().length > 0;
            const hasShows = profile && profile.shows && Array.isArray(profile.shows) && profile.shows.length > 0;
            
            console.log("Auth complete: Profile analysis:", {
              hasProfile: !!profile,
              hasUsername,
              hasShows,
              username: profile?.username,
              showsCount: profile?.shows?.length
            });
            
            if (hasUsername && hasShows) {
              console.log("Auth complete: User has complete profile (username + shows), redirecting to hub");
              router.replace("/hub");
            } else {
              console.log("Auth complete: User needs to complete profile, redirecting to finish");
              router.replace("/auth/finish");
            }
          } catch (error) {
            console.error("Auth complete: Profile check failed with error:", error);
            // Fallback to finish page if profile check fails
            console.log("Auth complete: Profile check failed, redirecting to finish page");
            router.replace("/auth/finish");
          }
        };
        
        handleUser(auth.currentUser);
      }, 100);
      return;
    }
    
    const unsub = auth.onAuthStateChanged(async (u) => {
      console.log("Auth complete: Auth state changed", u ? { uid: u.uid, email: u.email } : "No user");
      
      // Clear the force redirect timer since auth state fired
      clearTimeout(forceRedirectTimer);
      
      if (!u) {
        // Fail fast: if no OAuth params and no session, bounce to register.
        // If OAuth params present, allow a short grace period for Firebase to hydrate.
        const hasOAuthParams = !!(search.get("code") || search.get("state") || search.get("oauth") || search.get("provider"));
        if (!hasOAuthParams) {
          console.log("Auth complete: No user, no OAuth params, redirecting to register");
          router.replace("/auth/register");
        } else {
          console.log("Auth complete: No user but OAuth params present, setting fallback timer");
          if (fallbackTimer.current == null) {
            fallbackTimer.current = window.setTimeout(() => {
              console.log("Auth complete: Fallback timer expired, redirecting to register");
              router.replace("/auth/register");
            }, 8000);
          }
        }
        return;
      }
      // We have a user; cancel any fallback redirect timer
      if (fallbackTimer.current != null) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
      
      console.log("Auth complete: User found", { uid: u.uid, email: u.email });
      
      try {
        const idToken = await u.getIdToken();
        console.log("Auth complete: Got ID token, calling session login");
        const sessionResponse = await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
        console.log("Auth complete: Session login response", sessionResponse.status);
      } catch (error) {
        console.error("Auth complete: Session login failed", error);
      }
      
      // Check if user has a complete profile
      try {
        console.log("Auth complete: Checking user profile for uid:", u.uid);
        const profile = await getUserProfile(u.uid);
        console.log("Auth complete: Profile check result:", profile);
        
        // More explicit check for complete profile
        const hasUsername = profile && profile.username && profile.username.trim().length > 0;
        const hasShows = profile && profile.shows && Array.isArray(profile.shows) && profile.shows.length > 0;
        
        console.log("Auth complete: Profile analysis:", {
          hasProfile: !!profile,
          hasUsername,
          hasShows,
          username: profile?.username,
          showsCount: profile?.shows?.length
        });
        
        if (hasUsername && hasShows) {
          console.log("Auth complete: User has complete profile (username + shows), redirecting to hub");
          router.replace("/hub");
        } else {
          console.log("Auth complete: User needs to complete profile, redirecting to finish");
          router.replace("/auth/finish");
        }
      } catch (error) {
        console.error("Auth complete: Profile check failed with error:", error);
        // Fallback to finish page if profile check fails
        console.log("Auth complete: Profile check failed, redirecting to finish page");
        router.replace("/auth/finish");
      }
    });
    return () => {
      clearTimeout(forceRedirectTimer);
      if (fallbackTimer.current != null) clearTimeout(fallbackTimer.current);
      unsub();
    };
  }, [router, search]);

  return (
    <main className="mx-auto max-w-xl p-12 text-center text-sm text-gray-600">
      Finishing sign-in…
    </main>
  );
}

export default function OAuthCallbackRedirect() {
  return (
    <Suspense fallback={
      <main className="mx-auto max-w-xl p-12 text-center text-sm text-gray-600">
        Loading…
      </main>
    }>
      <OAuthCallbackRedirectContent />
    </Suspense>
  );
}

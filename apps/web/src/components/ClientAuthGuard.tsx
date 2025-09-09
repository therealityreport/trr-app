"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";

interface ClientAuthGuardProps {
  children: React.ReactNode;
  requireComplete?: boolean;
}

export default function ClientAuthGuard({ children, requireComplete = false }: ClientAuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      console.log("ClientAuthGuard: Auth state changed", { user: !!user, email: user?.email });
      
      if (!user) {
        console.log("ClientAuthGuard: No user, redirecting to main page");
        // Add a small delay to prevent immediate redirect loops
        setTimeout(() => {
          router.replace("/");
        }, 100);
        return;
      }

      if (requireComplete) {
        console.log("ClientAuthGuard: Checking profile completeness for", user.email);
        try {
          const profile = await getUserProfile(user.uid);
          const complete = !!profile && !!profile.username && Array.isArray(profile.shows) && profile.shows.length >= 3 && !!profile.birthday;
          
          console.log("ClientAuthGuard: Profile check result", { complete, profile: !!profile });
          
          if (!complete) {
            console.log("ClientAuthGuard: Profile incomplete, redirecting to finish");
            router.replace("/auth/finish");
            return;
          }
        } catch (error) {
          console.error("Error checking profile completeness:", error);
          router.replace("/auth/finish");
          return;
        }
      }

      console.log("ClientAuthGuard: User authorized");
      setAuthorized(true);
      setLoading(false);
    });

    return unsub;
  }, [router, requireComplete]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null; // Will redirect
  }

  return <>{children}</>;
}

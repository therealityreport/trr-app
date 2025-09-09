"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";
import { AuthDebugger, EnvUtils } from "@/lib/debug";

interface ClientAuthGuardProps {
  children: React.ReactNode;
  requireComplete?: boolean;
}

export default function ClientAuthGuard({ children, requireComplete = false }: ClientAuthGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    AuthDebugger.log("ClientAuthGuard: Component mounted", {
      requireComplete,
      environment: EnvUtils.getEnvironmentInfo(),
    });

    const unsub = auth.onAuthStateChanged(async (user) => {
      AuthDebugger.log("ClientAuthGuard: Auth state changed", { 
        hasUser: !!user, 
        email: user?.email,
        uid: user?.uid?.substring(0, 8) + '...',
        environment: EnvUtils.isProduction() ? 'production' : 'local',
      });
      
      if (!user) {
        AuthDebugger.log("ClientAuthGuard: No user found, preparing redirect to main page");
        
        // Add a delay and more logging for production debugging
        const delay = EnvUtils.isProduction() ? 200 : 100;
        AuthDebugger.log(`ClientAuthGuard: Waiting ${delay}ms before redirect to prevent loops`);
        
        setTimeout(() => {
          AuthDebugger.log("ClientAuthGuard: Executing redirect to main page");
          router.replace("/");
        }, delay);
        return;
      }

      if (requireComplete) {
        AuthDebugger.log("ClientAuthGuard: Checking profile completeness", { userEmail: user.email });
        try {
          const profile = await getUserProfile(user.uid);
          const complete = !!profile && !!profile.username && Array.isArray(profile.shows) && profile.shows.length >= 3 && !!profile.birthday;
          
          AuthDebugger.log("ClientAuthGuard: Profile check completed", { 
            complete, 
            hasProfile: !!profile,
            hasUsername: !!profile?.username,
            showsCount: profile?.shows?.length || 0,
            hasBirthday: !!profile?.birthday,
          });
          
          if (!complete) {
            AuthDebugger.log("ClientAuthGuard: Profile incomplete, redirecting to finish page");
            router.replace("/auth/finish");
            return;
          }
        } catch (error) {
          AuthDebugger.log("ClientAuthGuard: Error checking profile completeness", { error: error?.toString() });
          router.replace("/auth/finish");
          return;
        }
      }

      AuthDebugger.log("ClientAuthGuard: User authorized, rendering children");
      setAuthorized(true);
      setLoading(false);
    });

    return () => {
      AuthDebugger.log("ClientAuthGuard: Component unmounting, cleaning up auth listener");
      unsub();
    };
  }, [router, requireComplete]);

  if (loading) {
    AuthDebugger.log("ClientAuthGuard: Rendering loading state");
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    AuthDebugger.log("ClientAuthGuard: Not authorized, returning null (will redirect)");
    return null; // Will redirect
  }

  AuthDebugger.log("ClientAuthGuard: Rendering authorized content");
  return <>{children}</>;
}

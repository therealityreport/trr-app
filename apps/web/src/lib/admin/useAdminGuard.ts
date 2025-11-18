'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isClientAdmin } from "./client-access";

export function useAdminGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (!currentUser) {
        setHasAccess(false);
        router.replace("/");
        return;
      }
      if (!isClientAdmin(currentUser)) {
        setHasAccess(false);
        router.replace("/hub");
        return;
      }
      setHasAccess(true);
    });

    return () => unsubscribe();
  }, [router]);

  return { user, checking, hasAccess };
}

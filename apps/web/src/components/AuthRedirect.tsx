"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onUser } from "@/lib/firebase";

export default function AuthRedirect(): null {
  const router = useRouter();

  useEffect(() => {
    const unsub = onUser((u) => {
      if (u) router.replace("/hub");
    });
    return () => unsub();
  }, [router]);

  return null;
}

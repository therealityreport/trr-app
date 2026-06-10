"use client";

import { logout } from "@/lib/firebase";

export default function SignOutButton() {
  const handle = async () => {
    try {
      await logout();
    } finally {
      window.location.href = "/";
    }
  };
  return (
    <button type="button" className="px-3 py-1 rounded border text-sm" onClick={handle}>
      Sign out
    </button>
  );
}


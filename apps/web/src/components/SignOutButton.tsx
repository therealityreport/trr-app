"use client";

import { logout } from "@/lib/firebase";

export default function SignOutButton() {
  const handle = async () => {
    try {
      await logout();
    } finally {
      window.location.href = "/auth/register";
    }
  };
  return (
    <button className="px-3 py-1 rounded border text-sm" onClick={handle}>
      Sign out
    </button>
  );
}


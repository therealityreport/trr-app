"use client";

import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

export type AdminSnapshotFamilyInput =
  | { pageFamily: "season-social-analytics"; scope: string }
  | { pageFamily: "week-social"; scope: string }
  | { pageFamily: "social-profile"; scope: string }
  | { pageFamily: "reddit-sources"; scope: string }
  | { pageFamily: "cast-socialblade"; scope: string }
  | { pageFamily: "system-health"; scope?: string | null };

export const invalidateAdminSnapshotFamilies = async (families: AdminSnapshotFamilyInput[]): Promise<void> => {
  if (families.length === 0) return;
  const response = await fetchAdminWithAuth(
    "/api/admin/trr-api/snapshots/invalidate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ families }),
    },
    { allowDevAdminBypass: true },
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "Failed to invalidate admin snapshots");
  }
};

"use client";

import { useCallback, useEffect, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SkillsAgentsDashboardData } from "@/lib/admin/dev-dashboard-skills-agents";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { DevDashboardShell } from "../_components/DevDashboardShell";
import { SkillsAgentsDashboardContent } from "../_components/SkillsAgentsDashboardContent";

export default function SkillsAndAgentsPage() {
  const { user, userKey, checking, hasAccess } = useAdminGuard();

  const [data, setData] = useState<SkillsAgentsDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchAdminWithAuth("/api/admin/dev-dashboard/skills-and-agents", undefined, {
        preferredUser: user,
        allowDevAdminBypass: true,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : `Request failed (${response.status})`;
        throw new Error(message);
      }

      setData(payload as SkillsAgentsDashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills and agents dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (checking) return;
    if (!userKey || !hasAccess) return;
    void load();
  }, [checking, userKey, hasAccess, load]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing skills and agents dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <DevDashboardShell
        activeRoute="/admin/dev-dashboard/skills-and-agents"
        breadcrumbItems={[
          ...buildAdminSectionBreadcrumb("Dev Dashboard", "/admin/dev-dashboard"),
          { label: "Skills & Agents", href: "/admin/dev-dashboard/skills-and-agents" },
        ]}
        title="Skills & Agents"
        description="Inventory Codex, Claude, workspace, and repo-local skills plus agent interfaces and plugins."
        generatedAt={data?.generatedAt}
      >
        {error ? (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
        ) : null}

        {!data && loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              <p className="text-sm text-zinc-600">Loading skills and agents…</p>
            </div>
          </div>
        ) : null}

        {data ? <SkillsAgentsDashboardContent data={data} /> : null}
      </DevDashboardShell>
    </ClientOnly>
  );
}

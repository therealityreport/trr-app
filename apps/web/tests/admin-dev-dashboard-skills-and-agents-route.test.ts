import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getDevDashboardSkillsAgentsDataMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getDevDashboardSkillsAgentsDataMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/admin/dev-dashboard-skills-agents-service", () => ({
  getDevDashboardSkillsAgentsData: getDevDashboardSkillsAgentsDataMock,
}));

import { GET } from "@/app/api/admin/dev-dashboard/skills-and-agents/route";

describe("/api/admin/dev-dashboard/skills-and-agents route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getDevDashboardSkillsAgentsDataMock.mockReset();
  });

  it("returns the skills and agents payload for an admin", async () => {
    requireAdminMock.mockResolvedValue({ uid: "admin-uid" });
    getDevDashboardSkillsAgentsDataMock.mockResolvedValue({
      skills: [],
      agents: {
        codexProjectAgents: [],
        skillAgentInterfaces: [],
        claudeUserPlugins: [],
      },
      generatedAt: "2026-03-26T14:00:00.000Z",
      warnings: [],
    });

    const response = await GET(new NextRequest("http://localhost/api/admin/dev-dashboard/skills-and-agents"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      skills: [],
      agents: {
        codexProjectAgents: [],
        skillAgentInterfaces: [],
        claudeUserPlugins: [],
      },
      generatedAt: "2026-03-26T14:00:00.000Z",
      warnings: [],
    });
  });

  it("returns 403 when admin access is forbidden", async () => {
    requireAdminMock.mockRejectedValue(new Error("forbidden"));

    const response = await GET(new NextRequest("http://localhost/api/admin/dev-dashboard/skills-and-agents"));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({ error: "forbidden" });
  });
});

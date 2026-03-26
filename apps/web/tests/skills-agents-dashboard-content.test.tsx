import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SkillsAgentsDashboardContent } from "@/app/admin/dev-dashboard/_components/SkillsAgentsDashboardContent";
import type { SkillsAgentsDashboardData } from "@/lib/admin/dev-dashboard-skills-agents";

const sampleData: SkillsAgentsDashboardData = {
  skills: [
    {
      key: "codex-system",
      label: "Codex System",
      repoLabel: null,
      items: [
        {
          id: "skill-1",
          name: "OpenAI Docs",
          description: "Official docs helper.",
          sourceLabel: "Codex System",
          repoLabel: null,
          path: "~/.codex/skills/.system/openai-docs/SKILL.md",
          hasAgentInterface: false,
          agentInterfacePath: null,
        },
      ],
    },
  ],
  agents: {
    codexProjectAgents: [
      {
        key: "reviewer",
        description: "Risk-first reviewer.",
        configFile: "TRR/.codex/agents/reviewer.toml",
        model: "gpt-5.4",
        reasoningEffort: "high",
        mcpServers: ["chrome-devtools"],
        nicknameCandidates: ["Sentinel"],
        skillsLabel: "No explicit skill mapping",
      },
    ],
    skillAgentInterfaces: [
      {
        id: "interface-1",
        displayName: "Workspace Reviewer",
        shortDescription: "Workspace review interface.",
        defaultPrompt: "Use the reviewer skill.",
        sourceLabel: "Workspace Shared Agent Interfaces",
        repoLabel: null,
        owningSkillName: "code-reviewer",
        owningSkillPath: "TRR/.agents/skills/code-reviewer/SKILL.md",
        interfacePath: "TRR/.agents/skills/code-reviewer/agents/openai.yaml",
        toolDependencies: [],
      },
    ],
    claudeUserPlugins: [
      {
        id: "plugin-1",
        pluginId: "context7",
        marketplace: "claude-plugins-official",
        version: "1.0.0",
        scope: "user",
        installPath: "~/.claude/plugins/cache/context7/1.0.0",
        installedAt: "2026-03-21T02:53:46.524Z",
        lastUpdated: "2026-03-26T08:53:16.396Z",
      },
    ],
  },
  generatedAt: "2026-03-26T14:00:00.000Z",
  warnings: ["Example warning"],
};

describe("SkillsAgentsDashboardContent", () => {
  it("renders skills first and switches to agents on tab click", () => {
    render(<SkillsAgentsDashboardContent data={sampleData} />);

    expect(screen.getByRole("tablist", { name: "Skills and agents tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Skills" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("OpenAI Docs")).toBeInTheDocument();
    expect(screen.getByText("Example warning")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Agents" }));

    expect(screen.getByRole("tab", { name: "Agents" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Codex Project Agents")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(screen.getByText("Workspace Reviewer")).toBeInTheDocument();
    expect(screen.getByText("context7")).toBeInTheDocument();
  });
});

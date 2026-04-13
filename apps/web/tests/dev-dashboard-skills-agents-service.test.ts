import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getDevDashboardSkillsAgentsData } from "@/lib/server/admin/dev-dashboard-skills-agents-service";

async function writeTextFile(filePath: string, contents: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, "utf8");
}

describe("getDevDashboardSkillsAgentsData", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (dir) => {
        await rm(dir, { recursive: true, force: true });
      }),
    );
  });

  it("groups skills by source and keeps duplicate skill names in separate groups", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "skills-agents-dashboard-"));
    tempDirs.push(root);

    const homeDir = path.join(root, "home");
    const workspaceRoot = path.join(root, "TRR");

    await writeTextFile(
      path.join(homeDir, ".codex/skills/.system/openai-docs/SKILL.md"),
      `---
name: OpenAI Docs
description: Official OpenAI docs helper.
---
`,
    );
    await writeTextFile(
      path.join(homeDir, ".codex/skills/user-skill/SKILL.md"),
      `---
name: User Skill
description: User-installed Codex skill.
---
`,
    );
    await writeTextFile(
      path.join(homeDir, ".claude/skills/claude-user-skill/SKILL.md"),
      `---
name: Claude User Skill
description: User-installed Claude skill.
---
`,
    );
    await writeTextFile(
      path.join(homeDir, ".claude/plugins/installed_plugins.json"),
      JSON.stringify(
        {
          version: 2,
          plugins: {
            "context7@claude-plugins-official": [
              {
                scope: "user",
                installPath: path.join(homeDir, ".claude/plugins/cache/context7/1.0.0"),
                version: "1.0.0",
                installedAt: "2026-03-21T02:53:46.524Z",
                lastUpdated: "2026-03-26T08:53:16.396Z",
              },
            ],
          },
        },
        null,
        2,
      ),
    );

    await writeTextFile(
      path.join(workspaceRoot, ".agents/skills/workspace-duplicate/SKILL.md"),
      `---
name: Duplicate Skill
description: Shared workspace skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, ".agents/skills/workspace-duplicate/agents/openai.yaml"),
      `interface:
  display_name: "Duplicate Workspace Interface"
  short_description: "Workspace agent interface"
  default_prompt: "Use the workspace duplicate skill."
dependencies:
  tools:
    - type: "mcp"
      value: "chrome-devtools"
      description: "Browser verification"
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, ".codex/skills/project-codex-skill/SKILL.md"),
      `---
name: Project Codex Skill
description: Workspace Codex project skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, ".claude/skills/project-claude-skill/SKILL.md"),
      `---
name: Project Claude Skill
description: Workspace Claude project skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, "TRR-APP/.agents/skills/repo-duplicate/SKILL.md"),
      `---
name: Duplicate Skill
description: Repo-local TRR-APP skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, "TRR-APP/.agents/skills/repo-duplicate/agents/openai.yaml"),
      `interface:
  display_name: "Duplicate App Interface"
  short_description: "TRR-APP interface"
  default_prompt: "Use the repo duplicate skill."
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, "TRR-APP/.claude/skills/repo-claude-skill/SKILL.md"),
      `---
name: Repo Claude Skill
description: TRR-APP Claude skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, "TRR-Backend/.agents/skills/backend-skill/SKILL.md"),
      `---
name: Backend Skill
description: TRR-Backend skill.
---
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, ".codex/config.toml"),
      `[agents]
max_threads = 6

[agents.reviewer]
description = "Risk-first reviewer."
config_file = "./agents/reviewer.toml"
`,
    );
    await writeTextFile(
      path.join(workspaceRoot, ".codex/agents/reviewer.toml"),
      `description = "Detailed reviewer config"
model = "gpt-5.4"
model_reasoning_effort = "high"
nickname_candidates = ["Sentinel", "Watchdog"]

[mcp_servers.chrome-devtools]
command = "codex-chrome"
enabled = true
`,
    );

    const data = await getDevDashboardSkillsAgentsData({ homeDir, workspaceRoot });

    expect(data.skills.map((group) => group.label)).toEqual([
      "Codex System",
      "Codex User",
      "Workspace Shared",
      "Workspace Codex Project",
      "Workspace Claude Project",
      "TRR-APP Repo",
      "TRR-Backend Repo",
      "Claude User",
    ]);

    const workspaceShared = data.skills.find((group) => group.key === "workspace-shared");
    const trrAppRepo = data.skills.find((group) => group.key === "trr-app-repo");
    expect(workspaceShared?.items.map((item) => item.name)).toEqual(["Duplicate Skill"]);
    expect(trrAppRepo?.items.map((item) => item.name)).toContain("Duplicate Skill");

    const codexUser = data.skills.find((group) => group.key === "codex-user");
    expect(codexUser?.items.map((item) => item.path)).toEqual(["~/.codex/skills/user-skill/SKILL.md"]);

    expect(data.agents.codexProjectAgents).toEqual([
      expect.objectContaining({
        key: "reviewer",
        configFile: "TRR/.codex/agents/reviewer.toml",
        model: "gpt-5.4",
        reasoningEffort: "high",
        mcpServers: ["chrome-devtools"],
        nicknameCandidates: ["Sentinel", "Watchdog"],
        skillsLabel: "No explicit skill mapping",
      }),
    ]);

    expect(data.agents.skillAgentInterfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayName: "Duplicate Workspace Interface",
          owningSkillName: "Duplicate Skill",
          toolDependencies: [{ label: "mcp: chrome-devtools", description: "Browser verification" }],
        }),
        expect.objectContaining({
          displayName: "Duplicate App Interface",
          repoLabel: "TRR-APP",
        }),
      ]),
    );

    expect(data.agents.claudeUserPlugins).toEqual([
      expect.objectContaining({
        pluginId: "context7",
        marketplace: "claude-plugins-official",
        version: "1.0.0",
        scope: "user",
      }),
    ]);

    expect(data.warnings).toEqual([]);
  });

  it("returns empty groups and warnings when optional filesystem inputs are missing", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "skills-agents-dashboard-missing-"));
    tempDirs.push(root);

    const homeDir = path.join(root, "home");
    const workspaceRoot = path.join(root, "TRR");

    const data = await getDevDashboardSkillsAgentsData({ homeDir, workspaceRoot });

    expect(data.skills.every((group) => group.items.length === 0)).toBe(true);
    expect(data.agents.codexProjectAgents).toEqual([]);
    expect(data.agents.skillAgentInterfaces).toEqual([]);
    expect(data.agents.claudeUserPlugins).toEqual([]);
    expect(data.warnings).toContain(`Codex config not found: ${path.join(workspaceRoot, ".codex", "config.toml")}`);
  });
});

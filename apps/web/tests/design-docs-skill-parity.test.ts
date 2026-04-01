import { access, readFile, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const workspaceRoot = resolve("/Users/thomashulihan/Projects/TRR");
const skillRoot = resolve(workspaceRoot, ".agents/skills/design-docs-agent");
const skillAliasRoot = resolve(workspaceRoot, ".agents/skills");
const yamlPath = resolve(skillRoot, "agents/openai.yaml");
const skillDocPath = resolve(skillRoot, "SKILL.md");
const entrySkillPath = resolve(skillRoot, "skills/design-docs/SKILL.md");
const codexAdapterPath = resolve(skillRoot, "adapters/codex.md");
const claudeAdapterPath = resolve(skillRoot, "adapters/claude.md");
const claudePluginPath = resolve(skillRoot, ".claude-plugin/plugin.json");
const codexPluginPath = resolve(skillRoot, ".codex-plugin/plugin.json");
const localCodexWrapperPath = resolve(
  "/Users/thomashulihan/.codex/plugins/cache/local-plugins/design-docs-agent/local/skills/design-docs-agent/SKILL.md",
);
const localCodexPluginPath = resolve(
  "/Users/thomashulihan/.codex/plugins/cache/local-plugins/design-docs-agent/local/.codex-plugin/plugin.json",
);
const referencesRoot = resolve(skillRoot, "references");
const scriptsDir = resolve("/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web/scripts/design-docs");

type ParsedSkillEntry = {
  section: "supporting" | "owned";
  skill: string;
  status: string;
};

function parseSkillsetYaml(content: string): ParsedSkillEntry[] {
  const entries: ParsedSkillEntry[] = [];
  const lines = content.split(/\r?\n/);
  let section: ParsedSkillEntry["section"] | null = null;
  let current: ParsedSkillEntry | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "supporting:") {
      section = "supporting";
      continue;
    }
    if (line.trim() === "owned:") {
      section = "owned";
      continue;
    }

    const skillMatch = line.match(/^\s*-\s*skill:\s*([A-Za-z0-9-]+)/);
    if (skillMatch && section) {
      current = {
        section,
        skill: skillMatch[1],
        status: "unknown",
      };
      entries.push(current);
      continue;
    }

    const statusMatch = line.match(/^\s*status:\s*(active|pending|retain)/);
    if (statusMatch && current) {
      current.status = statusMatch[1];
    }
  }

  return entries;
}

function parseSkillDocRoster(content: string) {
  return Array.from(content.matchAll(/\|\s*\d+\s*\|\s*`([^`]+)`\s*\|/g), (match) => match[1]);
}

function parseInterfaceShortDescription(content: string) {
  const match = content.match(/short_description:\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

describe("design-docs-agent skill parity", () => {
  it("keeps YAML, manifests, adapters, entry wrapper, references, and validators in sync", async () => {
    const [
      yamlContent,
      skillDoc,
      entrySkill,
      codexAdapter,
      claudeAdapter,
      claudePluginContent,
      codexPluginContent,
      localCodexWrapper,
      localCodexPluginContent,
    ] = await Promise.all([
      readFile(yamlPath, "utf8"),
      readFile(skillDocPath, "utf8"),
      readFile(entrySkillPath, "utf8"),
      readFile(codexAdapterPath, "utf8"),
      readFile(claudeAdapterPath, "utf8"),
      readFile(claudePluginPath, "utf8"),
      readFile(codexPluginPath, "utf8"),
      readFile(localCodexWrapperPath, "utf8"),
      readFile(localCodexPluginPath, "utf8"),
    ]);

    const entries = parseSkillsetYaml(yamlContent);
    const docSkills = parseSkillDocRoster(skillDoc);
    const interfaceShortDescription = parseInterfaceShortDescription(yamlContent);
    const claudePlugin = JSON.parse(claudePluginContent) as {
      name: string;
      version?: string;
      description?: string;
      skills?: string;
    };
    const codexPlugin = JSON.parse(codexPluginContent) as {
      name: string;
      version?: string;
      description?: string;
      skills?: string;
      interface?: {
        shortDescription?: string;
        longDescription?: string;
      };
    };
    const localCodexPlugin = JSON.parse(localCodexPluginContent) as {
      name: string;
      description?: string;
      interface?: {
        shortDescription?: string;
        longDescription?: string;
      };
    };

    expect(entries).toHaveLength(21);
    expect(entries.every((entry) => entry.status === "active")).toBe(true);
    expect(docSkills).toHaveLength(21);
    expect(docSkills).toEqual(entries.map((entry) => entry.skill));

    expect(skillDoc).toContain("## Ownership Matrix");
    expect(skillDoc).toContain("`agents/openai.yaml`");
    expect(skillDoc).toContain("`skills/design-docs/SKILL.md`");
    expect(skillDoc).toContain("`references/`");

    expect(entrySkill).toContain("User entry wrapper");
    expect(entrySkill).toContain("Load the canonical orchestrator");
    expect(entrySkill).not.toContain("## MANDATORY Rules");
    expect(entrySkill).toContain("source bundle");

    expect(codexAdapter).toContain("package `SKILL.md`");
    expect(claudeAdapter).toContain("package `SKILL.md`");
    expect(codexAdapter).toContain("agents/openai.yaml");
    expect(claudeAdapter).toContain("agents/openai.yaml");
    expect(codexAdapter).not.toContain("All 20 skills");
    expect(claudeAdapter).not.toContain("All 20 skills");

    expect(interfaceShortDescription).toBeTruthy();
    expect(claudePlugin.name).toBe("design-docs-agent");
    expect(codexPlugin.name).toBe("design-docs-agent");
    expect(codexPlugin.version).toBe(claudePlugin.version);
    expect(codexPlugin.description).toBe(claudePlugin.description);
    expect(codexPlugin.description).toBe(interfaceShortDescription);
    expect(codexPlugin.skills).toBe("./");
    expect(claudePlugin.skills).toBe("./");
    expect(codexPlugin.interface?.shortDescription).toBe(interfaceShortDescription);
    expect(codexPlugin.interface?.longDescription).toContain("agents/openai.yaml");
    expect(codexPlugin.interface?.longDescription).toContain("package SKILL.md");
    expect(localCodexPlugin.name).toBe("design-docs-agent");
    expect(localCodexWrapper).toContain("/Users/thomashulihan/Projects/TRR/.agents/skills/design-docs-agent/SKILL.md");
    expect(localCodexWrapper).not.toContain("/Users/thomashulihan/Projects/TRR/TRR-APP/.agents/skills/design-docs-agent/SKILL.md");
    expect(localCodexWrapper).toContain("sourceBundle");
    expect(localCodexPlugin.interface?.shortDescription).toContain("saved source bundles");

    for (const referenceName of [
      "README.md",
      "taxonomy.md",
      "rendering-contracts.md",
      "component-inventory-provenance.md",
      "reference-implementations.md",
      "lessons-learned.md",
      "preflight-checklist.md",
      "source-html-modes.md",
    ]) {
      await expect(access(resolve(referencesRoot, referenceName), constants.F_OK)).resolves.toBeUndefined();
    }

    for (const entry of entries.filter((item) => item.section === "owned")) {
      await expect(access(resolve(skillRoot, entry.skill, "SKILL.md"), constants.F_OK)).resolves.toBeUndefined();
      await expect(access(resolve(skillAliasRoot, `design-docs-${entry.skill}`, "SKILL.md"), constants.F_OK)).resolves.toBeUndefined();
      await expect(realpath(resolve(skillAliasRoot, `design-docs-${entry.skill}`))).resolves.toBe(
        resolve(skillRoot, entry.skill),
      );
    }

    await expect(access(resolve(skillAliasRoot, "design-docs", "SKILL.md"), constants.F_OK)).resolves.toBeUndefined();
    await expect(realpath(resolve(skillAliasRoot, "design-docs"))).resolves.toBe(
      resolve(skillRoot, "skills/design-docs"),
    );

    for (const scriptName of [
      "classify-publisher-patterns.mjs",
      "extract-navigation.mjs",
      "validate-config-integrity.mjs",
      "run-accessibility-audit.mjs",
      "run-integration-checks.mjs",
    ]) {
      await expect(access(resolve(scriptsDir, scriptName), constants.F_OK)).resolves.toBeUndefined();
    }
  });

  it("keeps owned skill contracts structurally consistent and long-form guidance out of executable skill files", async () => {
    const yamlContent = await readFile(yamlPath, "utf8");
    const entries = parseSkillsetYaml(yamlContent).filter((entry) => entry.section === "owned");
    const requiredHeadings = [
      "## Purpose",
      "## Use When",
      "## Do Not Use For",
      "## Inputs",
      "## Outputs",
      "## Procedure",
      "## Validation",
      "## Stop And Escalate If",
      "## Completion Contract",
    ];
    const bannedHeadings = [
      "## Lessons Learned",
      "## Reference Implementations",
      "## Common Issues",
      "## Step 7: Pre-flight Checklist",
      "## MANDATORY Rules",
    ];

    for (const entry of entries) {
      const content = await readFile(resolve(skillRoot, entry.skill, "SKILL.md"), "utf8");

      for (const heading of requiredHeadings) {
        expect(content).toContain(heading);
      }

      for (const heading of bannedHeadings) {
        expect(content).not.toContain(heading);
      }
    }
  });
});

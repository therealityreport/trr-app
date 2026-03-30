import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const skillRoot = resolve("/Users/thomashulihan/Projects/TRR/TRR-APP/.agents/skills/design-docs-agent");
const yamlPath = resolve(skillRoot, "agents/openai.yaml");
const skillDocPath = resolve(skillRoot, "SKILL.md");
const codexAdapterPath = resolve(skillRoot, "adapters/codex.md");
const claudeAdapterPath = resolve(skillRoot, "adapters/claude.md");
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

describe("design-docs-agent skill parity", () => {
  it("keeps YAML, canonical docs, adapters, and executable validators in sync", async () => {
    const [yamlContent, skillDoc, codexAdapter, claudeAdapter] = await Promise.all([
      readFile(yamlPath, "utf8"),
      readFile(skillDocPath, "utf8"),
      readFile(codexAdapterPath, "utf8"),
      readFile(claudeAdapterPath, "utf8"),
    ]);

    const entries = parseSkillsetYaml(yamlContent);
    const docSkills = parseSkillDocRoster(skillDoc);

    expect(entries).toHaveLength(20);
    expect(entries.every((entry) => entry.status === "active")).toBe(true);
    expect(docSkills).toHaveLength(20);
    expect(docSkills).toEqual(entries.map((entry) => entry.skill));

    expect(codexAdapter).toContain("All 20 skills");
    expect(claudeAdapter).toContain("All 20 skills");
    expect(codexAdapter).toContain("agents/openai.yaml");
    expect(claudeAdapter).toContain("agents/openai.yaml");

    for (const entry of entries.filter((item) => item.section === "owned")) {
      await expect(
        access(resolve(skillRoot, entry.skill, "SKILL.md"), constants.F_OK),
      ).resolves.toBeUndefined();
    }

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
});

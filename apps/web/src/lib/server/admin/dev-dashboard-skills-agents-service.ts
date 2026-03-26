import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import os from "node:os";
import type {
  AgentToolDependency,
  ClaudeUserPluginItem,
  CodexProjectAgentItem,
  SkillAgentInterfaceItem,
  SkillInventoryGroup,
  SkillInventoryItem,
  SkillsAgentsDashboardData,
} from "@/lib/admin/dev-dashboard-skills-agents";

const DEFAULT_WORKSPACE_ROOT = "/Users/thomashulihan/Projects/TRR";
const NO_EXPLICIT_SKILL_MAPPING = "No explicit skill mapping";

interface InventoryRoots {
  homeDir?: string;
  workspaceRoot?: string;
}

interface SkillGroupConfig {
  key: string;
  label: string;
  repoLabel: string | null;
  roots: string[];
}

interface ParsedSkillFile {
  name: string;
  description: string;
}

interface ClaudePluginsManifest {
  version?: number;
  plugins?: Record<
    string,
    Array<{
      scope?: string;
      installPath?: string;
      version?: string;
      installedAt?: string;
      lastUpdated?: string;
    }>
  >;
}

interface InventoryContext {
  homeDir: string;
  workspaceRoot: string;
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

async function listFilesRecursive(root: string, targetFileName: string): Promise<string[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(root, entry.name);
        if (entry.isDirectory()) {
          return listFilesRecursive(fullPath, targetFileName);
        }
        if (entry.isFile() && entry.name === targetFileName) {
          return [fullPath];
        }
        return [];
      }),
    );
    return files.flat();
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }
}

async function readUtf8IfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

function normalizeDescription(body: string): string {
  const paragraphs = body
    .split(/\n\s*\n/g)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean);

  const candidate = paragraphs.find((paragraph) => {
    if (paragraph.startsWith("#")) return false;
    if (paragraph.startsWith("```")) return false;
    if (paragraph.startsWith("- ")) return false;
    if (/^\d+\.\s/.test(paragraph)) return false;
    return true;
  });

  return candidate ?? "No description available.";
}

function unquoteString(rawValue: string): string {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseSimpleFrontmatter(frontmatter: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of frontmatter.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;
    result[key] = unquoteString(value);
  }

  return result;
}

function stripTomlComment(rawLine: string): string {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < rawLine.length; index += 1) {
    const char = rawLine[index];
    if (char === '"' && !inSingleQuote && rawLine[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (char === "'" && !inDoubleQuote && rawLine[index - 1] !== "\\") {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === "#" && !inSingleQuote && !inDoubleQuote) {
      return rawLine.slice(0, index);
    }
  }

  return rawLine;
}

function parseTomlValue(rawValue: string): unknown {
  const value = rawValue.trim();
  if (!value) return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return unquoteString(value);
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((item) => unquoteString(item.trim()))
      .filter((item) => item.length > 0);
  }
  if (value.startsWith("{") && value.endsWith("}")) {
    return value;
  }
  const numeric = Number(value);
  if (!Number.isNaN(numeric)) return numeric;
  return value;
}

function setNestedValue(target: Record<string, unknown>, pathParts: string[], key: string, value: unknown) {
  let cursor = target;

  for (const part of pathParts) {
    const existing = cursor[part];
    if (!isRecord(existing)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  cursor[key] = value;
}

function parseTomlDocument(contents: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentPath: string[] = [];
  let multilineKey: string | null = null;
  let multilineBuffer: string[] = [];

  for (const rawLine of contents.split("\n")) {
    if (multilineKey) {
      const closingIndex = rawLine.indexOf('"""');
      if (closingIndex !== -1) {
        multilineBuffer.push(rawLine.slice(0, closingIndex));
        setNestedValue(result, currentPath, multilineKey, multilineBuffer.join("\n"));
        multilineKey = null;
        multilineBuffer = [];
      } else {
        multilineBuffer.push(rawLine);
      }
      continue;
    }

    const line = stripTomlComment(rawLine).trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentPath = sectionMatch[1]
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
      continue;
    }

    const assignmentMatch = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!assignmentMatch) continue;

    const [, key, rawValue] = assignmentMatch;
    const value = rawValue.trim();

    if (value.startsWith('"""')) {
      const remainder = value.slice(3);
      const closingIndex = remainder.indexOf('"""');
      if (closingIndex !== -1) {
        setNestedValue(result, currentPath, key, remainder.slice(0, closingIndex));
      } else {
        multilineKey = key;
        multilineBuffer = [remainder];
      }
      continue;
    }

    setNestedValue(result, currentPath, key, parseTomlValue(value));
  }

  return result;
}

function parseOpenAiYaml(contents: string): {
  interfaceData: Record<string, string>;
  toolDependencies: AgentToolDependency[];
} {
  const interfaceData: Record<string, string> = {};
  const toolDependencies: AgentToolDependency[] = [];
  let section: "interface" | "dependencies" | null = null;
  let inTools = false;
  let currentTool: Record<string, string> | null = null;

  const commitCurrentTool = () => {
    if (!currentTool) return;
    const type = currentTool.type?.trim() ?? "";
    const value = currentTool.value?.trim() ?? "";
    if (type || value) {
      toolDependencies.push({
        label: [type, value].filter(Boolean).join(": "),
        description: currentTool.description?.trim() || null,
      });
    }
    currentTool = null;
  };

  for (const rawLine of contents.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (!rawLine.startsWith(" ")) {
      commitCurrentTool();
      inTools = false;
      if (trimmed === "interface:") {
        section = "interface";
        continue;
      }
      if (trimmed === "dependencies:") {
        section = "dependencies";
        continue;
      }
      section = null;
      continue;
    }

    if (section === "interface") {
      const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
      if (!match) continue;
      interfaceData[match[1]] = unquoteString(match[2]);
      continue;
    }

    if (section === "dependencies") {
      if (trimmed === "tools:") {
        inTools = true;
        continue;
      }
      if (!inTools) continue;

      const toolStartMatch = trimmed.match(/^-\s+([A-Za-z0-9_-]+):\s*(.+)$/);
      if (toolStartMatch) {
        commitCurrentTool();
        currentTool = {
          [toolStartMatch[1]]: unquoteString(toolStartMatch[2]),
        };
        continue;
      }

      const toolFieldMatch = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.+)$/);
      if (toolFieldMatch && currentTool) {
        currentTool[toolFieldMatch[1]] = unquoteString(toolFieldMatch[2]);
      }
    }
  }

  commitCurrentTool();

  return { interfaceData, toolDependencies };
}

function parseSkillFile(contents: string, fallbackName: string): ParsedSkillFile {
  let body = contents;
  let metadata: Record<string, string> = {};

  if (contents.startsWith("---\n")) {
    const frontmatterEnd = contents.indexOf("\n---\n", 4);
    if (frontmatterEnd !== -1) {
      const frontmatter = contents.slice(4, frontmatterEnd);
      body = contents.slice(frontmatterEnd + 5);
      metadata = parseSimpleFrontmatter(frontmatter);
    }
  }

  const parsedName =
    typeof metadata.name === "string" && metadata.name.trim().length > 0
      ? metadata.name.trim()
      : fallbackName;
  const parsedDescription =
    typeof metadata.description === "string" && metadata.description.trim().length > 0
      ? metadata.description.trim()
      : normalizeDescription(body);

  return {
    name: parsedName,
    description: parsedDescription,
  };
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.name.localeCompare(right.name));
}

function sortByDisplayName<T extends { displayName: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function formatDisplayPath(fullPath: string, homeDir: string, workspaceRoot: string): string {
  if (fullPath.startsWith(`${homeDir}/`)) {
    return `~/${relative(homeDir, fullPath)}`;
  }
  if (fullPath === homeDir) return "~";
  if (fullPath.startsWith(`${workspaceRoot}/`)) {
    return `TRR/${relative(workspaceRoot, fullPath)}`;
  }
  if (fullPath === workspaceRoot) return "TRR";
  return fullPath;
}

async function buildSkillGroup(
  config: SkillGroupConfig,
  homeDir: string,
  workspaceRoot: string,
): Promise<SkillInventoryGroup> {
  const skillFiles = (
    await Promise.all(config.roots.map((root) => listFilesRecursive(root, "SKILL.md")))
  ).flat();

  const items = await Promise.all(
    skillFiles.map(async (skillFile): Promise<SkillInventoryItem> => {
      const contents = await readFile(skillFile, "utf8");
      const fallbackName = basename(resolve(skillFile, ".."));
      const parsed = parseSkillFile(contents, fallbackName);
      const interfacePath = join(resolve(skillFile, ".."), "agents", "openai.yaml");
      const interfaceContents = await readUtf8IfExists(interfacePath);

      return {
        id: formatDisplayPath(skillFile, homeDir, workspaceRoot),
        name: parsed.name,
        description: parsed.description,
        sourceLabel: config.label,
        repoLabel: config.repoLabel,
        path: formatDisplayPath(skillFile, homeDir, workspaceRoot),
        hasAgentInterface: interfaceContents !== null,
        agentInterfacePath: interfaceContents ? formatDisplayPath(interfacePath, homeDir, workspaceRoot) : null,
      };
    }),
  );

  return {
    key: config.key,
    label: config.label,
    repoLabel: config.repoLabel,
    items: sortByName(items),
  };
}

async function collectSkillAgentInterfaces(
  roots: string[],
  context: InventoryContext,
): Promise<SkillAgentInterfaceItem[]> {
  const interfaceFiles = (await Promise.all(roots.map((root) => listFilesRecursive(root, "openai.yaml")))).flat();

  const interfaces = await Promise.all(
    interfaceFiles.map(async (interfaceFile) => {
      const contents = await readFile(interfaceFile, "utf8");
      const parsed = parseOpenAiYaml(contents);
      const interfaceData = parsed.interfaceData;

      const skillDir = resolve(interfaceFile, "..", "..");
      const skillFile = join(skillDir, "SKILL.md");
      const skillFileContents = await readUtf8IfExists(skillFile);
      if (!skillFileContents) {
        context.warnings.push(`Skipped agent interface without adjacent SKILL.md: ${interfaceFile}`);
        return null;
      }
      const fallbackSkillName = basename(skillDir);
      const parsedSkill = parseSkillFile(skillFileContents, fallbackSkillName);

      const displayName =
        typeof interfaceData.display_name === "string" && interfaceData.display_name.trim().length > 0
          ? interfaceData.display_name.trim()
          : parsedSkill.name;
      const shortDescription =
        typeof interfaceData.short_description === "string" && interfaceData.short_description.trim().length > 0
          ? interfaceData.short_description.trim()
          : parsedSkill.description;
      const defaultPrompt =
        typeof interfaceData.default_prompt === "string" && interfaceData.default_prompt.trim().length > 0
          ? interfaceData.default_prompt.trim()
          : null;
      const repoLabel = (() => {
        if (skillFile.startsWith(`${context.workspaceRoot}/TRR-APP/`)) return "TRR-APP";
        if (skillFile.startsWith(`${context.workspaceRoot}/TRR-Backend/`)) return "TRR-Backend";
        if (skillFile.startsWith(`${context.workspaceRoot}/screenalytics/`)) return "screenalytics";
        return null;
      })();

      return {
        id: formatDisplayPath(interfaceFile, context.homeDir, context.workspaceRoot),
        displayName,
        shortDescription,
        defaultPrompt,
        sourceLabel: repoLabel ? `${repoLabel} Repo Agent Interfaces` : "Workspace Shared Agent Interfaces",
        repoLabel,
        owningSkillName: parsedSkill.name,
        owningSkillPath: formatDisplayPath(skillFile, context.homeDir, context.workspaceRoot),
        interfacePath: formatDisplayPath(interfaceFile, context.homeDir, context.workspaceRoot),
        toolDependencies: parsed.toolDependencies,
      } satisfies SkillAgentInterfaceItem;
    }),
  );

  return sortByDisplayName(
    interfaces.filter((item): item is SkillAgentInterfaceItem => item !== null),
  );
}

async function collectCodexProjectAgents(
  context: InventoryContext,
): Promise<CodexProjectAgentItem[]> {
  const configPath = join(context.workspaceRoot, ".codex", "config.toml");
  const configContents = await readUtf8IfExists(configPath);
  if (!configContents) {
    context.warnings.push(`Codex config not found: ${configPath}`);
    return [];
  }
  const parsedConfig = parseTomlDocument(configContents);
  const agentsSection = isRecord(parsedConfig.agents) ? parsedConfig.agents : {};

  const items = await Promise.all(
    Object.entries(agentsSection)
      .filter(([, value]) => isRecord(value))
      .map(async ([key, value]) => {
        const configFile =
          typeof value.config_file === "string" && value.config_file.trim().length > 0
            ? value.config_file.trim()
            : null;
        const configFilePath = configFile ? resolve(context.workspaceRoot, ".codex", configFile) : null;
        const configFileContents = configFilePath ? await readUtf8IfExists(configFilePath) : null;
        const parsedAgentConfig = configFileContents ? parseTomlDocument(configFileContents) : {};
        if (configFilePath && !configFileContents) {
          context.warnings.push(`Codex agent config not found: ${configFilePath}`);
        }
        const mcpServers = isRecord(parsedAgentConfig.mcp_servers)
          ? Object.keys(parsedAgentConfig.mcp_servers)
          : [];
        const nicknameCandidates = Array.isArray(parsedAgentConfig.nickname_candidates)
          ? parsedAgentConfig.nickname_candidates.filter((candidate): candidate is string => typeof candidate === "string")
          : [];

        return {
          key,
          description:
            (typeof value.description === "string" && value.description.trim().length > 0
              ? value.description.trim()
              : typeof parsedAgentConfig.description === "string" && parsedAgentConfig.description.trim().length > 0
                ? parsedAgentConfig.description.trim()
                : "No description available."),
          configFile: configFilePath
            ? formatDisplayPath(configFilePath, context.homeDir, context.workspaceRoot)
            : "No config file declared",
          model:
            typeof parsedAgentConfig.model === "string" && parsedAgentConfig.model.trim().length > 0
              ? parsedAgentConfig.model.trim()
              : null,
          reasoningEffort:
            typeof parsedAgentConfig.model_reasoning_effort === "string" &&
            parsedAgentConfig.model_reasoning_effort.trim().length > 0
              ? parsedAgentConfig.model_reasoning_effort.trim()
              : null,
          mcpServers: mcpServers.sort((left, right) => left.localeCompare(right)),
          nicknameCandidates,
          skillsLabel: NO_EXPLICIT_SKILL_MAPPING,
        } satisfies CodexProjectAgentItem;
      }),
  );

  return [...items].sort((left, right) => left.key.localeCompare(right.key));
}

async function collectClaudeUserPlugins(
  context: InventoryContext,
): Promise<ClaudeUserPluginItem[]> {
  const pluginsFile = join(context.homeDir, ".claude", "plugins", "installed_plugins.json");
  try {
    const contents = await readFile(pluginsFile, "utf8");
    const parsed = JSON.parse(contents) as ClaudePluginsManifest;
    const items = Object.entries(parsed.plugins ?? {}).flatMap(([id, installs]) =>
      installs.map((install) => {
        const separatorIndex = id.lastIndexOf("@");
        const pluginId = separatorIndex === -1 ? id : id.slice(0, separatorIndex);
        const marketplace = separatorIndex === -1 ? "unknown" : id.slice(separatorIndex + 1);
        return {
          id: `${id}:${install.installPath ?? "unknown"}`,
          pluginId,
          marketplace,
          version: install.version ?? null,
          scope: install.scope ?? null,
          installPath: install.installPath
            ? formatDisplayPath(install.installPath, context.homeDir, context.workspaceRoot)
            : "Unknown install path",
          installedAt: install.installedAt ?? null,
          lastUpdated: install.lastUpdated ?? null,
        } satisfies ClaudeUserPluginItem;
      }),
    );

    return items.sort((left, right) => left.id.localeCompare(right.id));
  } catch (error) {
    if (isNotFoundError(error)) return [];
    throw error;
  }
}

export async function getDevDashboardSkillsAgentsData(
  options: InventoryRoots = {},
): Promise<SkillsAgentsDashboardData> {
  const context: InventoryContext = {
    homeDir: options.homeDir ?? os.homedir(),
    workspaceRoot: options.workspaceRoot ?? DEFAULT_WORKSPACE_ROOT,
    warnings: [],
  };

  const skillGroupsConfig: SkillGroupConfig[] = [
    {
      key: "codex-system",
      label: "Codex System",
      repoLabel: null,
      roots: [join(context.homeDir, ".codex", "skills", ".system")],
    },
    {
      key: "codex-user",
      label: "Codex User",
      repoLabel: null,
      roots: [join(context.homeDir, ".codex", "skills")],
    },
    {
      key: "workspace-shared",
      label: "Workspace Shared",
      repoLabel: null,
      roots: [join(context.workspaceRoot, ".agents", "skills")],
    },
    {
      key: "workspace-codex-project",
      label: "Workspace Codex Project",
      repoLabel: null,
      roots: [join(context.workspaceRoot, ".codex", "skills")],
    },
    {
      key: "workspace-claude-project",
      label: "Workspace Claude Project",
      repoLabel: null,
      roots: [join(context.workspaceRoot, ".claude", "skills")],
    },
    {
      key: "trr-app-repo",
      label: "TRR-APP Repo",
      repoLabel: "TRR-APP",
      roots: [
        join(context.workspaceRoot, "TRR-APP", ".agents", "skills"),
        join(context.workspaceRoot, "TRR-APP", ".claude", "skills"),
      ],
    },
    {
      key: "trr-backend-repo",
      label: "TRR-Backend Repo",
      repoLabel: "TRR-Backend",
      roots: [join(context.workspaceRoot, "TRR-Backend", ".agents", "skills")],
    },
    {
      key: "screenalytics-repo",
      label: "screenalytics Repo",
      repoLabel: "screenalytics",
      roots: [join(context.workspaceRoot, "screenalytics", ".claude", "skills")],
    },
    {
      key: "claude-user",
      label: "Claude User",
      repoLabel: null,
      roots: [join(context.homeDir, ".claude", "skills")],
    },
  ];

  const skillGroups = await Promise.all(
    skillGroupsConfig.map(async (config) => {
      const group = await buildSkillGroup(config, context.homeDir, context.workspaceRoot);
      if (config.key === "codex-user") {
        group.items = group.items.filter((item) => !item.path.startsWith("~/.codex/skills/.system/"));
      }
      return group;
    }),
  );

  const skillAgentInterfaces = await collectSkillAgentInterfaces(
    [
      join(context.workspaceRoot, ".agents", "skills"),
      join(context.workspaceRoot, "TRR-APP", ".agents", "skills"),
      join(context.workspaceRoot, "TRR-Backend", ".agents", "skills"),
    ],
    context,
  );

  return {
    skills: skillGroups,
    agents: {
      codexProjectAgents: await collectCodexProjectAgents(context),
      skillAgentInterfaces,
      claudeUserPlugins: await collectClaudeUserPlugins(context),
    },
    generatedAt: new Date().toISOString(),
    warnings: [...new Set(context.warnings)],
  };
}

export interface SkillInventoryItem {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  repoLabel: string | null;
  path: string;
  hasAgentInterface: boolean;
  agentInterfacePath: string | null;
}

export interface SkillInventoryGroup {
  key: string;
  label: string;
  repoLabel: string | null;
  items: SkillInventoryItem[];
}

export interface CodexProjectAgentItem {
  key: string;
  description: string;
  configFile: string;
  model: string | null;
  reasoningEffort: string | null;
  mcpServers: string[];
  nicknameCandidates: string[];
  skillsLabel: string;
}

export interface AgentToolDependency {
  label: string;
  description: string | null;
}

export interface SkillAgentInterfaceItem {
  id: string;
  displayName: string;
  shortDescription: string;
  defaultPrompt: string | null;
  sourceLabel: string;
  repoLabel: string | null;
  owningSkillName: string;
  owningSkillPath: string;
  interfacePath: string;
  toolDependencies: AgentToolDependency[];
}

export interface ClaudeUserPluginItem {
  id: string;
  pluginId: string;
  marketplace: string;
  version: string | null;
  scope: string | null;
  installPath: string;
  installedAt: string | null;
  lastUpdated: string | null;
}

export interface SkillsAgentsDashboardData {
  skills: SkillInventoryGroup[];
  agents: {
    codexProjectAgents: CodexProjectAgentItem[];
    skillAgentInterfaces: SkillAgentInterfaceItem[];
    claudeUserPlugins: ClaudeUserPluginItem[];
  };
  generatedAt: string;
  warnings: string[];
}

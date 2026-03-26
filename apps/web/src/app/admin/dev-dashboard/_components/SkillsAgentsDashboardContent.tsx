"use client";

import { useMemo, useState } from "react";
import type {
  ClaudeUserPluginItem,
  CodexProjectAgentItem,
  SkillAgentInterfaceItem,
  SkillInventoryGroup,
  SkillsAgentsDashboardData,
} from "@/lib/admin/dev-dashboard-skills-agents";

type SkillsAgentsTabId = "skills" | "agents";

const INTERNAL_TABS: Array<{ id: SkillsAgentsTabId; label: string }> = [
  { id: "skills", label: "Skills" },
  { id: "agents", label: "Agents" },
];

function formatTimestamp(value: string | null): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function InternalTabs({
  activeTab,
  onSelect,
}: {
  activeTab: SkillsAgentsTabId;
  onSelect: (tab: SkillsAgentsTabId) => void;
}) {
  return (
    <div className="mb-6" role="tablist" aria-label="Skills and agents tabs">
      <div className="inline-flex rounded-full border border-zinc-200 bg-white p-1 shadow-sm">
        {INTERNAL_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(tab.id)}
              className={
                isActive
                  ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-full px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100"
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  count,
  description,
}: {
  title: string;
  count: number;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">{count}</span>
    </div>
  );
}

function SkillGroupSection({ group }: { group: SkillInventoryGroup }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <SectionHeader
        title={group.label}
        count={group.items.length}
        description={group.repoLabel ? `Repo: ${group.repoLabel}` : undefined}
      />
      {group.items.length === 0 ? (
        <p className="text-sm italic text-zinc-500">No skills found for this source.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {group.items.map((item) => (
            <article key={item.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">{item.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{item.description}</p>
                </div>
                {item.hasAgentInterface ? (
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                    Agent Interface
                  </span>
                ) : null}
              </div>
              <dl className="mt-4 space-y-2 text-sm text-zinc-600">
                <div>
                  <dt className="font-semibold text-zinc-900">Source</dt>
                  <dd>{item.sourceLabel}</dd>
                </div>
                {item.repoLabel ? (
                  <div>
                    <dt className="font-semibold text-zinc-900">Repo</dt>
                    <dd>{item.repoLabel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-semibold text-zinc-900">Path</dt>
                  <dd className="break-all font-mono text-xs">{item.path}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-zinc-900">Interface</dt>
                  <dd className="break-all">
                    {item.agentInterfacePath ? (
                      <span className="font-mono text-xs">{item.agentInterfacePath}</span>
                    ) : (
                      "No agent interface"
                    )}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CodexAgentCard({ agent }: { agent: CodexProjectAgentItem }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{agent.key}</h3>
          <p className="mt-1 text-sm text-zinc-600">{agent.description}</p>
        </div>
        <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700">
          Codex
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm text-zinc-600">
        <div>
          <dt className="font-semibold text-zinc-900">Config file</dt>
          <dd className="break-all font-mono text-xs">{agent.configFile}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Model</dt>
          <dd>{agent.model ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Reasoning effort</dt>
          <dd>{agent.reasoningEffort ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">MCP servers</dt>
          <dd>{agent.mcpServers.length > 0 ? agent.mcpServers.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Nickname candidates</dt>
          <dd>{agent.nicknameCandidates.length > 0 ? agent.nicknameCandidates.join(", ") : "None"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Skills</dt>
          <dd>{agent.skillsLabel}</dd>
        </div>
      </dl>
    </article>
  );
}

function SkillAgentInterfaceCard({ agent }: { agent: SkillAgentInterfaceItem }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{agent.displayName}</h3>
          <p className="mt-1 text-sm text-zinc-600">{agent.shortDescription}</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
          Interface
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm text-zinc-600">
        <div>
          <dt className="font-semibold text-zinc-900">Owning skill</dt>
          <dd>{agent.owningSkillName}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Owning path</dt>
          <dd className="break-all font-mono text-xs">{agent.owningSkillPath}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Interface path</dt>
          <dd className="break-all font-mono text-xs">{agent.interfacePath}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Source</dt>
          <dd>{agent.repoLabel ? `${agent.repoLabel} Repo` : "Workspace Shared"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Default prompt</dt>
          <dd>{agent.defaultPrompt ?? "No default prompt declared"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Tool dependencies</dt>
          <dd>
            {agent.toolDependencies.length > 0
              ? agent.toolDependencies
                  .map((dependency) =>
                    dependency.description ? `${dependency.label} (${dependency.description})` : dependency.label,
                  )
                  .join(", ")
              : "None declared"}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function ClaudePluginCard({ plugin }: { plugin: ClaudeUserPluginItem }) {
  return (
    <article className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{plugin.pluginId}</h3>
          <p className="mt-1 text-sm text-zinc-600">Marketplace: {plugin.marketplace}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
          Plugin
        </span>
      </div>
      <dl className="mt-4 space-y-2 text-sm text-zinc-600">
        <div>
          <dt className="font-semibold text-zinc-900">Version</dt>
          <dd>{plugin.version ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Scope</dt>
          <dd>{plugin.scope ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Install path</dt>
          <dd className="break-all font-mono text-xs">{plugin.installPath}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Installed</dt>
          <dd>{formatTimestamp(plugin.installedAt)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-900">Updated</dt>
          <dd>{formatTimestamp(plugin.lastUpdated)}</dd>
        </div>
      </dl>
    </article>
  );
}

function AgentSections({ data }: { data: SkillsAgentsDashboardData }) {
  const sections = useMemo(
    () => [
      {
        key: "codex-project-agents",
        title: "Codex Project Agents",
        description: "TRR workspace agents declared in .codex/config.toml and .codex/agents/*.toml.",
        count: data.agents.codexProjectAgents.length,
        content:
          data.agents.codexProjectAgents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.agents.codexProjectAgents.map((agent) => (
                <CodexAgentCard key={agent.key} agent={agent} />
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-zinc-500">No Codex project agents found.</p>
          ),
      },
      {
        key: "skill-agent-interfaces",
        title: "Workspace/Repo Agent Interfaces",
        description: "Agent interfaces declared beside workspace and repo-local skills.",
        count: data.agents.skillAgentInterfaces.length,
        content:
          data.agents.skillAgentInterfaces.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.agents.skillAgentInterfaces.map((agent) => (
                <SkillAgentInterfaceCard key={agent.id} agent={agent} />
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-zinc-500">No workspace or repo agent interfaces found.</p>
          ),
      },
      {
        key: "claude-user-plugins",
        title: "Claude User Plugins",
        description: "Installed Claude plugins from the local user profile.",
        count: data.agents.claudeUserPlugins.length,
        content:
          data.agents.claudeUserPlugins.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.agents.claudeUserPlugins.map((plugin) => (
                <ClaudePluginCard key={plugin.id} plugin={plugin} />
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-zinc-500">No Claude user plugins found.</p>
          ),
      },
    ],
    [data],
  );

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.key} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <SectionHeader title={section.title} count={section.count} description={section.description} />
          {section.content}
        </section>
      ))}
    </div>
  );
}

export function SkillsAgentsDashboardContent({ data }: { data: SkillsAgentsDashboardData }) {
  const [activeTab, setActiveTab] = useState<SkillsAgentsTabId>("skills");

  return (
    <div>
      <InternalTabs activeTab={activeTab} onSelect={setActiveTab} />

      {data.warnings.length > 0 ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Warnings</p>
          <ul className="mt-2 space-y-1">
            {data.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeTab === "skills" ? (
        <div className="space-y-6">
          {data.skills.map((group) => (
            <SkillGroupSection key={group.key} group={group} />
          ))}
        </div>
      ) : (
        <AgentSections data={data} />
      )}
    </div>
  );
}

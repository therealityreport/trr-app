import { GENERATED_ADMIN_API_REFERENCE_INVENTORY } from "@/lib/admin/api-references/generated/inventory";
import type {
  AdminApiReferenceEdge,
  AdminApiReferenceInventory,
  AdminApiReferenceNode,
  AdminApiReferenceNodeKind,
} from "@/lib/admin/api-references/types";

const FALLBACK_WORKSPACE_ROOT = "/Users/thomashulihan/Projects/TRR/TRR-APP/apps/web";
const WORKSPACE_ROOT = process.env.NEXT_PUBLIC_TRR_APP_WORKSPACE_ROOT?.trim() || FALLBACK_WORKSPACE_ROOT;

export const ADMIN_API_REFERENCE_INVENTORY: AdminApiReferenceInventory = GENERATED_ADMIN_API_REFERENCE_INVENTORY;

export const ADMIN_API_REFERENCE_SECTION_ORDER: Array<{
  kind: AdminApiReferenceNodeKind;
  title: string;
  description: string;
}> = [
  {
    kind: "ui_surface",
    title: "Admin Pages",
    description: "Page-level entry surfaces and request-originating admin components.",
  },
  {
    kind: "api_route",
    title: "Admin API Routes",
    description: "Next.js admin routes under /api/admin that pages and components call.",
  },
  {
    kind: "backend_endpoint",
    title: "Backend Endpoints",
    description: "TRR-Backend endpoints reached through admin proxies and backend helpers.",
  },
  {
    kind: "repository_surface",
    title: "Repository / Query Surfaces",
    description: "Server-side repository, service, or query surfaces touched by admin paths.",
  },
  {
    kind: "polling_loop",
    title: "Polling / Background Refreshes",
    description: "Explicit intervals, streams, and scheduled refresh loops found in admin UI code.",
  },
] as const;

export function isPageNode(node: AdminApiReferenceNode): boolean {
  return node.kind === "ui_surface" && node.id.startsWith("page:");
}

export function isComponentNode(node: AdminApiReferenceNode): boolean {
  return node.kind === "ui_surface" && node.id.startsWith("component:");
}

export function formatNodeKindLabel(node: AdminApiReferenceNode): string {
  if (isPageNode(node)) return "page";
  if (isComponentNode(node)) return "component";
  return node.kind.replace(/_/g, " ");
}

export function buildSourceHref(sourceFile: string | null, line = 1): string | null {
  if (!sourceFile) return null;
  return `vscode://file${WORKSPACE_ROOT}/${sourceFile}:${Math.max(1, line)}`;
}

export function buildInventoryGraph(inventory: AdminApiReferenceInventory = ADMIN_API_REFERENCE_INVENTORY): {
  nodeMap: Map<string, AdminApiReferenceNode>;
  outboundByNode: Map<string, AdminApiReferenceEdge[]>;
  inboundByNode: Map<string, AdminApiReferenceEdge[]>;
} {
  const nodeMap = new Map(inventory.nodes.map((node) => [node.id, node]));
  const outboundByNode = new Map<string, AdminApiReferenceEdge[]>();
  const inboundByNode = new Map<string, AdminApiReferenceEdge[]>();
  for (const edge of inventory.edges) {
    const outbound = outboundByNode.get(edge.from) ?? [];
    outbound.push(edge);
    outboundByNode.set(edge.from, outbound);
    const inbound = inboundByNode.get(edge.to) ?? [];
    inbound.push(edge);
    inboundByNode.set(edge.to, inbound);
  }
  return { nodeMap, outboundByNode, inboundByNode };
}

export function getSectionNodes(
  kind: AdminApiReferenceNodeKind,
  inventory: AdminApiReferenceInventory = ADMIN_API_REFERENCE_INVENTORY,
): AdminApiReferenceNode[] {
  if (kind !== "ui_surface") {
    return inventory.nodes.filter((node) => node.kind === kind);
  }
  const pageNodes = inventory.nodes.filter((node) => isPageNode(node));
  const componentNodes = inventory.nodes.filter((node) => isComponentNode(node));
  return [...pageNodes, ...componentNodes];
}

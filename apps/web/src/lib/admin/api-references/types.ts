export const ADMIN_API_REFERENCES_SCHEMA_VERSION = "1.0.0";
export const ADMIN_API_REFERENCES_GENERATOR_VERSION = "1.0.0";

export type AdminApiReferenceNodeKind =
  | "ui_surface"
  | "api_route"
  | "backend_endpoint"
  | "repository_surface"
  | "polling_loop";

export type AdminApiReferenceEdgeKind =
  | "originates_request"
  | "contains_polling"
  | "calls"
  | "proxies_to"
  | "touches_repository"
  | "renders_view";

export type AdminApiReferenceProvenance =
  | "static_scan"
  | "heuristic_inference"
  | "manual_override"
  | "derived";

export type AdminApiReferenceConfidence = "high" | "medium" | "low";

export type AdminApiReferenceVerificationStatus = "verified" | "inferred" | "unverified_manual";

export type AdminApiReferenceUsageTier = "continuous" | "high" | "medium" | "low" | "manual";

export type AdminApiReferenceViewKind = "gallery" | "list" | "detail";

export type AdminApiReferencePostgresAccess = "direct" | "indirect" | "none";

export type AdminApiReferenceRisk = "high" | "medium" | "low";

export type AdminApiReferenceIgnoreReason =
  | "out_of_scope_public"
  | "auth_or_framework_only"
  | "redirect_only"
  | "static_only"
  | "duplicate_alias"
  | "intentionally_hidden_tooling";

export type AdminApiReferenceSourceLocator = {
  line: number;
  symbol?: string;
  matchedText?: string;
};

export type AdminApiReferenceNode = {
  id: string;
  kind: AdminApiReferenceNodeKind;
  title: string;
  pathPattern: string | null;
  symbol: string | null;
  sourceFile: string | null;
  sourceLocator: AdminApiReferenceSourceLocator | null;
  provenance: AdminApiReferenceProvenance;
  confidence: AdminApiReferenceConfidence;
  verificationStatus: AdminApiReferenceVerificationStatus;
  basis: string[];
  usageTier: AdminApiReferenceUsageTier;
  polls: boolean;
  pollCadenceMs: number | null;
  automatic: boolean;
  loadsLargeDatasets: boolean;
  usesPagination: boolean;
  returnsWideRowsOrBlobsOrRawJson: boolean;
  fansOutQueries: boolean;
  postgresAccess: AdminApiReferencePostgresAccess;
  viewKinds: AdminApiReferenceViewKind[];
  payloadRisk: AdminApiReferenceRisk;
  fanoutRisk: AdminApiReferenceRisk;
  staticOnly: boolean;
};

export type AdminApiReferenceEdge = {
  id: string;
  kind: AdminApiReferenceEdgeKind;
  from: string;
  to: string;
  title: string | null;
  sourceFile: string | null;
  sourceLocator: AdminApiReferenceSourceLocator | null;
  provenance: AdminApiReferenceProvenance;
  confidence: AdminApiReferenceConfidence;
  verificationStatus: AdminApiReferenceVerificationStatus;
  basis: string[];
};

export type AdminApiReferenceSummary = {
  totalNodes: number;
  totalEdges: number;
  nodesByKind: Record<AdminApiReferenceNodeKind, number>;
  edgesByKind: Record<AdminApiReferenceEdgeKind, number>;
  automaticNodes: number;
  pollingNodes: number;
  directPostgresNodes: number;
  indirectPostgresNodes: number;
};

export type AdminApiReferenceIndexes = {
  nodeIdsByKind: Record<AdminApiReferenceNodeKind, string[]>;
  edgeIdsByKind: Record<AdminApiReferenceEdgeKind, string[]>;
  summary: AdminApiReferenceSummary;
};

export type AdminApiReferenceInventory = {
  inventorySchemaVersion: string;
  generatorVersion: string;
  generatedAt: string;
  sourceCommitSha: string;
  overrideDigest: string;
  nodes: AdminApiReferenceNode[];
  edges: AdminApiReferenceEdge[];
  indexes: AdminApiReferenceIndexes;
};

export type AdminApiReferenceNodeOverride = {
  id: string;
  title?: string;
  basis?: string[];
  usageTier?: AdminApiReferenceUsageTier;
  polls?: boolean;
  pollCadenceMs?: number | null;
  automatic?: boolean;
  loadsLargeDatasets?: boolean;
  usesPagination?: boolean;
  returnsWideRowsOrBlobsOrRawJson?: boolean;
  fansOutQueries?: boolean;
  postgresAccess?: AdminApiReferencePostgresAccess;
  viewKinds?: AdminApiReferenceViewKind[];
  staticOnly?: boolean;
  confidence?: AdminApiReferenceConfidence;
  verificationStatus?: AdminApiReferenceVerificationStatus;
};

export type AdminApiReferenceSeedNode = Omit<
  AdminApiReferenceNode,
  "payloadRisk" | "fanoutRisk"
>;

export type AdminApiReferenceEdgeOverride = {
  kind: AdminApiReferenceEdgeKind;
  from: string;
  to: string;
  title?: string | null;
  sourceFile?: string | null;
  sourceLocator?: AdminApiReferenceSourceLocator | null;
  provenance: AdminApiReferenceProvenance;
  confidence: AdminApiReferenceConfidence;
  verificationStatus: AdminApiReferenceVerificationStatus;
  basis: string[];
};

export type AdminApiReferenceIgnoreEntry = {
  id: string;
  reason: AdminApiReferenceIgnoreReason;
  note: string;
};

export type AdminApiReferenceCatalogOverrides = {
  nodeOverrides: AdminApiReferenceNodeOverride[];
  seedNodes: AdminApiReferenceSeedNode[];
  edgeOverrides: AdminApiReferenceEdgeOverride[];
};

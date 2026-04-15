export type LayoutFamily =
  | "nyt-interactive"
  | "nyt-article"
  | "athletic-article"
  | "generic-publisher";

export interface DetectedFramework {
  name: string;
  version?: string;
  confidence: number;
}

export interface CDNDetection {
  name: string;
  urls: string[];
}

export interface AnalyticsDetection {
  name: string;
  id?: string;
}

export interface TechInventory {
  frameworks: DetectedFramework[];
  cdns: CDNDetection[];
  analytics: AnalyticsDetection[];
  cssFramework?: string;
  buildSystem?: string;
}

export interface TaxonomySectionMapping {
  discovered: boolean;
  elements: string[];
  subPages: string[];
}

export interface TaxonomyMapping {
  sections: Record<string, TaxonomySectionMapping>;
}

export interface ExtractionPlan {
  required: string[];
  conditional: Array<{ skill: string; reason: string }>;
  skip: string[];
}

export type FidelitySeverity = "blocking" | "degraded";

export interface PublisherClassification {
  techInventory: TechInventory;
  layoutFamily: LayoutFamily;
  taxonomyMapping: TaxonomyMapping;
  extractionPlan: ExtractionPlan;
  bespokeInteractive: boolean;
  requiresVisualContract: boolean;
  classificationSignals: string[];
}

export interface HeaderFidelityRequirements {
  headlineText?: string;
  headlineStyle?: string;
  deckBehavior?: "render" | "source-only" | "omit";
  bylineLayout?: "inline" | "stacked" | "centered";
  noteTextOrder?: string[];
}

export interface TypographyFidelityVariant {
  role: string;
  sampleText: string;
  styleSignature: string;
  severity: FidelitySeverity;
}

export interface BarChartVisualContract {
  rendererKind: "bar-chart";
  requiresDedicatedComponent: boolean;
  requiredTitle?: string;
  requiredNote?: string;
  requiresAxis: boolean;
  requiresLegend: boolean;
  requiresFaces: boolean;
}

export interface BubbleChartVisualContract {
  rendererKind: "bubble-chart";
  requiresDedicatedComponent: boolean;
  requiredTitle?: string;
  requiredNote?: string;
  requiresFaces: boolean;
  requiresTopicLabels: boolean;
}

export interface GenericVisualChartContract {
  rendererKind: string;
  rawEvidence: Record<string, unknown>;
}

export type VisualChartContract =
  | BarChartVisualContract
  | BubbleChartVisualContract
  | GenericVisualChartContract;

export interface VisualAssetContractEntry {
  kind: "icon" | "image" | "portrait" | "social-image";
  name: string;
  required: boolean;
  sourceUrl?: string;
  resolvedUrl?: string;
  provenance?: string;
}

export interface ArticleVisualContract {
  chrome: HeaderFidelityRequirements;
  typography: {
    variants: TypographyFidelityVariant[];
  };
  charts: VisualChartContract[];
  assets: VisualAssetContractEntry[];
  severitySummary: {
    blocking: number;
    degraded: number;
  };
}

export interface NavigationLink {
  label: string;
  href: string;
  hasSubmenu: boolean;
}

export interface NavigationCluster {
  label: string;
  items: Array<{ label: string; href: string; iconUrl?: string }>;
}

export interface NavigationData {
  header: {
    logo: { type: "svg" | "img" | "text"; content: string; width?: number; height?: number } | null;
    primaryNav: NavigationLink[];
    secondaryNav?: Array<{ label: string; href: string; iconUrl?: string }>;
    hamburgerMenu?: { sections: NavigationCluster[] };
    searchBar?: { placeholder: string; position: string };
    userActions?: Array<{ label: string; href: string; style: string }>;
    sticky: boolean;
    height: string;
    background: string;
    textColor: string;
  };
  footer: {
    columns: Array<{ header: string; links: Array<{ label: string; href: string }> }>;
    legalText: string;
    socialLinks: Array<{ platform: string; href: string; iconSvg?: string }>;
    appStoreBadges?: Array<{ platform: "ios" | "android"; href: string }>;
    policyLinks: Array<{ label: string; href: string }>;
    background: string;
    textColor: string;
  };
  sidebar?: {
    position: "left" | "right";
    collapsible: boolean;
    items: Array<{ label: string; href: string; children?: Array<{ label: string; href: string }> }>;
  };
  tabs?: {
    items: Array<{ label: string; active: boolean }>;
    style: { font: string; activeColor: string; inactiveColor: string; borderBottom: string };
  };
  breadcrumbs?: Array<{ label: string; href: string }>;
  searchFilter?: {
    hasSearch: boolean;
    hasFilter: boolean;
    hasSort: boolean;
  };
  dropdownMenus?: Array<{
    trigger: string;
    items: Array<{ label: string; href?: string; icon?: string }>;
  }>;
}

export interface SocialShareAsset {
  name: string;
  url: string;
  ratio: string;
  width?: number;
  source: "meta" | "json-ld" | "next-data" | "heuristic";
}

export interface SocialShareAssetSet {
  assets: SocialShareAsset[];
}

export interface HydratedInteractionCoverage {
  mastheadSpacer: boolean;
  storyline: boolean;
  menuOverlay: boolean;
  searchPanel: boolean;
  accountDrawer: boolean;
}

export interface SiteShellStorylineExtraction {
  title: string;
  links: Array<{ label: string; href: string }>;
  primitiveMatchId?: string;
}

export interface SiteHeaderShellExtraction {
  mastheadSpacerHeight?: number;
  hasMenuButton: boolean;
  hasSearchButton: boolean;
  hasAccountButton: boolean;
  primitiveMatchId?: string;
}

export interface SiteShellExtraction {
  siteHeader?: SiteHeaderShellExtraction;
  storyline?: SiteShellStorylineExtraction;
  interactionCoverage: HydratedInteractionCoverage;
}

export interface ReusableUiPrimitive {
  id: string;
  publisher: string;
  layoutFamily: LayoutFamily;
  kind: "icon" | "icon-set" | "site-header-shell" | "storyline";
  variant: string;
  signature: string;
  provenance?: string;
}

export interface MergedExtractionOutput {
  articleUrl: string;
  sourceHtmlLength: number;
  publisherClassification: PublisherClassification;
  navigationData: NavigationData;
  socialShareAssets?: SocialShareAssetSet | null;
  siteShell?: SiteShellExtraction | null;
  interactionCoverage?: HydratedInteractionCoverage | null;
  reusablePrimitives?: ReusableUiPrimitive[];
  extractionOutputs: Record<string, unknown>;
  blockCompleteness?: number | null;
  techInventory: TechInventory;
  visualContract?: ArticleVisualContract | null;
  legacyFidelityMode: boolean;
}

export interface AuditCheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message?: string;
  details?: string[];
}

export interface AuditResult {
  passed: boolean;
  articleId: string;
  checks: AuditCheckResult[];
  blockingErrors: string[];
  warnings: string[];
}

export interface SourceFidelityFinding {
  severity: FidelitySeverity;
  area: "chrome" | "typography" | "charts" | "assets" | "general";
  message: string;
}

export interface SourceFidelityResult {
  articleId: string;
  passed: boolean;
  legacyMode: boolean;
  blockingFindings: SourceFidelityFinding[];
  degradedFindings: SourceFidelityFinding[];
}

export interface A11yAuditFinding {
  check: string;
  severity: "error" | "warning" | "info";
  element: string;
  message: string;
  recommendation: string;
  wcagCriterion?: string;
}

export interface A11yAuditResult {
  passed: boolean;
  articleId: string;
  brandSlug: string;
  findings: A11yAuditFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

export interface IntegrationFailure {
  test: string;
  articleId?: string;
  expected: string;
  actual: string;
}

export interface IntegrationTestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  failures: IntegrationFailure[];
  duration: number;
}

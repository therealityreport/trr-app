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

export interface PublisherClassification {
  techInventory: TechInventory;
  layoutFamily: LayoutFamily;
  taxonomyMapping: TaxonomyMapping;
  extractionPlan: ExtractionPlan;
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

export interface MergedExtractionOutput {
  articleUrl: string;
  sourceHtmlLength: number;
  publisherClassification: PublisherClassification;
  navigationData: NavigationData;
  extractionOutputs: Record<string, unknown>;
  blockCompleteness?: number | null;
  techInventory: TechInventory;
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

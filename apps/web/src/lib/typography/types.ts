export type TypographyArea = "user-frontend" | "surveys" | "admin";

export type TypographyBreakpoint = "mobile" | "desktop";

export interface TypographyRoleStyle {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform?: string;
}

export interface TypographyRoleConfig {
  mobile: TypographyRoleStyle;
  desktop: TypographyRoleStyle;
}

export interface TypographySet {
  id: string;
  slug: string;
  name: string;
  area: TypographyArea;
  seedSource: string;
  roles: Record<string, TypographyRoleConfig>;
  createdAt: string;
  updatedAt: string;
}

export interface TypographyAssignment {
  id: string;
  area: TypographyArea;
  pageKey: string | null;
  instanceKey: string | null;
  setId: string;
  sourcePath: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TypographyState {
  sets: TypographySet[];
  assignments: TypographyAssignment[];
}

export interface TypographySelector {
  area: TypographyArea;
  pageKey?: string | null;
  instanceKey?: string | null;
  role: string;
}

export interface TypographyResolvedEntry {
  selector: Required<Pick<TypographySelector, "area" | "role">> & {
    pageKey: string | null;
    instanceKey: string | null;
  };
  set: TypographySet;
  roleConfig: TypographyRoleConfig;
}

export type TypographyStyleInput = Partial<TypographyRoleStyle> | null | undefined;

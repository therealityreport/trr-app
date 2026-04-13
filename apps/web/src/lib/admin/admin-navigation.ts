import type { Route } from "next";
import {
  ADMIN_API_REFERENCES_PATH,
  ADMIN_DESIGN_DOCS_PATH,
  ADMIN_SHOWS_PATH,
  ADMIN_SOCIAL_PATH,
} from "@/lib/admin/admin-route-paths";

export type AdminNavItem = {
  key: string;
  title: string;
  href: Route;
  description: string;
  badge: string;
  hasShowsSubmenu?: boolean;
  activeMatchPrefixes?: readonly string[];
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    key: "dev-dashboard",
    title: "Dev Dashboard",
    href: "/dev-dashboard" as Route,
    description: "Git status, branches, PRs, commits, and outstanding tasks across all TRR workspace repos.",
    badge: "Dev",
  },
  {
    key: "trr-shows",
    title: "Shows",
    href: ADMIN_SHOWS_PATH,
    description: "Browse the show library from the admin dashboard, then open show workspaces and linked survey flows.",
    badge: "API",
    hasShowsSubmenu: true,
    activeMatchPrefixes: ["/admin/shows", "/admin/trr-shows", "/shows"],
  },
  {
    key: "screenalytics",
    title: "Screenalytics",
    href: "/screenalytics" as Route,
    description:
      "Canonical TRR-APP admin entry for screen-time workflows. Pick a show here, then continue into its /<show> workspace.",
    badge: "Screen",
    activeMatchPrefixes: ["/screenalytics", "/screenlaytics", "/admin/screenalytics", "/admin/screenlaytics", "/admin/trr-shows"],
  },
  {
    key: "people",
    title: "People",
    href: "/people" as Route,
    description: "Find and review cast and crew profiles across shows with ranking rails and quick search.",
    badge: "People",
    activeMatchPrefixes: ["/people", "/admin/people"],
  },
  {
    key: "games",
    title: "Games",
    href: "/games" as Route,
    description: "Manage games and interactive experiences.",
    badge: "Games",
    activeMatchPrefixes: ["/games", "/admin/games"],
  },
  {
    key: "surveys",
    title: "Surveys",
    href: "/surveys" as Route,
    description: "Build and manage survey templates, runs, responses, and export tooling.",
    badge: "Surveys",
    activeMatchPrefixes: ["/surveys", "/admin/surveys"],
  },
  {
    key: "social-media",
    title: "Social Media",
    href: ADMIN_SOCIAL_PATH,
    description: "Manage social media pipelines, templates, and publishing workflows.",
    badge: "Social",
    activeMatchPrefixes: ["/social", "/admin/social", "/admin/social-media", "/social-media"],
  },
  {
    key: "networks-streaming",
    title: "Brands",
    href: "/brands",
    description: "Manage brand coverage across networks, streaming services, production companies, and publications.",
    badge: "Data",
    activeMatchPrefixes: [
      "/brands",
      "/brands/networks-and-streaming",
      "/brands/production-companies",
      "/brands/news",
      "/brands/other",
      "/brands/shows-and-franchises",
      "/admin/brands",
      "/admin/networks-and-streaming",
      "/admin/production-companies",
      "/admin/news",
      "/admin/other",
      "/admin/networks",
    ],
  },
  {
    key: "users",
    title: "Users",
    href: "/users" as Route,
    description: "Manage users, roles, and admin access controls.",
    badge: "Admin",
    activeMatchPrefixes: ["/users", "/admin/users"],
  },
  {
    key: "groups",
    title: "Groups",
    href: "/groups" as Route,
    description: "Manage user groups and community segmentation.",
    badge: "Groups",
    activeMatchPrefixes: ["/groups", "/admin/groups"],
  },
  {
    key: "docs",
    title: "Docs",
    href: "/docs" as Route,
    description: "Operational reference for TRR-APP admin jobs with exact pages, buttons, and trigger locations.",
    badge: "Docs",
    activeMatchPrefixes: ["/docs", "/admin/docs"],
  },
  {
    key: "api-references",
    title: "API References Library",
    href: ADMIN_API_REFERENCES_PATH,
    description:
      "Generated request-path inventory for admin pages, API routes, backend endpoints, repository surfaces, and polling loops.",
    badge: "Trace",
    activeMatchPrefixes: ["/api-references", "/admin/api-references"],
  },
  {
    key: "design-system",
    title: "UI Design System",
    href: "/design-system/fonts" as Route,
    description: "Reference for fonts, survey question components, and form patterns used across the app.",
    badge: "Design",
    activeMatchPrefixes: ["/design-system"],
  },
  {
    key: "design-docs",
    title: "Design Docs",
    href: ADMIN_DESIGN_DOCS_PATH,
    description:
      "Data visualization and editorial design system — typography, colors, charts, layout, and component patterns.",
    badge: "Design",
    activeMatchPrefixes: ["/design-docs", "/admin/design-docs"],
  },
  {
    key: "settings",
    title: "Settings",
    href: "/settings" as Route,
    description: "Configure environment and application settings.",
    badge: "Settings",
    activeMatchPrefixes: ["/settings", "/admin/settings"],
  },
] as const;

export const ADMIN_DASHBOARD_TOOLS = ADMIN_NAV_ITEMS;

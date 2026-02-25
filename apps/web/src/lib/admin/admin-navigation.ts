import type { Route } from "next";

export type AdminNavItem = {
  key: string;
  title: string;
  href: Route;
  description: string;
  badge: string;
  hasShowsSubmenu?: boolean;
};

export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  {
    key: "dev-dashboard",
    title: "Dev Dashboard",
    href: "/admin/dev-dashboard",
    description: "Git status, branches, PRs, commits, and outstanding tasks across all TRR workspace repos.",
    badge: "Dev",
  },
  {
    key: "trr-shows",
    title: "Shows",
    href: "/admin/trr-shows",
    description: "Browse the TRR metadata database. View shows, seasons, cast, and create linked surveys.",
    badge: "API",
    hasShowsSubmenu: true,
  },
  {
    key: "games",
    title: "Games",
    href: "/admin/games",
    description: "Manage games and interactive experiences.",
    badge: "Games",
  },
  {
    key: "surveys",
    title: "Survey Editor",
    href: "/admin/surveys",
    description: "Build and manage survey templates, runs, responses, and export tooling.",
    badge: "Surveys",
  },
  {
    key: "social-media",
    title: "Social Media",
    href: "/admin/social-media",
    description: "Manage social media pipelines, templates, and publishing workflows.",
    badge: "Social",
  },
  {
    key: "networks-streaming",
    title: "Networks & Streaming",
    href: "/admin/networks",
    description: "View network/provider coverage counts and run sync/mirror enrichment workflows.",
    badge: "Data",
  },
  {
    key: "users",
    title: "Users",
    href: "/admin/users",
    description: "Manage users, roles, and admin access controls.",
    badge: "Admin",
  },
  {
    key: "groups",
    title: "Groups",
    href: "/admin/groups",
    description: "Manage user groups and community segmentation.",
    badge: "Groups",
  },
  {
    key: "design-system",
    title: "UI Design System",
    href: "/admin/fonts",
    description: "Reference for fonts, survey question components, and form patterns used across the app.",
    badge: "Design",
  },
  {
    key: "settings",
    title: "Settings",
    href: "/admin/settings",
    description: "Configure environment and application settings.",
    badge: "Settings",
  },
] as const;

export const ADMIN_DASHBOARD_TOOLS = ADMIN_NAV_ITEMS;

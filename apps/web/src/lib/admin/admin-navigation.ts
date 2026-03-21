import type { Route } from "next";

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
    href: "/admin/shows" as Route,
    description: "Browse the TRR metadata database. View shows, seasons, cast, and create linked surveys.",
    badge: "API",
    hasShowsSubmenu: true,
    activeMatchPrefixes: ["/admin/shows", "/admin/trr-shows", "/shows"],
  },
  {
    key: "screenlaytics",
    title: "Screenalytics",
    href: "/screenlaytics" as Route,
    description: "Pick a show and jump into the show-level admin workspace used for screen-time and related operations.",
    badge: "Screen",
    activeMatchPrefixes: ["/screenlaytics", "/screenalytics", "/admin/trr-shows"],
  },
  {
    key: "people",
    title: "People",
    href: "/people",
    description: "Find and review cast and crew profiles across shows with ranking rails and quick search.",
    badge: "People",
  },
  {
    key: "games",
    title: "Games",
    href: "/games" as Route,
    description: "Manage games and interactive experiences.",
    badge: "Games",
  },
  {
    key: "surveys",
    title: "Survey Editor",
    href: "/surveys" as Route,
    description: "Build and manage survey templates, runs, responses, and export tooling.",
    badge: "Surveys",
  },
  {
    key: "social-media",
    title: "Social Media",
    href: "/admin/social" as Route,
    description: "Manage social media pipelines, templates, and publishing workflows.",
    badge: "Social",
    activeMatchPrefixes: ["/admin/social", "/admin/social-media", "/social-media"],
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
  },
  {
    key: "groups",
    title: "Groups",
    href: "/groups" as Route,
    description: "Manage user groups and community segmentation.",
    badge: "Groups",
  },
  {
    key: "docs",
    title: "Docs",
    href: "/docs" as Route,
    description: "Operational reference for TRR-APP admin jobs with exact pages, buttons, and trigger locations.",
    badge: "Docs",
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
    href: "/admin/design-docs" as Route,
    description:
      "Data visualization and editorial design system — typography, colors, charts, layout, and component patterns.",
    badge: "Design",
    activeMatchPrefixes: ["/admin/design-docs"],
  },
  {
    key: "settings",
    title: "Settings",
    href: "/settings" as Route,
    description: "Configure environment and application settings.",
    badge: "Settings",
  },
] as const;

export const ADMIN_DASHBOARD_TOOLS = ADMIN_NAV_ITEMS;

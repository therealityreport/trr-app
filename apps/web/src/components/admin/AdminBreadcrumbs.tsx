import Link from "next/link";
import type { Route } from "next";
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-breadcrumbs";

interface AdminBreadcrumbsProps {
  items: AdminBreadcrumbItem[];
  className?: string;
}

export default function AdminBreadcrumbs({ items, className }: AdminBreadcrumbsProps) {
  const visibleItems = items.filter((item) => item.label.trim().length > 0);
  if (visibleItems.length === 0) {
    return null;
  }
  const currentItem = visibleItems[visibleItems.length - 1];

  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold text-zinc-500">
        {visibleItems.map((item, index) => {
          const isCurrent = item === currentItem;
          const href = item.href?.trim() || null;
          const isInternalHref = Boolean(href && href.startsWith("/"));
          const itemKey = visibleItems
            .slice(0, index + 1)
            .map((segment) => `${segment.href ?? "__current__"}:${segment.label}`)
            .join(">");
          return (
            <li key={itemKey} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {href && !isCurrent && isInternalHref ? (
                <Link href={href as Route} className="transition hover:text-zinc-800 hover:underline">
                  {item.label}
                </Link>
              ) : href && !isCurrent ? (
                <a href={href} className="transition hover:text-zinc-800 hover:underline">
                  {item.label}
                </a>
              ) : (
                <span className={isCurrent ? "text-zinc-700" : undefined}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

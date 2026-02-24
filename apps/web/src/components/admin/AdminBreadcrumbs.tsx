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

  return (
    <nav
      aria-label="Breadcrumb"
      className={className}
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold text-zinc-500">
        {visibleItems.map((item, index) => {
          const isCurrent = index === visibleItems.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 ? <span aria-hidden>/</span> : null}
              {item.href && !isCurrent ? (
                <a href={item.href} className="transition hover:text-zinc-800 hover:underline">
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

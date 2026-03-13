"use client";

import { usePathname } from "next/navigation";
import { extractPrefixedPathSegment } from "@/lib/public/prefixed-pathname";
import { formatRouteValue } from "@/components/public/PublicRouteShell";

type PrefixedPathValueProps = {
  fallback?: string | null;
  prefix: string;
  segmentIndex: number;
};

export default function PrefixedPathValue({
  fallback,
  prefix,
  segmentIndex,
}: PrefixedPathValueProps) {
  const pathname = usePathname();
  const resolvedValue = extractPrefixedPathSegment(pathname, segmentIndex, prefix) ?? fallback;

  return <>{formatRouteValue(resolvedValue)}</>;
}

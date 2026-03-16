import type { Route } from "next";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ communityId: string; windowKey: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const appendQuery = (pathname: string, searchParams?: Record<string, string | string[] | undefined>): string => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        query.append(key, entry);
      }
      continue;
    }
    if (typeof value === "string") {
      query.set(key, value);
    }
  }
  const search = query.toString();
  return search ? `${pathname}?${search}` : pathname;
};

export default async function LegacyAdminSocialRedditWindowPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  redirect(
    appendQuery(
      `/admin/social/reddit/communities/${encodeURIComponent(resolvedParams.communityId)}/${encodeURIComponent(resolvedParams.windowKey)}`,
      resolvedSearchParams,
    ) as Route,
  );
}

import { redirect } from "next/navigation";
import { toFriendlyBrandSlug } from "@/lib/admin/brand-profile";

type AdminNetworkStreamingAliasPageProps = {
  params: Promise<{ entityType: string; entitySlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const buildSearch = async (
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
): Promise<string> => {
  const resolved = await searchParams;
  if (!resolved) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null) query.append(key, item);
      });
      continue;
    }
    if (value != null) query.set(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
};

export default async function AdminNetworkStreamingAliasPage({
  params,
  searchParams,
}: AdminNetworkStreamingAliasPageProps) {
  const { entitySlug } = await params;
  const canonicalSlug = toFriendlyBrandSlug(entitySlug) || encodeURIComponent(entitySlug);
  const search = await buildSearch(searchParams);
  redirect(`/brands/${canonicalSlug}${search}`);
}

import { redirect } from "next/navigation";

type AdminShowAliasCatchallPageProps = {
  params: Promise<{ showId: string; rest?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const buildSearch = async (searchParams?: Promise<Record<string, string | string[] | undefined>>): Promise<string> => {
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

export default async function AdminShowAliasCatchallPage({
  params,
  searchParams,
}: AdminShowAliasCatchallPageProps) {
  const { showId, rest = [] } = await params;
  const restPath = rest.length > 0 ? `/${rest.map((segment) => encodeURIComponent(segment)).join("/")}` : "";
  const search = await buildSearch(searchParams);
  redirect(`/${encodeURIComponent(showId)}${restPath}${search}`);
}

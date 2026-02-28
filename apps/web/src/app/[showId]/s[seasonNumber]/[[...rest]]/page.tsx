import ShowAdminPage from "@/app/admin/trr-shows/[showId]/page";
import SeasonAdminPage from "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page";

interface RootShowSeasonAliasPageProps {
  params: Promise<{ showId: string; seasonNumber: string; rest?: string[] }>;
}

const isStrictSeasonNumber = (value: string): boolean => /^[0-9]{1,3}$/.test(value);

export default async function RootShowSeasonAliasPage({
  params,
}: RootShowSeasonAliasPageProps) {
  const { seasonNumber } = await params;
  const normalizedSeasonNumber =
    typeof seasonNumber === "string" ? seasonNumber.trim() : "";
  if (isStrictSeasonNumber(normalizedSeasonNumber)) {
    return <SeasonAdminPage />;
  }
  return <ShowAdminPage />;
}

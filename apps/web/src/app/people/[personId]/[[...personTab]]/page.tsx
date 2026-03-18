import { redirect } from "next/navigation";

type PersonPageProps = {
  params: Promise<{ personId: string; personTab?: string[] }>;
};

export default async function PersonPage({ params }: PersonPageProps) {
  const { personId, personTab } = await params;
  const tabPath = personTab?.length ? `/${personTab.join("/")}` : "";
  redirect(`/admin/trr-shows/people/${personId}${tabPath}`);
}

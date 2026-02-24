import SurveysSection from "@/components/admin/surveys-section";

type ShowSurveysTabProps = {
  showId: string;
  showName: string;
  totalSeasons: number | null;
};

export default function ShowSurveysTab({ showId, showName, totalSeasons }: ShowSurveysTabProps) {
  return (
    <SurveysSection
      showId={showId}
      showName={showName}
      totalSeasons={totalSeasons}
    />
  );
}

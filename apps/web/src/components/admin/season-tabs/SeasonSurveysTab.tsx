import SurveysSection from "@/components/admin/surveys-section";

type SeasonSurveysTabProps = {
  showId: string;
  showName: string;
  totalSeasons: number | null;
  seasonNumber: number | null;
};

export default function SeasonSurveysTab({
  showId,
  showName,
  totalSeasons,
  seasonNumber,
}: SeasonSurveysTabProps) {
  return (
    <SurveysSection
      showId={showId}
      showName={showName}
      totalSeasons={totalSeasons}
      seasonNumber={seasonNumber}
    />
  );
}

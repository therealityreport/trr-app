export type CastBatchProgressSnapshot = {
  completed: number;
  total: number;
  inFlight: number;
};

export const formatCastBatchCounts = (snapshot: CastBatchProgressSnapshot): string =>
  `completed ${snapshot.completed}/${snapshot.total}, in-flight ${snapshot.inFlight}`;

export const formatCastBatchMemberMessage = (
  label: string,
  snapshot: CastBatchProgressSnapshot
): string =>
  `Syncing ${label}... (${formatCastBatchCounts(snapshot)})`;

export const formatCastBatchRunningMessage = (snapshot: CastBatchProgressSnapshot): string =>
  `Syncing cast profiles/media... (${formatCastBatchCounts(snapshot)})`;

"use client";

import type { RankingInputProps } from "./rankings-core";
import { RankingInputCore } from "./rankings-core";

export type PosterRankingsInputProps = RankingInputProps;

export default function PosterRankingsInput(props: PosterRankingsInputProps) {
  return (
    <RankingInputCore
      {...props}
      forcedVariant="poster-rankings"
      warningTestIdPrefix="rank-order"
    />
  );
}

"use client";

import type { RankingInputProps } from "./rankings-core";
import { RankingInputCore } from "./rankings-core";

export type PersonRankingsInputProps = RankingInputProps;

export default function PersonRankingsInput(props: PersonRankingsInputProps) {
  return (
    <RankingInputCore
      {...props}
      forcedVariant="person-rankings"
      warningTestIdPrefix="rank-order"
    />
  );
}

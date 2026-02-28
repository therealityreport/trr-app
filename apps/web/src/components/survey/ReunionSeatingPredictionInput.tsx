"use client";

import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { SurveyQuestion, QuestionOption } from "@/lib/surveys/normalized-types";
import type { ReunionSeatingPredictionConfig } from "@/lib/surveys/question-config-types";
import SurveyContinueButton from "./SurveyContinueButton";
import CastCircleToken from "./CastCircleToken";
import {
  isCloudfrontCdnFontCandidate,
  resolveCloudfrontCdnFont,
} from "@/lib/fonts/cdn-fonts";

export interface ReunionSeatingPredictionInputProps {
  question: SurveyQuestion & { options: QuestionOption[] };
  value: {
    fullTimeOrder?: string[];
    friendSide?: "left" | "right" | null;
    completed?: boolean;
  } | null;
  onChange: (value: {
    fullTimeOrder: string[];
    friendSide: "left" | "right" | null;
    completed: boolean;
  }) => void;
  disabled?: boolean;
}

const DEFAULT_PANEL_BG = "#D9D9D9";
const DEFAULT_HEADING_FONT = "\"Rude Slab Condensed\", var(--font-sans), sans-serif";
const DEFAULT_HEADING_COLOR = "#111111";
const DEFAULT_HOST_NAME = "Andy Cohen";
const DEFAULT_HOST_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Andy_Cohen_2012_Shankbone_2.jpg/320px-Andy_Cohen_2012_Shankbone_2.jpg";

type UnknownRecord = Record<string, unknown>;
type CastRole = "main" | "friend_of" | "unknown";

interface SeatingOption {
  id: string;
  label: string;
  imagePath: string | null;
  castRole: CastRole;
}

interface SeatCenter {
  x: number;
  y: number;
}

const FIGMA_REUNION_HOST_Y_RATIO = 0.086;
const FIGMA_REUNION_SIDE_Y_START_RATIO = 0.171;
const FIGMA_REUNION_SIDE_Y_END_RATIO = 0.914;
const FIGMA_REUNION_SIDE_OFFSET_START_RATIO = 0.193;
const FIGMA_REUNION_SIDE_OFFSET_END_RATIO = 0.409;
const FIGMA_REUNION_BASE_GROUP_WIDTH = 356.5;
const FIGMA_REUNION_BASE_GROUP_HEIGHT = 388;
const FIGMA_REUNION_BASE_SEAT_SIZE = 66.5;

export interface ReunionSeatLayout {
  arcWidth: number;
  arcHeight: number;
  seatSize: number;
  seatStroke: number;
  hostSize: number;
  hostCenterY: number;
  centers: SeatCenter[];
}

type DragToken =
  | { kind: "full_time"; optionId: string; label: string; imagePath: string | null }
  | { kind: "friend"; optionId: string; label: string; imagePath: string | null };

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readPath(record: UnknownRecord, path: string[]): unknown {
  let cursor: unknown = record;
  for (const key of path) {
    const current = toRecord(cursor);
    if (!current || !(key in current)) return undefined;
    cursor = current[key];
  }
  return cursor;
}

function readFontValue(record: UnknownRecord, path: string[]): string | null {
  const value = readPath(record, path);
  const direct = toTrimmedString(value);
  if (direct) return direct;
  const nested = toRecord(value);
  if (!nested) return null;
  return (
    toTrimmedString(nested.fontFamily) ??
    toTrimmedString(nested.font) ??
    toTrimmedString(nested.family) ??
    null
  );
}

function readNumberValue(record: UnknownRecord, path: string[]): number | null {
  const value = readPath(record, path);
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function pushUnique(values: string[], next: string | null) {
  if (!next || values.includes(next)) return;
  values.push(next);
}

function resolveFont(candidates: string[], fallback: string): string {
  for (const candidate of candidates) {
    const resolved = resolveCloudfrontCdnFont(candidate);
    if (resolved) return resolved.fontFamily;
    if (!isCloudfrontCdnFontCandidate(candidate)) return candidate;
  }
  return fallback;
}

function resolveRole(option: QuestionOption): CastRole {
  const metadata = toRecord(option.metadata);
  const roleRaw = toTrimmedString(metadata?.castRole) ?? toTrimmedString(metadata?.surveyRole);
  if (roleRaw === "main") return "main";
  if (roleRaw === "friend_of") return "friend_of";
  return "unknown";
}

function resolveImagePath(option: QuestionOption): string | null {
  const metadata = option.metadata as { imagePath?: string; imageUrl?: string } | null | undefined;
  const raw = metadata?.imagePath ?? metadata?.imageUrl;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function initials(label: string): string {
  const tokens = label.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "?";
  if (tokens.length === 1) return tokens[0]!.slice(0, 2).toUpperCase();
  return `${tokens[0]![0] ?? ""}${tokens[1]![0] ?? ""}`.toUpperCase();
}

function minSeatDistance(centers: SeatCenter[]): number {
  if (centers.length <= 1) return Number.POSITIVE_INFINITY;
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < centers.length; i += 1) {
    for (let j = i + 1; j < centers.length; j += 1) {
      const a = centers[i]!;
      const b = centers[j]!;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      min = Math.min(min, distance);
    }
  }
  return min;
}

function buildArcSideCenters({
  count,
  centerX,
  arcWidth,
  arcHeight,
  direction,
}: {
  count: number;
  centerX: number;
  arcWidth: number;
  arcHeight: number;
  direction: "left" | "right";
}): SeatCenter[] {
  if (count <= 0) return [];
  const directionSign = direction === "left" ? -1 : 1;
  const tForIndex = (index: number) => (count === 1 ? 0.5 : index / (count - 1));
  const rowStepRatio = (FIGMA_REUNION_SIDE_Y_END_RATIO - FIGMA_REUNION_HOST_Y_RATIO) / count;

  return Array.from({ length: count }, (_, index) => {
    const t = tForIndex(index);
    // Keep each row at a constant vertical step from host to bottom row.
    const yRatio = FIGMA_REUNION_HOST_Y_RATIO + rowStepRatio * (index + 1);
    const offsetRatio =
      FIGMA_REUNION_SIDE_OFFSET_START_RATIO
      + (FIGMA_REUNION_SIDE_OFFSET_END_RATIO - FIGMA_REUNION_SIDE_OFFSET_START_RATIO) * t;
    return {
      x: centerX + directionSign * arcWidth * offsetRatio,
      y: arcHeight * clampNumber(yRatio, FIGMA_REUNION_SIDE_Y_START_RATIO, FIGMA_REUNION_SIDE_Y_END_RATIO),
    };
  });
}

function buildReunionCenters(
  leftCount: number,
  rightCount: number,
  arcWidth: number,
  arcHeight: number,
): SeatCenter[] {
  const centerX = arcWidth * 0.5;
  const leftCenters = buildArcSideCenters({
    count: leftCount,
    centerX,
    arcWidth,
    arcHeight,
    direction: "left",
  });
  const rightCenters = buildArcSideCenters({
    count: rightCount,
    centerX,
    arcWidth,
    arcHeight,
    direction: "right",
  });
  const hostCenter: SeatCenter = { x: centerX, y: arcHeight * FIGMA_REUNION_HOST_Y_RATIO };
  return [...leftCenters, hostCenter, ...rightCenters];
}

export function computeReunionSeatLayout(
  seatCount: number,
  containerWidth: number,
  distribution?: { leftCount: number; rightCount: number },
): ReunionSeatLayout {
  const progress = clampNumber((containerWidth - 320) / (1280 - 320), 0, 1);
  const arcWidth = Math.round(clampNumber(containerWidth - 24, 292, 760));

  const totalSideSeats = Math.max(0, seatCount - 1);
  const leftCount = distribution
    ? clampNumber(distribution.leftCount, 0, totalSideSeats)
    : Math.floor(totalSideSeats / 2);
  const rightCount = distribution
    ? clampNumber(distribution.rightCount, 0, totalSideSeats)
    : (totalSideSeats - leftCount);

  const figmaHeightRatio = FIGMA_REUNION_BASE_GROUP_HEIGHT / FIGMA_REUNION_BASE_GROUP_WIDTH;
  const figmaSeatRatio = FIGMA_REUNION_BASE_SEAT_SIZE / FIGMA_REUNION_BASE_GROUP_WIDTH;
  let arcHeight = Math.round(
    clampNumber(arcWidth * figmaHeightRatio + Math.max(0, seatCount - 11) * (12 + progress * 8), 280, 620),
  );
  const desiredSeatSize = Math.round(
    clampNumber(arcWidth * figmaSeatRatio, 48, 92),
  );
  const desiredGap = Math.round(clampNumber(8 + progress * 4, 8, 14));

  let centers = buildReunionCenters(leftCount, rightCount, arcWidth, arcHeight);
  let maxSeatFromSpacing = Math.floor(minSeatDistance(centers) - desiredGap);
  let seatSize = Math.min(desiredSeatSize, maxSeatFromSpacing);

  let attempts = 0;
  while (seatSize < 42 && arcHeight < 620 && attempts < 6) {
    arcHeight = Math.round(clampNumber(arcHeight + 28, 250, 620));
    centers = buildReunionCenters(leftCount, rightCount, arcWidth, arcHeight);
    maxSeatFromSpacing = Math.floor(minSeatDistance(centers) - desiredGap);
    seatSize = Math.min(desiredSeatSize, maxSeatFromSpacing);
    attempts += 1;
  }

  seatSize = Math.round(clampNumber(seatSize, 36, 92));
  const seatStroke = Math.max(2, Math.round(seatSize * 0.04));
  const hostSize = seatSize;
  const hostCenterY = centers[Math.max(0, leftCount)]?.y ?? Math.round(arcHeight * 0.28);

  return {
    arcWidth,
    arcHeight,
    seatSize,
    seatStroke,
    hostSize,
    hostCenterY,
    centers,
  };
}

function tokenId(kind: DragToken["kind"], optionId: string): string {
  return `${kind}-token-${optionId}`;
}

function parseTokenId(id: string): { kind: DragToken["kind"]; optionId: string } | null {
  if (id.startsWith("full_time-token-")) {
    return { kind: "full_time", optionId: id.replace("full_time-token-", "") };
  }
  if (id.startsWith("friend-token-")) {
    return { kind: "friend", optionId: id.replace("friend-token-", "") };
  }
  return null;
}

function fullTimeSeatId(index: number): string {
  return `fulltime-seat-${index}`;
}

function parseFullTimeSeatId(id: string): number | null {
  if (!id.startsWith("fulltime-seat-")) return null;
  const raw = Number.parseInt(id.replace("fulltime-seat-", ""), 10);
  return Number.isFinite(raw) ? raw : null;
}

function DraggableCastCircleToken({
  option,
  kind,
  disabled,
  active,
  sizePx = 56,
  testId,
  onClick,
}: {
  option: SeatingOption;
  kind: DragToken["kind"];
  disabled?: boolean;
  active?: boolean;
  sizePx?: number;
  testId?: string;
  onClick?: () => void;
}) {
  const id = tokenId(kind, option.id);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <CastCircleToken
      ref={setNodeRef}
      onClick={onClick}
      label={option.label}
      img={option.imagePath}
      selected={Boolean(active)}
      sizeVariant="custom"
      sizePx={sizePx}
      draggable={!disabled}
      disabled={disabled}
      {...listeners}
      {...attributes}
      style={style}
      aria-label={`Drag ${option.label}`}
      data-testid={testId}
    />
  );
}

function DroppableSeat({
  id,
  label,
  style,
  disabled,
  onClick,
  children,
  isFriendSeat = false,
  isActive = false,
  dashed = false,
}: {
  id: string;
  label: string;
  style: React.CSSProperties;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  isFriendSeat?: boolean;
  isActive?: boolean;
  dashed?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute rounded-full transition-transform focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/20"
      style={{
        ...style,
        borderStyle: dashed && !isActive ? "dashed" : "solid",
        borderColor: isOver ? "#111111" : style.borderColor,
        transform: isOver ? "translate(-50%, -50%) scale(1.02)" : "translate(-50%, -50%)",
        opacity: disabled ? 0.62 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      aria-label={label}
      data-testid={id}
      aria-pressed={isFriendSeat ? isActive : undefined}
    >
      {children}
    </button>
  );
}

export default function ReunionSeatingPredictionInput({
  question,
  value,
  onChange,
  disabled = false,
}: ReunionSeatingPredictionInputProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState(390);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applyWidth = (next: number) => {
      if (!Number.isFinite(next) || next <= 0) return;
      setContainerWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    };

    applyWidth(container.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (typeof measured === "number") applyWidth(measured);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const sortedOptions = React.useMemo(
    () =>
      [...question.options]
        .sort((a, b) => a.display_order - b.display_order)
        .map<SeatingOption>((option) => ({
          id: option.option_key,
          label: option.option_text,
          imagePath: resolveImagePath(option),
          castRole: resolveRole(option),
        })),
    [question.options],
  );

  const fullTime = React.useMemo(() => {
    const mains = sortedOptions.filter((option) => option.castRole === "main");
    return mains.length > 0 ? mains : sortedOptions.filter((option) => option.castRole !== "friend_of");
  }, [sortedOptions]);

  const friends = React.useMemo(
    () => sortedOptions.filter((option) => option.castRole === "friend_of"),
    [sortedOptions],
  );

  const hasSingleFriend = friends.length === 1;
  const singleFriend = hasSingleFriend ? friends[0] : null;

  const [selectedFullTimeId, setSelectedFullTimeId] = React.useState<string | null>(null);
  const [fullTimeOrder, setFullTimeOrder] = React.useState<string[]>(
    () => value?.fullTimeOrder?.slice(0, fullTime.length) ?? Array(fullTime.length).fill(""),
  );
  const [friendSide, setFriendSide] = React.useState<"left" | "right" | null>(
    () => value?.friendSide ?? null,
  );
  const [activeDragToken, setActiveDragToken] = React.useState<DragToken | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  React.useEffect(() => {
    setFullTimeOrder((prev) => {
      const validIds = new Set(fullTime.map((option) => option.id));
      const normalized = prev
        .map((entry) => (validIds.has(entry) ? entry : ""))
        .slice(0, fullTime.length);
      while (normalized.length < fullTime.length) normalized.push("");
      return normalized;
    });
  }, [fullTime]);

  const configRecord = React.useMemo(
    () => ((question.config ?? {}) as UnknownRecord),
    [question.config],
  );
  const config = (question.config ?? {}) as unknown as ReunionSeatingPredictionConfig;

  const headingFont = React.useMemo(() => {
    const candidates: string[] = [];
    const paths: string[][] = [
      ["questionTextFontFamily"],
      ["headingFontFamily"],
      ["titleFontFamily"],
      ["fonts", "questionText"],
      ["fonts", "heading"],
      ["typography", "questionText"],
      ["typography", "heading"],
    ];
    for (const path of paths) pushUnique(candidates, readFontValue(configRecord, path));
    return resolveFont(candidates, DEFAULT_HEADING_FONT);
  }, [configRecord]);

  const headingColor = toTrimmedString(config.questionTextColor) ?? DEFAULT_HEADING_COLOR;
  const panelColor = toTrimmedString(config.componentBackgroundColor) ?? DEFAULT_PANEL_BG;
  const fullTimePrompt =
    toTrimmedString(config.fullTimePrompt) ?? "Seat the full-time cast first";
  const friendPrompt =
    toTrimmedString(config.friendPrompt) ??
    "Which couch side should this friend sit on?";

  const hostName = toTrimmedString(config.hostName) ?? DEFAULT_HOST_NAME;
  const hostImagePath = toTrimmedString(config.hostImagePath) ?? DEFAULT_HOST_IMAGE;

  const fullTimeComplete = fullTimeOrder.every((entry) => entry.length > 0);
  const stage: "full_time" | "friend_side" | "complete" = hasSingleFriend
    ? (fullTimeComplete ? (friendSide ? "complete" : "friend_side") : "full_time")
    : (fullTimeComplete ? "complete" : "full_time");

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  React.useEffect(() => {
    onChangeRef.current({
      fullTimeOrder: fullTimeOrder.filter((entry) => entry.length > 0),
      friendSide,
      completed: stage === "complete",
    });
  }, [friendSide, fullTimeOrder, stage]);

  const unassignedFullTime = React.useMemo(() => {
    const assigned = new Set(fullTimeOrder.filter(Boolean));
    return fullTime.filter((option) => !assigned.has(option.id));
  }, [fullTime, fullTimeOrder]);

  const assignFullTimeToSeat = React.useCallback((optionId: string, seatIndex: number) => {
    setFullTimeOrder((prev) => {
      const next = [...prev];
      const clampedIndex = clampNumber(seatIndex, 0, next.length - 1);
      const previousSeatIndex = next.findIndex((entry) => entry === optionId);
      if (previousSeatIndex >= 0) next[previousSeatIndex] = "";
      next[clampedIndex] = optionId;
      return next;
    });
    setSelectedFullTimeId(null);
  }, []);

  const clearFullTimeFromSeat = React.useCallback((seatIndex: number) => {
    setFullTimeOrder((prev) => {
      const next = [...prev];
      if (seatIndex >= 0 && seatIndex < next.length) {
        next[seatIndex] = "";
      }
      return next;
    });
  }, []);

  const handleSeatClick = React.useCallback((seatIndex: number) => {
    if (disabled) return;
    const currentOccupant = fullTimeOrder[seatIndex] ?? "";

    if (selectedFullTimeId) {
      assignFullTimeToSeat(selectedFullTimeId, seatIndex);
      return;
    }

    if (currentOccupant) {
      clearFullTimeFromSeat(seatIndex);
    }
  }, [assignFullTimeToSeat, clearFullTimeFromSeat, disabled, fullTimeOrder, selectedFullTimeId]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const parsed = parseTokenId(String(event.active.id));
    if (!parsed) {
      setActiveDragToken(null);
      return;
    }

    if (parsed.kind === "full_time") {
      const option = fullTime.find((entry) => entry.id === parsed.optionId);
      if (!option) {
        setActiveDragToken(null);
        return;
      }
      setActiveDragToken({
        kind: "full_time",
        optionId: option.id,
        label: option.label,
        imagePath: option.imagePath,
      });
      return;
    }

    const option = singleFriend && singleFriend.id === parsed.optionId ? singleFriend : null;
    if (!option) {
      setActiveDragToken(null);
      return;
    }
    setActiveDragToken({
      kind: "friend",
      optionId: option.id,
      label: option.label,
      imagePath: option.imagePath,
    });
  }, [fullTime, singleFriend]);

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const parsed = parseTokenId(String(event.active.id));
    const overId = event.over ? String(event.over.id) : "";
    setActiveDragToken(null);

    if (!parsed || disabled) return;

    if (parsed.kind === "full_time") {
      const seatIndex = parseFullTimeSeatId(overId);
      if (seatIndex !== null) {
        assignFullTimeToSeat(parsed.optionId, seatIndex);
        return;
      }
      if (overId === "fulltime-bank") {
        setSelectedFullTimeId((prev) => (prev === parsed.optionId ? null : prev));
      }
      return;
    }

    if (parsed.kind === "friend") {
      if (overId === "friend-seat-left") setFriendSide("left");
      if (overId === "friend-seat-right") setFriendSide("right");
      if (overId === "friend-bank") setFriendSide(null);
    }
  }, [assignFullTimeToSeat, disabled]);

  const handleContinue = React.useCallback(() => {
    if (disabled || stage !== "complete") return;
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("survey-question-continue", { detail: { questionId: question.id } }),
    );
  }, [disabled, question.id, stage]);

  const includeFriendEndSeats = hasSingleFriend && stage !== "full_time";
  // Keep arc geometry symmetric: round odd counts up per side, then hide the extra slot.
  const fullTimeSideSlotCount = Math.ceil(fullTime.length / 2);
  const leftSeatCount = fullTimeSideSlotCount + (includeFriendEndSeats ? 1 : 0);
  const rightSeatCount = fullTimeSideSlotCount + (includeFriendEndSeats ? 1 : 0);
  const arcSeatCount = leftSeatCount + 1 + rightSeatCount;
  const seatDescriptors = React.useMemo(() => {
    const descriptors: Array<
      | { kind: "host" }
      | { kind: "friend"; side: "left" | "right" }
      | { kind: "full_time"; fullTimeIndex: number }
      | { kind: "hidden_full_time" }
    > = [];
    if (includeFriendEndSeats) descriptors.push({ kind: "friend", side: "left" });
    for (let index = 0; index < fullTimeSideSlotCount; index += 1) {
      descriptors.push({ kind: "full_time", fullTimeIndex: index });
    }
    descriptors.push({ kind: "host" });
    for (let slotIndex = 0; slotIndex < fullTimeSideSlotCount; slotIndex += 1) {
      const fullTimeIndex = fullTimeSideSlotCount + slotIndex;
      if (fullTimeIndex < fullTime.length) {
        descriptors.push({ kind: "full_time", fullTimeIndex });
      } else {
        descriptors.push({ kind: "hidden_full_time" });
      }
    }
    if (includeFriendEndSeats) descriptors.push({ kind: "friend", side: "right" });
    return descriptors;
  }, [includeFriendEndSeats, fullTime.length, fullTimeSideSlotCount]);

  const layout = React.useMemo(
    () => computeReunionSeatLayout(arcSeatCount, containerWidth, {
      leftCount: leftSeatCount,
      rightCount: rightSeatCount,
    }),
    [arcSeatCount, containerWidth, leftSeatCount, rightSeatCount],
  );

  const progress = clampNumber((containerWidth - 320) / (1180 - 320), 0, 1);
  const headingSize = Math.round(30 + progress * 19);
  const configuredHeadingLineHeight =
    readNumberValue(configRecord, ["questionTextLineHeight"]) ??
    readNumberValue(configRecord, ["styles", "questionTextLineHeight"]);
  const headingLineHeight = typeof configuredHeadingLineHeight === "number"
    ? (configuredHeadingLineHeight > 0 && configuredHeadingLineHeight < 3
      ? Math.round(headingSize * configuredHeadingLineHeight)
      : Math.round(configuredHeadingLineHeight))
    : Math.round(36 + progress * 12);
  const configuredHeadingLetterSpacing =
    readNumberValue(configRecord, ["questionTextLetterSpacing"]) ??
    readNumberValue(configRecord, ["styles", "questionTextLetterSpacing"]);
  const headingLetterSpacing = (typeof configuredHeadingLetterSpacing === "number"
    ? configuredHeadingLetterSpacing
    : (0.008 + progress * 0.002)).toFixed(4);

  const configuredOptionLineHeight =
    readNumberValue(configRecord, ["optionTextLineHeight"]) ??
    readNumberValue(configRecord, ["styles", "optionTextLineHeight"]);
  const optionLineHeight = typeof configuredOptionLineHeight === "number"
    ? (configuredOptionLineHeight > 0 && configuredOptionLineHeight < 3
      ? configuredOptionLineHeight
      : configuredOptionLineHeight / 16)
    : 1.2;
  const configuredOptionLetterSpacing =
    readNumberValue(configRecord, ["optionTextLetterSpacing"]) ??
    readNumberValue(configRecord, ["styles", "optionTextLetterSpacing"]);
  const optionLetterSpacing = (typeof configuredOptionLetterSpacing === "number"
    ? configuredOptionLetterSpacing
    : 0.08).toFixed(4);

  const panelRadius = Math.round(16 + progress * 8);
  const bankTokenSize = Math.round(clampNumber(48 + progress * 8, 48, 56));
  const optionById = React.useMemo(
    () => new Map(sortedOptions.map((option) => [option.id, option])),
    [sortedOptions],
  );

  const activeOverlayOption = React.useMemo(() => {
    if (!activeDragToken) return null;
    const option = optionById.get(activeDragToken.optionId);
    if (!option) return null;
    return option;
  }, [activeDragToken, optionById]);

  const seatTokenStyle: React.CSSProperties = {
    width: `${layout.seatSize}px`,
    height: `${layout.seatSize}px`,
    borderRadius: "9999px",
    borderWidth: `${layout.seatStroke}px`,
    borderStyle: "solid",
    borderColor: "#000000",
    backgroundColor: "#F8F8F8",
    overflow: "hidden",
    left: "0px",
    top: "0px",
  };

  return (
    <section
      ref={containerRef}
      className="mx-auto w-full max-w-[1280px]"
      style={{
        borderRadius: `${panelRadius}px`,
        backgroundColor: panelColor,
        padding: "20px 16px 26px",
      }}
      data-testid="reunion-seating-root"
    >
      <h3
        className="mx-auto max-w-[1000px] text-center"
        style={{
          fontFamily: headingFont,
          color: headingColor,
          fontSize: `${headingSize}px`,
          lineHeight: `${headingLineHeight}px`,
          letterSpacing: `${headingLetterSpacing}em`,
          fontWeight: 800,
        }}
      >
        {question.question_text}
      </h3>

      <p
        className="mt-3 text-center text-sm font-semibold uppercase text-zinc-700"
        style={{
          lineHeight: optionLineHeight,
          letterSpacing: `${optionLetterSpacing}em`,
        }}
      >
        {stage === "full_time" ? fullTimePrompt : friendPrompt}
      </p>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="relative mx-auto mt-3"
          style={{ width: `${layout.arcWidth}px`, height: `${layout.arcHeight}px` }}
          data-testid="reunion-seating-arc"
        >
          {layout.centers.map((center, seatIdx) => {
            const descriptor = seatDescriptors[seatIdx];
            const baseSeatStyle: React.CSSProperties = {
              ...seatTokenStyle,
              left: `${center.x}px`,
              top: `${center.y}px`,
              transform: "translate(-50%, -50%)",
            };

            if (!descriptor) return null;
            if (descriptor.kind === "hidden_full_time") return null;

            if (descriptor.kind === "host") {
              return (
                <div
                  key="host-seat"
                  className="absolute rounded-full border-[3px] border-black bg-white"
                  style={{
                    ...baseSeatStyle,
                    width: `${layout.hostSize}px`,
                    height: `${layout.hostSize}px`,
                  }}
                  aria-label={hostName}
                  data-testid="reunion-host-seat"
                >
                  {hostImagePath ? (
                    <Image
                      src={hostImagePath}
                      alt={hostName}
                      fill
                      unoptimized={hostImagePath.startsWith("http")}
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-zinc-800">
                      AC
                    </span>
                  )}
                </div>
              );
            }

            if (descriptor.kind === "friend") {
              const side = descriptor.side;
              const active = friendSide === side && singleFriend;
              return (
                <DroppableSeat
                  key={`friend-seat-${side}`}
                  id={`friend-seat-${side}`}
                  label={`Friend seat ${side}`}
                  style={{
                    ...baseSeatStyle,
                    borderColor: active ? "#111111" : "#999999",
                  }}
                  disabled={disabled || !fullTimeComplete || !hasSingleFriend}
                  onClick={() => {
                    if (disabled || !fullTimeComplete) return;
                    setFriendSide((prev) => (prev === side ? null : side));
                  }}
                  isFriendSeat
                  isActive={Boolean(active)}
                  dashed
                >
                  {active && singleFriend?.imagePath ? (
                    <Image
                      src={singleFriend.imagePath}
                      alt={singleFriend.label}
                      fill
                      unoptimized={singleFriend.imagePath.startsWith("http")}
                      className="object-cover"
                    />
                  ) : active && singleFriend ? (
                    <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-800">
                      {initials(singleFriend.label)}
                    </span>
                  ) : null}
                </DroppableSeat>
              );
            }

            const fullTimeIdx = descriptor.fullTimeIndex;
            const occupantId = fullTimeOrder[fullTimeIdx] ?? "";
            const occupant = occupantId ? optionById.get(occupantId) : undefined;
            return (
              <DroppableSeat
                key={`main-seat-${fullTimeIdx}`}
                id={fullTimeSeatId(fullTimeIdx)}
                label={occupant ? `Seat ${occupant.label}` : `Assign seat ${fullTimeIdx + 1}`}
                style={baseSeatStyle}
                disabled={disabled}
                onClick={() => handleSeatClick(fullTimeIdx)}
              >
                {occupant?.imagePath ? (
                  <Image
                    src={occupant.imagePath}
                    alt={occupant.label}
                    fill
                    unoptimized={occupant.imagePath.startsWith("http")}
                    className="object-cover"
                  />
                ) : occupant ? (
                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-800">
                    {initials(occupant.label)}
                  </span>
                ) : null}
              </DroppableSeat>
            );
          })}
        </div>

        <div className="mx-auto mt-3 w-full max-w-[760px]" data-testid="reunion-unassigned-bank">
          <p
            className="text-center text-xs font-semibold uppercase text-zinc-600"
            style={{ letterSpacing: `${optionLetterSpacing}em` }}
          >
            {stage === "friend_side" ? "Friend Of" : "Full-Time Cast"}
          </p>

          {stage === "friend_side" && singleFriend ? (
            <div className="mt-3 flex justify-center">
              <FriendBank
                singleFriend={singleFriend}
                disabled={disabled || !fullTimeComplete}
                tokenSize={bankTokenSize}
              />
            </div>
          ) : (
            <FullTimeBank
              options={unassignedFullTime}
              selectedId={selectedFullTimeId}
              disabled={disabled}
              tokenSize={bankTokenSize}
              onSelect={(optionId) => setSelectedFullTimeId((prev) => (prev === optionId ? null : optionId))}
            />
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOverlayOption ? (
            <div
              className="rounded-full border-[3px] border-black bg-white shadow-lg"
              style={{
                width: `${layout.seatSize}px`,
                height: `${layout.seatSize}px`,
                overflow: "hidden",
              }}
            >
              {activeOverlayOption.imagePath ? (
                <Image
                  src={activeOverlayOption.imagePath}
                  alt={activeOverlayOption.label}
                  width={layout.seatSize}
                  height={layout.seatSize}
                  unoptimized={activeOverlayOption.imagePath.startsWith("http")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-zinc-800">
                  {initials(activeOverlayOption.label)}
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {stage === "complete" && (
        <div className="mt-6 flex justify-center">
          <SurveyContinueButton
            onClick={handleContinue}
            className="mx-auto"
            data-testid={`survey-question-continue-${question.id}`}
          />
        </div>
      )}
    </section>
  );
}

function FullTimeBank({
  options,
  selectedId,
  disabled,
  tokenSize,
  onSelect,
}: {
  options: SeatingOption[];
  selectedId: string | null;
  disabled: boolean;
  tokenSize: number;
  onSelect: (optionId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "fulltime-bank" });

  return (
    <div
      ref={setNodeRef}
      className="mt-2 flex gap-3 overflow-x-auto px-1 py-2 transition sm:flex-wrap sm:justify-center sm:overflow-visible"
      style={{ outline: isOver ? "2px dashed rgba(17,17,17,0.45)" : "2px solid transparent", outlineOffset: 2 }}
      data-testid="fulltime-bank"
    >
      {options.map((option) => (
        <DraggableCastCircleToken
          key={option.id}
          option={option}
          kind="full_time"
          disabled={disabled}
          active={selectedId === option.id}
          sizePx={tokenSize}
          onClick={() => onSelect(option.id)}
          testId={`reunion-token-${option.id}`}
        />
      ))}
      {!disabled && options.length > 0 && (
        <span className="sr-only">Drag cast circles to the reunion seats</span>
      )}
    </div>
  );
}

function FriendBank({
  singleFriend,
  disabled,
  tokenSize,
}: {
  singleFriend: SeatingOption;
  disabled: boolean;
  tokenSize: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "friend-bank" });

  return (
    <div
      ref={setNodeRef}
      className="flex gap-3 overflow-x-auto px-1 py-2 transition sm:justify-center sm:overflow-visible"
      style={{ outline: isOver ? "2px dashed rgba(17,17,17,0.45)" : "2px solid transparent", outlineOffset: 2 }}
      data-testid="friend-bank"
    >
      <DraggableCastCircleToken
        option={singleFriend}
        kind="friend"
        disabled={disabled}
        sizePx={tokenSize}
        testId={`reunion-friend-token-${singleFriend.id}`}
      />
    </div>
  );
}

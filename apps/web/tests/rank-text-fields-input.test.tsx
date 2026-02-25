import React from "react";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

let dndContextProps: Record<string, ((event: unknown) => void) | undefined> = {};
let draggingId: string | null = null;
let overId: string | null = null;

vi.mock("@/lib/fonts/cdn-fonts", () => ({
  isCloudfrontCdnFontCandidate: () => false,
  resolveCloudfrontCdnFont: () => null,
}));

vi.mock("@dnd-kit/core", async () => {
  const React = await import("react");

  return {
    DndContext: ({ children, ...props }: { children: React.ReactNode }) => {
      dndContextProps = props as Record<string, ((event: unknown) => void) | undefined>;
      return <div data-testid="dnd-context">{children}</div>;
    },
    DragOverlay: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="drag-overlay">{children}</div>
    ),
    KeyboardSensor: class KeyboardSensorMock {},
    PointerSensor: class PointerSensorMock {},
    TouchSensor: class TouchSensorMock {},
    useSensor: () => ({}),
    useSensors: (...sensors: unknown[]) => sensors,
    useDraggable: ({ id }: { id: string }) => ({
      attributes: {},
      listeners: {},
      setNodeRef: () => {},
      setActivatorNodeRef: () => {},
      transform: null,
      isDragging: draggingId === id,
    }),
    useDroppable: ({ id }: { id: string }) => ({
      setNodeRef: () => {},
      isOver: overId === id,
    }),
  };
});

import RankTextFields from "@/components/survey/RankTextFields";

function makeQuestion() {
  return {
    id: "q-rank-text",
    survey_id: "survey-1",
    question_key: "rank_text_fields",
    question_text: "Rank the taglines",
    question_type: "single_choice",
    display_order: 1,
    is_required: true,
    config: { uiVariant: "rank-text-fields" },
    created_at: "",
    updated_at: "",
    options: [
      {
        id: "o1",
        question_id: "q-rank-text",
        option_key: "answer_1",
        option_text: "Answer Choice 1",
        display_order: 1,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
      {
        id: "o2",
        question_id: "q-rank-text",
        option_key: "answer_2",
        option_text: "Answer Choice 2",
        display_order: 2,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
      {
        id: "o3",
        question_id: "q-rank-text",
        option_key: "answer_3",
        option_text: "Answer Choice 3",
        display_order: 3,
        metadata: {},
        created_at: "",
        updated_at: "",
      },
    ],
  };
}

function currentOrder() {
  return screen
    .getAllByTestId(/rank-text-fields-row-/)
    .map((row) => row.getAttribute("data-testid")!.replace("rank-text-fields-row-", ""));
}

function emitDragStart(active: string) {
  draggingId = active;
  dndContextProps.onDragStart?.({ active: { id: active } });
}

function emitDragOver(active: string, over: string) {
  overId = over;
  dndContextProps.onDragOver?.({ active: { id: active }, over: { id: over } });
}

function emitDragCancel() {
  dndContextProps.onDragCancel?.({});
  draggingId = null;
  overId = null;
}

function emitDragEnd(active: string, over?: string) {
  dndContextProps.onDragEnd?.({
    active: { id: active },
    over: over ? { id: over } : null,
  });
  draggingId = null;
  overId = null;
}

describe("RankTextFields", () => {
  beforeEach(() => {
    dndContextProps = {};
    draggingId = null;
    overId = null;
  });

  it("reorders rows live on drag-over and commits on drop", () => {
    const onChange = vi.fn();
    render(
      <RankTextFields
        question={makeQuestion() as never}
        value={["answer_1", "answer_2", "answer_3"]}
        onChange={onChange}
      />,
    );

    expect(currentOrder()).toEqual(["answer_1", "answer_2", "answer_3"]);

    act(() => {
      emitDragStart("answer_1");
      emitDragOver("answer_1", "answer_3");
    });

    expect(currentOrder()).toEqual(["answer_2", "answer_3", "answer_1"]);
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      emitDragEnd("answer_1", "answer_3");
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(["answer_2", "answer_3", "answer_1"]);
  });

  it("restores original order on drag cancel", () => {
    const onChange = vi.fn();
    render(
      <RankTextFields
        question={makeQuestion() as never}
        value={["answer_1", "answer_2", "answer_3"]}
        onChange={onChange}
      />,
    );

    act(() => {
      emitDragStart("answer_1");
      emitDragOver("answer_1", "answer_3");
    });
    expect(currentOrder()).toEqual(["answer_2", "answer_3", "answer_1"]);

    act(() => {
      emitDragCancel();
    });

    expect(currentOrder()).toEqual(["answer_1", "answer_2", "answer_3"]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("restores original order and does not emit change when dropped outside", () => {
    const onChange = vi.fn();
    render(
      <RankTextFields
        question={makeQuestion() as never}
        value={["answer_1", "answer_2", "answer_3"]}
        onChange={onChange}
      />,
    );

    act(() => {
      emitDragStart("answer_1");
      emitDragOver("answer_1", "answer_3");
    });
    expect(currentOrder()).toEqual(["answer_2", "answer_3", "answer_1"]);

    act(() => {
      emitDragEnd("answer_1");
    });

    expect(currentOrder()).toEqual(["answer_1", "answer_2", "answer_3"]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses a source placeholder while dragging so only the overlay appears as active drag", () => {
    render(
      <RankTextFields
        question={makeQuestion() as never}
        value={["answer_1", "answer_2", "answer_3"]}
        onChange={() => {}}
      />,
    );

    act(() => {
      emitDragStart("answer_1");
    });

    expect(screen.getByTestId("rank-text-fields-row-answer_1")).toHaveStyle({ opacity: "0" });
    expect(screen.getByTestId("drag-overlay")).toHaveTextContent("Answer Choice 1");
  });
});

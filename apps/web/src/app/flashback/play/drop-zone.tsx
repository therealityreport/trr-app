"use client";

import { useDroppable } from "@dnd-kit/core";

interface DropZoneProps {
  id: string;
  position: number;
  isActive: boolean; // true when a drag is in progress
}

export default function DropZone({ id, position, isActive }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { position },
  });

  if (!isActive) {
    // When not dragging, render a minimal spacer so layout stays stable
    return <div className="h-1" />;
  }

  return (
    <div
      ref={setNodeRef}
      className="flex items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200"
      style={{
        height: isOver ? 72 : 40,
        borderColor: isOver ? "var(--fb-accent)" : "var(--fb-timeline)",
        backgroundColor: isOver ? "rgba(107, 107, 160, 0.08)" : "transparent",
      }}
    >
      {isOver && (
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--fb-accent)" }}
        >
          Drop here
        </span>
      )}
    </div>
  );
}

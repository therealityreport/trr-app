import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowLinksDiscoveryModal, {
  type ShowLinksDiscoveryModalProps,
} from "@/components/admin/ShowLinksDiscoveryModal";

vi.mock("@/components/admin/AdminModal", () => ({
  default: ({
    ariaLabel,
    children,
    isOpen,
  }: {
    ariaLabel?: string;
    children: ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div role="dialog" aria-label={ariaLabel}>{children}</div> : null),
}));

type ModalOverrides = {
  dialog?: Partial<ShowLinksDiscoveryModalProps["dialog"]>;
  cancellation?: Partial<ShowLinksDiscoveryModalProps["cancellation"]>;
  execution?: Partial<ShowLinksDiscoveryModalProps["execution"]>;
  progress?: Partial<ShowLinksDiscoveryModalProps["progress"]>;
};

const createProps = (overrides: ModalOverrides = {}): ShowLinksDiscoveryModalProps => {
  const props: ShowLinksDiscoveryModalProps = {
    dialog: {
      open: true,
      onClose: vi.fn(),
      status: "running",
      error: null,
      notice: "Discovery is running",
      completionNotice: "Links refresh complete. 3 discovered.",
    },
    cancellation: {
      visible: true,
      pending: false,
      buttonLabel: "Cancel job",
      onCancel: vi.fn(),
    },
    execution: {
      runLabel: "Run abcdef12",
      operationLabel: "Op fedcba98",
      owner: "remote_worker",
      backend: "modal",
      mode: "remote",
    },
    progress: {
      summary: {
        currentStage: "people",
        stageLabel: "Cast Member Pages",
        headline: "Checking cast links",
        detail: "Discovery still running...",
        budgetLabel: "Budget exhausted: candidate limit",
        elapsedLabel: "12s elapsed",
        stageElapsedLabel: "4s in this stage",
        targetSummary: "1/2 Cast Members",
        stageProgressLabel: "1/2 processed · 3 links found",
        currentTargetLabel: "Lisa Vanderpump",
        metrics: [{ label: "Discovered", value: "3" }],
        heartbeat: false,
        terminal: false,
        stalled: true,
        stalledReason: "worker heartbeat overdue",
        lastProgressAt: "2026-07-16T03:30:00.000Z",
        lastStageTransitionAt: "2026-07-16T03:29:00.000Z",
      },
      refreshing: true,
      timeoutMessage: "Cast discovery reached its time budget.",
      stalled: true,
      stalledReason: "worker heartbeat overdue",
      lastUpdateLabel: "2s ago",
      lastStageChangeLabel: "8s ago",
      validatedSourceCounts: [{ key: "bravotv", label: "BravoTV", count: 3 }],
      deletedSourceCounts: [{ key: "fandom", label: "Fandom", count: 1 }],
      hasResult: true,
    },
  };

  return {
    dialog: { ...props.dialog, ...overrides.dialog },
    cancellation: { ...props.cancellation, ...overrides.cancellation },
    execution: { ...props.execution, ...overrides.execution },
    progress: { ...props.progress, ...overrides.progress },
  };
};

describe("ShowLinksDiscoveryModal", () => {
  it("renders progress details and dispatches route-owned callbacks", () => {
    const props = createProps();

    render(<ShowLinksDiscoveryModal {...props} />);

    expect(screen.getByRole("dialog", { name: "Links discovery progress" })).toBeInTheDocument();
    expect(screen.getByText("Links Discovery")).toBeInTheDocument();
    expect(screen.getByText("running")).toHaveClass("border-blue-200");
    expect(screen.getByText("Run abcdef12")).toBeInTheDocument();
    expect(screen.getByText("Op fedcba98")).toBeInTheDocument();
    expect(screen.getByText("remote worker")).toBeInTheDocument();
    expect(screen.getByText("modal · mode remote")).toBeInTheDocument();
    expect(screen.getByText("Cast Member Pages")).toBeInTheDocument();
    expect(screen.getByText("Checking cast links")).toBeInTheDocument();
    expect(screen.getByText("Checking:")).toHaveTextContent("Lisa Vanderpump");
    expect(screen.getByText("Discovered: 3")).toBeInTheDocument();
    expect(screen.getByText("Cast discovery reached its time budget.")).toBeInTheDocument();
    expect(screen.getByText("Stalled")).toHaveClass("text-amber-700");
    expect(screen.getByText("Last stream update: 2s ago")).toBeInTheDocument();
    expect(screen.getByText("Last stage change: 8s ago")).toBeInTheDocument();
    expect(screen.getByText("BravoTV: 3")).toBeInTheDocument();
    expect(screen.getByText("Fandom: 1")).toBeInTheDocument();
    expect(screen.getByText("BravoTV: 3 live")).toBeInTheDocument();
    expect(screen.getByText("Fandom: 1 invalid deleted")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel job" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(props.cancellation.onCancel).toHaveBeenCalledOnce();
    expect(props.dialog.onClose).toHaveBeenCalledOnce();
  });

  it("preserves message precedence, terminal status styling, and pending cancellation", () => {
    const props = createProps({
      dialog: {
        status: "failed",
        error: "Discovery failed",
        completionNotice: "Completion should be hidden",
        notice: "Notice should be hidden",
      },
      cancellation: { pending: true, buttonLabel: "Cancelling..." },
      progress: { hasResult: false },
    });

    render(<ShowLinksDiscoveryModal {...props} />);

    expect(screen.getByText("Discovery failed")).toHaveClass("text-red-600");
    expect(screen.queryByText("Completion should be hidden")).not.toBeInTheDocument();
    expect(screen.queryByText("Notice should be hidden")).not.toBeInTheDocument();
    expect(screen.getByText("failed")).toHaveClass("border-rose-200");
    expect(screen.getByRole("button", { name: "Cancelling..." })).toBeDisabled();
  });

  it("preserves the queued empty state and hides cancellation when unavailable", () => {
    render(
      <ShowLinksDiscoveryModal
        {...createProps({
          dialog: { status: null, error: null, completionNotice: null, notice: null },
          cancellation: { visible: false },
          execution: {
            runLabel: "Pending",
            operationLabel: "Pending",
            owner: null,
            backend: null,
            mode: null,
          },
          progress: {
            summary: null,
            refreshing: false,
            timeoutMessage: null,
            stalled: false,
            stalledReason: null,
            lastUpdateLabel: null,
            lastStageChangeLabel: null,
            validatedSourceCounts: [],
            deletedSourceCounts: [],
            hasResult: false,
          },
        })}
      />
    );

    expect(screen.getByText("queued")).toHaveClass("border-zinc-200");
    expect(screen.getByText("Awaiting worker")).toBeInTheDocument();
    expect(screen.getByText("Start a links refresh to see live updates here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it.each([
    ["completed", "border-emerald-200"],
    ["cancelled", "border-rose-200"],
    ["cancelling", "border-zinc-200"],
  ] as const)("preserves the %s status badge", (status, className) => {
    render(<ShowLinksDiscoveryModal {...createProps({ dialog: { status } })} />);

    expect(screen.getByText(status)).toHaveClass(className);
  });
});

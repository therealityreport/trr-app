import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowHealthCenterModal, {
  type ShowHealthCenterModalProps,
} from "@/components/admin/ShowHealthCenterModal";

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

type ShowHealthCenterModalOverrides = {
  dialog?: Partial<ShowHealthCenterModalProps["dialog"]>;
  contentHealthItems?: ShowHealthCenterModalProps["contentHealthItems"];
  pipeline?: Partial<ShowHealthCenterModalProps["pipeline"]>;
  operationsInboxItems?: ShowHealthCenterModalProps["operationsInboxItems"];
  refreshLog?: Partial<ShowHealthCenterModalProps["refreshLog"]>;
};

const createProps = (
  overrides: ShowHealthCenterModalOverrides = {}
): ShowHealthCenterModalProps => {
  const props: ShowHealthCenterModalProps = {
    dialog: {
      open: true,
      onClose: vi.fn(),
      onRun: vi.fn(),
      runDisabled: false,
      runButtonLabel: "Run",
      notice: "Refresh ready",
      error: null,
      progressContent: <div data-testid="refresh-progress">Refreshing details</div>,
    },
    contentHealthItems: [
      {
        key: "show",
        label: "Show",
        countLabel: "Info set",
        status: "ready",
        onClick: vi.fn(),
      },
      {
        key: "cast",
        label: "Credits",
        countLabel: "0",
        status: "missing",
        onClick: vi.fn(),
      },
    ],
    pipeline: {
      steps: [
        {
          topic: {
            key: "show_core",
            label: "SHOW CORE",
            description: "Details and setup",
          },
          status: "failed",
          latest: {
            id: "entry-1",
            at: "2026-07-16T03:30:00.000Z",
            category: "Refresh",
            message: "Catalog Sync: waiting on upstream",
            current: 1,
            total: 2,
          },
          executionOwner: "remote_worker",
          parentOperationId: "op-1",
        },
      ],
      onRetryStep: vi.fn(),
    },
    operationsInboxItems: [
      {
        id: "op-1",
        title: "Sync prerequisites missing",
        detail: "Run Show Info first.",
        onClick: vi.fn(),
      },
    ],
    refreshLog: {
      hasEntries: true,
      topicGroups: [
        {
          topic: {
            key: "show_core",
            label: "SHOW CORE",
            description: "Details and setup",
          },
          entries: [
            {
              id: "entry-1",
              at: "2026-07-16T03:30:00.000Z",
              category: "Refresh",
              message: "Catalog Sync: waiting on upstream",
              current: 1,
              total: 2,
            },
          ],
          entriesForView: [
            {
              id: "entry-1",
              at: "2026-07-16T03:30:00.000Z",
              category: "Refresh",
              message: "Catalog Sync: waiting on upstream",
              current: 1,
              total: 2,
            },
          ],
          latest: {
            id: "entry-1",
            at: "2026-07-16T03:30:00.000Z",
            category: "Refresh",
            message: "Catalog Sync: waiting on upstream",
            current: 1,
            total: 2,
          },
          status: "failed",
        },
        {
          topic: {
            key: "bravo",
            label: "BRAVO",
            description: "Bravo sync",
          },
          entries: [],
          entriesForView: [],
          latest: null,
          status: "done",
        },
      ],
    },
  };

  return {
    ...props,
    ...overrides,
    dialog: { ...props.dialog, ...overrides.dialog },
    pipeline: { ...props.pipeline, ...overrides.pipeline },
    refreshLog: { ...props.refreshLog, ...overrides.refreshLog },
    contentHealthItems: overrides.contentHealthItems ?? props.contentHealthItems,
    operationsInboxItems: overrides.operationsInboxItems ?? props.operationsInboxItems,
  };
};

describe("ShowHealthCenterModal", () => {
  it("renders the health center sections and dispatches route-owned callbacks", () => {
    const props = createProps();

    render(<ShowHealthCenterModal {...props} />);

    expect(screen.getByRole("dialog", { name: "Health Center" })).toBeInTheDocument();
    expect(screen.getByTestId("refresh-progress")).toHaveTextContent("Refreshing details");
    expect(screen.getByText("Content Health")).toBeInTheDocument();
    expect(screen.getByText("Sync Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Operations Inbox")).toBeInTheDocument();
    expect(screen.getByText("Refresh Log")).toBeInTheDocument();
    expect(screen.getByText("BRAVO: Done ✔️")).toBeInTheDocument();
    expect(screen.getByText("(Modal)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Show Ready Info set" }));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    fireEvent.click(screen.getByRole("button", { name: "Sync prerequisites missing Run Show Info first." }));

    expect(props.dialog.onRun).toHaveBeenCalledOnce();
    expect(props.dialog.onClose).toHaveBeenCalledOnce();
    expect(props.contentHealthItems[0]?.onClick).toHaveBeenCalledOnce();
    expect(props.pipeline.onRetryStep).toHaveBeenCalledWith("show_core", "op-1");
    expect(props.operationsInboxItems[0]?.onClick).toHaveBeenCalledOnce();
  });

  it("preserves the empty inbox and refresh-log branches", () => {
    render(
      <ShowHealthCenterModal
        {...createProps({
          dialog: { notice: null },
          operationsInboxItems: [],
          refreshLog: { hasEntries: false },
        })}
      />
    );

    expect(screen.getByText("No blocking tasks.")).toBeInTheDocument();
    expect(screen.getByText("No refresh activity yet.")).toBeInTheDocument();
    expect(screen.queryByText("BRAVO: Done ✔️")).not.toBeInTheDocument();
  });
});

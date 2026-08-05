import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ShowBatchRoleModals, {
  type ShowBatchRoleModalsProps,
} from "@/components/admin/ShowBatchRoleModals";

vi.mock("@/components/admin/AdminModal", () => ({
  default: ({
    ariaLabel,
    children,
    closeLabel,
    disableClose,
    isOpen,
    onClose,
  }: {
    ariaLabel?: string;
    children: ReactNode;
    closeLabel?: string;
    disableClose?: boolean;
    isOpen: boolean;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={ariaLabel} data-disable-close={String(Boolean(disableClose))}>
        <button type="button" aria-label={closeLabel} onClick={onClose} disabled={disableClose} />
        {children}
      </div>
    ) : null,
}));

const createProps = (): ShowBatchRoleModalsProps => ({
  batchJobs: {
    open: true,
    running: false,
    operationOptions: [
      { key: "count", label: "Count", checked: true, onToggle: vi.fn() },
      { key: "crop", label: "Crop", checked: false, onToggle: vi.fn() },
    ],
    contentSectionOptions: [
      { key: "posters", label: "Posters", checked: true, onToggle: vi.fn() },
    ],
    preflightSummary: "Will process 3 assets across Posters with Count.",
    onClose: vi.fn(),
    onRun: vi.fn(),
  },
  roleRename: {
    draft: null,
    saving: false,
    onClose: vi.fn(),
    onNameChange: vi.fn(),
    onSave: vi.fn(),
  },
  castRoles: {
    draft: null,
    saving: false,
    onClose: vi.fn(),
    onRoleCsvChange: vi.fn(),
    onSave: vi.fn(),
  },
});

describe("ShowBatchRoleModals", () => {
  it("renders batch options and relays route-owned controls", () => {
    const props = createProps();
    render(<ShowBatchRoleModals {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Run image batch jobs" });
    expect(dialog).toHaveAttribute("data-disable-close", "false");
    expect(within(dialog).getByRole("checkbox", { name: "Count" })).toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Crop" })).not.toBeChecked();
    expect(within(dialog).getByRole("checkbox", { name: "Posters" })).toBeChecked();
    expect(within(dialog).getByText(props.batchJobs.preflightSummary)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Crop" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Run Batch Jobs" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Close batch jobs dialog" }));

    expect(props.batchJobs.operationOptions[1].onToggle).toHaveBeenCalledOnce();
    expect(props.batchJobs.onRun).toHaveBeenCalledOnce();
    expect(props.batchJobs.onClose).toHaveBeenCalledTimes(3);
  });

  it("preserves the batch running lock across shell and visible controls", () => {
    const props = createProps();
    props.batchJobs.running = true;
    render(<ShowBatchRoleModals {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Run image batch jobs" });
    expect(dialog).toHaveAttribute("data-disable-close", "true");
    expect(within(dialog).getByRole("button", { name: "Close batch jobs dialog" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Running..." })).toBeDisabled();
    for (const checkbox of within(dialog).getAllByRole("checkbox")) {
      expect(checkbox).toBeDisabled();
    }
  });

  it("renders the rename draft and relays edit, cancel, and save callbacks", () => {
    const props = createProps();
    props.batchJobs.open = false;
    props.roleRename.draft = { originalName: "Friend", nextName: "Housewife" };
    const { rerender } = render(<ShowBatchRoleModals {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Rename role" });
    expect(within(dialog).getByText("Current: Friend")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "New Name" }), {
      target: { value: "Guest" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Role" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(props.roleRename.onNameChange).toHaveBeenCalledWith("Guest");
    expect(props.roleRename.onSave).toHaveBeenCalledOnce();
    expect(props.roleRename.onClose).toHaveBeenCalledOnce();

    props.roleRename.saving = true;
    rerender(<ShowBatchRoleModals {...props} />);
    expect(within(dialog).getByRole("button", { name: "Close role rename dialog" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(within(dialog).getByRole("textbox", { name: "New Name" })).toBeEnabled();
  });

  it("renders the cast-role draft and preserves its saving lock", () => {
    const props = createProps();
    props.batchJobs.open = false;
    props.castRoles.draft = { personName: "Lisa Vanderpump", roleCsv: "Housewife" };
    const { rerender } = render(<ShowBatchRoleModals {...props} />);

    const dialog = screen.getByRole("dialog", { name: "Assign cast roles" });
    expect(within(dialog).getByText("Assign Roles for Lisa Vanderpump")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Roles" }), {
      target: { value: "Housewife, Friend Of" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Roles" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(props.castRoles.onRoleCsvChange).toHaveBeenCalledWith("Housewife, Friend Of");
    expect(props.castRoles.onSave).toHaveBeenCalledOnce();
    expect(props.castRoles.onClose).toHaveBeenCalledOnce();

    props.castRoles.saving = true;
    rerender(<ShowBatchRoleModals {...props} />);
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Close cast role editor" })).toBeDisabled();
    expect(within(dialog).getByRole("textbox", { name: "Roles" })).toBeEnabled();
  });
});

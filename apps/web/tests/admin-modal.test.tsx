import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import AdminModal from "@/components/admin/AdminModal";

describe("AdminModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders dialog content and closes on backdrop", () => {
    const onClose = vi.fn();
    render(
      <AdminModal isOpen={true} onClose={onClose} ariaLabel="Batch Jobs">
        <p>Modal body</p>
      </AdminModal>
    );

    expect(screen.getByRole("dialog", { name: "Batch Jobs" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Close dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses first control on open and restores prior focus on close", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open Trigger</button>
        <AdminModal isOpen={false} onClose={onClose} ariaLabel="Editor">
          <button type="button">First Action</button>
          <button type="button">Second Action</button>
        </AdminModal>
      </>
    );

    const trigger = screen.getByRole("button", { name: "Open Trigger" });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open Trigger</button>
        <AdminModal isOpen={true} onClose={onClose} ariaLabel="Editor">
          <button type="button">First Action</button>
          <button type="button">Second Action</button>
        </AdminModal>
      </>
    );

    expect(screen.getByRole("button", { name: "First Action" })).toHaveFocus();

    rerender(
      <>
        <button type="button">Open Trigger</button>
        <AdminModal isOpen={false} onClose={onClose} ariaLabel="Editor">
          <button type="button">First Action</button>
          <button type="button">Second Action</button>
        </AdminModal>
      </>
    );

    expect(screen.getByRole("button", { name: "Open Trigger" })).toHaveFocus();
  });

  it("respects disableClose for escape/backdrop", () => {
    const onClose = vi.fn();
    render(
      <AdminModal isOpen={true} onClose={onClose} disableClose={true} ariaLabel="Protected">
        <p>Locked</p>
      </AdminModal>
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByLabelText("Close dialog"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("has no basic axe violations", async () => {
    const onClose = vi.fn();
    const { container } = render(
      <AdminModal isOpen={true} onClose={onClose} ariaLabel="Accessible dialog">
        <button type="button">Primary action</button>
      </AdminModal>
    );

    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});

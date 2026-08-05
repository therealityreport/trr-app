"use client";

import AdminModal from "@/components/admin/AdminModal";

export type ShowBatchRoleToggleOption = Readonly<{
  key: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}>;

export type ShowBatchRoleModalsProps = {
  batchJobs: {
    open: boolean;
    running: boolean;
    operationOptions: ReadonlyArray<ShowBatchRoleToggleOption>;
    contentSectionOptions: ReadonlyArray<ShowBatchRoleToggleOption>;
    preflightSummary: string;
    onClose: () => void;
    onRun: () => void;
  };
  roleRename: {
    draft: Readonly<{
      originalName: string;
      nextName: string;
    }> | null;
    saving: boolean;
    onClose: () => void;
    onNameChange: (name: string) => void;
    onSave: () => void;
  };
  castRoles: {
    draft: Readonly<{
      personName: string;
      roleCsv: string;
    }> | null;
    saving: boolean;
    onClose: () => void;
    onRoleCsvChange: (roleCsv: string) => void;
    onSave: () => void;
  };
};

export default function ShowBatchRoleModals({
  batchJobs,
  roleRename,
  castRoles,
}: ShowBatchRoleModalsProps) {
  return (
    <>
      <AdminModal
        isOpen={batchJobs.open}
        onClose={batchJobs.onClose}
        disableClose={batchJobs.running}
        closeLabel="Close batch jobs dialog"
        ariaLabel="Run image batch jobs"
        panelClassName="max-w-2xl p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Batch Jobs
            </p>
            <h4 className="text-lg font-semibold text-zinc-900">Run Image Jobs</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Select one or more operations and content types. Jobs run on the currently visible gallery assets.
            </p>
          </div>
          <button
            type="button"
            onClick={batchJobs.onClose}
            className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
            disabled={batchJobs.running}
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Operations
            </p>
            <div className="flex flex-wrap gap-2">
              {batchJobs.operationOptions.map((option) => (
                <label
                  key={option.key}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={option.onToggle}
                    disabled={batchJobs.running}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Content Types
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {batchJobs.contentSectionOptions.map((option) => (
                <label
                  key={option.key}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={option.onToggle}
                    disabled={batchJobs.running}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            {batchJobs.preflightSummary}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={batchJobs.onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            disabled={batchJobs.running}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={batchJobs.onRun}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={batchJobs.running}
          >
            {batchJobs.running ? "Running..." : "Run Batch Jobs"}
          </button>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={Boolean(roleRename.draft)}
        onClose={roleRename.onClose}
        disableClose={roleRename.saving}
        closeLabel="Close role rename dialog"
        ariaLabel="Rename role"
        panelClassName="max-w-md"
      >
        {roleRename.draft && (
          <>
            <h4 className="text-lg font-semibold text-zinc-900">Rename Role</h4>
            <p className="mt-1 text-sm text-zinc-500">
              Current: {roleRename.draft.originalName}
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              New Name
              <input
                value={roleRename.draft.nextName}
                onChange={(event) => roleRename.onNameChange(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                placeholder="Housewife"
                required
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={roleRename.onClose}
                disabled={roleRename.saving}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={roleRename.onSave}
                disabled={roleRename.saving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {roleRename.saving ? "Saving..." : "Save Role"}
              </button>
            </div>
          </>
        )}
      </AdminModal>

      <AdminModal
        isOpen={Boolean(castRoles.draft)}
        onClose={castRoles.onClose}
        disableClose={castRoles.saving}
        closeLabel="Close cast role editor"
        ariaLabel="Assign cast roles"
        panelClassName="max-w-xl"
      >
        {castRoles.draft && (
          <>
            <h4 className="text-lg font-semibold text-zinc-900">
              Assign Roles for {castRoles.draft.personName}
            </h4>
            <p className="mt-1 text-sm text-zinc-500">
              Enter comma-separated role names. Missing roles will be created automatically.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Roles
              <textarea
                value={castRoles.draft.roleCsv}
                onChange={(event) => castRoles.onRoleCsvChange(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
                rows={4}
                placeholder="Housewife, Friend Of"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={castRoles.onClose}
                disabled={castRoles.saving}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={castRoles.onSave}
                disabled={castRoles.saving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {castRoles.saving ? "Saving..." : "Save Roles"}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    </>
  );
}

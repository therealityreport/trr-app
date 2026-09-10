# Unit-test archive — September 9, 2026

Archived 502 currently passing Vitest files under the user-requested retention rule. Kept 9 files revised within 14 days or in the latest merged PR; both recently failing unit-test files are included. No tests changed during the tooling upgrade. This is a retention decision, not a finding that the archived behavioral coverage is redundant or obsolete.

All 511 files (3,000 tests) passed immediately before this cleanup. Failure history was checked against the Web CI runs within the 14-day window. Historical failure evidence is incomplete outside that window. E2E tests, standalone runtime checks, shared setup, mocks, and helpers are unchanged.

`inventory.json` records the base revision, original paths, edit dates, file sizes, SHA-256 checksums, retained files, and CI failure links. `tests.tar.gz` contains each archived file at its original repository-relative path. Every archived byte was verified before removal from active discovery.

To restore, first extract into a temporary directory and compare against the current checkout. Copy only the desired tests back into their original paths; do not overwrite newer files blindly. For example, from the TRR-APP repository root:

```sh
restore_dir=$(mktemp -d)
tar -xzf docs/testing/archives/2026-09-09-unit-tests/tests.tar.gz -C "$restore_dir"
printf '%s\n' "$restore_dir"
```

Quick validation now uses retained routing and public identity checks plus generated-artifact validation. It no longer runs the archived validation, environment-contract, or build-wrapper unit tests. This reduces ongoing regression protection in those areas.

## Post-cleanup validation

- Existing batched CI runner: 9 retained files / 363 tests passed, exit 0.
- `make app-validate-quick`: generated artifacts unchanged and 3 files / 78 tests passed, exit 0.
- All 502 archive entries verified by SHA-256; retained files match the selected set and have no content edits.
- No archived tests remain in active discovery. Shared support files and non-unit checks remain unchanged.
- Production build remains pending explicit approval.

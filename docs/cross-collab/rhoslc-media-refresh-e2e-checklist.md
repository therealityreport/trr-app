# RHOSLC Media Refresh E2E Checklist

## Scope
Validate RHOSLC media refresh behavior across show, season, person, and per-image actions with request-id traceability and degraded Screenalytics handling.

## RHOSLC Routes
- Show page: `http://127.0.0.1:3000/admin/trr-shows/the-real-housewives-of-salt-lake-city`
- Season page (example S4): `http://127.0.0.1:3000/admin/trr-shows/the-real-housewives-of-salt-lake-city/seasons/4`
- Person page (example cast member): `http://127.0.0.1:3000/admin/trr-shows/people/7f528757-5017-4599-8252-c02f0d0736cf?showId=the-real-housewives-of-salt-lake-city`

## Mode A: Normal (Screenalytics available)
1. From `/Users/thomashulihan/Projects/TRR`, run `make dev`.
2. Confirm health:
- TRR-APP: `http://127.0.0.1:3000`
- TRR-Backend: `http://127.0.0.1:8000`
- Screenalytics API: `http://127.0.0.1:8001`
3. Open browser devtools network tab and preserve logs.

Expected baseline:
- Stream requests start quickly (first progress event within ~2s).
- No indefinite `Refreshing...` state.
- Progress logs keep updating (including heartbeat-style elapsed updates where applicable).

## Mode B: Degraded (Screenalytics unavailable)
1. From `/Users/thomashulihan/Projects/TRR`, run:
- `make stop && make down`
- `make dev-lite`
2. Confirm TRR-APP + TRR-Backend are healthy and Screenalytics endpoints are unavailable.

Expected degraded behavior:
- Count/crop-dependent steps do not hang.
- UI/log payload includes explicit unavailable/skip messaging.
- Presence of structured markers where emitted:
  - `service_unavailable`
  - `retry_after_s`
- Refresh completes (or fails fast) without endless spinner states.

## Test Matrix

### 1) Show refresh stream
Route:
- `POST /api/admin/trr-api/shows/{showId}/refresh/stream`

Steps:
1. On RHOSLC show page, trigger refresh.
2. Watch activity log and network stream events.

Pass criteria:
- Start message appears immediately.
- During long steps, progress continues and does not look idle.
- Terminal event is emitted (`complete` or structured `error`).

### 2) Season "Refresh Images" request-id trace
Route:
- `POST /api/admin/trr-api/shows/{showId}/refresh-photos/stream`

Steps:
1. On RHOSLC season page, click `Refresh Images` twice.
2. Capture two request ids from the activity log lines (`[req:...]`).
3. In network request headers confirm `x-trr-request-id` matches UI log id.
4. In SSE payload confirm `request_id` echoes same value through progress/complete events.

Pass criteria:
- Each click gets a unique request id.
- Same request id is visible in:
  - UI log lines
  - outbound proxy header
  - backend SSE payloads

### 3) Person refresh + stage controls
Route:
- `POST /api/admin/trr-api/people/{personId}/refresh-images/stream`

Steps:
1. Open RHOSLC person page.
2. Trigger `Refresh Images`, then stage actions (`Sync`, `Count`, `Crop`, `ID Text`, `Auto-Crop`, `Resize`) as exposed.

Pass criteria:
- Each action starts and terminates cleanly.
- Failure states clear disabled/loading UI.
- No stalled stream with no log updates.

### 4) Per-image lightbox actions
Actions in lightbox:
- `Refresh`, `Sync`, `Count`, `Crop`, `ID Text`, `Auto-Crop`, `Resize`

Steps:
1. Open a season/show/person gallery image in lightbox.
2. Run each action independently.

Pass criteria:
- Stage action is independently callable.
- Response details are visible in logs.
- Timeouts (if any) are explicit and stage-specific.

### 5) Degraded-mode validation (Mode B)
Steps:
1. Repeat season/person/per-image actions that require counting/cropping.
2. Confirm logs indicate degraded handling.

Pass criteria:
- Explicit unavailable/skip status, including `service_unavailable` and `retry_after_s` when emitted.
- No indefinite `Refreshing...` state.

## Evidence Template
Copy this template for each run.

```
Run timestamp:
Mode: Normal | Degraded
Page URL:
Action:
Request ID:
Network header x-trr-request-id:
SSE request_id seen:
Result: PASS | FAIL
Observed terminal event: complete | error
Notes:
Screenshot paths:
```

## Report Format
Submit results grouped by:
1. Show refresh
2. Season refresh request-id trace
3. Person refresh/stages
4. Per-image stages
5. Degraded mode

Include request ids and screenshot evidence for any failures.

## Latest Execution (2026-02-24)

Mode A (normal, `TRR_BACKEND_RELOAD=0`):
- Show refresh stream:
  - Result: PASS
  - Evidence: `/Users/thomashulihan/Projects/TRR/.logs/manual-e2e/rhoslc-normal/show-refresh-stream-sample.sse`
  - Notes: includes heartbeat payloads (`heartbeat=true`, `elapsed_ms`) and echoed `request_id`.
- Season refresh request-id stream echo:
  - Result: PASS
  - Evidence: `/Users/thomashulihan/Projects/TRR/.logs/manual-e2e/rhoslc-normal/season-refresh-stream-sample.sse`
  - Notes: immediate `starting` event + echoed `request_id`.
- Per-image stage endpoints (`mirror`, `auto-count`, `detect-text-overlay`, `variants`) on cast photo `ec03ed6e-07aa-4b7e-9dc3-6f8dab044a5b`:
  - Result: PASS

Mode B (degraded, `dev-lite`):
- Count-dependent endpoint (`cast-photos/{id}/auto-count`):
  - Result: PASS
  - Notes: fails fast (~1.45s) with explicit Screenalytics unavailable detail; no indefinite spinner/hang.

Closeout rerun (same day):
- Mode A (normal) person stream checks:
  - `refresh-images/stream` result: PASS
  - Evidence: `/Users/thomashulihan/Projects/TRR/.logs/manual-e2e/rhoslc-normal/person-refresh-stream-sample.sse`
  - Notes: first event `stage=starting` includes `request_id=req-person-refresh-runtime-1`; terminal `complete` echoes same request id.
- Mode A (normal) person reprocess stream checks:
  - `reprocess-images/stream` result: PASS
  - Evidence: `/Users/thomashulihan/Projects/TRR/.logs/manual-e2e/rhoslc-normal/person-reprocess-stream-sample.sse`
  - Notes: startup progress emitted and request id echoed in progress/complete.
- Mode B (degraded) person stream checks:
  - `refresh-images/stream` result: PASS
  - Evidence: `/Users/thomashulihan/Projects/TRR/.logs/manual-e2e/rhoslc-degraded/person-refresh-stream-sample.sse`
  - Notes: explicit `service_unavailable` + `retry_after_s` markers present; stream completes without hanging.

Outstanding:
- None.

Go/No-Go:
- **GO** for RHOSLC media refresh closeout.

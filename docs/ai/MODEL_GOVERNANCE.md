# TRR-APP Model Governance

TRR-APP does not host primary AI model inference defaults. It consumes/proxies data from TRR-Backend.

## Current Policy (Pinned This Wave)

1. No TRR-APP-specific model-default changes in this modernization wave.
2. Keep backend-facing contracts stable while SDK/runtime/tooling updates land.
3. Treat model-default changes as backend/pipeline concerns and track them in:
- `/Users/thomashulihan/Projects/TRR/TRR-Backend/docs/ai/MODEL_GOVERNANCE.md`

## Promotion and Rollback Expectations for App Integrations

Promotion:
1. Validate no response-shape drift for affected TRR-APP API proxies/pages.
2. Run representative admin-route smoke checks after backend/pipeline model promotions.

Rollback:
1. Revert backend/pipeline model defaults first.
2. Redeploy and re-run app smoke checks on impacted routes.

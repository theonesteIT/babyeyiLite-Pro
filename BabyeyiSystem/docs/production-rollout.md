# Production Rollout and Enforcement

## Merge Gates

- `backend-ci` must pass.
- `frontend-ci` must pass.
- `web-ci` must pass.
- No direct deploy if `npm run migrate:status` reports pending migrations.

## Stage Rollout

1. Stage 1: internal users only (1-2 days).
2. Stage 2: pilot schools subset (3-5 days).
3. Stage 3: full production rollout.

## Operational Checks

- `/api/health` must be green.
- `/api/metrics` must expose data.
- Error rate < 2% and p95 latency < 1s for core endpoints.

## Rollback

1. Pause traffic shift.
2. Roll back application deploy.
3. Run `npm run migrate:rollback` only for explicitly reversible migration windows.

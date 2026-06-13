# BabyeyiSystem

Baseline tooling included:

- Database migrations (Knex in `backend`)
- Strict environment validation on server start
- Observability (structured logs + metrics endpoint)

## Setup

1. Copy `.env.example` files and fill real values.
2. Install dependencies:
   - `cd backend && npm install`
   - `cd frontend && npm install`
3. Run migrations: `cd backend && npm run migrate:latest`
4. Start services:
   - Backend: `npm run dev`
   - Frontend: `npm run dev`

## Core auth tables (`users`, `staff`)

If login fails with `Table 'babyeyi.users' doesn't exist` (or `staff` is missing), create the core auth schema:

```bash
cd BabyeyiSystem/backend
npm run ensure:auth-schema
```

Then restart the API server. The script also repairs a missing primary key on `roles` when required. Run this after a fresh database setup or when restoring from a partial backup.

## Reassign legacy school id (e.g. id `0`)

Some databases have a school row with `id = 0`, which breaks APIs that treat `0` as invalid. To move it to a normal id and update all `school_id` references:

```bash
cd BabyeyiSystem/backend
node scripts/reassign-school-id.js --from=0 --dry-run
node scripts/reassign-school-id.js --from=0 --to=7
```

Omit `--to` to use `MAX(id) + 1`. Use `npm run reassign:school-id -- --from=0` as a shortcut.

## Quality checks

- Backend: `npm run lint`
- Frontend: `npm run lint && npm run build`

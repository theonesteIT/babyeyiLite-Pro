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

## Quality checks

- Backend: `npm run lint`
- Frontend: `npm run lint && npm run build`

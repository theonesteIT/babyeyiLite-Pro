# BabyeyiSystem Backend API Map (Portal Operations)

This map documents the consolidated backend used by `teacher`, `discipline`, `manager`, `accountant`, and `storekeeper` portals.

Base mounts:
- `portalOperations.js` => `/api/*`
- `shuleAvanceServices.js` => `/api/services/*`

## Role Matrix (Hardened)

- **Teacher requisition read**: `TEACHER`, `HOD`, `DOS`, `ACCOUNTANT`, `SCHOOL_ADMIN`, `SCHOOL_MANAGER`
- **Teacher requisition write**: `TEACHER`, `HOD`
- **Accountant read/write**: `ACCOUNTANT`, `SCHOOL_ADMIN`, `SCHOOL_MANAGER`
- **Store read**: `STORE_MANAGER`, `STOREKEEPER`, `ACCOUNTANT`, `SCHOOL_ADMIN`, `SCHOOL_MANAGER`
- **Store write**: `STORE_MANAGER`, `STOREKEEPER`
- **Ticha AI**: all school roles (`ALL_SCHOOL_ROLES`)
- **ShuleAvance Teacher**: `TEACHER`
- **ShuleAvance Accountant**: `ACCOUNTANT`
- **ShuleAvance Manager**: `SCHOOL_MANAGER`, `SCHOOL_ADMIN`, `CEO`

## Teacher Portal APIs

- `GET /api/teacher-portal/requisitions`
- `POST /api/teacher-portal/requisitions`
- `GET /api/services/shule-avance/teacher/my-requests`
- `POST /api/services/shule-avance/teacher/requests`
- `PUT /api/services/shule-avance/teacher/requests/:id`
- `DELETE /api/services/shule-avance/teacher/requests/:id`

## Accountant Portal APIs

- `GET /api/accountant/requisitions`
- `POST /api/accountant/requisitions`
- `PATCH /api/accountant/requisitions/:id/status`
- `GET /api/accountant/expenses`
- `POST /api/accountant/expenses`
- `PATCH /api/accountant/expenses/:id/status`
- `POST /api/accountant/expenses/:id/payments`
- `DELETE /api/accountant/expenses/:id` (soft delete)
- `DELETE /api/accountant/expenses/:expenseId/payments/:paymentId` (soft delete)
- `GET /api/accountant/payroll/config`
- `PUT /api/accountant/payroll/rates`
- `PATCH /api/accountant/payroll/staff/:userId`
- `GET /api/accountant/payroll/runs`
- `GET /api/accountant/payroll/runs/:id`
- `POST /api/accountant/payroll/runs/trigger`
- `GET /api/services/shule-avance/finance/pending-invoices`
- `PATCH /api/services/shule-avance/finance/invoice-requests/:id/send-to-manager`
- `PATCH /api/services/shule-avance/finance/invoice-requests/:id/reject`

## Manager Portal APIs

- `GET /api/services/shule-avance/manager/pending-requests`
- `PATCH /api/services/shule-avance/manager/invoice-requests/:id/decision`
- `GET /api/accountant/requisitions` (oversight view)
- `GET /api/accountant/expenses` (oversight view)
- `GET /api/accountant/payroll/config` (oversight view)
- `GET /api/accountant/payroll/runs`
- `GET /api/accountant/payroll/runs/:id`
- `GET /api/store/requisitions` (oversight view)
- `GET /api/store/inventory` (oversight view)
- `GET /api/store/suppliers` (oversight view)
- `GET /api/store/movements` (oversight view)

## Admin / Ops APIs

- `GET /api/admin/portal-audit-logs`
  - Filters: `portal`, `entity`, `action`, `userId`, `from`, `to`, `page`, `limit`

## Storekeeper / Store Manager APIs

- `GET /api/store/requisitions`
- `PATCH /api/store/requisitions/:id/status`
- `GET /api/store/inventory`
- `POST /api/store/inventory`
- `PATCH /api/store/inventory/:id`
- `DELETE /api/store/inventory/:id` (soft delete)
- `GET /api/store/suppliers`
- `POST /api/store/suppliers`
- `PATCH /api/store/suppliers/:id`
- `DELETE /api/store/suppliers/:id` (soft delete)
- `GET /api/store/movements`
- `POST /api/store/movements`

## Discipline Portal APIs

Current state:
- No dedicated discipline-only CRUD endpoints exist yet in `portalOperations.js`.
- Discipline users can use shared helper features:
  - `GET /api/tools/ticha-ai/history`
  - `POST /api/tools/ticha-ai/assist`

Recommendation:
- Add a dedicated discipline module under `/api/discipline/*` if your frontend now needs incident/case workflows.

## Audit + Soft Delete Notes

- Mutating operations now write to `portal_operation_audit_logs`.
- Soft delete is enabled for these record groups:
  - `store_inventory_items`
  - `store_suppliers`
  - `store_movements` (read excludes deleted records)
  - `accountant_expenses`
  - `accountant_expense_payments`
  - `portal_requisitions` (filtered to exclude deleted records)
- Existing list/read APIs exclude records with `deleted_at IS NOT NULL`.

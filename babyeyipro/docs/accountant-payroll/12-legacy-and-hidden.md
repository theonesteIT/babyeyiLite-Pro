# Legacy & Hidden Pages

Pages that exist in codebase but are **not** in the main payroll workflow or use **mock data**.

---

## Bulk Salary Import

**Route:** `/payroll/bulk-import`  
**Component:** `BulkSalaryImport.jsx`  
**Sidebar:** Commented out

| Aspect | Status |
|--------|--------|
| UI | 4-step wizard (Upload → Validate → Preview → Import) |
| Data | **MOCK_PREVIEW** hardcoded rows |
| API | None — simulated timeout import |
| Purpose | UI prototype for bulk salary updates |

**Recommendation:** Wire to `saveStaffPayrollProfile` batch API or merge with Employee Import. See [14-recommended-features](./14-recommended-features.md).

---

## Configure Payroll (PayrollConfig)

**Route:** `/payroll/config`  
**Component:** `PayrollConfig.jsx`  
**Sidebar:** Commented out

Legacy **Payroll Management workspace** using shared components:

- `PayrollWorkspaceTabs.jsx`
- `PayrollPaymentTrackerPanel.jsx`
- `PayrollInvoiceDetailPanel.jsx`
- Payroll requests, invoices, payment tracker

Superseded by: Run → Salary Payment → Disbursement flow.

---

## Payroll History

**Route:** `/payroll/history`  
**Component:** `PayrollHistory.jsx`  
**Sidebar:** Commented out  
**BottomNav:** Mobile **Payroll** tab still points here ⚠️

Legacy multi-step **Payroll Requests** wizard and history list.

---

## PayrollCenter

**Component:** `PayrollCenter.jsx`  
**Routed:** No

Monolithic mock payroll dashboard with local seed data (~legacy).

---

## SalaryAdjustments

**Component:** `Payroll/SalaryAdjustments.jsx`  
**Routed:** No

Mock UI for mid-month salary adjustments — not connected to API.

---

## SampleSalaryTemplate

**Component:** `Payroll/SampleSalaryTemplate.jsx`  
**Routed:** No

Reference/demo layout for salary template design.

---

## Migration guidance

| Legacy | Replace with |
|--------|--------------|
| Payroll History | Payroll Run + Salary Payment |
| PayrollConfig | Salary Template + Disbursement |
| BulkSalaryImport | Employee Import + Staff Salary Setup |
| PayrollCenter | Dashboard + Payroll Run |
| BottomNav `/payroll/history` | `/payroll/run` |

---

## Related

- [14-recommended-features](./14-recommended-features.md)

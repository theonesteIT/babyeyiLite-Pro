# Payroll Engine — Rwanda Calculation Logic

**File:** `frontend/src/utils/rwandaPayrollEngine.js`  
**Channels:** `shared/payroll/payrollTemplateChannels.js`

This is the **single source of truth** for client-side payroll math. Every preview (Template, Staff Setup, Payroll Run, Reports) should go through `calcRwandaPayroll()`.

---

## Main export: `calcRwandaPayroll(input)`

### Input shape

| Field | Description |
|-------|-------------|
| `basicSalary` | Contract basic (RWF) |
| `allowances` | Run-level or staff allowances |
| `templateAllowances` | From active salary template |
| `templateDeductions` | Template deductions |
| `employeeDeductions` | Per-employee recurring deductions (loans, SACCO, etc.) |
| `statutory` | RSSB, RAMA, CBHI, maternity, occupational hazard rates |
| `payeRates` | PAYE bracket config (defaults to Rwanda monthly bands) |
| `allowanceRules` | School auto-allowance (% of gross) |
| `storedAllowanceSplit` | Manual Others/H/A/T/A from staff profile |
| `runAllowances` | If set, disables auto school allowances |
| `forceManualAllowances` | Skip auto calc |

### Output shape (key fields)

| Field | Description |
|-------|-------------|
| `gross` | Basic + total allowances |
| `registerAllowanceSplit` | `{ others, housing, transport, totalAllowances }` |
| `paye` | Progressive PAYE amount |
| `payeBreakdown` | Band-by-band detail |
| `rssbEmployee`, `rssbEmployer` | Pension |
| `ramaEmployee`, `ramaEmployer` | Medical |
| `cbhi`, `maternityEmployee` | Other statutory |
| `templateDeductionTotal` | Template deductions (tax channel) |
| `employeeDeductionTotal` | Personal deductions |
| `taxNet` / `netSalary` | After tax-side deductions |
| `bankNetAdjust` | Bank-channel only adjustments |
| `finalNet` / `finalPayable` | Amount for bank transfer |

---

## Progressive PAYE (Rwanda monthly)

Default bands (`DEFAULT_PAYE_BRACKETS` / `RWANDA_PAYE_BAND_WIDTHS`):

| Gross slice (RWF) | Rate |
|-------------------|------|
| 0 – 60,000 | 0% |
| 60,001 – 100,000 | 10% |
| 100,001 – 200,000 | 20% |
| Above 200,000 | 30% |

Function: `calcProgressivePAYEBreakdown(gross, brackets)` — **marginal** calculation, not flat rate on full gross.

---

## Statutory defaults (`DEFAULT_STATUTORY`)

| Component | Employee % | Employer % |
|-----------|------------|------------|
| RSSB pension | 6 | 6 |
| Occupational hazard | — | 2 |
| Maternity | 0.3 | 0.3 |
| RAMA | 7.5 | 7.5 |
| CBHI | 0.5 | — |

Override via template `statutoryRates` → `normalizeStatutoryRates()`.

---

## School auto-allowances

When enabled (`DEFAULT_SCHOOL_ALLOWANCE_RULES`):

- Total allowances = **30% of gross**
- Register columns Others, H/A, T/A = **10% of gross each**
- Formula: `Gross = Basic ÷ (1 − 0.30)`

Function: `calcSchoolAllowancesFromBasic(basic, rules)`

Enabled when:

- Template allowance rules enabled
- No run-level allowance overrides
- No `forceManualAllowances`

Staff profile stored split takes precedence over auto calc.

---

## Net-to-gross mode

**File usage:** `StaffSalarySetup.jsx`

`calcNetToGrossFromDesiredNet({ desiredNet, employeeDeductions, statutory, payeRates })`

- Binary search on gross until `finalNet ≈ desiredNet`
- Used when accountant enters target take-home instead of basic

---

## Allowance & deduction categories

**Allowances:** Transport, Housing, Communication, Responsibility, Risk, Meal, Overtime, Bonus, etc.

**Deductions:** Loan, Salary Advance, SACCO, Union, Penalty, Court Order, Insurance, etc.

Template items support amount types:

- Fixed Amount
- Percentage of Basic Salary
- Percentage of Gross Salary

---

## Channel filtering

```javascript
filterForTaxPayroll(items)   // tax + both
filterForBankPayroll(items)  // bank + both
buildTaxPayrollItems(...)    // amounts for tax register
bankPayrollNetAdjust(...)    // bank-only net adjustments
```

**Rule:** `both` channel items affect tax net; `bank`-only items adjust disbursement net on top.

---

## Integration points

| Consumer | Uses engine for |
|----------|-----------------|
| `SalaryTemplate.jsx` | Live preview register while editing template |
| `StaffSalarySetup.jsx` | Per-staff package + net-to-gross |
| `PayrollRun.jsx` | Pre-run preview + run-level adjustments |
| `payrollPreview.js` | Batch preview rows |
| `payrollReportTables.js` | Report row enrichment |
| `terminationBenefitsCalc.js` | Settlement net salary reference |
| `terminatedMonthPayroll.js` | Final month pro-rata |

---

## Developer checklist when changing math

1. Update `calcRwandaPayroll()` only — avoid duplicate formulas in pages.
2. Sync register columns in `payrollRegister.js` headers.
3. Update export PDFs/Excel in `payrollReportExport.js`.
4. Verify tax **and** bank report tabs still sum correctly.
5. Test with: auto-allowances ON/OFF, stored split, bank-only deductions, terminated staff row.

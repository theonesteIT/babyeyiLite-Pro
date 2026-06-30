# HR Dashboard

**Route:** `/manager/hr`  
**Component:** `HRDashboard.jsx`

---

## Purpose

Workforce overview at a glance — KPIs, trends, department mix, gender split, quick actions, and HR alerts.

---

## Layout & design

```
┌─────────────────────────────────────────────────────────────┐
│  HERO (navy) — "HR Dashboard" + subtitle                    │
│  KPI row: Total | Active | Teachers | On Leave              │
│  Embedded chart card: Staff growth trend (12 months)         │
└─────────────────────────────────────────────────────────────┘
┌──────────────────────────────┬──────────────────────────────┐
│ Employees by department      │ Gender distribution          │
│ Horizontal bar chart         │ Donut + legend               │
└──────────────────────────────┴──────────────────────────────┘
┌──────────────────────────────┬──────────────────────────────┐
│ Quick actions (2×3 grid)     │ Alerts panel                 │
└──────────────────────────────┴──────────────────────────────┘
```

- **Hero KPI tiles:** 4 cards in a 2×2 (mobile) / 4-column (desktop) grid
- **Growth chart:** `HrGrowthTrendChart` — monthly hire trend with gradient ochre bars
- **Department bars:** Gradient fill `#c87800` → `#FEBF10`, count on the right
- **Gender donut:** SVG ring chart (Male 58% / Female 42% in demo data)
- **Quick action buttons:** Rounded-xl, slate-50 background, hover amber border

---

## Features

### KPI summary (hero)

| KPI | Description |
|-----|-------------|
| **Total Employees** | Full active workforce count |
| **Active** | Active staff + active rate % |
| **Teachers** | Teaching staff count + % of total |
| **On Leave** | Staff currently on leave + % |

> Note: Dashboard currently uses **sample/static data** for department and gender charts; KPI hero values are demo figures (200 total, 187 active, etc.).

### Staff growth trend

- 12-month bar series built from `buildGrowthTrendSeries()`
- Shown inside the hero overlap card (`embedded` mode)

### Employees by department

- Bar list for: Academics, Administration, Finance, ICT, Library, Support
- Each row: name, progress bar (%), employee count

### Gender distribution

- Donut chart with center total
- Legend: Male / Female with color swatches

### Quick actions

| Action | Navigates to | Status |
|--------|--------------|--------|
| Add Employee | `/hr/registration` | ✅ Live |
| New Contract | `/hr/contracts` | ✅ Live |
| Upload Docs | `/hr/documents` | ✅ Live |
| Approve Leave | `/hr/leave` | ✅ Live |
| Transfer | — | 🔶 UI only (no route) |
| Promote | — | 🔶 UI only (no route) |

### Alerts panel

Color-coded `HrAlert` cards:

| Variant | Example |
|---------|---------|
| Danger | Contracts expiring this week |
| Warning | Employees missing documents |
| Info | Probation periods ending soon |
| Success | Birthdays this month |

> Alerts are **illustrative** on the dashboard (not yet wired to live API).

---

## Related pages

- [Employee Directory](./02-employee-directory.md) — full staff list
- [Leave Management](./06-leave-management.md) — approve leave from quick action
- [Staff Documents](./09-staff-documents.md) — document compliance

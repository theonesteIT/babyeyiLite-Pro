# Chapter 10 — Reports

**Path:** Sidebar → **Reports** → `/assets/reports`

---

## Reports hub

The overview page shows cards for each report type. Click a card to open the detailed report.

---

## Available reports

| Report | Slug | Description |
|--------|------|-------------|
| **Overview** | *(empty)* | Summary dashboard |
| **All Assets** | `all-assets` | Full register with QR codes |
| **Assets by Category** | `categories` | Quantity, cost, value by category |
| **Financial Years** | `financial-years` | Assets per register year |
| **Asset Health** | `health` | Used vs Not Used (Old) |
| **Assigned Assets** | `assignments` | Staff/department assignments |
| **Returned Assets** | `returns` | Return history |
| **Transfer Report** | `transfers` | Location/department movements |
| **Maintenance** | `maintenance` | Tickets, costs, completion |
| **Depreciation** | `depreciation` | FY engine category summary |
| **Damaged & Lost** | `damaged-lost` | Audit exceptions |
| **Location Report** | `locations` | Assets by campus/room |

**URLs:** `/assets/reports/all-assets`, `/assets/reports/depreciation`, etc.

---

## Step-by-step: Run a report

1. Open **Reports** from sidebar.
2. Click the report card (e.g. **All Assets**).
3. Apply filters if shown (year, category, date range).
4. Review table on screen.
5. Click **Export Excel** to download.

---

## All Assets report columns

Matches Asset Register:

- S/N, Asset Name, Category
- Opening Stock, Purchase Price, Total Balance
- Accumulated Depreciation, Dep Rate
- Annual Depreciation, Total Depreciation, Net Book Value
- Health Status, Quantity, QR Code

---

## Depreciation report

Shows financial year engine summary per category:
- Opening, purchases, accumulated, annual dep, closing

Useful for reconciling with Year Setup.

---

## API

```
GET /api/school/assets/reports/:type
```

Types: `overview`, `all-assets`, `categories`, `financial-years`, `health`, `assignments`, `returns`, `transfers`, `maintenance`, `depreciation`, `damaged-lost`, `locations`

Frontend: `reportsApi.js`

---

## Step-by-step: Export report to Excel

1. Open report detail page.
2. Set filters.
3. Click **Export** / **Download Excel**.
4. File saved via `reportExport.js` utility.

---

[← Operations](./09-operations.md) · [Features index](../FEATURES_INDEX.md) · [Next: QR & Scan →](./11-qr-scan.md)

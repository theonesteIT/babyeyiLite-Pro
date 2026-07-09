# Babyeyi Assets Portal — Complete Features Manual

**Version:** 2026  
**Portal URL:** `/assets`  
**Format:** Markdown — open in Word via *File → Open* or export with Pandoc.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Getting started](#2-getting-started)
3. [Year Setup](#3-year-setup)
4. [Categories](#4-categories)
5. [Add Asset form](#5-add-asset-form)
6. [Asset Register](#6-asset-register)
7. [Excel import](#7-excel-import)
8. [Export & recalculate](#8-export--recalculate)
9. [Land & Buildings](#9-land--buildings)
10. [Operations](#10-operations)
11. [Reports](#11-reports)
12. [QR & scan](#12-qr--scan)
13. [Dashboard & analytics](#13-dashboard--analytics)
14. [Feature map (developer)](#14-feature-map-developer)

**Detailed chapters:** See [features/](./features/) folder or [FEATURES_INDEX.md](./FEATURES_INDEX.md)

---

## 1. Introduction

The **Babyeyi Assets Manager Portal** manages:

- **Asset register** — opening stock, purchases, depreciation, net book value (KPS-style)
- **Financial years** — Year Setup with per-category opening balances
- **Operations** — assignments, transfers, maintenance, replacements
- **Reports & QR** — Excel exports, printable QR codes, scan lookup

### Main screens

| Screen | Path | Primary action |
|--------|------|----------------|
| Dashboard | `/assets` | Overview stats |
| **Asset Register** | `/assets/asset-add-test` | Add, edit, import, export assets |
| Year Setup | `/assets/year-setup` | Financial years & openings |
| Categories | `/assets/categories` | Category & dep rates |
| Reports | `/assets/reports` | Analytical exports |
| Operations | `/assets/assignments` etc. | Lifecycle tracking |

---

## 2. Getting started

### Step 1 — Log in
Sign in with **Assets Manager** or **Asset Manager** role → navigate to `/assets`.

### Step 2 — First-time school setup

| Order | Task | Section |
|-------|------|---------|
| 1 | Verify categories (Buildings, Land, …) | §4 |
| 2 | Create Active financial year + openings | §3 |
| 3 | Add assets (form or import) | §5, §7 |
| 4 | Verify register table | §6 |
| 5 | Recalculate if needed | §8 |

### Key terms

| Term | Meaning |
|------|---------|
| Register year | Year on asset row (e.g. 2024) |
| Active financial year | Only one Active; required for "First time" add mode |
| Opening stock | Carried value into row |
| Total balance | Opening + Purchase |
| Net book value | After depreciation (= Total balance for Land) |

---

## 3. Year Setup

**Path:** Year Setup → **+ Create Year**

### 4-step wizard

**Step 1 — Year Info:** Year (e.g. 2021), start/end dates, description.

**Step 2 — Opening Balances:** Per category:

| Column | Normal | Land |
|--------|--------|------|
| Opening stock | Enter value | Enter value only |
| Acc. dep. start | Enter value | Not used (0) |
| Rate | e.g. 5% | 0% |

**Step 3 — Rules:** Depreciation method, auto carry-forward, lock previous year.

**Step 4 — Confirmation:** Review and save.

### Multi-year example
- **2018 Closed** — Land opening only
- **2021 Active** — Current Buildings register

Land in 2018: register via Add Asset → **Not first time** → year 2018.

---

## 4. Categories

**Path:** Categories → **Add Category**

| Field | Example |
|-------|---------|
| Name | Sports Equipment |
| Depreciation rate | 15 |
| Land rate | **0** always |

Default categories: IT Equipment (25%), Furniture (10%), Vehicles (20%), Buildings (5%), **Land (0%)**, etc.

---

## 5. Add Asset form

**Path:** Asset Register → **+ Add Asset**

### Step 1 — Basic Info

1. **Register mode**
   - **First time** (green) → Active FY only
   - **Not first time** (blue) → any year (historical)
2. **Year** — select register year
3. **Asset name** *
4. **Category** * — Land / Buildings / etc.
5. **Building status** (Buildings only) — Working Progress or Finished
6. **Location** * and **Label of location** *
7. **SKU** — Auto or Manual
8. **Quantity** (1–100, creates multiple rows)
9. **Health status** — Used / Not Used (Old)

Click **Continue**.

### Step 2 — Financial Info

1. Review **Opening stock card** (auto from engine)
2. **Purchase price** *
3. Purchase date, condition, receipt refs
4. **VAT 18%** toggle
5. Review **Auto-Calculation Engine:**
   - TOTAL BALANCE = Opening + Purchase
   - Annual / Total depreciation / NET BOOK VALUE
6. Click **Save Asset**

### Land quick path
Category Land → purchase price → Annual = 0, NBV = Total balance.

### Buildings WIP quick path
Category Buildings → Working Progress → verify year-carry formula in calc panel.

---

## 6. Asset Register

**Path:** Asset Register

### Toolbar actions

| Button | Action |
|--------|--------|
| Refresh | Reload table & stats |
| Recalculate register | Full chain recalc all years |
| Export Excel | Download filtered register |
| Import Excel | Bulk import wizard |
| + Add Asset | Open add wizard |

### Table columns
S/N, Year, Name, Category, Opening, Purchase, Total Balance, Accumulated Dep, Rate, Annual Dep, Total Dep, **Net Book Value**, Health, Qty, QR.

### Filters
Search, Year, Category, Health, Date period, Old not replaced.

### Row actions
- **Click row** → preview drawer
- **Click QR** → deep link `?asset=ID`
- **Edit** → Add Asset wizard (edit mode)
- **Health menu** → change Used / Not Used (Old)
- **Delete** / bulk delete

### Stats cards
Total Assets, Purchase Value, Net Book Value, Register Years.

---

## 7. Excel import

**Path:** Asset Register → **Import Excel**

### Phases

1. **Year** — First time / Not first time + select year
2. **File** — Download template, upload Excel
3. **Preview** — ready (green) / duplicate (amber) / invalid (red)
4. **Confirm** — Import ready rows

### Template columns

`location`, `label`, `type`, `supplier`, `upi`, `sku`, `cba`, `material`, `purchase_year`, `purchase_month`, `purchase_day`, `purchase_unit_price`, `name`

**Required:** `type`, `purchase_unit_price`, `name`

### Options
- Skip duplicates (default ON)
- Auto-generate SKU (default ON)

### After import
Run **Recalculate register** for large imports.

---

## 8. Export & recalculate

### Export Excel
Filter register → **Export Excel** → up to 2000 rows with full financial columns.

### Recalculate register
**Recalculate register** → confirm → recomputes all years/categories in database.

**Run when:** after math fixes, bulk import, table ≠ edit form.

---

## 9. Land & Buildings

### Land (no depreciation)

```
Rate = 0%, Annual = 0, NBV = Total Balance = Opening + Purchase
Next year Opening = prior year last Total Balance
```

Year Setup: **Opening only** for Land.

### Buildings — Working Progress

| Case | Annual depreciation |
|------|---------------------|
| Year-carry (new year) | Prior year NBV × rate |
| Case 1 | (PP − TD) × rate |
| Case 2 (same year only) | (PP − Prior Progress PP − TD) × rate |

Prior Progress PP **never** carries across years.

### KPS reference (NEW DINNING HALL)

| Year | Annual | NBV |
|------|--------|-----|
| 2024 | 162,730,553 | 3,091,880,509 |
| 2025 | 154,594,025 | 2,937,286,484 |

---

## 10. Operations

| Module | Path | Create action |
|--------|------|---------------|
| Assignments | `/assets/assignments` | + New Assignment |
| Returns | `/assets/returns` | Via assignment return |
| Transfers | `/assets/transfers` | + New Transfer |
| Maintenance | `/assets/maintenance` | + New Request |
| Replacements | `/assets/replacements` | + New Replacement → Approve |
| Purchase Requests | `/assets/purchase-requests` | Procurement form |

Replacements **create new register asset** on approval.

---

## 11. Reports

**Path:** `/assets/reports`

| Report | Slug |
|--------|------|
| All Assets | `all-assets` |
| By Category | `categories` |
| Financial Years | `financial-years` |
| Health | `health` |
| Assignments | `assignments` |
| Returns | `returns` |
| Transfers | `transfers` |
| Maintenance | `maintenance` |
| Depreciation | `depreciation` |
| Damaged & Lost | `damaged-lost` |
| Locations | `locations` |

Each report: filter → view → **Export Excel**.

---

## 12. QR & scan

- Every register row has a **QR code**
- Scan opens `/assets/scan?code=...`
- Payload: `CODE:…|TAG:…|SN:…|ID:…`
- Auto SKU: `SCH/LOC/LABEL/00001`

---

## 13. Dashboard & analytics

| Screen | Path | Content |
|--------|------|---------|
| Dashboard | `/assets` | Summary cards, quick links |
| Analytics | `/assets/analytics` | Charts, category/year breakdowns |

---

## 14. Feature map (developer)

### Frontend files

| Feature | Page | Component | API service |
|---------|------|-----------|-------------|
| Register | `AssetAddTest.jsx` | `AddAsset2.jsx` | `assetTestApi.js` |
| Import | — | `AssetTestImportModal.jsx` | `assetTestApi.importAssets` |
| Year Setup | `YearSetUp.jsx` | `CategoryFormModal.jsx` | `assetsApi.js` |
| Categories | `Categories.jsx` | `CategoryFormModal.jsx` | `assetsApi.js` |
| Assignments | `Assignments.jsx` | `AssetAssignmentModal.jsx` | `assetsApi.js` |
| Reports | `ReportDetailPage.jsx` | — | `reportsApi.js` |
| Math | — | — | `assetRegisterMath.js` |

### Backend

| Feature | File | Key routes |
|---------|------|------------|
| Register | `schoolAssets.js` | `/test/*` |
| Year Setup | `schoolAssets.js` | `/financial-years/*` |
| Reports | `schoolAssetsReports.js` | `/reports/:type` |
| Math | `schoolAssets.js` | `computeAssetRegisterMath`, `recalcRegisterChainInCategory` |

### Documentation

| Doc | Audience |
|-----|----------|
| [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) | Developers — architecture |
| [API_REFERENCE.md](./API_REFERENCE.md) | Developers — REST API |
| [BUSINESS_RULES.md](./BUSINESS_RULES.md) | Accountants + devs — math |
| [features/](./features/) | Step-by-step per feature |

---

## Appendix — Register mode decision tree

```
Need to add asset?
├── Year is Active financial year?
│   ├── YES → First time mode → year_setup
│   └── NO  → Not first time mode → legacy → pick any year
├── Category = Land?
│   └── Year Setup opening (first year) OR prior Total Balance chain
└── Category = Buildings WIP?
    └── Set Working Progress → verify year-carry in calc panel
```

---

*Babyeyi Assets Portal — Complete Features Manual*  
*For technical architecture see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)*

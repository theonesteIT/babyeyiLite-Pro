# Chapter 05 — Asset Register (Table & Actions)

**Path:** Sidebar → **Asset Register** → `/assets/asset-add-test`

The Asset Register is the **main production screen** for the KPS-style ledger.

---

## Screen layout

```
┌─────────────────────────────────────────────────────────────┐
│  HERO: Smart Asset Entry                                     │
│  [Refresh] [Recalculate] [Export Excel] [Import] [+ Add]   │
├─────────────────────────────────────────────────────────────┤
│  STATS: Total Assets | Purchase Value | Net Book | Years    │
├─────────────────────────────────────────────────────────────┤
│  FILTERS: Search | Year | Category | Health | Date | Old NR  │
├─────────────────────────────────────────────────────────────┤
│  TABLE (paginated, 30 rows/page)                             │
│  S/N | YEAR | NAME | CATEGORY | OPENING | PURCHASE | ...    │
├─────────────────────────────────────────────────────────────┤
│  PAGINATION                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Table columns

| Column | Description |
|--------|-------------|
| S/N | Row number on current page |
| YEAR | Register year |
| ASSET NAME | Asset name |
| CATEGORY | Category name |
| OPENING STOCK | Chain-calculated opening |
| PURCHASE PRICE | Unit price |
| TOTAL BALANCE | Opening + Purchase |
| ACCUMULATED DEPRECIATION | Year-start accumulated |
| DEPRECIATION RATE | Category rate % |
| ANNUAL DEPRECIATION | This year's charge |
| TOTAL DEPRECIATION | Accumulated + Annual |
| NET BOOK VALUE | Highlighted closing value |
| HEALTH STATUS | Used / Not Used (Old) |
| QUANTITY | Usually 1 |
| QR | Clickable QR code |

**Tip:** Scroll horizontally — prompt says "Scroll horizontally to see all columns".

Displayed financials use **chain enrichment** so table matches the edit form.

---

## Step-by-step: Filter the register

### Search
Type asset name or code in the search box. Results filter after short delay.

### Filter by year
Select register year from dropdown (e.g. `2024`).

### Filter by category
Select category (e.g. `Buildings`).

### Filter by health status
- Used
- Not Used (Old)

### Date period filter
Filter by purchase date range.

### Old not replaced filter
Shows old assets not yet replaced (links from Replacements module).

### Clear filters
Reset dropdowns and search; table reloads.

---

## Step-by-step: View asset details

### Method A — Click row
1. Click any table row.
2. **Preview drawer** slides in from the right.
3. See asset summary, financials, QR.

### Method B — Click QR
1. Click QR cell.
2. Opens register page with `?asset=ID` in URL (shareable link).

### Method C — QR scan
Scan physical QR → opens `/assets/scan?code=...`

---

## Step-by-step: Edit an asset

1. Open preview drawer or select row.
2. Click **Edit** (or edit from drawer).
3. **Add Asset wizard** opens in edit mode with saved values.
4. Modify fields → Save.
5. Table refreshes; chain recalculates for that category/year.

---

## Step-by-step: Change health status

1. Find **Health Status** column.
2. Click status badge/menu on the row.
3. Select **Used** or **Not Used (Old)**.
4. Saves immediately via API.

---

## Step-by-step: Delete assets

### Single delete
1. Select row / open actions.
2. Confirm delete.

### Bulk delete
1. Check boxes on multiple rows (if enabled).
2. Click bulk delete.
3. Confirm.

Deleted assets are soft-deleted (`deleted_at` set).

---

## Step-by-step: Refresh data

Click **Refresh** in hero bar:
- Reloads stats and table
- If year filter set, attempts chain recalc for that year (best-effort)

---

## Stats cards (top)

| Card | Meaning |
|------|---------|
| Total Assets | Count of register rows |
| Purchase Value | Sum of unit prices |
| Net Book Value | Sum of net book after dep |
| Register Years | Distinct years in register |

---

## URL deep linking

| URL param | Effect |
|-----------|--------|
| `?asset=123` | Opens preview for asset ID 123 |
| `?code=KPS/...` | Resolves code and opens preview |
| `?health=Not+Used+(Old)` | Pre-filters health |
| `?old_not_replaced=1` | Old not replaced filter |

---

## Developer notes

| Item | Location |
|------|----------|
| Page component | `AssetAddTest.jsx` |
| Chain math | `enrichRegisterChainFinancials()` |
| API list | `assetTestApi.listAssets()` |
| Page size | 30 (`PAGE_SIZE`) |

**Pagination caveat:** Chain math runs on **current page rows**. For full-year accuracy, run **Recalculate register** to persist DB values.

---

[← Add Asset Form](./04-add-asset-form.md) · [Features index](../FEATURES_INDEX.md) · [Next: Excel Import →](./06-excel-import.md)

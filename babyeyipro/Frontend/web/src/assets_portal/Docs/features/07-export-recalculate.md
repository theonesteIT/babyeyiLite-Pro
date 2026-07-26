# Chapter 07 — Export Excel & Recalculate Register

---

## Export Excel

**Path:** Asset Register → **Export Excel**

### Step-by-step

1. Optionally set filters (year, category) — export respects current filters.
2. Click **Export Excel**.
3. Wait for download (loads up to 2000 rows).
4. File includes chain-enriched columns:
   - Year, name, category
   - Opening, purchase, total balance
   - Accumulated, rate, annual dep, total dep, net book
   - Health status

**Use case:** Compare with KPS reference spreadsheet, audit, share with accountants.

---

## Recalculate Register

**Path:** Asset Register → **Recalculate register**

### What it does

Recomputes for **all register years and categories**:

- Opening amounts (chain order by asset `id`)
- Accumulated depreciation (year-start from prior year total dep)
- Annual depreciation, total depreciation, net book value
- Buildings WIP and Land rules

Writes corrected values to **database** (`school_assets` table).

### Step-by-step

1. Click **Recalculate register**.
2. Confirm dialog:
   > Recalculate the full asset register for all years?
3. Wait (may take minutes for large registers).
4. Success message shows count of assets recalculated.
5. Table auto-refreshes.

### When to run

| Situation | Run recalc? |
|-----------|-------------|
| After code/math fix | **Yes** |
| After bulk Excel import | **Yes** |
| Table ≠ edit form | **Yes**, then hard refresh (Ctrl+F5) |
| After editing one asset | Usually no (single row recalcs on save) |
| After Year Setup change | **Yes** for affected years |

### Partial recalc (developer/API)

```
POST /api/school/assets/test/recalc-chain
{ "register_year": 2024, "category": "Buildings" }
```

Recalculates one category-year only.

---

## Refresh button

**Path:** Asset Register → **Refresh**

- Reloads stats + table
- If year filter active, best-effort chain recalc for that year before load

Lighter than full recalculate — use for normal refresh after adds.

---

## Compare export with KPS

1. Export register filtered to **Buildings** + years 2021–2025.
2. Open KPS reference: `assets_portal/Docs/new asset register kps.xlsx`
3. Compare per row:
   - Opening stock
   - Purchase price
   - Total balance
   - Annual depreciation
   - Net book value

If mismatch after recalc, check Buildings WIP status and year order.

---

[← Excel Import](./06-excel-import.md) · [Features index](../FEATURES_INDEX.md) · [Next: Land & Buildings →](./08-land-and-buildings.md)

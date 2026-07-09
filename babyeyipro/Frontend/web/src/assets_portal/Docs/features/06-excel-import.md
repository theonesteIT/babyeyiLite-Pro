# Chapter 06 — Excel Import (Step-by-Step)

**Opens from:** Asset Register → **Import Excel**  
**Component:** `AssetTestImportModal.jsx`

Import bulk assets from Excel with **preview and validation** before saving.

---

## Import flow (4 phases)

```
Phase 1: YEAR     → Pick register mode + year
Phase 2: FILE     → Upload Excel or download template
Phase 3: PREVIEW  → Review rows (ready / duplicate / invalid)
Phase 4: CONFIRM  → Import ready rows to database
```

---

## Step-by-step: Full import

### Phase 1 — Year selection

1. Click **Import Excel** on Asset Register.
2. **Register mode** toggle (same as Add Asset):
   - **First time** → Active financial year only
   - **Not first time** → Any year (historical imports)
3. Select **register year**.
4. Click **Next**.

### Phase 2 — Upload file

1. Click **Download template** to get sample Excel with correct headers.
2. Fill your data in Excel (see column reference below).
3. Click **Upload** or drag file.
4. System parses and validates rows.
5. On success → moves to **Preview**.

**Parse errors:** Check column headers match template exactly.

### Phase 3 — Preview

Review table with status per row:

| Status | Color | Meaning |
|--------|-------|---------|
| **ready** | Green | Will import |
| **duplicate** | Amber | SKU/code already exists |
| **invalid** | Red | Missing required fields |

**Summary bar:** ready / duplicate / invalid counts.

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| Skip duplicates | ON | Don't import duplicate SKUs |
| Auto-generate SKU | ON | Generate SKU when empty |

**Preview columns include:**
- Row data (name, type, price, …)
- Calculated opening, accumulated, annual dep, net book (chain preview)

Review **category opening summary** at top — shows opening source per category/year.

Click **Import** when satisfied.

### Phase 4 — Confirm

1. System shows importing progress.
2. On success: message with count imported.
3. Modal closes; register table refreshes.
4. **Recommended:** Run **Recalculate register** after large imports.

---

## Excel column reference

### Template headers

| Column | Required | Description |
|--------|----------|-------------|
| `location` | Recommended | Physical location |
| `label` | Recommended | Location label (SKU part) |
| `type` | **Yes** | Asset type code → maps to category |
| `supplier` | Optional | Supplier name |
| `upi` | Optional | UPI reference |
| `sku` | Optional | Manual SKU (auto-generated if empty) |
| `cba` | Optional | Extra code field |
| `material` | Optional | Material description |
| `purchase_year` | Optional | Overrides batch year for row |
| `purchase_month` | Optional | Purchase month |
| `purchase_day` | Optional | Purchase day |
| `purchase_unit_price` | **Yes** | Purchase price (RWF) |
| `name` | **Yes** | Asset name |

### Accepted header aliases

The parser accepts variations, e.g.:
- `purchase unit price`, `unit_price`, `price` → purchase_unit_price
- `asset_name`, `asset name` → name
- `category` → type/category

### Type → category mapping

| Excel `type` | Category |
|--------------|----------|
| BUILDING, BUILDINGS | Buildings |
| LAND | Land |
| FURNITURE | Furniture |
| VEHICLE, VEHICLES | Vehicles |
| ICT, IT, ELECTRONICS | IT Equipment / Electronics |
| LAB | Laboratory Equipment |
| OFFICE | Office Equipment |

---

## Import rules

1. Rows sorted by **category** then **year** then **id order** for chain math.
2. Opening/accumulated computed per category-year chain (same as add form).
3. Land rows: rate forced to 0, no depreciation.
4. Buildings: set building status via import payload if column provided.
5. Timeout: 5 minutes for large files.

---

## Step-by-step: Download template

1. Open Import modal → Phase 2.
2. Click **Download template**.
3. Opens Excel with headers + sample row.

Sample reference file in repo:  
`assets_portal/Docs/new asset register kps.xlsx`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No data rows found | Fix header row to match template |
| All rows invalid | Check name, type, purchase_unit_price filled |
| Duplicates | Enable skip duplicates or fix SKUs |
| Wrong opening after import | Run Recalculate register |
| Wrong year on rows | Set purchase_year column or batch year in Phase 1 |
| Buildings WIP wrong | Import in year order; recalc Buildings category |

---

## API

```
POST /api/school/assets/test/import
Body: {
  rows: [...],
  register_year: 2024,
  entry_mode: "year_setup" | "legacy",
  first_time: true | false,
  skip_duplicates: true,
  auto_generate_sku: true
}
```

---

[← Asset Register](./05-asset-register.md) · [Features index](../FEATURES_INDEX.md) · [Next: Export & Recalculate →](./07-export-recalculate.md)

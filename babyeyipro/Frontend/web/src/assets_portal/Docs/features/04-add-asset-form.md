# Chapter 04 — Add Asset Form (Step-by-Step)

**Opens from:** Asset Register → **+ Add Asset**  
**Component:** `AddAsset2.jsx` (2-step wizard modal)

---

## Overview

The add-asset wizard has **2 steps**:

| Step | Name | What you do |
|------|------|-------------|
| **1** | Basic Info | Year, category, location, SKU, building status |
| **2** | Financial Info | Purchase price, tax, auto-calculated depreciation |

Financial fields are **calculated automatically** from opening context + category rules.

---

## Before you start

| Prerequisite | Check |
|--------------|-------|
| Categories exist | Categories page |
| Financial year exists | Year Setup |
| Active year (for First time mode) | Year Setup shows Active status |
| Opening balance set (first asset in category/year) | Year Setup Step 2 |

---

## Step-by-step: Add a new asset

### Open the wizard

1. Go to **Asset Register** (`/assets/asset-add-test`).
2. Click **+ Add Asset** (gold button).

---

### STEP 1 — Basic Info

#### A. Register mode (toggle)

| Mode | Toggle label | Year picker | Use when |
|------|--------------|-------------|----------|
| **First time** | Green toggle ON | **Active financial year only** | Normal new assets in current Active FY |
| **Not first time** | Blue toggle OFF | **Any year from 1900** | Historical/Closed years (e.g. Land 2018) |

**Land in 2018 while Active is 2021:** Use **Not first time** → select `2018`.

#### B. Financial year / Register year *

- **First time:** Select Active year (e.g. `2021 / 2022 — Active`)
- **Not first time:** Select any year (e.g. `2018`)

#### C. Asset Name *

Free text, e.g. `NEW DINNING HALL`, `Plot Block A`.

#### D. Category *

Select from dropdown. Shows depreciation hint:
- `Buildings (5% dep.)`
- `Land (no depreciation)`

**Buildings only:** Building status toggle appears:
- **Working Progress** — construction in progress (KPS WIP rules)
- **Finished** — completed building

**Land only:** Green note explains Opening + Purchase = Total balance, no depreciation.

#### E. Location *

Physical location, e.g. `Main Campus - Block A`.

#### F. Label of Location *

Short code for SKU, e.g. `BLKA`. Auto-uppercased.

#### G. Label Tag (optional)

Additional tag for SKU generation.

#### H. SKU / Serial

| Mode | Behavior |
|------|----------|
| **Auto** | System generates `SCH/LOC/LABEL/00001` |
| **Manual** | You enter unique SKU per register year |

#### I. Quantity (new assets only)

1–100. Creates separate register rows each with own SKU and QR.

#### J. Asset Health Status

- **Used** (default)
- **Not Used (Old)**

Click **Continue** when all required fields are valid.

---

### STEP 2 — Financial Info

#### A. Opening stock card

Shows auto-loaded context:
- Opening source (Year Setup, last year, prior register row)
- Accumulated depreciation start
- Prior asset name (if chaining)

#### B. Purchase price *

Enter amount in RWF. This is **purchase unit price** (PP).

#### C. Purchase date

Optional. Defaults to today if empty.

#### D. Condition

Excellent / Good / Fair / Poor.

#### E. SD Number / Receipt Number

Optional procurement references.

#### F. Apply VAT 18%

Toggle ON by default. Adds 18% tax on purchase (informational; register TB uses purchase price before tax logic display).

#### G. Auto-Calculation Engine (read-only panel)

Shows live calculation:

| Line | Description |
|------|-------------|
| Opening stock | From engine |
| Accumulated dep. (start) | Prior year total dep or Year Setup |
| + Purchase price | Your input |
| **TOTAL BALANCE** | Opening + Purchase |
| Annual depreciation | Formula shown (varies by category) |
| TOTAL DEPRECIATION | Acc. start + Annual |
| **NET BOOK VALUE** | After depreciation |

**Land:** Annual = 0, NBV = Total balance.

**Buildings WIP:** Formula line shows KPS year-carry or Case 1/2.

#### H. Save

Click **Save Asset** (or **Update Asset** when editing).

**On success:** Modal closes, register table refreshes.

---

## Step-by-step: Edit an existing asset

1. In register table, click a row (opens preview drawer) or use edit action.
2. Open edit wizard with asset pre-filled.
3. Change fields as needed.
4. Save — backend recalculates chain for that category/year.

---

## Field reference (API payload)

| Form field | API field |
|------------|-----------|
| Register year | `register_year` |
| First time toggle | `entry_mode`: `year_setup` / `legacy`, `first_time` |
| Asset name | `asset_name` |
| Category | `category` |
| Location | `location`, `location_label` |
| SKU mode | `sku_mode`: `auto` / `manual` |
| Purchase price | `purchase_price` |
| Building status | `building_status` |
| Health | `asset_health_status` |
| VAT toggle | `apply_tax` |

---

## Validation rules

| Rule | Message / behavior |
|------|-------------------|
| Active year required (First time) | Can't save without Active FY |
| Asset name, category, location required | Continue button disabled |
| Purchase price > 0 | Required on Step 2 |
| Manual SKU unique per year | Error on duplicate |
| Buildings need building status | Defaults to Finished |

---

## Quick recipes

### Recipe: First Building in Active year

1. First time ON → Active year
2. Category: Buildings → Working Progress
3. Enter purchase price
4. Verify annual dep uses Year Setup accumulated start

### Recipe: Land in historical year

1. Not first time ON → year `2018`
2. Category: Land
3. Opening from Year Setup 2018
4. Enter purchase → Total balance = sum, no dep

### Recipe: Second asset same year (same category)

1. Add another asset same year/category
2. Opening auto = prior row **Total balance**
3. Accumulated stays same as first asset in year

---

[← Categories](./03-categories.md) · [Features index](../FEATURES_INDEX.md) · [Next: Asset Register →](./05-asset-register.md)

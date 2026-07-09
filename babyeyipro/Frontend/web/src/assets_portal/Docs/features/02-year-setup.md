# Chapter 02 — Year Setup (Financial Years)

**Path:** Sidebar → **Year Setup** → `/assets/year-setup`

Year Setup defines financial years and **per-category opening balances** used when you add the first asset in each category for that year.

---

## When to use Year Setup

| Scenario | Action |
|----------|--------|
| Brand-new school register | Create first FY (e.g. 2021) with all category openings |
| New calendar year | Create next FY; use auto carry-forward from prior year |
| Land starts in older year (e.g. 2018) | Create **2018** FY with Land opening only |
| Buildings active in 2021 | Create **2021** as **Active** for current entries |

You can have **multiple financial years** (2018 Closed, 2021 Active). Categories can start in different years.

---

## Step-by-step: Create a new financial year

### Step 1 — Open the wizard

1. Go to **Year Setup**.
2. Click **+ Create Year** (top right).

### Step 2 — Year Info (Step 1 of 4)

| Field | What to enter |
|-------|----------------|
| **Financial year** | Start year, e.g. `2021` (displays as 2021/2022) |
| **Start date** | e.g. `2021-01-01` |
| **End date** | e.g. `2021-12-31` |
| **Description** | Optional note |

If a **previous year** exists, a banner shows prior closing balances for reference.

Click **Next**.

### Step 3 — Opening Balances (Step 2 of 4)

A table lists every category with columns:

| Column | Normal categories | **Land** |
|--------|-------------------|----------|
| Opening stock | Enter opening value | Enter opening value **only** |
| Last yr closing | Read-only (from prior FY) | Same |
| Acc. dep. start | Enter accumulated depreciation start | **— not used** (0) |
| Rate | From category (e.g. 5%) | **0% (none)** |
| Year-start annual | Calculated preview | **—** |

**Land rule:** Enter **Opening amount only**. No accumulated depreciation.

Click **+ Add Category** if a category is missing (opens category modal).

Click **Next**.

### Step 4 — Rules & Depreciation (Step 3 of 4)

| Setting | Recommended | Description |
|---------|-------------|-------------|
| **Depreciation method** | Diminishing | Default method for the FY |
| **Auto carry forward** | ON | Opening = prior year closing per category |
| **Lock previous year** | ON | Closes older years when new Active year is created |

Review rates per category (Land shows **0% — no depreciation**).

Click **Next**.

### Step 5 — Confirmation (Step 4 of 4)

Review summary:
- Financial year, dates, method
- Opening balance per category
- Land rows show "(Land — opening only)"

Click **Save** / **Create year**.

**Result:** New year appears in the table. If set Active, previous Active year becomes **Closed**.

---

## Step-by-step: Edit an existing year

1. Find the year in the table.
2. Click **Edit** (pencil icon).
3. Walk through the same 4 steps.
4. Save changes.

**Note:** You cannot change the year number when editing — only dates, balances, and rules.

---

## Step-by-step: View year details

1. Click **View** (eye icon) on a year row.
2. See:
   - Total opening, depreciation, closing
   - Per-category: opening, accumulated, annual dep, closing

---

## Multi-year example (Land 2018 + Buildings 2021)

| Year | Status | Purpose |
|------|--------|---------|
| 2018 | Closed | Land opening `819,810,000` |
| 2021 | Active | Buildings + current assets |

**Register Land in 2018:** Use Add Asset → **Not first time** → year `2018` (see [04 Add Asset](./04-add-asset-form.md)).

**Register Buildings in 2021:** Use Add Asset → **First time** → Active year `2021`.

---

## Year Setup table columns

| Column | Meaning |
|--------|---------|
| YEAR | Financial year (e.g. 2021/2022) |
| START / END DATE | FY period |
| STATUS | Active, Closed, Draft |
| TOTAL ASSETS | Aggregate asset value |
| OPENING BALANCE | Sum of category openings |
| TOTAL DEPRECIATION | Accumulated depreciation |
| CLOSING BALANCE | End position |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No categories in Step 2 | Add categories first ([03 Categories](./03-categories.md)) |
| Can't add assets to year | Ensure year is **Active** for "First time" mode |
| Land shows depreciation | Land row should show 0% — re-save Year Setup |
| Wrong opening carried forward | Edit year balances or run register recalc |

---

[← Getting Started](./01-getting-started.md) · [Features index](../FEATURES_INDEX.md) · [Next: Categories →](./03-categories.md)

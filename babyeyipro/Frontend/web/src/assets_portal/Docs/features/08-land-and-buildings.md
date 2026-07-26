# Chapter 08 — Land & Buildings (Special Categories)

Two categories have **custom register rules** beyond standard depreciation.

---

## Land — No depreciation

### Rules summary

| Field | Value |
|-------|-------|
| Depreciation rate | **0%** |
| Accumulated depreciation | **0** |
| Annual depreciation | **0** |
| Total depreciation | **0** |
| Net book value | **= Total balance** |
| Total balance | **Opening + Purchase** |

### Year Setup (Land)

1. Create/edit financial year.
2. Find **Land (no dep.)** row.
3. Enter **Opening stock only**.
4. Acc. dep. shows **— not used**.
5. Rate shows **0% (none)**.

### Register (Land)

**First Land asset in a year:**
- Opening = Year Setup opening (first year) OR prior year last **Total balance**

**Each new Land row:**
- Opening = previous Land row **Total balance** (same year)
- Enter purchase price
- Total balance = Opening + Purchase

**Next calendar year:**
- Opening = last Land **Total balance** from prior year
- No depreciation ever

### Multi-year schools (Land 2018, Active 2021)

| Task | How |
|------|-----|
| Set Land starting value | Year Setup **2018** → Land opening |
| Register 2018 Land | Add Asset → **Not first time** → year 2018 |
| Register 2019+ Land | Not first time → each year; opening auto-chains |
| Register 2021 Land | Can use First time (Active) if 2020 Land exists |

---

## Buildings — Finished vs Working Progress

### Building status

| Status | Use for |
|--------|---------|
| **Finished** | Completed buildings |
| **Working Progress** | Construction in progress (WIP) |

Set on Add Asset form when category = Buildings.

---

### Buildings — Finished

Standard building depreciation:

```
Annual = (Purchase − Accumulated) × rate   (or TB − TD if PP base invalid)
Total dep = Accumulated + Annual
NBV = Total balance − Total dep
```

---

### Buildings — Working Progress (WIP)

KPS-style rules for construction projects (e.g. NEW DINNING HALL).

#### Annual depreciation

| Case | When | Formula |
|------|------|---------|
| **Year-carry** | First WIP row in **new year** | Prior year **NBV × rate** |
| **Case 1** | No prior WIP same year | `(PP − TD) × rate` or `(Opening − TD) × rate` |
| **Case 2** | Prior WIP **same year only** | `(PP − Prior Progress PP − TD) × rate` |

**Important:** Prior Progress PP does **NOT** carry from last year to next year.

#### Net book value

| Case | Formula |
|------|---------|
| Year-carry | Prior year NBV − Annual |
| Case 1 (no opening) | TB − PP − TD |
| Case 1 (with opening) | Opening − TD − Annual |
| Case 2 (same year) | TB − PP − TD − Prior Progress PP |

#### KPS reference (NEW DINNING HALL)

| Year | Annual dep | Net book | Acc. start |
|------|------------|----------|------------|
| 2024 | 162,730,553 | 3,091,880,509 | 1,288,133,210 |
| 2025 | 154,594,025 | 2,937,286,484 | 1,450,863,763 |

2025 annual = 2024 NBV × 5% (not Case 2 with 2024 purchase price).

---

## Step-by-step: Add WIP Building

1. Year Setup: ensure Buildings opening/accumulated for the year.
2. Add Asset → First time (Active year) or Not first time (historical).
3. Category: **Buildings**.
4. Building status: **Working Progress**.
5. Enter purchase price (construction cost this year).
6. Verify Auto-Calculation panel:
   - Year-carry shows `Prior year NBV × rate` if first WIP in year
   - Case 2 shows prior progress PP if second WIP same year
7. Save → verify in register table (scroll to Annual dep column).

---

## Step-by-step: Add Land parcel

1. Year Setup: Land opening for start year.
2. Add Asset → Not first time (if Closed year) or First time (if Active).
3. Category: **Land**.
4. Enter purchase price (land acquisition cost).
5. Verify: Annual = 0, NBV = Total balance.
6. Next year: add new Land row — opening auto-fills from prior Total balance.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Land shows 5% rate | Category rate must be 0; re-save asset |
| WIP 2025 annual = 0 | Run recalc; ensure Case 2 PP not carried from 2024 |
| Table ≠ edit for Buildings | Recalculate + refresh; filter full year on one page |
| Wrong accumulated start | Acc. start = prior year **total depreciation** (last asset) |

Full math: [Business Rules](../BUSINESS_RULES.md)

---

[← Export & Recalculate](./07-export-recalculate.md) · [Features index](../FEATURES_INDEX.md) · [Next: Operations →](./09-operations.md)

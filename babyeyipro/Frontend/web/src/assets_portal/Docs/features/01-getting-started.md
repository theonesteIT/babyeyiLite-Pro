# Chapter 01 — Getting Started

## What is the Assets Portal?

The **Babyeyi Assets Manager Portal** is the school asset register and operations hub. It tracks:

- Asset register (opening stock, purchase, depreciation, net book value)
- Financial years and category opening balances
- Assignments, transfers, maintenance, and replacements
- Reports and QR-based asset lookup

**URL:** `/assets` (e.g. `http://localhost:5174/assets`)

---

## Step 1 — Log in

1. Open the main Babyeyi web application.
2. Sign in with a staff account that has the **Assets Manager** role.
3. Navigate to **Assets** from the portal switcher or direct URL `/assets`.

If you see a loading screen then redirect to login, your session expired — sign in again.

---

## Step 2 — Understand the layout

```
┌──────────────┬────────────────────────────────────────────┐
│   SIDEBAR    │  HEADER (search, notifications, profile)   │
│              ├────────────────────────────────────────────┤
│  Dashboard   │                                            │
│  Asset Mgmt  │         MAIN CONTENT AREA                  │
│  Reports     │         (page you selected)                │
│  Operations  │                                            │
│              │                                            │
│  Help        │                                            │
└──────────────┴────────────────────────────────────────────┘
```

### Sidebar groups

| Group | Items |
|-------|--------|
| **Asset Management** | Asset Register, Year Setup, Analytics, Categories |
| **Reports** | Overview, All Assets, Categories, Financial Years, Health, … |
| **Operations** | Assignments, Returns, Transfers, Replacements, Maintenance, Purchase Requests |

---

## Step 3 — Know your role

| Role | Can view | Can create/edit |
|------|----------|-----------------|
| Assets Manager | Yes | Yes |
| Asset Manager | Yes | Yes |
| Accountant | Yes | **No** (read-only) |
| School Admin / Manager | Yes | Yes |

---

## Step 4 — First-time school checklist

Complete these in order:

| Step | Action | Guide |
|------|--------|-------|
| 1 | Ensure categories exist (Buildings, Land, Furniture, …) | [03 Categories](./03-categories.md) |
| 2 | Create the first **Active** financial year with opening balances | [02 Year Setup](./02-year-setup.md) |
| 3 | Add assets via form or Excel import | [04 Add Asset](./04-add-asset-form.md) · [06 Import](./06-excel-import.md) |
| 4 | Verify register table totals | [05 Asset Register](./05-asset-register.md) |
| 5 | Run **Recalculate register** if numbers look off | [07 Export & Recalculate](./07-export-recalculate.md) |

---

## Step 5 — Key concepts (30-second version)

| Term | Meaning |
|------|---------|
| **Register year** | Calendar year the asset row belongs to (e.g. 2024) |
| **Financial year** | Year Setup record (e.g. 2024/2025) — one **Active** at a time |
| **Opening stock** | Value carried into the row from prior balance or Year Setup |
| **Purchase price** | This year's purchase / construction cost |
| **Total balance** | Opening + Purchase |
| **Net book value** | Value after depreciation (or = Total balance for Land) |
| **Active year** | Only Active FY accepts "First time" new assets |

---

[← Features index](../FEATURES_INDEX.md) · [Next: Year Setup →](./02-year-setup.md)

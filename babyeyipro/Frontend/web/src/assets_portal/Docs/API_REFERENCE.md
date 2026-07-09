# Assets Portal — API Reference

Base URL: `{VITE_API_URL}/api` (default `http://localhost:5100/api`)

All authenticated routes require a valid session cookie.  
401 → redirect to Babyeyi login.

**Read roles:** `ASSETS_MANAGER`, `ASSET_MANAGER`, `SCHOOL_ADMIN`, `SCHOOL_MANAGER`, `DOS`, `ACCOUNTANT`, `SUPER_ADMIN`, `FULL_SYSTEM_CONTROLLER`  
**Write roles:** same except `ACCOUNTANT`

---

## Public

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/public/school/assets/scan` | Public asset lookup by `code` or `id` (no auth) |

---

## Meta & dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/meta` | Portal metadata |
| `GET` | `/school/assets/dashboard` | Dashboard summary stats |
| `GET` | `/school/assets/analytics` | Analytics aggregates |

---

## Categories

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/categories` | List categories with asset counts |
| `POST` | `/school/assets/categories` | Create category (`name`, `icon`, `description`, `depreciation_rate`) |
| `PATCH` | `/school/assets/categories/:id` | Update category |
| `DELETE` | `/school/assets/categories/:id` | Soft-delete category |

**Default seeded categories:** IT Equipment, Furniture, Vehicles, Electronics, Machinery, Laboratory Equipment, Buildings (5%), Land (0%), Office Equipment (20%)

---

## Financial years (Year Setup)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/financial-years` | List all financial years + category balances |
| `GET` | `/school/assets/financial-years/active` | Current active FY |
| `GET` | `/school/assets/financial-years/opening-preview?year=` | Preview carry-forward for new FY wizard |
| `GET` | `/school/assets/financial-years/category-opening?year=&category=` | Opening context for one category |
| `POST` | `/school/assets/financial-years` | Create FY + category balances |
| `PATCH` | `/school/assets/financial-years/:id` | Update FY dates, rules, balances |
| `PATCH` | `/school/assets/financial-years/:id/reopen` | Reopen closed year |
| `PATCH` | `/school/assets/financial-years/:id/close` | Close year |
| `DELETE` | `/school/assets/financial-years/:id` | Delete FY |

**Create body (key fields):**

```json
{
  "year": 2021,
  "start_date": "2021-01-01",
  "end_date": "2021-12-31",
  "dep_method": "Diminishing",
  "auto_carry_forward": true,
  "lock_previous_year": true,
  "category_balances": [
    {
      "category": "Buildings",
      "opening_balance": 4016837629,
      "accumulated_depreciation": 0,
      "depreciation_rate": 5
    },
    {
      "category": "Land",
      "opening_balance": 819810000,
      "accumulated_depreciation": 0,
      "depreciation_rate": 0
    }
  ]
}
```

---

## Asset register (primary — `/test`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/test/stats` | Register summary (counts, totals by year/category) |
| `GET` | `/school/assets/test/meta` | Categories, financial years, active year |
| `GET` | `/school/assets/test/opening` | Opening context for add/edit row |
| `GET` | `/school/assets/test` | Paginated register list |
| `GET` | `/school/assets/test/identifiers` | SKUs/codes per `register_year` |
| `POST` | `/school/assets/test` | Create register asset |
| `PATCH` | `/school/assets/test/:id` | Update register asset |
| `DELETE` | `/school/assets/test/:id` | Soft-delete asset |
| `POST` | `/school/assets/test/import` | Bulk Excel import (long timeout) |
| `POST` | `/school/assets/test/recalc-chain` | Recompute register chain |
| `POST` | `/school/assets/test/bulk-delete` | Bulk soft-delete |

### `GET /test/opening` query params

| Param | Type | Description |
|-------|------|-------------|
| `year` | number | Register year |
| `category` | string | Category name |
| `entry_mode` | `year_setup` \| `legacy` | Opening resolution mode |
| `edit_asset_id` | number | When editing, exclude self from chain |

**Response highlights:**

```json
{
  "effective_opening": 4542744272,
  "effective_accumulated_depreciation": 1288133210,
  "last_year_total_depreciation": 1288133210,
  "prior_asset_net_book": 3091880509,
  "prior_progress_purchase": null,
  "depreciation_rate": 5,
  "assets_in_year": 1,
  "source": "ledger",
  "source_label": "Continues from last asset..."
}
```

### `GET /test` query params

| Param | Description |
|-------|-------------|
| `page`, `limit` | Pagination (default limit 30) |
| `register_year` | Filter by year |
| `category` | Filter by category |
| `asset_health_status` | `Used` \| `Not Used (Old)` |
| `old_not_replaced` | `1` for old unreplaced assets |
| `q` | Search asset name/code |
| `date_from`, `date_to` | Purchase date range |

### `POST /test` body (key fields)

```json
{
  "asset_name": "NEW DINNING HALL",
  "category": "Buildings",
  "register_year": 2024,
  "location": "Main Campus",
  "location_label": "BLK-A",
  "purchase_price": 150200674,
  "building_status": "Working Progress",
  "entry_mode": "year_setup",
  "first_time": true,
  "sku_mode": "auto",
  "apply_tax": true,
  "asset_health_status": "Used"
}
```

### `POST /test/recalc-chain` body

```json
{ "register_year": 2024, "category": "Buildings" }
```

```json
{ "all_years": true }
```

---

## Core assets (legacy inventory)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets` | List assets (legacy filters) |
| `GET` | `/school/assets/:id` | Single asset |
| `GET` | `/school/assets/:id/panel` | Side panel data |
| `GET` | `/school/assets/identifiers` | Global identifiers |
| `GET` | `/school/assets/scan-lookup` | Authenticated QR lookup |
| `POST` | `/school/assets` | Create asset (legacy) |
| `POST` | `/school/assets/simple` | Simplified create |
| `POST` | `/school/assets/import` | Legacy bulk import |
| `PATCH` | `/school/assets/:id` | Update asset |
| `PATCH` | `/school/assets/:id/health-status` | Update `asset_health_status` |
| `PATCH` | `/school/assets/:id/assets-status` | Update workflow status |
| `DELETE` | `/school/assets/:id` | Soft-delete |

---

## Assignments

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/assignments/meta` | Dropdown metadata |
| `GET` | `/school/assets/assignments` | List assignments |
| `GET` | `/school/assets/assignments/:assignmentId` | Single assignment |
| `POST` | `/school/assets/assignments` | Create assignment |
| `PATCH` | `/school/assets/assignments/:assignmentId/return` | Return asset |

---

## Maintenance

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/maintenance` | List tickets |
| `POST` | `/school/assets/maintenance` | Create ticket |
| `PATCH` | `/school/assets/maintenance/:id/extend` | Extend due date |

---

## Transfers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/transfers/meta` | Metadata |
| `GET` | `/school/assets/transfers` | List transfers |
| `POST` | `/school/assets/transfers` | Create transfer |

---

## Replacements

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/replacements/stats` | Summary counts |
| `GET` | `/school/assets/replacements/awaiting-assets` | Pending new assets |
| `GET` | `/school/assets/replacements/meta` | Metadata |
| `GET` | `/school/assets/replacements/old-asset/:assetId` | Old asset preview |
| `GET` | `/school/assets/replacements` | List replacements |
| `GET` | `/school/assets/replacements/:id` | Single replacement |
| `POST` | `/school/assets/replacements` | Create request |
| `PATCH` | `/school/assets/replacements/:id` | Update request |
| `POST` | `/school/assets/replacements/:id/approve` | Approve + create new asset |
| `POST` | `/school/assets/replacements/:id/reject` | Reject |
| `DELETE` | `/school/assets/replacements/:id` | Delete |

---

## Reports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/school/assets/reports/:type` | Generate report |

**Types:** `overview`, `all-assets`, `categories`, `financial-years`, `health`, `assignments`, `returns`, `transfers`, `maintenance`, `depreciation`, `damaged-lost`, `locations`

Query params vary by type (e.g. `register_year`, `category`, date filters).

---

## Standard response shape

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "message": "optional"
}
```

**Error:**

```json
{
  "success": false,
  "message": "Human-readable error"
}
```

Frontend services use `unwrap()` to extract `data` or throw on `success: false`.

---

## Frontend service mapping

| Service file | Routes used |
|--------------|-------------|
| `assetTestApi.js` | `/test/*`, scan-lookup, health-status |
| `assetsApi.js` | categories, financial-years, assignments, maintenance, transfers, replacements, dashboard, analytics, legacy `/school/assets` |
| `reportsApi.js` | `/reports/:type` |
| `publicAssetScanApi.js` | `/public/school/assets/scan` |

---

[← Back to docs index](./README.md) · [Developer Guide](./DEVELOPER_GUIDE.md) · [Business Rules](./BUSINESS_RULES.md)

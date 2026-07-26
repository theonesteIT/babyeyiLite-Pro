# Babyeyi Assets Portal — Developer Documentation

Welcome to the **Babyeyi Assets Manager Portal** developer docs. This folder is the onboarding hub for engineers extending the register, year setup, operations modules, and backend APIs.

## Quick start

```bash
# Backend (from BabyeyiSystem/backend)
npm install
npm run dev          # default http://localhost:5100

# Frontend (from babyeyipro/Frontend/web)
npm install
npm run dev          # default http://localhost:5174
```

Set `VITE_API_URL=http://localhost:5100` in `babyeyipro/Frontend/web/.env`.

Portal URL: **`http://localhost:5174/assets`**  
Required role: `ASSETS_MANAGER` or `ASSET_MANAGER` (see auth section in the developer guide).

---

## Documentation index

### Features (step-by-step user & dev guides)

| Document | What it covers |
|----------|----------------|
| [**Features Index**](./FEATURES_INDEX.md) | Hub for all feature guides + learning path |
| [**Features Complete Manual**](./FEATURES_COMPLETE.md) | **All features in one document** (best for Word export) |
| [**features/**](./features/) | 11 chapter guides: Year Setup, Add Form, Import, Operations, … |

### Developer & technical

| Document | What it covers |
|----------|----------------|
| [**Developer Guide**](./DEVELOPER_GUIDE.md) | Architecture, folder layout, routes, features, data flow, how to add pages/APIs |
| [**API Reference**](./API_REFERENCE.md) | All REST endpoints (`/api/school/assets/*`) with methods and purpose |
| [**Business Rules**](./BUSINESS_RULES.md) | Register chain, depreciation, Buildings WIP, Land, Year Setup math |

---

## System at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│  Babyeyi Web App (React + Vite)                                 │
│  /assets/*  →  assets_portal/PortalRoutes.jsx                   │
│                 └── imports pages from Assets System/src/pages    │
└────────────────────────────┬────────────────────────────────────┘
                             │ axios + cookies
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Babyeyi Backend (Express)  /api                                │
│  BabyeyiRoutes/schoolAssets.js  (~6.6k lines)                   │
│  BabyeyiRoutes/schoolAssetsReports.js                           │
└────────────────────────────┬────────────────────────────────────┘
                             │ MySQL
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  school_assets, school_asset_financial_years,                   │
│  school_asset_categories, assignments, transfers, etc.          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Production vs legacy paths

| Area | **Production (use this)** | Legacy |
|------|---------------------------|--------|
| Asset register UI | `AssetAddTest.jsx` → `/assets/asset-add-test` | `AssetInventory.jsx` → `/assets/inventory` |
| Register API | `/api/school/assets/test/*` | `/api/school/assets` (CRUD) |
| Register math | `assetRegisterMath.js` + chain enrichment | `assetsCalculations.js` (wizard only) |
| Add asset wizard | `AddAsset2.jsx` (used by register) | `AddAsset.jsx` |

New features for the **KPS-style register** should always target the **test** path unless explicitly migrating legacy inventory.

---

## Where to start by task

| I want to… | Start here |
|------------|------------|
| Add a sidebar page | `PortalRoutes.jsx` + `Sidebar.jsx` + new page in `Assets System/src/pages/` |
| Change depreciation logic | `assetRegisterMath.js` **and** `schoolAssets.js` `computeAssetRegisterMath` (keep in sync) |
| Fix register table display | `AssetAddTest.jsx` + `enrichRegisterChainFinancials()` |
| Year opening balances | `YearSetUp.jsx` + `/financial-years` API |
| Excel import | `assetTestExcelImport.js` + `POST /test/import` |
| New report | `reportConfig.js` + `schoolAssetsReports.js` |
| QR / scan | `assetsQr.js`, `AssetDetailQRScan.jsx`, `/public/school/assets/scan` |

---

## Reference files in repo

- Sample KPS register: `assets_portal/Docs/new asset register kps.xlsx`
- Portal styles: `assets_portal/assets-portal.css`
- Standalone Assets System shell (dev only): `Assets System/src/App.jsx`

---

*Last updated for register chain, Buildings WIP (KPS), and Land (no depreciation) workflows.*

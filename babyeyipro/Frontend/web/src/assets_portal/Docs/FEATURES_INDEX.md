# Assets Portal — Features Index

Step-by-step guides for every major feature in the Babyeyi Assets Manager Portal.

**Audience:** End users, school accountants, and developers onboarding to the portal.

**Format:** Markdown (`.md`) — open in VS Code, GitHub, or **Microsoft Word** (File → Open → select `.md`).

---

## Complete guide (single document)

| Document | Description |
|----------|-------------|
| [**FEATURES_COMPLETE.md**](./FEATURES_COMPLETE.md) | **Full step-by-step manual** — all features in one file (best for Word export / printing) |

---

## Feature modules (by chapter)

| # | Guide | What you learn |
|---|--------|----------------|
| 01 | [Getting Started](./features/01-getting-started.md) | Login, navigation, roles, portal layout |
| 02 | [Year Setup](./features/02-year-setup.md) | Create financial years, opening balances, Land vs other categories |
| 03 | [Categories](./features/03-categories.md) | Add/edit categories and depreciation rates |
| 04 | [Add Asset Form](./features/04-add-asset-form.md) | 2-step wizard: basic info + financial auto-calculation |
| 05 | [Asset Register](./features/05-asset-register.md) | Table, filters, preview, edit, delete, bulk actions |
| 06 | [Excel Import](./features/06-excel-import.md) | Template, columns, preview, confirm import |
| 07 | [Export & Recalculate](./features/07-export-recalculate.md) | Excel export, register chain recalculation |
| 08 | [Land & Buildings](./features/08-land-and-buildings.md) | Special category rules (no dep / WIP) |
| 09 | [Operations](./features/09-operations.md) | Assignments, returns, transfers, maintenance, replacements |
| 10 | [Reports](./features/10-reports.md) | All report types and export |
| 11 | [QR & Scan](./features/11-qr-scan.md) | QR codes, public scan, deep links |

---

## Developer documentation

| Document | Description |
|----------|-------------|
| [Developer Guide](./DEVELOPER_GUIDE.md) | Architecture, code layout, extending the portal |
| [API Reference](./API_REFERENCE.md) | REST endpoints |
| [Business Rules](./BUSINESS_RULES.md) | Depreciation math and register chain |

---

## Recommended learning path

```
New school setup:
  01 Getting Started → 03 Categories → 02 Year Setup → 04 Add Asset Form → 05 Register

Bulk historical data:
  02 Year Setup (first year) → 06 Excel Import → 07 Recalculate

Land-only school:
  02 Year Setup (Land opening) → 08 Land & Buildings → 04 Add Asset (Not first time for old years)

Daily operations:
  05 Register → 09 Operations → 10 Reports
```

---

## Export to Word

1. Open `FEATURES_COMPLETE.md` in Microsoft Word, or  
2. Use Pandoc: `pandoc FEATURES_COMPLETE.md -o Assets-Portal-Manual.docx`  
3. Or copy sections from chapter files into your own Word template.

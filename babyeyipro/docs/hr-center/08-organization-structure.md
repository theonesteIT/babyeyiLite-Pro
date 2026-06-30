# Organization Structure

**Route:** `/manager/hr/organization`  
**Component:** `EmployeeHierarchy.jsx`

---

## Purpose

Visualize the school's org chart — departments, positions, reporting lines, vacancies, and staff distribution with interactive charts and export.

---

## Layout & design

```
┌ HERO ─ 6 KPI tiles ─ [Download Image] ───────────────────────┐
├ Filter bar: search, dept, position, category, status ────────┤
├ Analytics panels (staff mix, timeline, payroll) ─────────────┤
├ Interactive React Flow org chart ────────────────────────────┤
│  Expand/collapse departments & positions                     │
│  MiniMap + Controls + Background                             │
├ Side drawer (node details) ──────────────────────────────────┤
├ Department members modal ────────────────────────────────────┤
├ Full-screen “Expand all” organization view ──────────────────┤
└ Export: PDF | PNG ───────────────────────────────────────────┘
```

**Visual style:**

- React Flow (`@xyflow/react`) interactive graph
- Custom node types in `orgHierarchy/OrgCustomNodes.jsx`
- Navy `#000435` + gold `#F59E0B` accent for leadership nodes
- Staff avatars with photo fallback to colored initials

---

## Features

### KPI tiles

| KPI | Description |
|-----|-------------|
| Total Staff | Active workforce |
| Departments | Organizational units |
| Positions | Defined roles |
| Vacant Positions | Open to recruit |
| Management Staff | Leadership roles |
| Teaching Staff | Academic personnel |

### Filters

| Filter | Description |
|--------|-------------|
| Search | Staff name |
| Department | All + HR departments |
| Position | All + unique job titles |
| Category | Employment category |
| Status | Active / other statuses |

### Interactive org chart

| Feature | Description |
|---------|-------------|
| **Expand/collapse departments** | Toggle department nodes |
| **Expand/collapse positions** | Toggle position groups |
| **Click nodes** | Opens details drawer |
| **Drag reassign** | Local structure update notice (demo) |
| **MiniMap** | Chart navigation |
| **Controls** | Zoom / pan |

### Details drawer (right slide-in)

Context by node type:

**Department:**

- Head, staff count, budget, payroll cost, vacancies, positions list
- Each position: title, reports-to, member count

**Position:**

- Reports to, assigned count, department
- Staff list → click to open profile

**Employee:**

- Photo, name, position, department, contract, hire date, status, reports-to
- **View full profile** button

### Department members modal

Full-screen modal per department:

- Header stats: Staff, Positions, Vacancies, Payroll/month
- Positions grouped with staff cards
- Per employee: Profile, Transfer, Promote buttons
- **Vacant position** alerts with Recruit CTA

### Full organization expand view

Full-screen modal (`OrganizationExpandModal`):

- Search across staff, positions, departments
- Leadership section: School Director → Head Teacher
- All departments with positions and staff grids
- Vacancy highlighting

### Analytics panels

Computed from employee data:

- Staff distribution metrics
- Org timeline (`ORG_TIMELINE`)
- Vacant positions list (`VACANT_POSITIONS`)
- Payroll summaries (`formatRwf`)

### Export

| Format | Method |
|--------|--------|
| **PNG** | html2canvas → download `organization-structure.png` |
| **PDF** | html2canvas + jsPDF landscape |

### Navigation

- Click staff anywhere → `/hr/directory/:id`

---

## Data sources

- `hrService.getDirectory()` — employees
- `hrService.getDepartments()` — department metadata
- `buildOrgGraph.js` — graph model, stats, analytics

---

## Related

- [Departments](./07-departments.md)
- [Employee Profile](./11-employee-profile.md)

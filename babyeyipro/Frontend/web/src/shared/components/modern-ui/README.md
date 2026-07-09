# Modern UI Kit

Reusable table and form components matching the Babyeyi design reference (clean white cards, orange accent `#FF8C00`, navy text `#000435`).

## Components

| Export | File | Purpose |
|--------|------|---------|
| `ModernDataTable` | `ModernDataTable.jsx` | Sortable table, selection, avatars, badges, actions, pagination |
| `SingleStepForm` | `SingleStepForm.jsx` | Single-page form card with footer actions |
| `MultiStepForm` | `MultiStepForm.jsx` | Wizard with stepper + summary sidebar |
| `formFields` | `formFields.jsx` | Inputs, selects, badges, buttons |

## Preview

```bash
cd babyeyipro/Frontend/web
npm run dev
# Open http://localhost:5174/dev/modern-ui  (or /pro/dev/modern-ui)
```

## Usage

```jsx
import {
  ModernDataTable,
  SingleStepForm,
  MultiStepForm,
  FormField,
  FormInput,
} from '../shared/components/modern-ui';

<ModernDataTable
  columns={[
    { key: 'id', label: 'ID', sortable: true },
    { key: 'fullName', label: 'Full Name', type: 'avatar-name' },
    { key: 'status', label: 'Status', type: 'status-badge' },
  ]}
  rows={data}
  selectable
  pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}
  onEdit={(row) => openEdit(row)}
/>
```

See `ModernUiDemo.jsx` for a full working example.

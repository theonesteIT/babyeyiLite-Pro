export const ASSET_TYPES = [
  'BUILDING',
  'FURNITURE',
  'ICT & ELECTRONICS',
  'LAB EQUIPMENT',
  'VEHICLES',
  'MACHINERY',
  'EDUCATIONAL MATERIALS',
  'CLEANING TOOLS',
  'OFFICE EQUIPMENT',
  'UTILITIES',
  'SPORTS',
  'INTANGIBLE ASSETS',
  'OTHER',
]

export const FUNDING_SOURCES = [
  'Government Budget',
  'Donor Funded',
  'Internal Revenue',
  'Grant',
  'Other',
]

export const DEPRECIATION_MODES = ['Diminishing', 'Straight Line']

export const ASSET_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Under Maintenance', label: 'Repair' },
  { value: 'Lost', label: 'Lost' },
  { value: 'Draft', label: 'Draft' },
]

export const ASSET_CONDITION_OPTIONS = [
  { value: '', label: 'All conditions' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Poor' },
]

export const SEARCH_FIELD_OPTIONS = [
  { value: 'code', label: 'Asset code' },
  { value: 'serial', label: 'Serial number' },
  { value: 'name', label: 'Name' },
]

export const SAVED_FILTERS_STORAGE_KEY = 'babyeyi_assets_saved_filters_v1'

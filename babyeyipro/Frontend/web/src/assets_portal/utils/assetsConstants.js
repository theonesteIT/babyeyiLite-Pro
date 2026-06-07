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

export const ASSET_HEALTH_STATUS_USED = 'Used'
export const ASSET_HEALTH_STATUS_NOT_USED_OLD = 'Not Used (Old)'

export const ASSET_HEALTH_STATUS_OPTIONS = [
  { value: ASSET_HEALTH_STATUS_USED, label: 'Used', group: 'In Use' },
  { value: ASSET_HEALTH_STATUS_NOT_USED_OLD, label: 'Not Used (Old)', group: 'Not Used' },
]

export const VALID_ASSET_HEALTH_STATUSES = ASSET_HEALTH_STATUS_OPTIONS.map((o) => o.value)

export const DEFAULT_ASSET_HEALTH_STATUS = ASSET_HEALTH_STATUS_USED

export const ASSETS_STATUS_IN_USE = [
  { value: 'Active', label: '🟢 Active', group: 'In Use' },
  { value: 'Assigned', label: '🟢 Assigned', group: 'In Use' },
  { value: 'Operational', label: '🟢 Operational', group: 'In Use' },
  { value: 'Deployed', label: '🟢 Deployed', group: 'In Use' },
]

export const ASSETS_STATUS_NOT_USED = [
  { value: 'Idle', label: '🟡 Idle', group: 'Not Used' },
  { value: 'Available', label: '🟡 Available', group: 'Not Used' },
  { value: 'In Storage', label: '🟡 In Storage', group: 'Not Used' },
  { value: 'Standby', label: '🟡 Standby', group: 'Not Used' },
  { value: 'Unassigned', label: '🟡 Unassigned', group: 'Not Used' },
]

export const ASSETS_STATUS_ALL = [...ASSETS_STATUS_IN_USE, ...ASSETS_STATUS_NOT_USED]

export const VALID_ASSETS_STATUSES = ASSETS_STATUS_ALL.map((o) => o.value)

export const ASSET_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...ASSETS_STATUS_ALL,
]

/** @deprecated workflow status — kept for maintenance/assignment flows */
export const ASSET_WORKFLOW_STATUS_OPTIONS = [
  { value: '', label: 'All' },
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

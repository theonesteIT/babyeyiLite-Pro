import { Fragment } from 'react'
import { QRCode } from 'react-qr-code'
import { formatRwf, formatLocationValue, groupAssetsByType } from '../../../assets_portal/utils/assetsCalculations'
import { buildAssetQrValue } from '../../../assets_portal/utils/assetsQr'

const NAVY = '#000435'
const GOLD = '#FEBF10'
const ROW_ODD = '#ffffff'
const ROW_EVEN = '#F7F8FC'
const ROW_BORDER = '#E4E8F0'
const TEXT_BODY = '#374151'
const FONT = "'Montserrat', system-ui, sans-serif"

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 700,
  whiteSpace: 'nowrap',
  fontSize: 10,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: '#fff',
  background: NAVY,
  border: 'none',
}

const tdStyle = {
  padding: '8px 10px',
  whiteSpace: 'nowrap',
  color: TEXT_BODY,
  fontSize: 11,
  fontWeight: 400,
  border: 'none',
  fontVariantNumeric: 'tabular-nums',
}

const HEADERS = [
  { key: 'location', label: 'location', w: 'min-w-[100px]' },
  { key: 'name', label: 'name', w: 'min-w-[140px]' },
  { key: 'label', label: 'label', w: 'min-w-[70px]' },
  { key: 'type', label: 'type', w: 'min-w-[120px]' },
  { key: 'supplier', label: 'supplier', w: 'min-w-[100px]' },
  { key: 'upi', label: 'upi', w: 'min-w-[80px]' },
  { key: 'sku', label: 'sku', w: 'min-w-[100px]' },
  { key: 'size', label: 'size', w: 'min-w-[60px]' },
  { key: 'material', label: 'material', w: 'min-w-[80px]' },
  { key: 'purchase_year', label: 'purchase_year', w: 'min-w-[70px]' },
  { key: 'purchase_month', label: 'purchase_month', w: 'min-w-[70px]' },
  { key: 'purchase_day', label: 'purchase_day', w: 'min-w-[60px]' },
  { key: 'unit_price', label: 'purchase_unit_price', w: 'min-w-[120px]', num: true },
  { key: 'opening', label: 'openingamount', w: 'min-w-[110px]', num: true },
  { key: 'total_balance', label: 'TOTAL BALANCE', w: 'min-w-[120px]', num: true },
  { key: 'accumulated', label: 'accumulated DEPRECIATION', w: 'min-w-[140px]', num: true },
  { key: 'decimal_dep', label: 'decimal depr', w: 'min-w-[80px]' },
  { key: 'annual_dep', label: 'Annual depreciation', w: 'min-w-[130px]', num: true },
  { key: 'total_dep', label: 'TOTAL DEPRECIATION', w: 'min-w-[130px]', num: true },
  { key: 'net_book', label: 'NET BOOK VALUE', w: 'min-w-[120px]', num: true },
  { key: 'qty', label: 'quantity', w: 'min-w-[60px]' },
  { key: 'dep_mode', label: 'depreciation_mode', w: 'min-w-[100px]' },
  { key: 'dep_rate', label: 'depreciation_rate', w: 'min-w-[90px]' },
  { key: 'condition', label: 'description', w: 'min-w-[90px]' },
  { key: 'qr', label: 'QR', w: 'min-w-[56px]' },
]

function parsePurchaseParts(dateStr) {
  if (!dateStr) return { y: '', m: '', d: '' }
  const s = String(dateStr).slice(0, 10)
  const [y, m, d] = s.split('-')
  return { y: y || '', m: m ? String(Number(m)) : '', d: d ? String(Number(d)) : '' }
}

function cell(row, key) {
  const parts = parsePurchaseParts(row.purchase_date)
  switch (key) {
    case 'location': return formatLocationValue(row.location) || '—'
    case 'name': return row.asset_name || row.name || '—'
    case 'label': return row.label_tag || '—'
    case 'type': {
      const t = row.asset_type || row.type || ''
      const other = row.asset_type_other
      return t === 'OTHER' && other ? other : t || '—'
    }
    case 'supplier': return row.supplier_name || row.supplier || '—'
    case 'upi': return row.upi || '—'
    case 'sku': return row.sku || '—'
    case 'size': return row.size_label || row.size || '—'
    case 'material': return row.material || '—'
    case 'purchase_year': return parts.y
    case 'purchase_month': return parts.m
    case 'purchase_day': return parts.d
    case 'unit_price': return row.unit_price
    case 'opening': return row.opening_amount
    case 'total_balance': return row.total_balance
    case 'accumulated': return row.accumulated_depreciation ?? row.accumulatedDepreciation
    case 'decimal_dep': return row.decimal_dep != null ? Number(row.decimal_dep).toFixed(2) : ''
    case 'annual_dep': return row.annual_dep
    case 'total_dep': return row.total_dep
    case 'net_book': return row.net_book_value
    case 'qty': return row.quantity ?? 1
    case 'dep_mode': return row.dep_mode || '—'
    case 'dep_rate': return row.dep_rate != null ? row.dep_rate : '—'
    case 'condition': return row.condition_code || row.condition || '—'
    case 'qr': return row.qr_value || buildAssetQrValue(row)
    default: return '—'
  }
}

export default function AssetRegisterTable({ assets = [], selectedId, onSelectAsset }) {
  const groups = groupAssetsByType(assets)

  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-500 text-sm font-normal">
        No assets in register yet.
      </div>
    )
  }

  let dataRowIndex = 0

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      style={{ borderBottom: `3px solid ${GOLD}`, fontFamily: FONT }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '100%' }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {HEADERS.map((h) => (
                <th key={h.key} className={h.w} style={thStyle}>
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ type, rows }) => (
              <Fragment key={type}>
                <tr style={{ background: NAVY, borderBottom: `2px solid ${GOLD}` }}>
                  <td
                    colSpan={HEADERS.length}
                    style={{
                      padding: '10px 12px',
                      fontWeight: 600,
                      fontSize: 11,
                      color: GOLD,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      border: 'none',
                    }}
                  >
                    {type === 'OTHER' ? 'OTHER' : type}
                  </td>
                </tr>
                {rows.map((row) => {
                  const ri = dataRowIndex
                  dataRowIndex += 1
                  const isSelected = selectedId === row.id
                  const rowBg = isSelected
                    ? '#FEF3C7'
                    : ri % 2 === 0
                      ? ROW_ODD
                      : ROW_EVEN
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectAsset?.(row)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSelectAsset?.(row)
                        }
                      }}
                      style={{
                        background: rowBg,
                        borderBottom: `1px solid ${ROW_BORDER}`,
                        cursor: 'pointer',
                        outline: isSelected ? `2px solid ${GOLD}` : 'none',
                        outlineOffset: -2,
                      }}
                      className="transition-colors hover:brightness-[0.98]"
                    >
                      {HEADERS.map((h) => {
                        const raw = cell(row, h.key)
                        if (h.key === 'qr') {
                          const qrVal = typeof raw === 'string' ? raw : buildAssetQrValue(row)
                          return (
                            <td key={h.key} style={{ ...tdStyle, textAlign: 'center' }}>
                              <div className="inline-block bg-white p-0.5 rounded border border-slate-200">
                                <QRCode value={qrVal} size={36} level="M" />
                              </div>
                            </td>
                          )
                        }
                        const display = h.num && raw !== '' && raw != null && raw !== '—'
                          ? formatRwf(raw)
                          : raw
                        const isNetBook = h.key === 'net_book'
                        return (
                          <td
                            key={h.key}
                            style={{
                              ...tdStyle,
                              textAlign: h.num ? 'left' : 'left',
                              fontWeight: isNetBook ? 600 : 400,
                              color: isNetBook ? NAVY : TEXT_BODY,
                            }}
                          >
                            {display === '' ? '—' : display}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

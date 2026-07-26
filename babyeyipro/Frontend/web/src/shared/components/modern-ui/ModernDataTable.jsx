import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Eye,
  MoreVertical,
  Pencil,
} from 'lucide-react';
import TablePagination from '../TablePagination';
import { avatarColorFor, initialsFromName, MODERN_UI } from './modernUiTheme';
import { ClassBadge, FormCheckbox, StatusBadge } from './formFields';

function SortIcon({ active, direction }) {
  if (!active) return <ChevronsUpDown size={14} className="text-[#000435]/30" />;
  return direction === 'asc' ? (
    <ChevronUp size={14} className="text-[#FF8C00]" />
  ) : (
    <ChevronDown size={14} className="text-[#FF8C00]" />
  );
}

function DefaultAvatar({ name, seed }) {
  const { bg, text } = avatarColorFor(seed || name);
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{ backgroundColor: bg, color: text }}
    >
      {initialsFromName(name)}
    </span>
  );
}

/**
 * Modern data table — sortable headers, row selection, avatars, badges, actions, pagination.
 *
 * @example
 * <ModernDataTable
 *   columns={[
 *     { key: 'id', label: 'ID', sortable: true },
 *     { key: 'fullName', label: 'Full Name', sortable: true, type: 'avatar-name' },
 *     { key: 'className', label: 'Class', type: 'class-badge' },
 *     { key: 'status', label: 'Status', type: 'status-badge' },
 *   ]}
 *   rows={students}
 *   getRowId={(r) => r.id}
 *   selectable
 *   pagination={{ page, pageSize, total, onPageChange, onPageSizeChange }}
 *   onView={(row) => {}}
 *   onEdit={(row) => {}}
 * />
 */
export default function ModernDataTable({
  columns = [],
  rows = [],
  getRowId = (row, index) => row?.id ?? index,
  selectable = false,
  selectedIds,
  onSelectionChange,
  sortKey,
  sortDirection = 'asc',
  onSort,
  pagination,
  onView,
  onEdit,
  onMore,
  renderActions,
  emptyMessage = 'No records found',
  className = '',
  stickyHeader = true,
}) {
  const [internalSelected, setInternalSelected] = useState(new Set());
  const selected = selectedIds ?? internalSelected;

  const setSelected = (next) => {
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelected(next);
  };

  const allIds = useMemo(() => rows.map((row, i) => getRowId(row, i)), [rows, getRowId]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id)) && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allIds));
  };

  const toggleRow = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSort = (key) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  const renderCell = (col, row, rowIndex) => {
    const value = row[col.key];

    if (col.render) return col.render(value, row, rowIndex);

    switch (col.type) {
      case 'avatar-name': {
        const name = col.nameKey ? row[col.nameKey] : value;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <DefaultAvatar name={name} seed={row.id ?? name} />
            <span className="font-medium text-[#000435] truncate">{name}</span>
          </div>
        );
      }
      case 'class-badge':
        return <ClassBadge label={value} tone={col.badgeTone?.(row) || row.classTone || 'blue'} />;
      case 'status-badge':
        return <StatusBadge status={value} variant={col.variant?.(row) || String(value).toLowerCase()} />;
      default:
        return <span className="text-[#000435]/80">{value ?? '—'}</span>;
    }
  };

  const showActions = onView || onEdit || onMore || renderActions;

  return (
    <div
      className={`rounded-2xl border border-black/[0.06] bg-white shadow-sm overflow-hidden ${className}`}
      style={{ fontFamily: MODERN_UI.font }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-black/[0.06] bg-slate-50/80">
              {selectable ? (
                <th className="w-12 px-4 py-3.5 text-left">
                  <FormCheckbox
                    id="modern-table-select-all"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={toggleAll}
                    label=""
                  />
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-[#000435]/70 ${
                    col.sortable ? 'cursor-pointer select-none hover:text-[#000435]' : ''
                  } ${col.headerClassName || ''}`}
                  style={{ width: col.width }}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.label}
                    {col.sortable ? (
                      <SortIcon active={sortKey === col.key} direction={sortDirection} />
                    ) : null}
                  </span>
                </th>
              ))}
              {showActions ? (
                <th className="w-28 px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-[#000435]/70">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (showActions ? 1 : 0)}
                  className="px-4 py-16 text-center text-sm text-[#000435]/45"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => {
                const id = getRowId(row, rowIndex);
                const isSelected = selected.has(id);
                return (
                  <tr
                    key={id}
                    className={`border-b border-black/[0.04] last:border-0 transition-colors ${
                      isSelected ? 'bg-[#FF8C00]/5' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    {selectable ? (
                      <td className="px-4 py-3.5">
                        <FormCheckbox
                          id={`row-${id}`}
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          label=""
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3.5 text-sm ${col.cellClassName || ''}`}>
                        {renderCell(col, row, rowIndex)}
                      </td>
                    ))}
                    {showActions ? (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {renderActions ? (
                            renderActions(row, rowIndex)
                          ) : (
                            <>
                              {onView ? (
                                <button
                                  type="button"
                                  onClick={() => onView(row)}
                                  className="p-2 rounded-lg text-[#000435]/45 hover:text-[#000435] hover:bg-slate-100 transition-colors"
                                  title="View"
                                >
                                  <Eye size={16} />
                                </button>
                              ) : null}
                              {onEdit ? (
                                <button
                                  type="button"
                                  onClick={() => onEdit(row)}
                                  className="p-2 rounded-lg text-[#000435]/45 hover:text-[#000435] hover:bg-slate-100 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={16} />
                                </button>
                              ) : null}
                              {onMore ? (
                                <button
                                  type="button"
                                  onClick={() => onMore(row)}
                                  className="p-2 rounded-lg border border-black/[0.08] text-[#000435]/45 hover:text-[#000435] hover:bg-slate-100 transition-colors"
                                  title="More"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.total > 0 ? (
        <TablePagination
          page={pagination.page}
          totalPages={Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
          total={pagination.total}
          pageSize={pagination.pageSize}
          itemCount={rows.length}
          pageStartIndex={(pagination.page - 1) * pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={pagination.pageSizeOptions || [5, 10, 25, 50]}
        />
      ) : null}
    </div>
  );
}

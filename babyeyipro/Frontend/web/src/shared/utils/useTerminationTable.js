import { useEffect, useMemo, useState } from 'react';
import TablePagination from '../components/TablePagination';
import { filterTerminationRecords } from '../utils/terminationFilters';

export function useTerminationTable(records = [], filters = {}, defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const filtered = useMemo(
    () => filterTerminationRecords(records, filters),
    [records, filters]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [filters.query, filters.year, filters.month, filters.department, filters.contractType, filters.status, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const paginationProps = {
    page,
    totalPages,
    total: filtered.length,
    pageSize,
    itemCount: paginated.length,
    pageStartIndex: (page - 1) * pageSize,
    onPageChange: setPage,
    onPageSizeChange: (n) => { setPageSize(n); setPage(1); },
  };

  return { filtered, paginated, paginationProps, page, setPage, pageSize };
}

export { TablePagination };

import React, { forwardRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DataTableColumn<T> {

  key: string;

  label: string;

  sortable?: boolean;

  render?: (row: T, index: number) => React.ReactNode;

  width?: string;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  cellClassName?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];

  rowKey?: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string, direction: SortDirection) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  selectedRowId?: string | number;
  onRowClick?: (row: T, index: number) => void;

  searchSlot?: React.ReactNode;

  stickyHeader?: boolean;
  className?: string;

  skeletonRows?: number;
}

function DataTableInner<T>(
  {
    columns,
    data,
    rowKey,
    loading = false,
    emptyMessage = 'No data found',
    onSort,
    sortKey,
    sortDirection,
    page = 1,
    pageSize = 10,
    totalItems,
    onPageChange,
    selectedRowId,
    onRowClick,
    searchSlot,
    stickyHeader = true,
    className,
  }: DataTableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const total = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSort) return;
    const nextDirection: SortDirection =
      sortKey === col.key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextDirection);
  };

  const getRowKey = (row: T, index: number) => (rowKey ? rowKey(row, index) : index);

  const alignClass = (align?: DataTableColumn<T>['align']) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div ref={ref} className={cn('flex flex-col w-full', className)}>
      {searchSlot && <div className="mb-4">{searchSlot}</div>}

      <div className="w-full overflow-auto rounded-xl border border-gray-200 bg-(--color-surface) max-h-[600px]">
        <table className="w-full border-collapse">
          <thead className={cn(stickyHeader && 'sticky top-0 z-10')}>
            <tr className="bg-gray-50 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={cn(
                    'px-6 py-3 text-table-header uppercase tracking-wide text-gray-500 whitespace-nowrap',
                    alignClass(col.align),
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                    col.headerClassName
                  )}
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="inline-flex flex-col -space-y-1">
                        {sortKey === col.key && sortDirection === 'desc' ? (
                          <ChevronDown size={13} />
                        ) : (
                          <ChevronUp
                            size={13}
                            className={cn(
                              sortKey === col.key ? 'opacity-100' : 'opacity-30'
                            )}
                          />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 8 }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 w-full max-w-[140px] rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <span className="text-body text-gray-400 italic">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              data.map((row, index) => {
                const key = getRowKey(row, index);
                const isSelected = selectedRowId !== undefined && selectedRowId === key;
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row, index)}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer',
                      isSelected
                        ? 'bg-(--color-state-selected)'
                        : 'hover:bg-(--color-state-hover)'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'px-6 py-4 text-body text-gray-600 whitespace-nowrap',
                          alignClass(col.align),
                          col.cellClassName
                        )}
                      >
                        {col.render ? col.render(row, index) : (row as any)[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {onPageChange && !loading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1">
          <div className="text-small text-gray-500">
            Showing <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span> of{' '}
            <span className="font-semibold text-gray-900">{total}</span> entries
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-(--color-brand-primary) hover:border-(--color-brand-primary) disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg text-small font-semibold transition-all',
                    page === pageNum
                      ? 'bg-(--color-brand-primary) text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-(--color-brand-primary) hover:border-(--color-brand-primary) disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const DataTable = forwardRef(DataTableInner) as <T>(
  props: DataTableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => ReturnType<typeof DataTableInner>;

export default DataTable;

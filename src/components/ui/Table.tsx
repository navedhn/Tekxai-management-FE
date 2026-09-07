import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '../skeletons';

export interface Column<T> {
  header: string;
  key: keyof T | string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  loading?: boolean;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalEntries: number;
    entriesPerPage: number;
  };
  emptyMessage?: string;
  className?: string;
  headerClassName?: string;
  stickyHeader?: boolean;
  maxBodyHeight?: string;
}

const Table = <T,>({
  columns,
  data,
  isLoading = false,
  loading = false,
  pagination,
  emptyMessage = 'No data found',
  className,
  headerClassName,
  stickyHeader = false,
  maxBodyHeight,
}: TableProps<T>) => {
  return (
    <div className={cn('w-full flex flex-col', className)}>
      {isLoading || loading ? (
        <TableSkeleton columns={columns.length} rows={8} />
      ) : (
        <div
          className="overflow-x-auto rounded-xl border border-(--color-border) shadow-sm bg-(--color-card-bg)"
          style={stickyHeader && maxBodyHeight ? { maxHeight: maxBodyHeight, overflowY: 'auto' } : undefined}
        >
          <table className="w-full text-sm text-left border-collapse">
            <thead className={cn(stickyHeader && 'sticky top-0 z-10 backdrop-blur-sm')}>
              <tr className={cn('bg-(--color-elevated) border-b border-(--color-border)', headerClassName)}>
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={cn(
                      'px-6 py-4 font-semibold text-(--color-text-secondary) whitespace-nowrap',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                    )}
                    style={{ width: col.width }}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--color-border)">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center">
                    <span className="text-(--color-text-secondary) italic font-medium">{emptyMessage}</span>
                  </td>
                </tr>
              ) : (
                data.map((item, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: rowIndex * 0.05 }}
                    className="hover:bg-(--color-state-hover) transition-colors group cursor-default"
                  >
                    {columns.map((col, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn(
                          'px-6 py-4 text-(--color-text-secondary) font-medium whitespace-nowrap',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                        )}
                      >
                        {col.render ? col.render(item, rowIndex) : (item[col.key as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination && !(isLoading || loading) && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-1">
          <div className="text-sm text-(--color-text-secondary) font-medium">
            Showing{' '}
            <span className="text-(--color-text-primary) font-semibold">
              {(pagination.currentPage - 1) * pagination.entriesPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="text-(--color-text-primary) font-semibold">
              {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)}
            </span>{' '}
            of <span className="text-(--color-text-primary) font-semibold">{pagination.totalEntries}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 border border-(--color-border) rounded-lg text-(--color-text-secondary) hover:text-primary-500 hover:border-primary-500 hover:bg-(--color-state-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all',
                    pagination.currentPage === pageNum
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-(--color-text-secondary) hover:bg-(--color-state-hover)',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 border border-(--color-border) rounded-lg text-(--color-text-secondary) hover:text-primary-500 hover:border-primary-500 hover:bg-(--color-state-hover) disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;

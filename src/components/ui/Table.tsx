import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { ChevronLeft, ChevronRight, LoaderPinwheel } from 'lucide-react';

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
}

const Table = <T,>({
  columns,
  data,
  isLoading = false,
  pagination,
  emptyMessage = 'No data found',
  className,
  headerClassName,
}: TableProps<T>) => {
  return (
    <div className={cn('w-full flex flex-col', className)}>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className={cn("bg-[#E4F0FF]/40 border-b border-gray-100", headerClassName)}>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className={cn(
                    'px-6 py-4 font-semibold text-gray-700 whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  style={{ width: col.width }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn('flex items-center justify-center')}>
                      <LoaderPinwheel
                        className={cn('animate-spin', className)}
                        size={30}
                        stroke="url(#gradient)"
                      />

                      <svg width="0" height="0">
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#005CDA" />
                            <stop offset="100%" stopColor="#001F4A" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <span className="text-gray-500 italic font-medium">{emptyMessage}</span>
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <motion.tr
                  key={rowIndex}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: rowIndex * 0.05 }}
                  className="hover:bg-gray-50/80 transition-colors group cursor-default"
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={cn(
                        'px-6 py-4 text-gray-600 font-medium whitespace-nowrap',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
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

      {pagination && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-1">
          <div className="text-sm text-gray-500 font-medium">
            Showing <span className="text-gray-900 font-semibold">{(pagination.currentPage - 1) * pagination.entriesPerPage + 1}</span> to{' '}
            <span className="text-gray-900 font-semibold">
              {Math.min(pagination.currentPage * pagination.entriesPerPage, pagination.totalEntries)}
            </span> of <span className="text-gray-900 font-semibold">{pagination.totalEntries}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>

            {Array.from({ length: Math.min(pagination.totalPages, 5) }).map((_, i) => {
              // Simplified pagination logic for demo
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => pagination.onPageChange(pageNum)}
                  className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all',
                    pagination.currentPage === pageNum
                      ? 'bg-gradient-to-b from-[#005CDA] to-[#001F4A] text-white shadow-md shadow-primary-200'
                      : 'text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-primary-500 hover:border-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

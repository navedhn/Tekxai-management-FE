import React, { useMemo } from 'react';
import DataTableLib from 'react-data-table-component';
import { classNames } from '@/utils/helpers';
import { TableColumn } from '@/types';

type Props<T = any> = {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: boolean;
  paginationPerPage?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  title?: string;
  selectableRows?: boolean;
  onSelectedRowsChange?: (selected: { allSelected: boolean; selectedCount: number; selectedRows: T[] }) => void;
};

const DataTable = <T extends Record<string, any> = any>({
  columns,
  data,
  loading = false,
  pagination = true,
  paginationPerPage = 10,
  searchable = false,
  searchPlaceholder = 'Search...',
  onRowClick,
  className,
  title,
  selectableRows = false,
  onSelectedRowsChange
}: Props<T>) => {
  const customStyles = useMemo(
    () => ({
      headRow: {
        style: {
          backgroundColor: 'var(--color-gray-50)',
          borderBottom: '1px solid var(--color-gray-200)'
        }
      },
      headCells: {
        style: {
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: 'var(--color-gray-700)'
        }
      },
      cells: {
        style: {
          fontSize: '0.875rem',
          color: 'var(--color-gray-900)'
        }
      },
      rows: {
        style: {
          '&:hover': {
            backgroundColor: 'var(--color-gray-50)',
            cursor: onRowClick ? 'pointer' : 'default'
          }
        }
      }
    }),
    [onRowClick]
  );

  return (
    <div className={classNames('bg-white dark:bg-gray-800 rounded-lg ', className)}>
      <DataTableLib
        columns={columns}
        data={data}
        progressPending={loading}
        pagination={pagination}
        paginationPerPage={paginationPerPage}
        paginationRowsPerPageOptions={[10, 20, 30, 50]}
        subHeader={searchable}
        subHeaderComponent={
          searchable ? (
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="border rounded-md px-3 py-2 w-full max-w-xs"
            />
          ) : undefined
        }
        title={title}
        customStyles={customStyles as any}
        onRowClicked={onRowClick}
        selectableRows={selectableRows}
        onSelectedRowsChange={onSelectedRowsChange}
        highlightOnHover
        pointerOnHover={!!onRowClick}
      />
    </div>
  );
};

export default DataTable;


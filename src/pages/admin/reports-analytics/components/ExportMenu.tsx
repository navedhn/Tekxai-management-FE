import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export interface ExportColumn {
  key: string;
  label: string;
}

export function ExportMenu<T extends Record<string, unknown>>({
  rows,
  columns,
  filenamePrefix,
}: {
  rows: T[];
  columns: ExportColumn[];
  filenamePrefix: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const dateStr = new Date().toISOString().slice(0, 10);

  const toRows = () => rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key]])));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(toRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filenamePrefix.slice(0, 28));
    XLSX.writeFile(wb, `${filenamePrefix}_${dateStr}.xlsx`);
    setOpen(false);
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(toRows());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl h-9"
        onClick={() => setOpen((v) => !v)}
      >
        <Download size={14} className="mr-1.5" /> Export <ChevronDown size={14} className="ml-1" />
      </Button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5">
          <button
            onClick={exportExcel}
            className={cn('w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors')}
          >
            <FileSpreadsheet size={15} className="text-green-600" /> Export as Excel
          </button>
          <button
            onClick={exportCsv}
            className={cn('w-full flex items-center gap-2.5 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors')}
          >
            <FileText size={15} className="text-blue-600" /> Export as CSV
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;

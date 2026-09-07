import React from 'react';
import { Trash2 } from 'lucide-react';

interface BulkDeleteBarProps {
  count: number;
  entityLabel: string;
  onClear: () => void;
  onDelete: () => void;
  extraActions?: React.ReactNode;
}

const BulkDeleteBar: React.FC<BulkDeleteBarProps> = ({ count, entityLabel, onClear, onDelete, extraActions }) => {
  if (count === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-3 px-4 py-2.5 bg-primary-50 border border-primary-100 rounded-xl">
      <span className="text-sm font-semibold text-primary-700">
        {count} {entityLabel}{count > 1 ? 's' : ''} selected
      </span>
      <div className="flex-1" />
      <button
        onClick={onClear}
        className="text-xs font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
      >
        Clear selection
      </button>
      {extraActions}
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-xs font-black text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
      >
        <Trash2 size={13} /> Delete {count} selected
      </button>
    </div>
  );
};

export default BulkDeleteBar;

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

// Shared multi-select chip picker — lifted out of CreateMilestoneModal.tsx
// (the only place this pattern existed) so the Access Control redesign
// (and any future feature) can reuse it instead of re-rolling its own.
export interface ChipMultiSelectProps {
  label?: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyText: string;
}

const ChipMultiSelect: React.FC<ChipMultiSelectProps> = ({ label, options, selected, onChange, emptyText }) => {
  const [open, setOpen] = useState(false);
  const available = options.filter((o) => !selected.includes(o.id));
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {selected.map((id) => {
          const opt = options.find((o) => o.id === id);
          return (
            <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-bold px-2.5 py-1 rounded-lg">
              {opt?.label || id}
              <button type="button" onClick={() => onChange(selected.filter((s) => s !== id))} className="hover:text-red-500">
                <X size={11} />
              </button>
            </span>
          );
        })}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg"
          >
            <Plus size={12} /> Add
          </button>
          {open && (
            <div className="absolute z-20 mt-1 w-56 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl p-1.5">
              {available.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-2 py-2">{emptyText}</p>
              ) : (
                available.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { onChange([...selected, o.id]); setOpen(false); }}
                    className="w-full text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg"
                  >
                    {o.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChipMultiSelect;

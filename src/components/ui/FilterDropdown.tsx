import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from './Button';

export interface FilterState {
  search: string;
  sortByLatest: boolean;
  last24Hours: boolean;
  lastWeek: boolean;
  lastMonth: boolean;
  lastYear: boolean;
  starredOnly: boolean;
  hasDescription: boolean;
}

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  triggerRef: React.RefObject<HTMLElement>;
}

const CheckRow: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <label className="flex items-center gap-3 py-2.5 cursor-pointer group">
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-150 shrink-0',
        checked
          ? 'bg-[#005CDA] border-[#005CDA]'
          : 'border-gray-300 group-hover:border-primary-300'
      )}
    >
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className="text-[14px] font-medium text-gray-700">{label}</span>
  </label>
);

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  isOpen,
  onClose,
  filters,
  onChange,
  triggerRef,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, triggerRef]);

  const set = (key: keyof FilterState, value: boolean | string) =>
    onChange({ ...filters, [key]: value });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.95, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="absolute top-[calc(100%+8px)] right-0 w-[340px] bg-white rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.14)] border border-gray-100 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <span className="font-black text-gray-900 text-base">Filter</span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Search inside filter */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
              />
            </div>
          </div>

          {/* Filter Body */}
          <div className="px-5 py-3 max-h-[380px] overflow-y-auto no-scrollbar">
            {/* Sort By */}
            <div className="mb-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Sort By</p>
              <CheckRow checked={filters.sortByLatest} onChange={(v) => set('sortByLatest', v)} label="Latest update" />
            </div>

            {/* Filter By Latest Update */}
            <div className="mb-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Filter By Latest Update</p>
              <CheckRow checked={filters.last24Hours} onChange={(v) => set('last24Hours', v)} label="Last 24 hourss" />
              <CheckRow checked={filters.lastWeek} onChange={(v) => set('lastWeek', v)} label="Last week" />
              <CheckRow checked={filters.lastMonth} onChange={(v) => set('lastMonth', v)} label="Last month" />
              <CheckRow checked={filters.lastYear} onChange={(v) => set('lastYear', v)} label="Last Year" />
            </div>

            {/* Starred Projects */}
            <div className="mb-4">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Starred Projects</p>
              <CheckRow checked={filters.starredOnly} onChange={(v) => set('starredOnly', v)} label="Only includes result from starred projects" />
            </div>

            {/* Project Description */}
            <div className="mb-2">
              <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">Project Description</p>
              <CheckRow checked={filters.hasDescription} onChange={(v) => set('hasDescription', v)} label="Only show projects with description" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              onClick={() => onChange({
                search: '', sortByLatest: false, last24Hours: false,
                lastWeek: false, lastMonth: false, lastYear: false,
                starredOnly: false, hasDescription: false
              })}
              className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors px-4 py-2 rounded-xl hover:bg-gray-50"
            >
              Clear All
            </button>
            <Button
              onClick={onClose}
              className="bg-[#005CDA] hover:bg-[#0048B8] text-white font-black text-sm px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-[0_4px_12px_rgba(0,92,218,0.3)]"
            >
              Apply Filters
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FilterDropdown;

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Search, ChevronDown, ChevronUp, Check, X, Loader2 } from 'lucide-react';

// Design System Phase 6: one reusable searchable dropdown for every
// "pick one from a list" field in the app (Employee/Department/
// Designation/Grade/Country/City/Business Unit/Client/Lead/Project/
// Role/Permission/Status/Category/Vendor/Asset/…). Supports local
// filtering out of the box; pass `onSearch` to delegate filtering to
// a remote endpoint instead (loading state included either way).
// Existing dropdown call sites (Select.tsx, FilterDropdown.tsx, the
// ~85 ad hoc <select>/custom-dropdown instances found in Phase 1) are
// migrated separately — this is the foundation component.

export interface SearchableSelectOption {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  options: SearchableSelectOption[];
  value?: string | number | null;
  onChange: (value: string | number | null) => void;
  onSearch?: (term: string) => void;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  containerClassName?: string;
  /** Above this many options, only the visible window is rendered. */
  virtualizeThreshold?: number;
}

const ROW_HEIGHT = 40;
const LIST_HEIGHT = 240;

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  error,
  options,
  value,
  onChange,
  onSearch,
  loading = false,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found',
  disabled = false,
  clearable = true,
  className,
  containerClassName,
  virtualizeThreshold = 100,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    if (onSearch) return options; // caller already filtered remotely
    if (!term.trim()) return options;
    const q = term.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, term, onSearch]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setScrollTop(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setTerm('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (onSearch) onSearch(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const selectOption = useCallback((opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setIsOpen(false);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlightedIndex];
      if (opt) selectOption(opt);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isVirtualized = filtered.length > virtualizeThreshold;
  const visibleCount = Math.ceil(LIST_HEIGHT / ROW_HEIGHT) + 2;
  const startIndex = isVirtualized ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1) : 0;
  const endIndex = isVirtualized ? Math.min(filtered.length, startIndex + visibleCount) : filtered.length;
  const visibleItems = isVirtualized ? filtered.slice(startIndex, endIndex) : filtered;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full relative', containerClassName)} ref={wrapperRef}>
      {label && <label className="text-body font-medium text-(--color-text-secondary) ml-1">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2 text-body shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-(--color-brand-primary) transition-all',
          disabled ? 'opacity-60 cursor-not-allowed bg-(--color-disabled-bg) border-gray-100' : 'cursor-pointer',
          error && 'border-(--color-danger) focus:ring-(--color-danger)',
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.icon}
          <span className={cn('truncate', !selected ? 'text-(--color-text-secondary)' : 'text-(--color-text-primary) font-medium')}>
            {selected ? selected.label : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-(--color-text-secondary) hover:text-(--color-text-primary) p-0.5"
              aria-label="Clear selection"
            >
              <X size={14} />
            </span>
          )}
          <span className={cn('text-(--color-text-secondary)', isOpen && 'text-(--color-brand-primary)')}>
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-xl shadow-xl z-90 overflow-hidden animate-dropdown-enter">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search size={15} className="text-(--color-text-secondary) shrink-0" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full text-body outline-none placeholder:text-(--color-text-secondary)"
            />
            {loading && <Loader2 size={14} className="animate-spin text-(--color-text-secondary) shrink-0" />}
          </div>

          <ul
            ref={listRef}
            className="overflow-auto p-1"
            style={{ maxHeight: LIST_HEIGHT }}
            onScroll={(e) => isVirtualized && setScrollTop(e.currentTarget.scrollTop)}
          >
            {isVirtualized && <li style={{ height: startIndex * ROW_HEIGHT }} aria-hidden />}

            {!loading && filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-small text-(--color-text-secondary)">{emptyMessage}</li>
            )}

            {visibleItems.map((opt, i) => {
              const actualIndex = startIndex + i;
              const isSelected = opt.value === value;
              const isHighlighted = actualIndex === highlightedIndex;
              return (
                <li
                  key={opt.value}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(actualIndex)}
                  style={{ height: ROW_HEIGHT }}
                  className={cn(
                    'flex items-center justify-between px-3 rounded-lg cursor-pointer transition-colors text-body select-none',
                    opt.disabled && 'opacity-50 cursor-not-allowed',
                    isSelected
                      ? 'bg-(--color-brand-primary) text-white font-medium'
                      : isHighlighted
                        ? 'bg-(--color-state-hover) text-(--color-text-primary)'
                        : 'text-(--color-text-primary)',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon}
                    <div className="min-w-0">
                      <p className="truncate">{opt.label}</p>
                      {opt.description && (
                        <p className={cn('truncate text-small', isSelected ? 'text-white/80' : 'text-(--color-text-secondary)')}>
                          {opt.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check size={16} strokeWidth={3} className="shrink-0" />}
                </li>
              );
            })}

            {isVirtualized && <li style={{ height: (filtered.length - endIndex) * ROW_HEIGHT }} aria-hidden />}
          </ul>
        </div>
      )}

      {error && <p className="text-small text-(--color-danger) ml-1">{error}</p>}
    </div>
  );
};

export default SearchableSelect;

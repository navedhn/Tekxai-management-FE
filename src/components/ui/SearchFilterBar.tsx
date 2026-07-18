import React from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import Select, { SelectOption } from './Select';

interface FilterConfig {
  options: SelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  containerClassName?: string;
}

interface SortConfig {
  label: string;
  onToggle: () => void;
}

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  sort?: SortConfig;
}

// Shared search + filter-dropdowns + optional sort-toggle bar. Extracted from
// the identical inline markup duplicated across DependenciesPanel and
// ClientCommunicationPanel (and 19+ other pages) — same visual output,
// just one implementation instead of N.
const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  search, onSearchChange, searchPlaceholder = 'Search…', filters = [], sort,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {filters.map((filter, i) => (
        <Select
          key={i}
          options={filter.options}
          value={filter.value}
          onChange={filter.onChange}
          containerClassName={filter.containerClassName}
        />
      ))}
      {sort && (
        <button
          onClick={sort.onToggle}
          className="flex items-center gap-1.5 h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 shrink-0"
        >
          <ArrowUpDown size={13} /> {sort.label}
        </button>
      )}
    </div>
  );
};

export default SearchFilterBar;

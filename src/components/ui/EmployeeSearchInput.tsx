import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@/services/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/utils/cn';

export interface EmployeeSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string | null;
  department?: { id: string; name: string } | null;
  designation?: string | null;
  designation_ref?: { id: string; name: string } | null;
  business_unit?: string | null;
  avatar?: string | null;
}

interface EmployeeSearchInputProps {
  onSelect: (employee: EmployeeSearchResult) => void;
  selected?: EmployeeSearchResult | null;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

// Standalone employee lookup — deliberately not extracted from or coupled to
// UserOverridePanel (RBAC module). Searches Name/Employee ID/Email/
// Department/Designation/Business Unit via the same GET /user?search=
// endpoint, whose backend match clauses already cover all of these fields.
const EmployeeSearchInput: React.FC<EmployeeSearchInputProps> = ({
  onSelect,
  selected,
  onClear,
  placeholder = 'Search by name, employee ID, email, department, or designation…',
  className,
}) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<EmployeeSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debouncedTerm = useDebounce(term, 350);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!debouncedTerm || debouncedTerm.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiRequest<any>(`${API_ENDPOINTS.USER.LIST}?search=${encodeURIComponent(debouncedTerm)}&limit=20`)
      .then((res) => {
        if (cancelled) return;
        setResults(res?.payload?.records || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedTerm]);

  if (selected) {
    return (
      <div className={cn('flex items-center justify-between gap-3 h-11 px-4 rounded-[8px] border border-gray-200 bg-white', className)}>
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-gray-800 truncate">
            {selected.first_name} {selected.last_name}
          </p>
          <p className="text-xs text-gray-400 truncate">{selected.email}</p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Clear selected employee"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors">
          <Search size={16} />
        </div>
        <input
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex h-11 w-full rounded-[8px] border border-gray-200 bg-white pl-11 pr-4 text-[14px] text-gray-700 placeholder:text-gray-400 focus-visible:outline-none focus:border-primary-500 transition-all duration-200 hover:border-gray-300"
        />
      </div>

      {open && (loading || results.length > 0 || (debouncedTerm.length >= 2 && !loading)) && (
        <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-100 rounded-xl shadow-lg divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {loading && (
            <p className="px-4 py-3 text-xs text-gray-400">Searching…</p>
          )}
          {!loading && results.length === 0 && debouncedTerm.length >= 2 && (
            <p className="px-4 py-3 text-xs text-gray-400">No employees found</p>
          )}
          {!loading && results.map((emp) => {
            const designation = emp.designation || emp.designation_ref?.name;
            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => { onSelect(emp); setTerm(''); setResults([]); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
              >
                <p className="text-[14px] font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                <p className="text-xs text-gray-400">
                  {[emp.employee_id, emp.email, emp.department?.name, designation].filter(Boolean).join(' · ')}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeeSearchInput;

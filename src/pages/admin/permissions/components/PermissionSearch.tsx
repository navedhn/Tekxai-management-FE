import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface PermissionSearchProps {
  onSearch: (term: string) => void;
  placeholder?: string;
}

// Debounced permission search — uses the app's existing useDebounce hook
// (the old page hand-rolled its own setTimeout debounce instead of this;
// fixed here since there's no reason for a second implementation).
const PermissionSearch: React.FC<PermissionSearchProps> = ({ onSearch, placeholder = 'Search permissions…' }) => {
  const [value, setValue] = useState('');
  const debounced = useDebounce(value, 250);

  useEffect(() => { onSearch(debounced); }, [debounced, onSearch]);

  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400"
      />
    </div>
  );
};

export default PermissionSearch;

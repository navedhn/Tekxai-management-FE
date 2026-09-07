import { useState, useMemo } from 'react';

export function useBulkSelection(pageIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allOnPageSelected = useMemo(
    () => pageIds.length > 0 && pageIds.every(id => selected.has(id)),
    [pageIds, selected]
  );
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allOnPageSelected) {
      setSelected(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...pageIds]));
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const clear = () => setSelected(new Set());

  return { selected, setSelected, allOnPageSelected, someSelected, toggleAll, toggleOne, clear };
}

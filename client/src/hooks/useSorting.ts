import { useState } from 'react';

export function useSorting() {
  const [sortColumn, setSortColumn] = useState<'date' | 'day' | 'task' | 'hours' | 'sent'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleHeaderClick = (key: string) => {
    if (key === 'action') return;
    if (sortColumn === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(key as 'date' | 'day' | 'task' | 'hours' | 'sent');
      setSortDirection(key === 'date' ? 'desc' : 'asc');
    }
  };

  return { sortColumn, sortDirection, handleHeaderClick };
}

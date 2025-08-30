
export function TableHeaders({
  sortColumn,
  sortDirection,
  onHeaderClick
}: {
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onHeaderClick: (key: string) => void;
}) {
  const headers = [
    { key: 'drag', label: '', sortable: false, width: 'w-8' },
    { key: 'task', label: 'Task' },
    { key: 'heading', label: 'Heading', hideOnMobile: true },
    { key: 'hours', label: 'Hours' },
    { key: 'action', label: 'Action', sortable: false },
  ];

  return (
    <tr className="border-b border-gray-200">
      {headers.map(h => (
        <th
          key={h.key}
          className={`px-3 sm:px-6 py-3 text-gray-900 font-semibold text-center select-none ${
            h.sortable === false ? '' : 'cursor-pointer hover:bg-gray-100'
          } ${h.width || ''} ${h.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
          onClick={() => h.sortable !== false ? onHeaderClick(h.key) : undefined}
        >
          {h.label}
          {h.key === sortColumn && (
            <span className="ml-1 text-gray-700">
              {sortDirection === 'asc' ? '▲' : '▼'}
            </span>
          )}
        </th>
      ))}
    </tr>
  );
}

import React from 'react';

export function EmptyState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-8 text-gray-700 text-lg">
        No entries in this range.
      </td>
    </tr>
  );
}

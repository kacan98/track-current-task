import React, { useState } from 'react';
import { useLogEntries } from '../../contexts/LogEntriesContext';

interface DayGroupDropZoneProps {
  date: string;
  children: React.ReactNode;
}

export function DayGroupDropZone({ date, children }: DayGroupDropZoneProps) {
  const { updateEntryDate } = useLogEntries();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only set to false if we're leaving the drop zone entirely
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const entryId = e.dataTransfer.getData('entryId');
    if (entryId) {
      updateEntryDate(entryId, date);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`transition-all ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
    >
      {children}
    </div>
  );
}
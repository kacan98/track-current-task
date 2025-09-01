import React, { useState } from 'react';

interface DragDropUploadProps {
  onFileSelect: (file: File) => void;
  onError: (error: string) => void;
  children: React.ReactNode;
  className?: string;
  accept?: string;
}

export const DragDropUpload: React.FC<DragDropUploadProps> = ({
  onFileSelect,
  onError,
  children,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onFileSelect(file);
      } else {
        onError('Please upload a CSV file.');
      }
    }
  };

  const dynamicClasses = isDragging 
    ? 'border-blue-400 bg-blue-50' 
    : 'border-gray-300 hover:border-gray-400 bg-white';

  return (
    <div
      className={`${className} ${dynamicClasses}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
};
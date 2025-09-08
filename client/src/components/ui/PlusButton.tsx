import React from 'react';

interface EmptyCellProps {
  onClick: () => void;
  title?: string;
  className?: string;
}

export const EmptyCell: React.FC<EmptyCellProps> = ({ 
  onClick, 
  title = "Add entry", 
  className = ""
}) => {
  return (
    <div 
      className={`w-full h-full min-h-[60px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${className}`}
      onClick={onClick}
      title={title}
    >
      <span className="text-2xl text-gray-400 hover:text-blue-600 transition-colors duration-200">+</span>
    </div>
  );
};
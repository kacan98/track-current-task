import React from 'react';

interface StepProps {
  stepNumber: string | number;
  title: string;
  description: string;
  optional?: boolean;
  children?: React.ReactNode;
}

export const Step: React.FC<StepProps> = ({ 
  stepNumber, 
  title, 
  description, 
  optional = false,
  children 
}) => {
  const bgColor = optional ? 'bg-gray-100' : 'bg-blue-100';
  const textColor = optional ? 'text-gray-600' : 'text-blue-600';
  
  return (
    <div className="flex gap-4">
      <div className={`flex-shrink-0 w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
        <span className={`${textColor} font-semibold`}>{stepNumber}</span>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800 mb-1">
          {title}
          {optional && <span className="text-xs text-gray-500 ml-1">(Optional)</span>}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
};
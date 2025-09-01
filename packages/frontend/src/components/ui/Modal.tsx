import React, { useEffect } from 'react';
import { Button } from './Button';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl'
};

export function Modal({ title, onClose, children, maxWidth = '2xl' }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-lg ${maxWidthClasses[maxWidth]} w-full mx-4 max-h-[80vh] overflow-y-auto cursor-default`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg p-0"
              aria-label={`Close ${title}`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </Button>
          </div>
          
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
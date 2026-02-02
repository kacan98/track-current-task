import React, { useEffect } from 'react';
import { Button } from './Button';

interface ModalProps {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  height?: 'auto' | 'full';
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onKeyDown?: (e: KeyboardEvent) => void;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  'full': 'max-w-[95vw]'
};

export function Modal({
  title,
  onClose,
  children,
  maxWidth = '4xl',
  height = 'auto',
  header,
  footer,
  onKeyDown: customKeyDown
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (customKeyDown) {
        customKeyDown(e);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, customKeyDown]);

  const heightClass = height === 'full' ? 'h-[90vh]' : 'max-h-[80vh]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${maxWidthClasses[maxWidth]} w-full mx-4 ${heightClass} cursor-default flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(header || title) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            {header || (
              <>
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-lg p-0"
                  aria-label={`Close ${title}`}
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </Button>
              </>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`flex-1 ${height === 'full' ? 'overflow-hidden' : 'overflow-y-auto p-6'}`}>
          {height === 'auto' ? (
            <div className="space-y-6">
              {children}
            </div>
          ) : (
            children
          )}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { createPortal } from 'react-dom';
import SettingsPage from './SettingsPage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteAllRows: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDeleteAllRows
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <SettingsPage onClose={onClose} onDeleteAllRows={onDeleteAllRows} />
      </div>
    </div>,
    document.body
  );
};
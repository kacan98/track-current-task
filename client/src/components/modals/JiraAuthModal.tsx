import React from 'react';
import { Modal } from '../ui/Modal';
import { JiraCredentialsForm } from '../forms/JiraCredentialsForm';

interface JiraAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const JiraAuthModal: React.FC<JiraAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess
}) => {
  if (!isOpen) return null;

  const handleAuthSuccess = () => {
    onAuthSuccess();
    onClose();
  };

  return (
    <Modal 
      title="Connect to Jira" 
      onClose={onClose}
      maxWidth="2xl"
    >
      <div className="mb-4">
        <p className="text-gray-600 text-sm">
          To send worklogs to Jira, please authenticate with your Jira account first.
        </p>
      </div>
      
      <JiraCredentialsForm onAuthSuccess={handleAuthSuccess} />
    </Modal>
  );
};
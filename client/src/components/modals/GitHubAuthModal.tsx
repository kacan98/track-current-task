import { Modal } from '../ui/Modal';
import { GitHubConnectionForm } from '../forms/GitHubConnectionForm';

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
  title?: string;
}

export function GitHubAuthModal({ isOpen, onClose, onAuthSuccess, title = "Connect to GitHub" }: GitHubAuthModalProps) {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">
          Connect your GitHub account to automatically fill your week with commit data.
        </p>
        <GitHubConnectionForm onSuccess={onAuthSuccess} />
      </div>
    </Modal>
  );
}
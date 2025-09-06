import { Modal } from '../ui/Modal';
import { GitHubConnectionForm } from '../forms/GitHubConnectionForm';

interface GitHubAuthModalProps {
  onClose: () => void;
  title?: string;
}

export function GitHubAuthModal({ onClose, title = "Connect to GitHub" }: GitHubAuthModalProps) {
  return (
    <Modal title={title} onClose={onClose} maxWidth="md">
      <div className="space-y-4">
        <p className="text-gray-600 text-sm">
          Connect your GitHub account to automatically fill your week with commit data.
        </p>
        <GitHubConnectionForm />
      </div>
    </Modal>
  );
}
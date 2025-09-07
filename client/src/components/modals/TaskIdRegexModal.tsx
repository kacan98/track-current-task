import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { RegexValidator } from '../ui/RegexValidator';
import { useSettings } from '../../contexts/SettingsContext';

interface TaskIdRegexModalProps {
  onClose: () => void;
  onSave: () => void;
}

export function TaskIdRegexModal({ onClose, onSave }: TaskIdRegexModalProps) {
  const settings = useSettings();
  
  const handleSave = () => {
    const taskIdRegex = settings?.getSetting('taskIdRegex');
    if (taskIdRegex && taskIdRegex.trim() !== '') {
      onSave();
    }
  };
  
  const handleCancel = () => {
    onClose();
  };
  
  const handleRegexChange = (regex: string) => {
    settings?.updateSetting('taskIdRegex', regex);
  };
  
  const taskIdRegex = settings?.getSetting('taskIdRegex') || '';
  const isValid = taskIdRegex.trim() !== '';
  
  return (
    <Modal title="Configure Task ID Pattern" onClose={onClose}>
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">What is this?</h4>
          <p className="text-sm text-blue-800">
            Auto-fill Week needs to know how to extract task IDs from your commit messages and branch names.
            Use the validator below to create and test a regular expression pattern that matches your task ID format.
          </p>
        </div>
        
        <RegexValidator
          regex={taskIdRegex}
          onRegexChange={handleRegexChange}
        />
        
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleSave}
            disabled={!isValid}
            variant="primary"
            className="flex-1"
          >
            Save & Continue Auto-fill
          </Button>
          <Button
            onClick={handleCancel}
            variant="secondary"
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
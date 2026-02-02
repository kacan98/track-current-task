import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLogEntries } from '../../contexts/LogEntriesContext';
import { createEntry } from '../../utils/entryUtils';

interface AddTaskModalProps {
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AddTaskModal({ date, isOpen, onClose }: AddTaskModalProps) {
  const { addEntry } = useLogEntries();
  const [taskId, setTaskId] = useState('');
  const [hours, setHours] = useState('1');
  const taskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && taskInputRef.current) {
      taskInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!taskId.trim()) return;

    const entry = createEntry(
      taskId.trim(),
      date,
      parseFloat(hours) || 1
    );

    addEntry(entry);

    // Reset form
    setTaskId('');
    setHours('1');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal title={`Add Task for ${date}`} onClose={onClose} maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Task ID
          </label>
          <input
            ref={taskInputRef}
            type="text"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            placeholder="e.g. PROJ-1234 or Meeting"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hours
          </label>
          <input
            type="number"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            min="0.1"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
          >
            Add Task
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { useGitHubAuth } from '../../../contexts/GitHubAuthContext';
import { Modal } from '../../ui/Modal';
import { CommitAnalysisSettings } from './components/CommitAnalysisSettings';
import { CommitTimeline } from './components/CommitTimeline';
import { PowerShellCommands } from './components/PowerShellCommands';
import { useCommitSessions } from './hooks/useCommitSessions';
import { commitService, type GitHubCommit } from '../../../services/commitService';

interface CommitsModalProps {
  date: string;
  onClose: () => void;
  onAddLogEntry?: (entry: { date: string; taskId: string; duration: number; description: string }) => void;
}

export function CommitsModal({ date, onClose, onAddLogEntry }: CommitsModalProps) {
  const settings = useSettings();
  const { isAuthenticated, getCommitsForDate, isLoading } = useGitHubAuth();
  const [username, setUsername] = useState('');
  const [githubCommits, setGithubCommits] = useState<GitHubCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  const workSessions = useCommitSessions(
    githubCommits,
    date,
    settings?.getSetting('dayStartTime') || '09:00',
    settings?.getSetting('dayEndTime') || '17:00',
    settings?.getSetting('taskIdRegex') || ''
  );
  
  useEffect(() => {
    setUsername(settings?.getSetting('githubUsername') || '');
  }, [settings]);

  // Initialize commit service
  useEffect(() => {
    if (isAuthenticated) {
      commitService.initialize(getCommitsForDate);
    }
  }, [isAuthenticated, getCommitsForDate]);

  const loadGithubCommits = useCallback(async () => {
    try {
      setLoadingCommits(true);
      setGithubError(null);
      const commits = await commitService.getCommitsForDate(date);
      setGithubCommits(commits);
    } catch (error) {
      console.error('Failed to load GitHub commits:', error);
      setGithubError(error instanceof Error ? error.message : 'Failed to load commits');
    } finally {
      setLoadingCommits(false);
    }
  }, [date]);

  // Load GitHub commits when authenticated and modal opens
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      loadGithubCommits();
    }
  }, [isAuthenticated, date, isLoading, loadGithubCommits]);

  const formatDateWithDay = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const handleUsernameChange = (newUsername: string) => {
    setUsername(newUsername);
    settings?.updateSetting('githubUsername', newUsername);
  };

  return (
    <Modal title={`GitHub Commits for ${formatDateWithDay(date)}`} onClose={onClose} maxWidth="2xl">
      <CommitAnalysisSettings />

      <CommitTimeline
        date={date}
        githubCommits={githubCommits}
        workSessions={workSessions}
        loadingCommits={loadingCommits}
        githubError={githubError}
        onAddLogEntry={onAddLogEntry}
      />

      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Manual Commands</h3>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-blue-800 text-sm font-medium mb-2">Prerequisites:</p>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• GitHub CLI installed (<code className="bg-blue-100 px-1 rounded">gh</code>)</li>
            <li>• Authenticated with <code className="bg-blue-100 px-1 rounded">gh auth login</code></li>
          </ul>
          <p className="text-blue-700 text-xs mt-2">
            💡 Note: Branch info not included in basic search. For detailed commit info, click individual commits in the output.
          </p>
        </div>

        <PowerShellCommands
          date={date}
          username={username}
          onUsernameChange={handleUsernameChange}
        />
      </div>
    </Modal>
  );
}
import { useState } from 'react';
import { Button } from '../../../ui/Button';
import { GitHubConnectionForm } from '../../../forms/GitHubConnectionForm';
import { useGitHubAuth } from '../../../../contexts/GitHubAuthContext';
import { useSettings } from '../../../../contexts/SettingsContext';
import type { CommitSession } from '../hooks/useCommitSessions';

interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  date: string;
  url: string;
  repository: { name: string; fullName: string };
  author: { name: string; email: string; date: string };
  branch: string;
  pullRequest: { number: number; title: string; branchDeleted: boolean; url: string } | null;
}

interface AddLogEntryData {
  date: string;
  taskId: string;
  duration: number;
  description: string;
}

interface CommitTimelineProps {
  date: string;
  githubCommits: GitHubCommit[];
  workSessions: CommitSession[];
  loadingCommits: boolean;
  githubError: string | null;
  onAddLogEntry: ((entry: AddLogEntryData) => void) | undefined;
}

export function CommitTimeline({ 
  date, 
  githubCommits, 
  workSessions, 
  loadingCommits, 
  githubError, 
  onAddLogEntry 
}: CommitTimelineProps) {
  const { isAuthenticated, user, logout } = useGitHubAuth();
  const settings = useSettings();
  const [sessionDurations, setSessionDurations] = useState<Record<number, number>>({});

  const formatCommitTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">GitHub Commits</h3>
        <GitHubConnectionForm />
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">GitHub Commits</h3>
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-sm text-gray-600">Connected as <strong>{user?.login}</strong></span>
          </div>
          <Button onClick={logout} variant="secondary" className="text-xs">
            Disconnect
          </Button>
        </div>
        
        {loadingCommits ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">Loading commits...</p>
          </div>
        ) : githubError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm mb-2">Error loading commits:</p>
            <p className="text-red-800 text-sm">{githubError}</p>
            {githubError.includes('expired') && (
              <div className="mt-2">
                <p className="text-red-600 text-xs mb-2">Please reconnect your GitHub account:</p>
                <GitHubConnectionForm />
              </div>
            )}
          </div>
        ) : githubCommits.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-gray-600">No commits found for {date}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-3">
              Found {githubCommits.length} commit{githubCommits.length !== 1 ? 's' : ''} in {workSessions.length} work session{workSessions.length !== 1 ? 's' : ''}:
            </p>
            
            {workSessions.length > 0 && (
              <div className="space-y-2">
                {(() => {
                  // Create a timeline of all items (day markers, commits, session summaries)
                  const timelineItems: Array<{ time: Date; type: 'day-start' | 'day-end' | 'commit' | 'session-end'; data?: any }> = [];
                  
                  const dayStartTime = new Date(`${date}T${settings?.getSetting('dayStartTime') || '09:00'}:00`);
                  const dayEndTime = new Date(`${date}T${settings?.getSetting('dayEndTime') || '17:00'}:00`);
                  
                  // Add day start marker
                  timelineItems.push({ time: dayStartTime, type: 'day-start' });
                  
                  // Add all commits and session ends
                  workSessions.forEach((session, sessionIndex) => {
                    // Add commits from this session
                    session.commits.forEach((commit: GitHubCommit) => {
                      timelineItems.push({ 
                        time: new Date(commit.date), 
                        type: 'commit', 
                        data: { commit, session, sessionIndex }
                      });
                    });
                    
                    // Add session end marker
                    timelineItems.push({ 
                      time: session.endTime, 
                      type: 'session-end', 
                      data: { session, sessionIndex }
                    });
                  });
                  
                  // Add day end marker
                  timelineItems.push({ time: dayEndTime, type: 'day-end' });
                  
                  // Sort by time
                  timelineItems.sort((a, b) => a.time.getTime() - b.time.getTime());
                  
                  return timelineItems.map((item, itemIndex) => {
                    const key = `${item.type}-${itemIndex}`;
                    
                    if (item.type === 'day-start') {
                      return (
                        <div key={key} className="ml-4 pl-4 border-l-2 border-green-500">
                          <div className="flex items-start gap-3">
                            <code className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
                              [{item.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}]
                            </code>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-green-700">📅 Day Start</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    if (item.type === 'day-end') {
                      return (
                        <div key={key} className="ml-4 pl-4 border-l-2 border-red-500">
                          <div className="flex items-start gap-3">
                            <code className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-mono">
                              [{item.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}]
                            </code>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-red-700">📅 Day End</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    if (item.type === 'commit') {
                      const { commit } = item.data;
                      const commitTime = new Date(commit.date);
                      const isBeforeHours = commitTime < dayStartTime;
                      const isAfterHours = commitTime > dayEndTime;
                      
                      return (
                        <div key={key} className="ml-4 pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start gap-3">
                            <code className={`text-xs px-2 py-1 rounded font-mono ${
                              isBeforeHours || isAfterHours 
                                ? 'bg-orange-100 text-orange-800' 
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              [{formatCommitTime(commit.date)}]
                              {(isBeforeHours || isAfterHours) && (
                                <span className="ml-1">⚠️</span>
                              )}
                            </code>
                            <div className="flex-1 min-w-0">
                              <a 
                                href={commit.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline break-words block"
                              >
                                {commit.message.split('\n')[0]}
                              </a>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">({commit.repository.name})</span>
                                <a 
                                  href={commit.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-gray-400 hover:text-blue-600 font-mono hover:underline"
                                >
                                  {commit.shortSha}
                                </a>
                                {commit.pullRequest ? (
                                  <a 
                                    href={commit.pullRequest.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium break-all hover:underline"
                                  >
                                    PR #{commit.pullRequest.number} ({commit.branch}){commit.pullRequest.branchDeleted ? ' [deleted]' : ''}
                                  </a>
                                ) : (
                                  <span className="text-xs text-blue-600 font-medium break-all">
                                    {commit.branch}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    if (item.type === 'session-end') {
                      const { session, sessionIndex } = item.data;
                      const startTimeStr = session.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const endTimeStr = session.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const defaultDurationHours = Math.ceil(session.durationMinutes / 15) * 0.25;
                      const durationHours = sessionDurations[sessionIndex] !== undefined ? sessionDurations[sessionIndex] : defaultDurationHours;
                      
                      return (
                        <div key={key} className="bg-blue-50 rounded-lg p-3 border border-blue-200 shadow-sm">
                          <div className="flex items-start gap-3">
                            {/* Left section - flexible, takes most space */}
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                  {startTimeStr} → {endTimeStr}
                                </span>
                                {session.startsBeforeWorkHours && (
                                  <span className="text-xs text-orange-600 whitespace-nowrap">⏰ Started before work hours</span>
                                )}
                              </div>
                              
                              {/* Task ID Section - More Prominent */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {session.taskId ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded whitespace-nowrap border border-green-300">
                                      📋 Task: {session.taskId}
                                    </span>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                      (extracted from {session.taskIdSource})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded whitespace-nowrap border border-yellow-300">
                                    ⚠️ No task ID found (regex: {settings?.getSetting('taskIdRegex') || 'DMO-\\d+'})
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-xs text-gray-600 space-y-1">
                                <div>
                                  Branch: <code className="bg-white px-1 rounded break-all">{session.branch}</code>
                                </div>
                                {session.prTitle && session.prNumber && (
                                  <div>
                                    PR: <code className="bg-white px-1 rounded break-all">#{session.prNumber}: {session.prTitle}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Right section - fixed width controls */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.25"
                                  value={durationHours}
                                  className="w-20 px-3 py-1 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm"
                                  onChange={(e) => {
                                    const newDuration = parseFloat(e.target.value) || 0;
                                    setSessionDurations(prev => ({
                                      ...prev,
                                      [sessionIndex]: newDuration
                                    }));
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">h</span>
                              </div>
                              <Button
                                onClick={() => {
                                  if (onAddLogEntry) {
                                    let description;
                                    if (session.taskId) {
                                      if (session.prTitle) {
                                        description = `${session.taskId}: ${session.prTitle}`;
                                      } else {
                                        description = `${session.taskId}: Work on ${session.branch}`;
                                      }
                                    } else {
                                      description = session.prTitle ? session.prTitle : `Work on ${session.branch}`;
                                    }
                                    
                                    onAddLogEntry({
                                      date,
                                      taskId: session.taskId || '',
                                      duration: durationHours,
                                      description
                                    });
                                  } else {
                                    alert(`Would add log entry:\nTask: ${session.taskId || 'No task ID'}\nTime: ${startTimeStr} - ${endTimeStr}\nDuration: ${durationHours} hours\nBranch: ${session.branch}${session.prTitle ? `\nPR: ${session.prTitle}` : ''}`);
                                  }
                                }}
                                variant="primary"
                                className="text-xs px-3 py-1 whitespace-nowrap"
                              >
                                Add Log Entry
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return null;
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
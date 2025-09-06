import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useGitHubAuth, getGitHubAuthUrl } from '@/contexts/GitHubAuthContext';
import { Modal } from '../ui/Modal';

interface CommitsModalProps {
  date: string;
  onClose: () => void;
  onAddLogEntry?: (entry: { date: string; taskId: string; duration: number; description: string }) => void;
}

export function CommitsModal({ date, onClose, onAddLogEntry }: CommitsModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedDetailed, setCopiedDetailed] = useState(false);
  const settings = useSettings();
  const { isAuthenticated, user, login, logout, getCommitsForDate, isLoading, checkAuthStatus } = useGitHubAuth();
  const [username, setUsername] = useState('');
  const [githubCommits, setGithubCommits] = useState<Array<{
    sha: string;
    shortSha: string;
    message: string;
    date: string;
    url: string;
    repository: { name: string; fullName: string };
    author: { name: string; email: string; date: string };
    branch: string;
    pullRequest: { number: number; title: string; branchDeleted: boolean; url: string } | null;
  }>>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Function to extract task ID from branch name and PR title using regex
  const extractTaskId = (branchName: string, prTitle?: string): string | null => {
    const regex = settings?.getSetting('taskIdRegex') || 'DMO-\\d+';
    try {
      // Try branch name first
      const branchMatch = branchName.match(new RegExp(regex));
      if (branchMatch) return branchMatch[0];
      
      // Fallback to PR title if available
      if (prTitle) {
        const titleMatch = prTitle.match(new RegExp(regex));
        if (titleMatch) return titleMatch[0];
      }
      
      return null;
    } catch (error) {
      console.warn('Invalid regex pattern:', regex, error);
      return null;
    }
  };

  // Function to group commits into work sessions
  const groupCommitsIntoSessions = (commits: typeof githubCommits) => {
    if (!commits.length) return [];

    const dayStartTime = settings?.getSetting('dayStartTime') || '09:00';
    const dayEndTime = settings?.getSetting('dayEndTime') || '17:00';

    // Parse times for the given date
    const dayStartDateTime = new Date(`${date}T${dayStartTime}:00`);
    const dayEndDateTime = new Date(`${date}T${dayEndTime}:00`);

    // Sort commits by time
    const sortedCommits = [...commits].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Check if we have commits outside work hours
    const firstCommitTime = new Date(sortedCommits[0].date);
    const lastCommitTime = new Date(sortedCommits[sortedCommits.length - 1].date);
    
    const useActualStart = firstCommitTime < dayStartDateTime;
    const useActualEnd = lastCommitTime > dayEndDateTime;

    // Group consecutive commits by branch
    let currentBranch = '';
    let currentCommits: typeof commits = [];
    const branchGroups: Array<{ branch: string; commits: typeof commits }> = [];

    for (const commit of sortedCommits) {
      if (commit.branch !== currentBranch && currentCommits.length > 0) {
        branchGroups.push({ branch: currentBranch, commits: [...currentCommits] });
        currentCommits = [];
      }
      currentBranch = commit.branch;
      currentCommits.push(commit);
    }

    if (currentCommits.length > 0) {
      branchGroups.push({ branch: currentBranch, commits: currentCommits });
    }

    const sessions: Array<{
      taskId: string | null;
      taskIdSource: 'branch' | 'pr' | null;
      branch: string;
      prTitle: string | null;
      prNumber: number | null;
      startTime: Date;
      endTime: Date;
      commits: typeof commits;
      durationMinutes: number;
      startsBeforeWorkHours: boolean;
      endsAfterWorkHours: boolean;
    }> = [];

    // Smart session start time
    let sessionStart = useActualStart ? firstCommitTime : dayStartDateTime;

    for (let i = 0; i < branchGroups.length; i++) {
      const group = branchGroups[i];
      const groupLastCommitTime = new Date(group.commits[group.commits.length - 1].date);
      
      // Session ends at the last commit time of this branch group
      let sessionEnd = groupLastCommitTime;
      
      // For the final session, use smart end boundary
      if (i === branchGroups.length - 1) {
        sessionEnd = useActualEnd ? lastCommitTime : (dayEndDateTime > groupLastCommitTime ? dayEndDateTime : groupLastCommitTime);
      }

      const durationMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60));
      
      // Extract task ID from branch and PR title
      const firstCommitWithPR = group.commits.find(c => c.pullRequest);
      const prTitle = firstCommitWithPR?.pullRequest?.title;
      const prNumber = firstCommitWithPR?.pullRequest?.number;
      const taskId = extractTaskId(group.branch, prTitle);
      const taskIdSource = taskId ? (group.branch.includes(taskId) ? 'branch' : 'pr') : null;

      sessions.push({
        taskId,
        taskIdSource,
        branch: group.branch,
        prTitle: prTitle || null,
        prNumber: prNumber || null,
        startTime: sessionStart,
        endTime: sessionEnd,
        commits: group.commits,
        durationMinutes,
        startsBeforeWorkHours: sessionStart < dayStartDateTime,
        endsAfterWorkHours: sessionEnd > dayEndDateTime
      });

      // Next session starts where this one ended (at the last commit of this branch)
      sessionStart = groupLastCommitTime;
    }

    return sessions;
  };

  const workSessions = groupCommitsIntoSessions(githubCommits);
  
  useEffect(() => {
    setUsername(settings?.getSetting('githubUsername') || '');
  }, [settings]);

  const loadGithubCommits = useCallback(async () => {
    try {
      setLoadingCommits(true);
      setGithubError(null);
      const commits = await getCommitsForDate(date);
      setGithubCommits(commits);
    } catch (error) {
      console.error('Failed to load GitHub commits:', error);
      setGithubError(error instanceof Error ? error.message : 'Failed to load commits');
    } finally {
      setLoadingCommits(false);
    }
  }, [getCommitsForDate, date]);

  // Load GitHub commits when authenticated and modal opens
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      loadGithubCommits();
    }
  }, [isAuthenticated, date, isLoading, loadGithubCommits]);

  const handleGitHubLogin = () => {
    const authUrl = getGitHubAuthUrl();
    // Open GitHub OAuth in a popup window
    const popup = window.open(authUrl, 'github-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');
    
    let isProcessing = false; // Prevent duplicate processing
    
    // Listen for postMessage from popup
    const handleMessage = async (event: MessageEvent) => {
      console.log('Parent: Received message', event);
      
      // Prevent duplicate processing
      if (isProcessing) {
        console.log('Parent: Already processing, ignoring duplicate message');
        return;
      }
      
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        console.log('Parent: Origin mismatch', event.origin, 'vs', window.location.origin);
        return;
      }
      
      if (event.data.type === 'GITHUB_OAUTH_CALLBACK') {
        isProcessing = true; // Mark as processing
        console.log('Parent: Processing OAuth callback', event.data);
        const { code, state, error } = event.data;
        
        // Clean up listener immediately
        window.removeEventListener('message', handleMessage);
        
        if (error) {
          console.error('GitHub OAuth error:', error);
          alert('GitHub authentication failed: ' + error);
          return;
        }
        
        // Validate state parameter
        const expectedState = sessionStorage.getItem('github_oauth_state');
        console.log('Parent: State validation', { expected: expectedState, received: state });
        
        if (!state || !expectedState || state !== expectedState) {
          console.error('Invalid state parameter from popup');
          alert('Authentication failed: Invalid state parameter');
          return;
        }
        
        // Clear the state from storage
        sessionStorage.removeItem('github_oauth_state');
        
        if (code) {
          try {
            console.log('Parent: Calling login with code:', code);
            await login(code);
            console.log('Parent: Login successful, refreshing auth status');
            await checkAuthStatus(); // Refresh the auth state
            console.log('Parent: Auth status refreshed, loading commits');
            loadGithubCommits();
          } catch (error) {
            console.error('Failed to complete GitHub login:', error);
            alert('Failed to complete GitHub authentication: ' + (error instanceof Error ? error.message : String(error)));
          }
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Fallback: check if popup closed without message
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        // Optional: check auth status as fallback
        setTimeout(() => {
          if (isAuthenticated) {
            loadGithubCommits();
          }
        }, 1000);
      }
    }, 1000);
  };

  const formatCommitTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };
  
  // Generate the simple GitHub CLI command for all commits on the specified date  
  const simpleCommand = `gh search commits --author="${username || 'YOUR_USERNAME'}" --author-date="${date}" --limit=100`;
  
  // Generate enhanced command with branch information (PowerShell script)
  const detailedCommand = `# Get commits with detailed formatting
Write-Host "Fetching commits for ${username || 'YOUR_USERNAME'} on ${date}..." -ForegroundColor Cyan

Write-Host "Loading commit data..." -ForegroundColor Yellow
$commits = gh api "search/commits?q=author:${username || 'YOUR_USERNAME'}+author-date:${date}&per_page=100" | ConvertFrom-Json
$results = @()
$total = $commits.items.Count

Write-Host "Processing $total commits..." -ForegroundColor Yellow

foreach ($commit in $commits.items) {
    $repo = $commit.repository.full_name
    $sha = $commit.sha.Substring(0,7)
    $message = $commit.commit.message
    $time = ([DateTime]$commit.commit.author.date).ToString("HH:mm")
    $branch = "main"
    
    # Try to parse branch from merge message (fast, no API calls)
    if ($message -match "Merge pull request #(\\\\d+) from (.+)") {
        $branchName = $Matches[2]
        $branch = "PR " + $branchName + " (#" + $Matches[1] + ")"
    } elseif ($message -match "Merge branch '(.+)' into") {
        $branchName = $Matches[1]
        $branch = "MERGE " + $branchName
    }
    
    # Don't truncate messages - show them in full
    $results += [PSCustomObject]@{
        Time = $time
        Branch = $branch
        Repository = $repo
        SHA = $sha
        Message = $message
    }
}

Write-Host ""
Write-Host "Results:" -ForegroundColor Green

# Display commits in a readable format (sorted by time, oldest first)
Write-Host ""
Write-Host "Time    SHA     Repository                     Message" -ForegroundColor Yellow
Write-Host "----    ---     ----------                     -------" -ForegroundColor Yellow

$results | Sort-Object @{Expression={[DateTime]::ParseExact($_.Time, "HH:mm", $null)}; Descending=$false} | ForEach-Object {
    $timeStr = $_.Time.PadRight(7)
    $shaStr = $_.SHA.PadRight(7)
    $repoStr = if ($_.Repository.Length -gt 30) { $_.Repository.Substring(0,27) + "..." } else { $_.Repository.PadRight(30) }
    
    Write-Host "$timeStr $shaStr $repoStr $($_.Message)" -ForegroundColor White
}

Write-Host "Found $($results.Count) commits with branch information" -ForegroundColor Green`;

  const copySimpleCommand = async () => {
    try {
      await navigator.clipboard.writeText(simpleCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const copyDetailedCommand = async () => {
    try {
      await navigator.clipboard.writeText(detailedCommand);
      setCopiedDetailed(true);
      setTimeout(() => setCopiedDetailed(false), 2000);
    } catch (err: unknown) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const formatDateWithDay = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Modal title={`GitHub Commits for ${formatDateWithDay(date)}`} onClose={onClose} maxWidth="2xl">
      {/* Commit Analysis Settings */}
      <div className="mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => settings?.updateSetting('commitAnalysisExpanded', settings.getBooleanSetting('commitAnalysisExpanded') ? 'false' : 'true')}
        >
          <h3 className="text-lg font-medium text-gray-900">Commit Analysis Settings</h3>
          <Button variant="secondary" className="text-xs px-2 py-1">
            {settings?.getBooleanSetting('commitAnalysisExpanded') ? '▼ Hide' : '▶ Show'}
          </Button>
        </div>
        
        {settings?.getBooleanSetting('commitAnalysisExpanded') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="dayStartTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Day Start Time
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="dayStartTime"
                    type="time"
                    value={settings?.getSetting('dayStartTime') || '09:00'}
                    onChange={(e) => settings?.updateSetting('dayStartTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white shadow-sm text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="dayEndTime" className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Day End Time
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <input
                    id="dayEndTime"
                    type="time"
                    value={settings?.getSetting('dayEndTime') || '17:00'}
                    onChange={(e) => settings?.updateSetting('dayEndTime', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-sm text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="taskIdRegex" className="block text-sm font-medium text-gray-700 mb-2">
                  Task ID Regex Pattern
                </label>
                <input
                  id="taskIdRegex"
                  type="text"
                  value={settings?.getSetting('taskIdRegex') || 'DMO-\\d+'}
                  onChange={(e) => settings?.updateSetting('taskIdRegex', e.target.value)}
                  placeholder="e.g., DMO-\\d+"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              These settings control how commits are grouped into work sessions and how task IDs are extracted from branch names.
            </p>
          </div>
        )}
      </div>

      {/* GitHub Commits Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">GitHub Commits</h3>
        
        {!isAuthenticated ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="mb-3">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-4">Connect your GitHub account to see your commits for this date</p>
            <Button onClick={handleGitHubLogin} variant="primary">
              Login with GitHub
            </Button>
          </div>
        ) : (
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
                  <Button onClick={handleGitHubLogin} variant="primary" className="mt-2 text-xs">
                    Reconnect to GitHub
                  </Button>
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
                        session.commits.forEach(commit => {
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
                          const { session } = item.data;
                          const startTimeStr = session.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                          const endTimeStr = session.endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                          const durationHours = Math.ceil(session.durationMinutes / 15) * 0.25;
                          
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
                                        console.log('Duration changed to:', e.target.value, 'hours');
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
        )}
      </div>

      {/* Manual Commands Section */}
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

        <div>
          <label htmlFor="github-username" className="block text-sm font-medium text-gray-700 mb-2">
            GitHub Username
          </label>
          <input
            id="github-username"
            type="text"
            value={username}
            title="Enter your GitHub username (not email address)"
            onChange={(e) => {
              const newUsername = e.target.value;
              setUsername(newUsername);
              settings?.updateSetting('githubUsername', newUsername);
            }}
            onInvalid={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.value.includes('@')) {
                target.setCustomValidity('Use your GitHub username, not your email address');
              } else {
                target.setCustomValidity('Please enter a valid GitHub username');
              }
            }}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              target.setCustomValidity('');
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent invalid:border-red-400 invalid:bg-red-50 invalid:text-red-900"
            placeholder="Enter your GitHub username (e.g., kacan98)"
          />
        </div>

        {username && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-sm font-medium mb-2">How to use:</p>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Copy and paste either command into PowerShell</li>
                <li>• Both will show all your commits for {date}</li>
              </ul>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-3">
                <strong>Quick Overview:</strong> Simple GitHub CLI command
              </p>
              
              <div className="bg-gray-900 rounded-lg p-4 relative group">
                <code className="text-green-400 text-sm font-mono break-all">
                  {simpleCommand}
                </code>
                <Button
                  onClick={copySimpleCommand}
                  variant="secondary"
                  className="absolute top-2 right-2 text-xs"
                >
                  📋 {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-3">
                <strong>Detailed with Branches:</strong> PowerShell script with formatted table, branch detection, and progress indicators
              </p>
              
              <div className="bg-gray-900 rounded-lg p-4 relative group">
                <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {detailedCommand}
                </pre>
                <Button
                  onClick={copyDetailedCommand}
                  variant="secondary"
                  className="absolute top-2 right-2 text-xs"
                >
                  📋 {copiedDetailed ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { useGitHubAuth, getGitHubAuthUrl } from '@/contexts/GitHubAuthContext';
import { Modal } from '../ui/Modal';

interface CommitsModalProps {
  date: string;
  onClose: () => void;
}

export function CommitsModal({ date, onClose }: CommitsModalProps) {
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
  }>>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  
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

  return (
    <Modal title={`GitHub Commits for ${date}`} onClose={onClose} maxWidth="2xl">
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
                <p className="text-sm text-gray-600 mb-3">Found {githubCommits.length} commit{githubCommits.length !== 1 ? 's' : ''}:</p>
                <div className="space-y-2">
                  {githubCommits.map((commit) => (
                    <div key={commit.sha} className="bg-white rounded p-3 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                          [{formatCommitTime(commit.date)}]
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
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
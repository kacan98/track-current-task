import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { useSettings } from '@/contexts/SettingsContext';
import { Modal } from '../ui/Modal';

interface CommitsModalProps {
  date: string;
  onClose: () => void;
}

export function CommitsModal({ date, onClose }: CommitsModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedDetailed, setCopiedDetailed] = useState(false);
  const { getSetting, updateSetting } = useSettings();
  const [username, setUsername] = useState('');  
  
  useEffect(() => {
    setUsername(getSetting('githubUsername') || '');
  }, [getSetting]);
  
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
            updateSetting('githubUsername', newUsername);
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
    </Modal>
  );
}
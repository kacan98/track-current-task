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
  const { getSetting } = useSettings();
  const [username, setUsername] = useState('');  
  
  useEffect(() => {
    setUsername(getSetting('githubUsername') || '');
  }, [getSetting]);
  
  // Generate the simple GitHub CLI command for all commits on the specified date  
  const simpleCommand = `gh search commits --author=${username || 'YOUR_USERNAME'} --author-date=${date} --limit=100`;
  
  // Generate enhanced command with branch information (PowerShell script)
  const detailedCommand = `# Get commits with branch info - formatted as table
Write-Host "🔍 Fetching commits for ${username || 'YOUR_USERNAME'} on ${date}..." -ForegroundColor Cyan

# Fetch commits
Write-Host "📥 Loading commit data..." -ForegroundColor Yellow
$commits = gh api "search/commits?q=author:${username || 'YOUR_USERNAME'}+author-date:${date}&per_page=100" | ConvertFrom-Json
$results = @()
$total = $commits.items.Count

# Process each commit with progress
Write-Host "🔍 Analyzing $total commits for branch info..." -ForegroundColor Yellow
$current = 0
foreach ($commit in $commits.items) {
    $current++
    Write-Progress -Activity "Processing commits" -Status "Commit $current of $total" -PercentComplete (($current / $total) * 100)
    
    $repo = $commit.repository.full_name
    $sha = $commit.sha.Substring(0,7)
    $message = $commit.commit.message.Split("\\n")[0]
    $time = ([DateTime]$commit.commit.author.date).ToString("HH:mm")
    $branch = "unknown"
    
    # Try to get branch info
    try {
        $branches = gh api "repos/$repo/commits/$($commit.sha)/branches-where-head" | ConvertFrom-Json
        if ($branches.Count -gt 0) { 
            $branchName = $branches[0].name
            $branch = "🌿 " + $branchName
        }
    } catch { }
    
    # Try to get from PR history
    if ($branch -eq "unknown") {
        try {
            $prs = gh api "repos/$repo/commits/$($commit.sha)/pulls" | ConvertFrom-Json
            if ($prs.Count -gt 0) {
                $prBranch = $prs[0].head.ref
                $prNumber = $prs[0].number
                $branch = "🔄 " + $prBranch + " (#" + $prNumber + ")"
            }
        } catch { }
    }
    
    # Try to parse from merge message
    if ($branch -eq "unknown") {
        if ($message -match "Merge pull request #(\\\\d+) from (.+)") {
            $branchName = $Matches[2]
            $branch = "🔀 " + $branchName + " (#" + $Matches[1] + ")"
        } elseif ($message -match "Merge branch '(.+)' into") {
            $branchName = $Matches[1]
            $branch = "🔀 " + $branchName
        } else {
            $branch = "📍 main"
        }
    }
    
    # Truncate long messages
    $shortMessage = if ($message.Length -gt 50) { 
        $message.Substring(0, 47) + "..." 
    } else { 
        $message 
    }
    
    # Add to results array
    $results += [PSCustomObject]@{
        Time = $time
        Branch = $branch
        Repository = $repo
        SHA = $sha
        Message = $shortMessage
    }
}

Write-Progress -Activity "Processing commits" -Completed
Write-Host ""
Write-Host "📊 Results:" -ForegroundColor Green

# Display as formatted table with balanced column widths
$results | Format-Table -Property @{Label="Time"; Expression={$_.Time}; Width=6}, @{Label="Branch"; Expression={$_.Branch}; Width=50}, @{Label="Repo"; Expression={$_.Repository}; Width=25}, @{Label="SHA"; Expression={$_.SHA}; Width=8}, @{Label="Message"; Expression={$_.Message}; Width=40} -Wrap

Write-Host "✨ Found $($results.Count) commits with branch information" -ForegroundColor Green`;

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
          onChange={(e) => {
            const newUsername = e.target.value;
            setUsername(newUsername);
            localStorage.setItem('githubUsername', newUsername);
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter your GitHub username"
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
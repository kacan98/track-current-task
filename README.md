# Git Branch Activity Logger

## Description
This tool tracks the time spent on different Git branches by monitoring for **new uncommitted changes**. It automatically associates the time with task IDs (e.g., DFO-xxxx) extracted from branch names and logs this activity to a CSV file.

Time is logged for a repository's currently active branch only if:
1.  New uncommitted changes are detected (via `git status --porcelain`) since the last check.
2.  The branch is new to the activity tracking state (i.e., it's the first time the script has seen this branch in this repository).
3.  There are new commits or changes to the branch compared to the main branch (e.g., master or main).

This means simply having a branch checked out without making any new changes will **not** result in logged time for that interval.

## Features
*   Tracks time spent on Git branches **based on new uncommitted activity**.
*   Monitors multiple repositories simultaneously.
*   Extracts task IDs (e.g., DFO-xxxx) from branch names.
*   Logs activity to a single CSV file (`date,taskId,hours`).
*   Configurable repository paths and logging interval.
*   If no task ID is found in the branch name, time is logged under "NonTaskActivity".
*   Maintains a state file (`repo_activity_state.json`) to track activity baselines.
*   Requires explicitly specifying main branch names for each repository.

## Prerequisites
*   Node.js and npm installed.
*   Git installed and accessible in the system PATH.

## Setup & Installation
1.  Clone the repository (or download the files).
2.  Navigate to the project directory.
3.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration
Create a `config.json` file in the project root directory. An example can be found in `config.example.json`.

**Structure of `config.json`:**
```json
{
  "repositories": [
    {
      "path": "/path/to/your/first/git/repository",
      "mainBranch": "master"
    },
    {
      "path": "/path/to/your/second/git/repository",
      "mainBranch": "main"
    },
    {
      "path": "/path/to/your/third/git/repository",
      "mainBranch": "develop"
    }
  ],
  "logIntervalMinutes": 30,
  "logFilePath": "./branch_activity_log.csv"
}
```

**Configuration Options:**
*   `repositories`: (Array of Objects) Each repository object must have:
    *   `path`: (String) Absolute or relative path to the Git repository.
    *   `mainBranch`: (String) The name of the main/default branch (e.g., "master", "main", "develop").
*   `repositoryPaths`: (Legacy, Array of Strings) An older way to specify repositories, but doesn't allow specifying main branch names. Use `repositories` instead.
*   `logIntervalMinutes`: (Number) How often, in minutes, the script will check the current branch in each repository for new activity and potentially update the log. For example, `30` means it will check every 30 minutes.
*   `logFilePath`: (String) Path (can be relative to the project root) where the single CSV log file will be created and updated for all monitored repositories. Example: `./branch_activity_log.csv`.

## Activity State File (`repo_activity_state.json`)
The script automatically creates and manages a file named `repo_activity_state.json` in the project root directory.

*   **Purpose**: This file stores the last known state of uncommitted changes (output of `git status --porcelain`) for each branch the script encounters in each configured repository. This baseline is crucial for the script to determine if *new* activity has occurred since the last check.
*   **Management**: This file is handled automatically. You generally don't need to edit it.
*   **Resetting Activity Baseline**: If you want to reset the activity detection (e.g., make the script consider the current state of all branches as the new baseline), you can safely delete `repo_activity_state.json`. The script will recreate it on its next run.
*   **Git Tracking**: This file is included in `.gitignore` and should not be committed to your own Git repositories.

## Running the Script
To run the activity logger:
```bash
npx ts-node src/index.ts
```
The script will start, perform an initial check, and then continue running in the background, periodically logging activity based on your `logIntervalMinutes` setting. You'll see console output indicating when it logs activity.

## Output Log File (`branch_activity_log.csv`)
The script generates and updates a CSV file (path specified by `logFilePath` in `config.json`) with the following format:

`date,taskId,hours`

**Example:**
```csv
date,taskId,hours
2023-10-27,DFO-12345,0.5
2023-10-27,NonTaskActivity,1.0
2023-10-28,DFO-12345,2.0
2023-10-28,DFO-56789,4.0
```
*   `date`: The date of the activity in YYYY-MM-DD format.
*   `taskId`: The extracted task ID (e.g., "DFO-12345") or "NonTaskActivity".
*   `hours`: The cumulative hours logged for that task on that day. This value increases by `logIntervalMinutes / 60` each time new activity is detected for the associated branch.

**Note on Log Output**: Due to the activity-based logging, you will only see time added to a task when new, uncommitted changes are detected on its associated branch in a monitored repository. If you are on a branch but not making changes, or if changes are already committed, time will not be logged for that interval. This can result in "gaps" in logging if there's no qualifying activity.

## Troubleshooting
*   **Error related to Git (e.g., "Error getting current branch...", "Error getting git status...")**:
    *   Ensure Git is installed and that its command-line interface (`git`) is accessible from your system's PATH.
    *   Verify that all paths listed in `repositoryPaths` in your `config.json` are correct and point to valid Git repositories.
    *   The script uses `git rev-parse --abbrev-ref HEAD` (to get current branch) and `git status --porcelain` (to detect changes). Try running these commands manually in each target repository to see if Git is working correctly and if there are any permission issues.
    *   If `git status --porcelain` consistently fails for a repository (e.g., due to very large untracked files causing performance issues, though less common), the script might log `<<ERROR_GIT_STATUS_FAILED>>` in `repo_activity_state.json` for that branch and may not log time correctly.
*   **Error reading or parsing `config.json`**:
    *   Make sure `config.json` exists in the root directory of this project (or the path you provide if modified).
    *   Ensure its content is valid JSON. Use a JSON validator to check.
    *   Double-check that `repositoryPaths` is an array of strings.
*   **Script doesn't log as expected / No time is being logged**:
    *   **Key Reason**: Remember that time is only logged if **new uncommitted changes** are detected on the current branch of a repository, or if it's the first time the script sees that branch. If you are not actively making changes (saving new modifications to files tracked by Git), time will not be logged.
    *   Check the console output for messages like "No new activity in..." or "Activity detected in...". This will tell you what the script is observing.
    *   Ensure `repositoryPaths` in `config.json` is not empty and contains correct paths.
    *   Ensure the `logIntervalMinutes` is set to a reasonable value for testing (e.g., 1 or 2 minutes) if you want to see quick updates.
    *   Verify that each path in `repositoryPaths` is indeed a Git repository and that you are on a branch the script can read.
    *   If a repository was just initialized or a branch just created, ensure it has at least one commit for Git commands to function reliably.
    *   Consider deleting `repo_activity_state.json` to reset the baseline if you suspect its stored states are incorrect.

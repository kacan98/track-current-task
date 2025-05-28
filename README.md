# Git Branch Activity Logger

## Overview
Tracks time spent on Git branches by monitoring changes in your repositories. It automatically associates time with task IDs (e.g., DFO-xxxx) extracted from branch names and logs activity to a CSV file.

## Key Features
* Tracks time based on actual Git activity (new changes or commits)
* Monitors multiple repositories simultaneously
* Extracts task IDs from branch names
* Logs time to a single CSV file
* Provides daily activity summaries
* Generates monthly reports with task breakdowns
* Groups monthly summaries by week with task details
* Shows line-level changes for each tracked file

## Quick Start
1. Install with `npm install`
2. Create a `config.json` file (see example below)
3. Run with `npx ts-node src/index.ts`
4. For a monthly summary, run `npm run summary:month`

## Configuration
```json
{
  "repositories": [
    {
      "path": "/path/to/repository",
      "mainBranch": "develop"
    }  ],
  "trackingIntervalMinutes": 5,
  "logSummaryIntervalMinutes": 30,
  "logFilePath": "./branch_activity_log.csv",
  "taskIdPattern": "D[FM]O-\\d+"
}
```

**Configuration Options:**
* `trackingIntervalMinutes`: How often to check for changes (e.g., 5 minutes)
* `logSummaryIntervalMinutes`: How often to log time and show summaries (e.g., 30 minutes)
* `logFilePath`: Where to save the CSV log file
* `taskIdPattern`: Regular expression to extract task IDs from branch names (e.g., `"D[FM]O-\\d+"` for both DFO and DMO tickets)

## How It Works
The tool logs time when:
1. New uncommitted changes are detected
2. New commits are made compared to the main branch
3. A branch is checked out for the first time

## Monthly Summary Report
Running `npm run summary:month` generates a detailed report of your activity:

* Shows total hours per task for the current month
* Groups tasks by week, showing weekly totals
* Provides daily breakdowns with task details within each week
* Shows previous month summary if viewing in the first week of a month
* Uses color-coded output for better readability

Example output:
```
====================================
       MONTHLY TIME SUMMARY
====================================

Current Month (June 2023):
  DFO-5678: 12h 30m (65.2%)
  DFO-1234: 6h 45m (34.8%)

  Total Hours: 19h 15m

  Weekly Breakdown:

  Week 1 (Jun 1 - Jun 4): 7h 15m
    DFO-1234: 4h 30m (62.1%)
    DFO-5678: 2h 45m (37.9%)
    Daily Details:
    Thu, Jun 1: 3h 45m
      DFO-1234: 2h 30m
      DFO-5678: 1h 15m
    Fri, Jun 2: 3h 30m
      DFO-1234: 2h 0m
      DFO-5678: 1h 30m

  Week 2 (Jun 5 - Jun 11): 12h 0m
    DFO-5678: 9h 45m (81.3%)
    DFO-1234: 2h 15m (18.7%)
    Daily Details:
    Mon, Jun 5: 4h 0m
      DFO-5678: 3h 30m
      DFO-1234: 0h 30m
    Tue, Jun 6: 4h 15m
      DFO-5678: 3h 45m
      DFO-1234: 0h 30m
    Wed, Jun 7: 3h 45m
      DFO-5678: 2h 30m
      DFO-1234: 1h 15m
```

## Output Format
The CSV file contains:
```
date,taskId,hours
2023-10-27,DFO-12345,0.5
2023-10-27,NonTaskActivity,1.0
```

## Troubleshooting
* **No time logged?** Make sure you're actively making changes to files in your Git repository
* **Git errors?** Verify Git is properly installed and the repository paths are correct
* **Need to reset?** Delete `repo_activity_state.json` to reset tracking baselines

## Configuration Examples
Two example configurations are provided for different teams:

### DFO Team Configuration
```json
{
  "repositories": [
    {
      "path": "K:\\git\\Dynaway.DFO.EAM",
      "mainBranch": "develop"
    }
  ],
  "trackingIntervalMinutes": 5,
  "logSummaryIntervalMinutes": 30,
  "logFilePath": "./dfo_activity_log.csv",
  "taskIdPattern": "DFO-\\d+"
}
```

### DMO Team Configuration
```json
{
  "repositories": [
    {
      "path": "K:\\git\\Dynaway.DMO.EAM",
      "mainBranch": "main"
    }
  ],
  "trackingIntervalMinutes": 5,
  "logSummaryIntervalMinutes": 30,
  "logFilePath": "./dmo_activity_log.csv",
  "taskIdPattern": "DMO-\\d+"
}
```

For more detailed configuration options, check `config.example.json`.

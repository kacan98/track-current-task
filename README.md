# Track Current Task

## How It Works

```
┌─────────────────┐                    ┌─────────────────┐
│  CLI Tracker    │────────────────────▶│    Frontend     │
│                 │     CSV Files       │                 │
│ • Watches Git   │                     │ • View hours    │
│ • Logs time     │                     │ • Edit entries  │
│ • Extracts      │                     │ • Upload CSV    │
│   task IDs      │                     │ • Send to Jira  │
└─────────────────┘                     └─────────────────┘
        │                                        │
        │ CSV Files                              │ HTTP/Auth
        │                                        │
        ▼                                        ▼
┌─────────────────┐                    ┌─────────────────┐
│   User Folder   │────────────────────▶│    Backend      │
│                 │    Serve CSV        │                 │
│ • activity.csv  │    (dev mode)       │ • Proxy to Jira │
│ • config.json   │                     │ • Auth cookies  │
│                 │                     │ • Serve files   │
└─────────────────┘                     └─────────────────┘
                                                 │
                                                 │ Jira API
                                                 ▼
                                        ┌─────────────────┐
                                        │      Jira       │
                                        │                 │
                                        │ • Store logs    │
                                        │ • Track tasks   │
                                        └─────────────────┘
```

**Data Flow:**
1. CLI Tracker → User Folder (logs time to CSV)
2. Backend → User Folder (serves CSV in dev mode)
3. Frontend ← Backend (loads CSV data)
4. Frontend → Backend (sends worklogs with encrypted cookie auth)
5. Backend → Jira (proxies API calls with stored token)

**Authentication:**
- Frontend sends login credentials to Backend
- Backend authenticates with Jira and stores encrypted token in httpOnly cookie
- Frontend never sees or stores the actual token
- All subsequent API calls use secure cookies for authentication
- Cookies are encrypted, httpOnly (XSS protection), and secure in production

## Setup

1. **Install Node.js** from [nodejs.org](https://nodejs.org)
2. **Clone and install:**
   ```bash
   git clone <this-repo>
   cd track-current-task
   npm install
   ```
3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```
4. **Start development:**
   ```bash
   npm start
   ```
   This runs:
   - Frontend at http://localhost:5173
   - Backend at http://localhost:9999

## Configuration
```json
{
  "repositories": [
    {
      "path": "/path/to/repository",
      "mainBranch": "main"
    }
  ],  
  "trackingIntervalMinutes": 15,
  "taskIdRegEx": "D[FM]O-\\d+",
  "taskTrackingUrl": "https://jira.eg.dk/browse/"
}
```

**Configuration Options:**
* `trackingIntervalMinutes`: How often to check for changes (e.g., 15 minutes) and how much we register if changes are found.
* `taskIdRegEx`: Regular expression to extract task IDs from branch names (e.g., `"D[FM]O-\\d+"` for both DFO and DMO tickets). Defaults to branch name if not found.
* `taskTrackingUrl`: Optional base URL for your task tracking system (e.g., `"https://jira.eg.dk/browse/"`). When configured, task IDs will be displayed with clickable links in summaries.

## When does it log
The tool logs time when:
1. The number of added or removed lines is different from previous check
2. New commits are made compared to the main branch
3. A branch is checked out for the first time

## Monthly Summary Report
On every run it will generate a monthly report, showing

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
  DFO-5678 (https://jira.eg.dk/browse/DFO-5678): 12h 30m (65.2%)
  DFO-1234 (https://jira.eg.dk/browse/DFO-1234): 6h 45m (34.8%)

  Total Hours: 19h 15m

  Weekly Breakdown:

  Week 1 (Jun 1 - Jun 4): 7h 15m
    DFO-1234 (https://jira.eg.dk/browse/DFO-1234): 4h 30m (62.1%)
    DFO-5678 (https://jira.eg.dk/browse/DFO-5678): 2h 45m (37.9%)

    Daily Details:
    Thu, Jun 1: 3h 45m
      DFO-1234 (https://jira.eg.dk/browse/DFO-1234): 2h 30m
      DFO-5678 (https://jira.eg.dk/browse/DFO-5678): 1h 15m
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

## CSV File
Data is stored in a CSV file that looks like this:
```
date,taskId,hours
2023-10-27,DFO-12345,0.5
2023-10-27,feature/improve-performance,1.0
```

## Troubleshooting
* **No time logged?** Make sure you're actively making changes to files in your Git repository
* **Git errors?** Verify Git is properly installed and the repository paths are correct
* **Want to reset?** Delete files in the .TrackCurrentTask folder
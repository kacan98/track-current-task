# Git-to-JIRA Bridge

Sync your tracked development time to Jira. Built to solve the tedious task of logging development hours - this bridges the gap between your actual work and time reporting requirements.

![Frontend Dashboard](screenshots/frontend.png)
*Main dashboard showing weekly time tracking with task breakdown and editing capabilities*

![Background Tracker Running](screenshots/month%20overview.png)  
*Background tracker running with monthly summary tracked across multiple repositories*

## Why This Exists

Manual time tracking used to be disruptive and time consuming. I needed a way to automatically capture what I worked on each day and easily log it to Jira. This system makes Jira time reporting much less painful for developers by automating data collection and streamlining the sync process.

## How It Works

Git-to-JIRA Bridge follows a simple 3-step workflow:

### 📊 Get Data (Choose One Method)

Pick the approach that works best for you:

**○ Generate from GitHub commits:** Connect GitHub and create time logs from your commit history (for a day or full week)

**○ Background Tracker:** Download and run our desktop app to automatically monitor your Git repos and generate CSV files with time logs

**○ Upload CSV:** Upload existing time tracking files or create your own 

**○ Start from scratch:** Begin with an empty workspace and add entries manually in a user friendly web UI

### ✏️ Edit Data

Review and adjust your time entries. Edit hours, dates, task IDs, and descriptions. Jira task details are automatically loaded when you connect to Jira.

### 🚀 Send to Jira

Connect to Jira with your credentials and sync your time entries as worklogs with one click.

## Privacy & Security

**Your data stays with you.** Git-to-JIRA Bridge stores nothing on our servers - all time entries and settings remain in your browser's local storage or your local CSV files. Authentication tokens are stored securely in HTTP-only cookies. The backend only acts as a secure proxy for API calls to GitHub and Jira.

![GitHub Commits Integration](screenshots/github%20commits.png)
*GitHub integration showing commits for a specific day to help with time tracking accuracy*

![JIRA and GitHub Settings](screenshots/jira%20and%20github%20integration.png)
*Settings panel showing connected JIRA and GitHub integrations for seamless workflow*

## System Architecture

```
Data Sources:
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Background      │    │ GitHub Commits  │    │ Manual/CSV      │
│ Tracker         │    │                 │    │ Upload          │
│                 │    │ • Commit history│    │                 │
│ • Watches Git   │    │ • Branch names  │    │ • Custom data   │
│ • Logs time     │    │ • Auto-fill     │    │ • Existing logs │
│ • Generates CSV │    │ • Daily/Weekly  │    │ • Manual entry  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └─────────────┬─────────────────┬─────────────────┘
                      │                 │
                      ▼                 ▼
                ┌─────────────────────────────────────────┐
                │            Web Interface               │
                │                                        │
                │ • Weekly/daily views                   │
                │ • Edit entries (hours, dates, tasks)   │
                │ • Automatic task ID extraction         │
                │ • Fill recurring events with one click │
                └─────────────────────────────────────────┘
                                    │
                                    │ One-click sync
                                    ▼
                            ┌─────────────────┐
                            │      JIRA       │
                            │                 │
                            │ • Worklogs      │
                            │ • Task details  │
                            │ • Cloud/Server  │
                            └─────────────────┘
```

## Installation

### Option 1: Use Deployed Version (Easiest)

1. **Get the time logger**: Download latest release from [Releases](https://github.com/kacan98/track-current-task/releases)
2. **Run the logger**: Execute the program - it will guide you through setup
3. **Use web interface**: Visit the deployed site on Vercel (URL to be added)
4. **Upload your CSV**: The logger generates CSV files you can upload to the web interface

### Option 2: Run Everything Locally

```bash
# Clone and install
git clone <repository-url>
cd track-current-task
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your settings

# Start the application (runs both frontend and serverless backend)
npm start
# This starts Vercel dev server at: http://localhost:3000
```

## Time Logger Configuration

Running the time logger for the first time will show an interactive setup guide. You can configure:
- Which repositories to monitor
- Time tracking interval (how often to check and how much time to log)
- Task ID extraction pattern (regex for pulling IDs from branch names)
- JIRA URL for linking tasks

Config is stored at: `%APPDATA%/.TrackCurrentTask/` (Windows) or `~/.TrackCurrentTask/` (Mac/Linux)

For automatic startup, place the executable in your system's startup folder.

## Data Storage

### CSV Format
```csv
date,taskId,hours
2023-10-27,JIRA-123,0.5
2023-10-27,feature/new-feature,1.0
```

Location: `%APPDATA%/.TrackCurrentTask/activity_log.csv`

### When Time is Logged
- File changes detected (different line count from last check)
- New commits compared to main branch  
- Branch checkout (first time on branch)

## Project Structure

```
├── packages/
│   ├── background-tracker/   # Time logger (Git monitoring & tracking)
│   ├── backend/       # Express API (serverless-ready)
│   └── frontend/      # React web interface
├── shared/            # Common utilities and types
└── vercel.json       # Deployment configuration
```
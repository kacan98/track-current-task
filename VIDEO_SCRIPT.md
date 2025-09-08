# Video Script: Time Tracking Tool for Developers

## The Real Struggle
Like many developers, I have to log my hours in JIRA every week. And I always forget to do it.

Then it's Friday and I need to submit my timesheet. So I'm trying to piece together what I worked on Monday - going through each repository, looking at commits, checking PRs, trying to remember which task I was on which day.

I could log my hours every day after work, but honestly? I'd rather spend that time actually writing code than doing administrative work.

## What I Built
So I built a set of tools to automate getting developer time into JIRA.

First, there's a background tracker that runs locally on Windows. It monitors your Git repos using a state comparison algorithm - every 15 minutes it checks for branch switches and code changes. If you're active, it logs that interval to a CSV file. Set it up once in your startup folder and it runs automatically every time you boot up.

Second, there's a web app where you can aggregate your time data. You can upload CSV files from the background tracker, connect to GitHub to generate time logs from your commit history, or add entries manually. The GitHub integration is pretty thorough - it reads commits across all your repos and creates time entries based on task IDs in branch names, even finding deleted branches through their merge PRs.

## The Technical Implementation
The interesting challenge was architecting this to run completely free on Vercel's serverless platform. I had to refactor the Node backend to be stateless - no session storage, no database dependencies. This constraint actually led to a better design: everything runs in serverless functions.

I built it with security in mind. Your JIRA credentials are encrypted and stored in httpOnly cookies to prevent XSS attacks. The server just acts as a proxy for API calls - nothing gets permanently stored. All your work logs stay in your browser's local storage, so you have complete control.

I've automated the deployment process - TypeScript checks run on every commit through Husky, and pushes to main automatically deploy to Vercel. GitHub Actions builds the Windows executables for each release.

## Why This Actually Matters
Once your data's in the web app, you can adjust hours and fix anything before sending to JIRA. It works with any task ID syntax and connects to any JIRA instance - cloud, server, whatever. One click syncs everything.

I've been using it for months now. It saves me about 20 minutes every Friday, but more importantly, it completely eliminates that end-of-week stress of reconstructing my entire week. The peace of mind of accurate time tracking is worth more than the time saved.

Building this taught me a lot about working with API rate limits and browser security models - real-world stuff you don't always get in tutorials.

## Wrapping Up
So that's what I built - a full-stack solution to a real problem every developer faces. React frontend, Node backend handling GitHub and JIRA APIs, serverless architecture, automated deployments, the works.

The code's on GitHub if you want to check out the architecture, or you can try the live app if you have the same problem. It's been running maintenance-free with zero hosting costs, and I'd love to build more tools like this that make developers' lives easier.
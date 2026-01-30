## Build Improvements  
- [ ] Include version in executable filenames when creating releases in GitHub
  - Change from `git-activity-logger-win.exe` to `git-activity-logger-v1.1.22-win.exe`
  - Update pkg build command to include version from package.json

# GitHub integration
- [ ] Add GitHub authentication option
  - Allow users to log in with GitHub OAuth
  - Store GitHub token securely in cookie
  - Now we show a command to get commits for a day. Instead we want to fetch the commits for the day for all repositories the user has access to.
  - Add a new page to display when user first opens the app and give them the possiblity to setup github - after OAuth we should 
   - ask them for some example of task ids (e.g. DFO-1234, DMO-78945, ..., default to three examples) so that we can constract a regex to extract the task id from branches. Then we should fetch like 20 most recent commits and show them which ids would be extracted
   - ask them to choose for a regex to filter repos so that we only include those that they want to track. Then show them repos and which of them will be included
   - store their preferences in the cookie
   - How about the option to fill in a whole week based on github? It looks very nicely rightnow. I wanna somehow reuse the existing functions and... for the tasks that we find an id in the branch automatically 

# Make variable jiraBaseUrl configurable
- [ ] Allow users to set their own Jira base URL when logging into Jira
  - Add input field for Jira base URL in login form
  - Store Jira base URL in cookie along with other credentials

# Todo tasks
- [] For some reason the status endpoints (api/jira/auth/status and api/github/auth/status) get called each 4 times!!! when opening the app. Investigate and fix this behavior to reduce unnecessary network calls.
- [x] api/github/branches/search?taskId=DFO-10842 takes waaaay too long - 30s! Investigate and optimize the performance of this endpoint.
  - DONE: Optimized from 30s to ~3s using GraphQL batching (reduced from ~200 API calls to 2 calls)
  - DONE: Fixed repository selection to prioritize repos where user has open PRs instead of globally recently pushed repos
- [] Make it possible to change the state of the tasks and subtasks (e.g. from "In Progress" to "Ready for review") directly from the app interface. Not sure how possible this is because jira has some restrictions on which order we can change states and to which states we can change.
- [] If I am reviewing something or I am assigned to a subtask in Jira... will it show up in the overview? it should. :D 
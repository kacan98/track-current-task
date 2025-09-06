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
   - How about the option to fill in a whole week based on github? It looks very nicely rightnow. I wanna somehow reuse the existing functions and... for the tasks that we find an id in the branch automatically - I think I would like to have a service for finding and querying the commits and the relevant data for a range. That would get used for the commits module - specifically for the commits imeline. I am saying it because I need it for a whole week - I would like to be able to fill in the logs automatically for the whole week if we are logged into github. So it should try to find the branches that have an id and create logs like they are generated in the commits timeline.

# Make variable jiraBaseUrl configurable
- [ ] Allow users to set their own Jira base URL when logging into Jira
  - Add input field for Jira base URL in login form
  - Store Jira base URL in cookie along with other credentials

- Make it so that I don't need to specify the repositories manually, but instead  specify a folder that contains folders with all my repositories. And then somehow find the default branches automatically. So instead of asking "Enter the full path to your Git repository" say "Where do you have your git repositories?". Maybe even before that we should ask if they want to track all their repos or just one.

## Code Organization
- [ ] Refactor App.tsx - split into smaller components to reduce bloat and repetitiveness
  - Extract file upload logic into separate component
  - Extract drag/drop handlers 
  - Move CSV processing logic to utility functions
  - Consider separating the main app layout from upload/login screens

- [ ] Reorganize project structure into apps/
  - Move CLI tracker to apps/tracker/
  - Move frontend to apps/web/
  - Move backend to apps/api/
  - Create shared utilities in shared/
  - Update build scripts and package.json files
  - there are so many folders now in src/... they are not needed!

## Build Improvements  
- [ ] Include version in executable filenames
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

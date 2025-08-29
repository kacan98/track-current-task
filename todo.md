- Change it so that when there are no changes, it still saves the current branch name that is checked out.
- Make it so that I don't need to specify the repositories manually, but instead  specify a folder that contains folders with all my repositories. And then somehow find the default branches automatically.

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

## Build Improvements  
- [ ] Include version in executable filenames
  - Change from `git-activity-logger-win.exe` to `git-activity-logger-v1.1.22-win.exe`
  - Update pkg build command to include version from package.json
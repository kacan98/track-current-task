import { AppScreens } from './components/AppScreens';
import { GitHubCallback } from './components/GitHubCallback';
import { OverviewPage } from './components/pages/OverviewPage';

function App() {
  // Handle GitHub OAuth callback
  if (window.location.pathname === '/github/callback') {
    return <GitHubCallback />;
  }

  // Handle My Tasks page
  if (window.location.pathname === '/tasks') {
    return <OverviewPage />;
  }

  return <AppScreens />;
}

export default App;
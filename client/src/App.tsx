import { AppScreens } from './components/AppScreens';
import { GitHubCallback } from './components/GitHubCallback';

function App() {
  // Handle GitHub OAuth callback
  if (window.location.pathname === '/github/callback') {
    return <GitHubCallback />;
  }
  
  return <AppScreens />;
}

export default App;
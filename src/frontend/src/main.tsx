import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LogEntriesProvider } from './contexts/LogEntriesContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LogEntriesProvider>
      <App />
    </LogEntriesProvider>
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LogEntriesProvider } from './contexts/LogEntriesContext.tsx'
import { ToastProvider } from './contexts/ToastContext.tsx'
import { SettingsProvider } from './contexts/SettingsContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <LogEntriesProvider>
          <App />
        </LogEntriesProvider>
      </ToastProvider>
    </SettingsProvider>
  </StrictMode>,
)
